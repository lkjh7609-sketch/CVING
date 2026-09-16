import { Company, Question, PromptTemplate, AppSettings } from '@/lib/types';

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onError: (error: string) => void;
  onFinish: (fullContent: string) => void;
}

interface PreviousAnswerContext {
  index: number;
  title: string;
  answer: string;
}

class AIService {
  /**
   * Generates resume tailored to a company using sequential per-question streaming (방식 1)
   * Prevents timeout, avoids repetition between questions, and strictly respects character limits.
   */
  async generateResumeStream(
    company: Company,
    questions: Question[],
    promptTemplate: PromptTemplate,
    settings: AppSettings,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const { onChunk, onError, onFinish } = callbacks;

    // Check if Demo/Simulation mode is active or API key is missing
    if (settings.isDemoMode || !settings.apiKey?.trim()) {
      await this.simulateSequentialStreaming(company, questions, callbacks, signal);
      return;
    }

    const companyName = company.name?.trim() || '목표 기업';
    const roleName = company.targetRole?.trim() || '지원 직무';
    const titleHeader = `# [${companyName}] ${roleName} 맞춤형 자기소개서\n\n`;

    let accumulatedContent = titleHeader;
    const previousAnswers: PreviousAnswerContext[] = [];

    onChunk(accumulatedContent);

    try {
      for (let i = 0; i < questions.length; i++) {
        if (signal?.aborted) {
          console.log('[AIService] Generation aborted before question', i + 1);
          break;
        }

        const currentQ = questions[i];
        const questionPrompt = this.buildQuestionPrompt(
          company,
          questions,
          i,
          previousAnswers,
          promptTemplate
        );

        // Header for this question to visually show immediate progress
        const questionHeader = `### [문항 ${i + 1}] ${currentQ.title}\n`;
        const prefixBeforeThisQuestion = accumulatedContent;

        // Callback for streaming chunks of current question
        let currentQuestionText = '';
        const handleQuestionChunk = (chunkText: string) => {
          currentQuestionText = chunkText;
          // If the model already outputted the ### header, don't duplicate it
          const cleanChunk = chunkText.startsWith('###')
            ? chunkText
            : `${questionHeader}${chunkText}`;
          onChunk(prefixBeforeThisQuestion + cleanChunk);
        };

        const generatedAnswer = await this.streamSingleQuestion(
          questionPrompt,
          promptTemplate.systemPrompt,
          settings,
          handleQuestionChunk,
          signal
        );

        if (signal?.aborted) {
          console.log('[AIService] Generation aborted during question', i + 1);
          if (currentQuestionText) {
            const cleanFinalChunk = currentQuestionText.startsWith('###')
              ? currentQuestionText
              : `${questionHeader}${currentQuestionText}`;
            accumulatedContent = prefixBeforeThisQuestion + cleanFinalChunk;
          }
          break;
        }

        // Clean up and standardize the completed question text
        let finalQuestionBlock = generatedAnswer.trim();
        if (!finalQuestionBlock.startsWith('###')) {
          finalQuestionBlock = `${questionHeader}${finalQuestionBlock}`;
        }

        previousAnswers.push({
          index: i,
          title: currentQ.title,
          answer: finalQuestionBlock,
        });

        accumulatedContent = prefixBeforeThisQuestion + finalQuestionBlock;

        // Add divider if more questions follow
        if (i < questions.length - 1) {
          accumulatedContent += '\n\n---\n\n';
        }

        onChunk(accumulatedContent);
      }

      onFinish(accumulatedContent);
    } catch (error: any) {
      if (error?.name === 'AbortError' || signal?.aborted) {
        console.log('[AIService] Generation cancelled by user. Preserving accumulated content.');
        onFinish(accumulatedContent);
        return;
      }
      console.error('[AIService] Generation error:', error);
      onError(error?.message || '자기소개서 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * Streams a single question prompt from the selected AI provider
   */
  private async streamSingleQuestion(
    userPrompt: string,
    systemPrompt: string,
    settings: AppSettings,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const isAnthropic =
      settings.provider === 'anthropic' ||
      settings.model?.toLowerCase().includes('claude') ||
      settings.apiEndpoint?.includes('anthropic') ||
      settings.apiEndpoint?.includes('aiapiflow');

    const isGemini =
      settings.provider === 'gemini' ||
      settings.model?.toLowerCase().includes('gemini') ||
      settings.apiEndpoint?.includes('googleapis.com');

    const endpoint = settings.apiEndpoint.replace(/\/+$/, '');
    let response: Response;

    if (isAnthropic) {
      response = await fetch('/api/anthropic/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey.trim()}`,
          'x-base-url': endpoint,
        },
        body: JSON.stringify({
          model: settings.model || 'claude-sonnet-5',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          temperature: settings.temperature ?? 0.7,
          stream: true,
        }),
        signal,
      });
    } else if (isGemini) {
      const targetModel = settings.model?.trim() || 'gemini-3.8-flash';
      const geminiStreamPayload = {
        model: targetModel,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        system_instruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: settings.temperature ?? 0.7,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      };

      const isOfficialGoogle = endpoint.includes('googleapis.com');
      if (isOfficialGoogle) {
        try {
          const directUrl = `${endpoint}/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${settings.apiKey.trim()}`;
          response = await fetch(directUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiStreamPayload),
            signal,
          });
          if (!response.ok) {
            throw new Error(`Direct Google API returned ${response.status}`);
          }
        } catch (directErr: any) {
          if (directErr?.name === 'AbortError' || signal?.aborted) throw directErr;
          console.warn('[Gemini] Direct connection failed, falling back to proxy:', directErr);
          response = await fetch('/api/gemini/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${settings.apiKey.trim()}`,
              'x-base-url': endpoint,
            },
            body: JSON.stringify(geminiStreamPayload),
            signal,
          });
        }
      } else {
        response = await fetch('/api/gemini/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.apiKey.trim()}`,
            'x-base-url': endpoint,
          },
          body: JSON.stringify(geminiStreamPayload),
          signal,
        });
      }
    } else {
      // OpenAI / Gateway
      response = await fetch('/api/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey.trim()}`,
          'x-base-url': endpoint,
        },
        body: JSON.stringify({
          model: settings.model || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: settings.temperature ?? 0.7,
          stream: true,
        }),
        signal,
      });
    }

    if (!response.ok) {
      let errMessage = `API 요청 실패 (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) {
          errMessage = errJson.error.message;
        } else if (errJson?.message) {
          errMessage = errJson.message;
        }
      } catch {
        // ignore JSON parse error
      }

      if (errMessage.includes('API_KEY_INVALID') || errMessage.includes('API key not valid')) {
        errMessage = 'Google Gemini API 키가 올바르지 않습니다. AI Studio에서 발급받은 키를 다시 확인해주세요.';
      } else if (errMessage.includes('RESOURCE_EXHAUSTED')) {
        errMessage = 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (
        errMessage.includes('<!DOCTYPE') ||
        errMessage.includes('Just a moment') ||
        errMessage.includes('Cloudflare') ||
        response.status === 403
      ) {
        errMessage =
          'AIApiFlow(Cloudflare) 403 봇 방화벽 차단: Vercel 서버리스 접속이 게이트웨이 보안 정책(Cloudflare)에 의해 차단되었습니다. [공식 앤트로픽 API 키]를 사용하시거나 Google Gemini를 이용해주세요.';
      }

      throw new Error(errMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('응답 스트림을 읽을 수 없습니다.');

    const decoder = new TextDecoder('utf-8');
    let questionContent = '';
    let buffer = '';

    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') break;

          try {
            const json = JSON.parse(dataStr);
            if (json.error?.message) {
              throw new Error(json.error.message);
            }

            let deltaText = '';
            // 1. Anthropic content_block_delta
            if (json.type === 'content_block_delta' && json.delta?.text) {
              deltaText = json.delta.text;
            }
            // 2. Gemini candidates[0].content.parts
            else if (json.candidates?.[0]?.content?.parts) {
              for (const part of json.candidates[0].content.parts) {
                if (part.text) deltaText += part.text;
              }
            }
            // 3. OpenAI choices[0].delta.content
            else if (json.choices?.[0]?.delta?.content) {
              deltaText = json.choices[0].delta.content;
            }
            // 4. General fallback
            else if (json.delta?.text) {
              deltaText = json.delta.text;
            } else if (typeof json.delta?.content === 'string') {
              deltaText = json.delta.content;
            }

            if (deltaText) {
              questionContent += deltaText;
              onChunk(questionContent);
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) {
              throw e;
            }
          }
        }
      }
    }

    return questionContent;
  }

  /**
   * Constructs user prompt specifically targeted for question[targetIndex]
   * Passes full applicant background + previous answers context to prevent story collision
   */
  private buildQuestionPrompt(
    company: Company,
    questions: Question[],
    targetIndex: number,
    previousAnswers: PreviousAnswerContext[],
    promptTemplate: PromptTemplate
  ): string {
    const targetQ = questions[targetIndex];

    const allBaseAnswers = questions
      .map(
        (q, idx) =>
          `[기본 항목 ${idx + 1}: ${q.title}]\n- 지원자 초안 내용:\n${q.answer || '(작성 내용 없음)'}`
      )
      .join('\n\n');

    let previousWrittenContext = '';
    if (previousAnswers.length > 0) {
      previousWrittenContext =
        `\n\n[★ 앞선 문항에서 이미 작성 완료된 내용 (소재 및 스토리 중복 엄격 금지 지침)]:\n` +
        previousAnswers
          .map(
            (pa) =>
              `■ 문항 ${pa.index + 1} (${pa.title}) 작성 내용 요약:\n${pa.answer.slice(0, 300)}...`
          )
          .join('\n\n') +
        `\n※ 핵심 주의사항: 위 앞선 문항들에서 이미 기술한 경험, 프로젝트, 키워드와 동일한 소재가 중복되지 않도록, 이번 문항에서는 지원자의 또 다른 역량과 차별화된 사례를 중심으로 서술하십시오.`;
    }

    return `
[지원 목표 기업]: ${company.name}
${company.targetRole ? `[지원 직무]: ${company.targetRole}` : ''}

[채용공고 및 요구역량 상세]:
${company.jobPostingText || '(공고 텍스트 없음)'}

${company.ocrText ? `[스크린샷 추출 추가 공고 내용]:\n${company.ocrText}` : ''}

[지원자의 전체 기초 경험 데이터 (참고용)]:
${allBaseAnswers}
${previousWrittenContext}

============================================================
[★ 이번에 집중 작성해야 할 문항: ${targetIndex + 1}번 문항 (전체 ${questions.length}개 중 ${targetIndex + 1}번째)]
- 문항 제목: ${targetQ.title}
- 문항 의도 및 설명: ${targetQ.description || '직무 적합성 및 성장 가능성 서술'}
- 지원자의 기본 작성 답변:
${targetQ.answer || '(작성 내용 없음)'}
- 엄격한 목표 글자수: 공백 포함 약 ${targetQ.maxLength}자 내외 (반드시 지정 글자수의 ±10% 이내 준수)

[작성 및 출력 형식 지침]:
1. 반드시 아래와 같이 문항 제목(### 헤더)으로 시작하여 완성도 높은 자기소개서 본문을 작성하십시오.
### [문항 ${targetIndex + 1}] ${targetQ.title}
<여기서부터 본문 서술 시작>

2. 분량 준수: 공백 포함 약 ${targetQ.maxLength}자에 도달하도록 구체적 근거와 스토리텔링을 밀도 있게 채우십시오.
3. 불필요한 인사말(예: "네, 작성하겠습니다", "이상입니다" 등)이나 잡담은 일체 출력하지 마십시오.
`;
  }

  /**
   * Realistic sequential simulation for demo and keyless mode
   */
  private async simulateSequentialStreaming(
    company: Company,
    questions: Question[],
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const { onChunk, onFinish } = callbacks;

    const companyName = company.name || '목표 기업';
    const roleName = company.targetRole || '지원 직무';

    let accumulated = `# [${companyName}] ${roleName} 맞춤형 자기소개서\n\n`;
    onChunk(accumulated);

    for (let i = 0; i < questions.length; i++) {
      if (signal?.aborted) break;

      const q = questions[i];
      const qHeader = `### [문항 ${i + 1}] ${q.title}\n`;
      const sampleAnswer = this.getSampleAnswer(i, companyName);
      const questionBlock = qHeader + sampleAnswer;

      if (i > 0) {
        accumulated += '\n\n---\n\n';
      }

      const prefix = accumulated;
      const chunkSize = 12;

      for (let c = 0; c < questionBlock.length; c += chunkSize) {
        if (signal?.aborted) break;
        accumulated = prefix + questionBlock.slice(0, c + chunkSize);
        onChunk(accumulated);
        await new Promise((r) => setTimeout(r, 18));
      }

      accumulated = prefix + questionBlock;
      onChunk(accumulated);

      if (signal?.aborted) break;
      await new Promise((r) => setTimeout(r, 80));
    }

    onFinish(accumulated);
  }

  private getSampleAnswer(index: number, companyName: string): string {
    const answers = [
      `${companyName}이 지향하는 혁신적인 가치와 비전에 깊이 공감하여 지원하게 되었습니다. 지원자의 탄탄한 기본 경험을 바탕으로, ${companyName}의 비즈니스 성장 곡선에 강력한 실행력으로 기여하고자 합니다. 입사 후에는 실무 프로세스를 신속히 내재화하고 팀 내 핵심 과제를 주도적으로 완수하며, 3년 내에 해당 부서의 중추적인 인재로 도약하겠습니다.`,
      `본 직무를 성공적으로 수행하기 위해 문제 해결 능력과 체계적인 분석 역량을 꾸준히 연마해 왔습니다. 이전 프로젝트에서 복잡한 요구사항을 기한 내에 성공적으로 구현한 경험이 있으며, 협업 부서와의 적극적인 소통을 통해 예상치 못한 난관을 돌파했습니다. 이러한 실전 경험은 ${companyName}의 실무 환경에서도 높은 완성도의 성과로 이어질 것입니다.`,
      `프로젝트 진행 도중 예기치 못한 기술적 병목과 일정 지연 이슈가 발생했을 때, 문제를 회피하지 않고 원인을 데이터 기반으로 분해하여 우선순위를 재정의했습니다. 팀원들과 밤낮으로 가설을 검증하며 새로운 대안을 도출하였고, 결과적으로 목표 대비 120%의 우수한 성과를 달성할 수 있었습니다. 어떠한 불확실성 속에서도 주도적으로 돌파구를 찾는 집념을 ${companyName}에서도 발휘하겠습니다.`,
      `성공적인 협업의 핵심은 경청과 명확한 목표 공유에 있습니다. 서로 다른 이해관계로 인해 의견이 대립했을 때, 각자의 관점을 충분히 청취한 후 데이터와 공동의 목표를 기준으로 중재안을 제안했습니다. 이 과정을 통해 갈등을 발전적인 시너지로 전환시켰으며, 팀 전체의 신뢰와 실행력을 크게 끌어올렸습니다.`,
      `'끝없는 배움과 끊임없는 성장, 그리고 동료와의 신뢰'를 인생의 가장 중요한 나침반으로 삼고 있습니다. 기술과 시장이 급변하는 시대일수록 기본에 충실하면서도 새로운 도전을 두려워하지 않는 자세가 필수적입니다. 끊임없이 스스로의 한계를 갱신하며 함께하는 조직과 함께 도약하는 인재가 되겠습니다.`,
    ];
    return answers[index] || answers[0];
  }
}

export const aiService = new AIService();


import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Middle school default curated word packs for reliable instant fallback
const CURATED_FALLBACKS: Record<string, Array<{
  word: string;
  meaning: string;
  initialHint: string;
  koreanInitialHint: string;
  alphabetBlocks: string[];
  limitTime: number;
  exampleSentence: string;
}>> = {
  general: [
    {
      word: 'ADVENTURE',
      meaning: '모험, 신나는 경험',
      initialHint: 'A _ _ _ _ _ _ E',
      koreanInitialHint: 'ㅁㅎ',
      alphabetBlocks: ['A', 'D', 'V', 'E', 'N', 'T', 'U', 'R', 'E', 'S', 'P', 'O'],
      limitTime: 20,
      exampleSentence: 'They went on an exciting adventure in the mountains.'
    },
    {
      word: 'TRADITION',
      meaning: '전통, 관습',
      initialHint: 'T _ _ _ _ _ _ _ N',
      koreanInitialHint: 'ㅈㅌ',
      alphabetBlocks: ['T', 'R', 'A', 'D', 'I', 'T', 'I', 'O', 'N', 'K', 'L', 'S'],
      limitTime: 20,
      exampleSentence: 'Hanbok is a symbol of Korean tradition.'
    },
    {
      word: 'CHALLENGE',
      meaning: '도전, 해볼 만한 문제',
      initialHint: 'C _ _ _ _ _ _ _ E',
      koreanInitialHint: 'ㄷㅈ',
      alphabetBlocks: ['C', 'H', 'A', 'L', 'L', 'E', 'N', 'G', 'E', 'B', 'M', 'R'],
      limitTime: 20,
      exampleSentence: 'Solving this math puzzle was a big challenge.'
    },
    {
      word: 'EXPERIMENT',
      meaning: '실험, 시험',
      initialHint: 'E _ _ _ _ _ _ _ _ T',
      koreanInitialHint: 'ㅅㅎ',
      alphabetBlocks: ['E', 'X', 'P', 'E', 'R', 'I', 'M', 'E', 'N', 'T', 'A', 'O', 'S'],
      limitTime: 20,
      exampleSentence: 'We did a chemistry experiment in science class.'
    },
    {
      word: 'COMMUNITY',
      meaning: '지역사회, 공동체',
      initialHint: 'C _ _ _ _ _ _ _ Y',
      koreanInitialHint: 'ㄱㄷㅊ',
      alphabetBlocks: ['C', 'O', 'M', 'M', 'U', 'N', 'I', 'T', 'Y', 'E', 'R', 'P'],
      limitTime: 20,
      exampleSentence: 'Our school helps people in the local community.'
    }
  ]
};

// Shuffle helper
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: Date.now(),
  });
});

// Gemini-powered word generator endpoint
app.post('/api/generate-words', async (req, res) => {
  try {
    const { topic = '중학교 필수 영단어 - 학교와 일상', count = 5, grade = '중2' } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not configured. Falling back to curated middle school vocabulary.');
      return res.json({
        success: true,
        source: 'curated_fallback',
        words: CURATED_FALLBACKS.general.slice(0, count)
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `당신은 대한민국 중학교 영어 교과서 및 2022 개정 교육과정 전문 영어 교사입니다.
다음 조건에 맞추어 중학생들이 실시간 퀴즈쇼에서 맞힐 수 있는 영어 단어 퀴즈 문제 ${count}개를 JSON으로 생성해주세요:
- 학년 수준: ${grade} (중학교 1~3학년 수준에 적합)
- 주제/테마: "${topic}"
- 각 단어는 4~10글자 사이의 철자이며, 대문자로 작성
- 뜻은 명확한 한국어 (중학생 눈높이)
- 초성 힌트는 한국어 뜻의 첫 자음들 (예: '모험' -> 'ㅁㅎ')
- initialHint는 첫 글자와 마지막 글자를 보여주고 중간을 '_'로 채움 (예: 'ADVENTURE' -> 'A _ _ _ _ _ _ E')
- alphabetBlocks는 해당 단어의 모든 철자 대문자 + 추가 방해 알파벳 3~4개를 섞은 배열
- exampleSentence는 해당 단어가 들어간 간단하고 자연스러운 중학교 교과서 수준의 영어 예문

반드시 지정된 JSON 스키마 형식으로 응답해주세요.`;

    let responseText = '';
    const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              description: '영어 단어 퀴즈 목록',
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING, description: '대문자 영어 단어' },
                  meaning: { type: Type.STRING, description: '한국어 뜻' },
                  initialHint: { type: Type.STRING, description: '영어 첫글자 힌트 (예: A _ _ _ E)' },
                  koreanInitialHint: { type: Type.STRING, description: '한국어 뜻 초성 (예: ㅁㅎ)' },
                  alphabetBlocks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '단어 철자 및 방해 알파벳 목록'
                  },
                  limitTime: { type: Type.NUMBER, description: '제한시간 초 (기본 20)' },
                  exampleSentence: { type: Type.STRING, description: '영어 예문' }
                },
                required: ['word', 'meaning', 'initialHint', 'koreanInitialHint', 'alphabetBlocks', 'limitTime', 'exampleSentence']
              }
            }
          }
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} attempt failed:`, err?.message);
      }
    }

    if (!responseText) {
      throw lastError || new Error('All model attempts failed');
    }

    const parsed = JSON.parse(responseText);

    // Sanitize and ensure blocks are properly shuffled
    const sanitizedWords = parsed.map((item: any, idx: number) => {
      const cleanWord = (item.word || '').toUpperCase().trim();
      const rawBlocks = Array.isArray(item.alphabetBlocks) ? item.alphabetBlocks : cleanWord.split('');
      const normalizedBlocks = rawBlocks.map((b: any) => String(b).toUpperCase().trim()).filter(Boolean);
      
      // Ensure all letters of the word exist in the blocks
      const wordLetters = cleanWord.split('');
      const combined = [...normalizedBlocks];
      for (const char of wordLetters) {
        if (!combined.includes(char)) {
          combined.push(char);
        }
      }
      
      // Add a couple extra letters if short
      const extras = ['E', 'A', 'R', 'T', 'S', 'O', 'N'];
      while (combined.length < cleanWord.length + 3) {
        const extraChar = extras[Math.floor(Math.random() * extras.length)];
        combined.push(extraChar);
      }

      return {
        qIndex: idx,
        word: cleanWord,
        meaning: item.meaning || '',
        initialHint: item.initialHint || `${cleanWord[0]} ${' _'.repeat(Math.max(1, cleanWord.length - 2))} ${cleanWord[cleanWord.length - 1]}`,
        koreanInitialHint: item.koreanInitialHint || '',
        alphabetBlocks: shuffleArray(combined),
        limitTime: item.limitTime || 20,
        exampleSentence: item.exampleSentence || ''
      };
    });

    return res.json({
      success: true,
      source: 'gemini',
      words: sanitizedWords
    });
  } catch (error: any) {
    console.error('Gemini Generation Error:', error);
    return res.json({
      success: true,
      source: 'fallback_error',
      words: CURATED_FALLBACKS.general.slice(0, 5),
      errorDetail: error.message
    });
  }
});

// Setup Vite in Dev or Static in Production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

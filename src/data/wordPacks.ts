export interface QuizQuestion {
  qIndex: number;
  word: string;
  meaning: string;
  initialHint: string;
  koreanInitialHint: string;
  alphabetBlocks: string[];
  limitTime: number;
  exampleSentence: string;
}

export interface WordPackPreset {
  id: string;
  title: string;
  grade: string;
  description: string;
  badge: string;
  questions: QuizQuestion[];
}

export const PRESET_WORD_PACKS: WordPackPreset[] = [
  {
    id: 'middle2_core',
    title: '중2 필수 어휘 - 여행 & 도전 & 공동체',
    grade: '중학교 2학년',
    description: '2022 개정 교육과정 중2 핵심 교과서 필수 어휘 6선',
    badge: '인기 1위',
    questions: [
      {
        qIndex: 0,
        word: 'ADVENTURE',
        meaning: '모험, 신나는 경험',
        initialHint: 'A _ _ _ _ _ _ E',
        koreanInitialHint: 'ㅁㅎ',
        alphabetBlocks: ['A', 'D', 'V', 'E', 'N', 'T', 'U', 'R', 'E', 'S', 'P', 'O'],
        limitTime: 20,
        exampleSentence: 'Traveling around the world is a thrilling adventure.'
      },
      {
        qIndex: 1,
        word: 'TRADITION',
        meaning: '전통, 관습',
        initialHint: 'T _ _ _ _ _ _ _ N',
        koreanInitialHint: 'ㅈㅌ',
        alphabetBlocks: ['T', 'R', 'A', 'D', 'I', 'T', 'I', 'O', 'N', 'K', 'L', 'S'],
        limitTime: 20,
        exampleSentence: 'Every country has its own unique cultural tradition.'
      },
      {
        qIndex: 2,
        word: 'CHALLENGE',
        meaning: '도전, 해볼 만한 과제',
        initialHint: 'C _ _ _ _ _ _ _ E',
        koreanInitialHint: 'ㄷㅈ',
        alphabetBlocks: ['C', 'H', 'A', 'L', 'L', 'E', 'N', 'G', 'E', 'M', 'O', 'B'],
        limitTime: 20,
        exampleSentence: 'Never give up when you face a new challenge.'
      },
      {
        qIndex: 3,
        word: 'DISCOVER',
        meaning: '발견하다, 찾다',
        initialHint: 'D _ _ _ _ _ _ R',
        koreanInitialHint: 'ㅂㄱ',
        alphabetBlocks: ['D', 'I', 'S', 'C', 'O', 'V', 'E', 'R', 'P', 'T', 'U'],
        limitTime: 20,
        exampleSentence: 'Scientists work hard to discover new stars.'
      },
      {
        qIndex: 4,
        word: 'COMMUNITY',
        meaning: '공동체, 지역사회',
        initialHint: 'C _ _ _ _ _ _ _ Y',
        koreanInitialHint: 'ㄱㄷㅊ',
        alphabetBlocks: ['C', 'O', 'M', 'M', 'U', 'N', 'I', 'T', 'Y', 'E', 'S', 'L'],
        limitTime: 20,
        exampleSentence: 'We can make our community a cleaner place together.'
      },
      {
        qIndex: 5,
        word: 'VACATION',
        meaning: '방학, 휴가',
        initialHint: 'V _ _ _ _ _ _ N',
        koreanInitialHint: 'ㅂㅎ',
        alphabetBlocks: ['V', 'A', 'C', 'A', 'T', 'I', 'O', 'N', 'H', 'E', 'R'],
        limitTime: 20,
        exampleSentence: 'Summer vacation starts next week.'
      }
    ]
  },
  {
    id: 'middle1_starter',
    title: '중1 기초 어휘 - 학교 & 친구 & 감정',
    grade: '중학교 1학년',
    description: '중1 입학 후 반드시 마스터해야 하는 필수 기초 영단어',
    badge: '기초 탄탄',
    questions: [
      {
        qIndex: 0,
        word: 'FRIEND',
        meaning: '친구, 벗',
        initialHint: 'F _ _ _ _ D',
        koreanInitialHint: 'ㅊㄱ',
        alphabetBlocks: ['F', 'R', 'I', 'E', 'N', 'D', 'K', 'L', 'T', 'S'],
        limitTime: 20,
        exampleSentence: 'A good friend is always by your side.'
      },
      {
        qIndex: 1,
        word: 'HEALTH',
        meaning: '건강, 건강 상태',
        initialHint: 'H _ _ _ _ H',
        koreanInitialHint: 'ㄱㄱ',
        alphabetBlocks: ['H', 'E', 'A', 'L', 'T', 'H', 'Y', 'O', 'U', 'R'],
        limitTime: 20,
        exampleSentence: 'Eating fresh vegetables is good for your health.'
      },
      {
        qIndex: 2,
        word: 'NATURE',
        meaning: '자연, 천성',
        initialHint: 'N _ _ _ _ E',
        koreanInitialHint: 'ㅈㅇ',
        alphabetBlocks: ['N', 'A', 'T', 'U', 'R', 'E', 'S', 'B', 'I', 'D'],
        limitTime: 20,
        exampleSentence: 'Take a deep breath and enjoy the fresh air of nature.'
      },
      {
        qIndex: 3,
        word: 'ANIMAL',
        meaning: '동물, 짐승',
        initialHint: 'A _ _ _ _ L',
        koreanInitialHint: 'ㄷㅁ',
        alphabetBlocks: ['A', 'N', 'I', 'M', 'A', 'L', 'S', 'P', 'O', 'T'],
        limitTime: 20,
        exampleSentence: 'The dolphin is an intelligent sea animal.'
      },
      {
        qIndex: 4,
        word: 'SPECIAL',
        meaning: '특별한, 특수한',
        initialHint: 'S _ _ _ _ _ L',
        koreanInitialHint: 'ㅌㅂ',
        alphabetBlocks: ['S', 'P', 'E', 'C', 'I', 'A', 'L', 'D', 'O', 'G'],
        limitTime: 20,
        exampleSentence: 'Today is a special day because it is my birthday.'
      }
    ]
  },
  {
    id: 'middle3_advanced',
    title: '중3 심화 어휘 - 과학 & 환경 & 미래기술',
    grade: '중학교 3학년',
    description: '고등학교 진학 대비 중3 교과서 핵심 심화 어휘',
    badge: '수준 업그레이드',
    questions: [
      {
        qIndex: 0,
        word: 'EXPERIMENT',
        meaning: '실험, 시험적 시도',
        initialHint: 'E _ _ _ _ _ _ _ _ T',
        koreanInitialHint: 'ㅅㅎ',
        alphabetBlocks: ['E', 'X', 'P', 'E', 'R', 'I', 'M', 'E', 'N', 'T', 'O', 'S', 'A'],
        limitTime: 25,
        exampleSentence: 'The science experiment showed surprising results.'
      },
      {
        qIndex: 1,
        word: 'CREATIVE',
        meaning: '창의적인, 독창적인',
        initialHint: 'C _ _ _ _ _ _ E',
        koreanInitialHint: 'ㅊㅇㅈ',
        alphabetBlocks: ['C', 'R', 'E', 'A', 'T', 'I', 'V', 'E', 'S', 'L', 'M'],
        limitTime: 20,
        exampleSentence: 'We need creative ideas to solve this complicated problem.'
      },
      {
        qIndex: 2,
        word: 'POLLUTION',
        meaning: '오염, 공해',
        initialHint: 'P _ _ _ _ _ _ _ N',
        koreanInitialHint: 'ㅇㅇ',
        alphabetBlocks: ['P', 'O', 'L', 'L', 'U', 'T', 'I', 'O', 'N', 'E', 'R', 'S'],
        limitTime: 20,
        exampleSentence: 'Plastic pollution causes serious harm to ocean wildlife.'
      },
      {
        qIndex: 3,
        word: 'INVENTOR',
        meaning: '발명가, 고안자',
        initialHint: 'I _ _ _ _ _ _ R',
        koreanInitialHint: 'ㅂㅁㄱ',
        alphabetBlocks: ['I', 'N', 'V', 'E', 'N', 'T', 'O', 'R', 'S', 'P', 'C'],
        limitTime: 20,
        exampleSentence: 'Thomas Edison is one of the most famous inventors.'
      },
      {
        qIndex: 4,
        word: 'SOLUTION',
        meaning: '해결책, 정답',
        initialHint: 'S _ _ _ _ _ _ N',
        koreanInitialHint: 'ㅎㄱㅊ',
        alphabetBlocks: ['S', 'O', 'L', 'U', 'T', 'I', 'O', 'N', 'A', 'B', 'K'],
        limitTime: 20,
        exampleSentence: 'Teamwork will help us find the best solution.'
      }
    ]
  }
];

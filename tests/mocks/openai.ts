import { vi } from 'vitest';

// Mock OpenAI API responses
export const mockOpenAIResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          subject: 'Wiskunde',
          topics: ['Algebra', 'Geometrie', 'Functies'],
          keyConcepts: ['Kwadratische vergelijkingen', 'Pythagoras', 'Lineaire functies'],
          difficulty: 'Gemiddeld',
          summary: 'Les over algebraïsche vergelijkingen en geometrische vormen.',
        }),
      },
    },
  ],
};

export const mockOpenAIService = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
};

// Mock OpenAI module
vi.mock('openai', () => ({
  OpenAI: vi.fn(() => mockOpenAIService),
}));

// Setup default mock implementation
mockOpenAIService.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

// Mock AI analysis helper functions
export const mockAnalyzeDocument = vi.fn();
export const mockExtractKeyConcepts = vi.fn();

mockAnalyzeDocument.mockImplementation((filename: string) => {
  return Promise.resolve({
    subject: 'Wiskunde',
    topics: ['Algebra', 'Geometrie'],
    keyConcepts: ['Kwadratische vergelijkingen', 'Pythagoras'],
    difficulty: 'Gemiddeld',
    summary: `AI analyse van ${filename}`,
    confidence: 0.85,
  });
});

mockExtractKeyConcepts.mockImplementation((content: string) => {
  return Promise.resolve([
    { term: 'Kwadratische vergelijking', explanation: 'Een vergelijking van de vorm ax² + bx + c = 0' },
    { term: 'Pythagoras', explanation: 'a² + b² = c² voor rechthoekige driehoeken' },
  ]);
});

export { mockOpenAIResponse, mockOpenAIService };

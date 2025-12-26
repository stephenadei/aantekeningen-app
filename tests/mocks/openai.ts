import { vi } from 'vitest';

export const mockOpenAIClient = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'This is a test response from the OpenAI mock.',
            },
            finish_reason: 'stop',
            index: 0,
          },
        ],
      }),
    },
  },
};

export const mockOpenAI = {
  OpenAI: vi.fn(() => mockOpenAIClient),
};

export const openaiAnalyzeFile = vi.fn().mockResolvedValue({
  subject: 'Wiskunde',
  topic: 'Algebra',
  level: 'Grade 10',
  schoolYear: '2024',
  keywords: ['algebra', 'equations', 'variables'],
  summary: 'This document covers basic algebra concepts',
  summaryEn: 'This document covers basic algebra concepts',
  topicEn: 'Algebra',
  keywordsEn: ['algebra', 'equations', 'variables'],
});

export const openaiExtractConcepts = vi.fn().mockResolvedValue([
  {
    term: 'Algebra',
    explanation: 'A branch of mathematics dealing with equations and variables',
    example: 'x + 5 = 10',
  },
  {
    term: 'Variable',
    explanation: 'A symbol that represents an unknown value',
    example: 'x in the equation x + 5 = 10',
  },
]);

const mockOpenAIModule = {
  openaiAnalyzeFile,
  openaiExtractConcepts,
  mockOpenAI,
  mockOpenAIClient,
};

export default mockOpenAIModule;

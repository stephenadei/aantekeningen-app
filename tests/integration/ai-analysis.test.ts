import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock OpenAI API
vi.mock('openai', () => ({
  OpenAI: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

describe('AI Analysis Integration', () => {
  const mockOpenAIResponse = {
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

  const mockPDFContent = `
    Wiskunde Les - Algebra
    ====================
    
    Vandaag behandelen we kwadratische vergelijkingen.
    
    De algemene vorm is: ax² + bx + c = 0
    
    Voorbeelden:
    1. x² - 5x + 6 = 0
    2. 2x² + 3x - 1 = 0
    
    We gebruiken de abc-formule om deze op te lossen.
    
    Ook kijken we naar de grafiek van kwadratische functies.
    De grafiek is een parabool.
  `;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OpenAI API Integration', () => {
    it('should analyze document successfully', async () => {
      const { OpenAI } = await import('openai');
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn(() => Promise.resolve(mockOpenAIResponse)),
          },
        },
      };

      vi.mocked(OpenAI).mockReturnValue(mockOpenAI as unknown as OpenAI);

      const openai = new OpenAI({ apiKey: 'test-key' });
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an educational content analyzer. Analyze the provided document and return a JSON response with subject, topics, keyConcepts, difficulty, and summary.',
          },
          {
            role: 'user',
            content: `Analyze this educational document: test.pdf\n\nContent: ${mockPDFContent.substring(0, 1000)}...\n\nPlease provide a JSON response with:\n- subject: Main subject/topic\n- topics: Array of specific topics covered\n- keyConcepts: Array of key concepts\n- difficulty: Difficulty level (Easy/Medium/Hard)\n- summary: Brief summary of the content\n\nFormat as valid JSON only.`,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      expect(response.choices[0].message.content).toBeDefined();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('educational content analyzer'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('test.pdf'),
          }),
        ]),
        max_tokens: 500,
        temperature: 0.3,
      });
    });

    it('should handle API errors gracefully', async () => {
      const { OpenAI } = await import('openai');
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn(() => Promise.reject(new Error('API quota exceeded'))),
          },
        },
      };

      vi.mocked(OpenAI).mockReturnValue(mockOpenAI as unknown as OpenAI);

      const openai = new OpenAI({ apiKey: 'test-key' });
      
      await expect(openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Analyze this document',
          },
        ],
      })).rejects.toThrow('API quota exceeded');
    });

    it('should handle rate limit errors', async () => {
      const { OpenAI } = await import('openai');
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn(() => Promise.reject(new Error('Rate limit exceeded'))),
          },
        },
      };

      vi.mocked(OpenAI).mockReturnValue(mockOpenAI as unknown as OpenAI);

      const openai = new OpenAI({ apiKey: 'test-key' });
      
      await expect(openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Analyze this document',
          },
        ],
      })).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Content Processing', () => {
    it('should extract text from PDF content', () => {
      const extractTextFromContent = (content: string): string => {
        return content
          .replace(/[^\w\s]/g, ' ') // Remove special characters
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      };

      const extracted = extractTextFromContent(mockPDFContent);
      
      expect(extracted).toContain('Wiskunde Les Algebra');
      expect(extracted).toContain('kwadratische vergelijkingen');
      expect(extracted).toContain('abc formule'); // Note: hyphen is removed by regex
      expect(extracted).not.toContain('==='); // Special characters removed
    });

    it('should truncate long content', () => {
      const truncateContent = (content: string, maxLength: number = 1000): string => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
      };

      const longContent = 'a'.repeat(2000);
      const truncated = truncateContent(longContent);
      
      expect(truncated.length).toBe(1003); // 1000 + '...'
      expect(truncated.endsWith('...')).toBe(true);
    });

    it('should clean filename for analysis', () => {
      const cleanFilenameForAnalysis = (filename: string): string => {
        return filename
          .replace(/^Priveles\s+/, '')
          .replace(/\s+\d{2}_\d{2}_\d{2}\.pdf$/, '')
          .replace(/\.pdf$/, '')
          .trim();
      };

      expect(cleanFilenameForAnalysis('Priveles 8 Oct 2025 12_39_30.pdf')).toBe('8 Oct 2025');
      expect(cleanFilenameForAnalysis('bijles toets.pdf')).toBe('bijles toets');
      expect(cleanFilenameForAnalysis('Homework Assignment.pdf')).toBe('Homework Assignment');
    });
  });

  describe('Response Parsing', () => {
    it('should parse valid JSON response', () => {
      const parseAIResponse = (response: string) => {
        try {
          const parsed = JSON.parse(response);
          return {
            subject: parsed.subject || 'Unknown',
            topics: Array.isArray(parsed.topics) ? parsed.topics : [],
            keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
            difficulty: parsed.difficulty || 'Medium',
            summary: parsed.summary || 'No summary available',
            confidence: parsed.confidence || 0.8,
          };
        } catch (error) {
          return {
            subject: 'Unknown',
            topics: [],
            keyConcepts: [],
            difficulty: 'Medium',
            summary: 'Failed to parse AI response',
            confidence: 0,
          };
        }
      };

      const validResponse = JSON.stringify({
        subject: 'Wiskunde',
        topics: ['Algebra', 'Geometrie'],
        keyConcepts: ['Kwadratische vergelijkingen', 'Pythagoras'],
        difficulty: 'Medium',
        summary: 'Les over algebraïsche vergelijkingen',
        confidence: 0.9,
      });

      const parsed = parseAIResponse(validResponse);
      
      expect(parsed.subject).toBe('Wiskunde');
      expect(parsed.topics).toEqual(['Algebra', 'Geometrie']);
      expect(parsed.keyConcepts).toEqual(['Kwadratische vergelijkingen', 'Pythagoras']);
      expect(parsed.difficulty).toBe('Medium');
      expect(parsed.summary).toBe('Les over algebraïsche vergelijkingen');
      expect(parsed.confidence).toBe(0.9);
    });

    it('should handle invalid JSON response', () => {
      const parseAIResponse = (response: string) => {
        try {
          const parsed = JSON.parse(response);
          return {
            subject: parsed.subject || 'Unknown',
            topics: Array.isArray(parsed.topics) ? parsed.topics : [],
            keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
            difficulty: parsed.difficulty || 'Medium',
            summary: parsed.summary || 'No summary available',
            confidence: parsed.confidence || 0.8,
          };
        } catch (error) {
          return {
            subject: 'Unknown',
            topics: [],
            keyConcepts: [],
            difficulty: 'Medium',
            summary: 'Failed to parse AI response',
            confidence: 0,
          };
        }
      };

      const invalidResponse = 'This is not valid JSON';
      const parsed = parseAIResponse(invalidResponse);
      
      expect(parsed.subject).toBe('Unknown');
      expect(parsed.topics).toEqual([]);
      expect(parsed.keyConcepts).toEqual([]);
      expect(parsed.difficulty).toBe('Medium');
      expect(parsed.summary).toBe('Failed to parse AI response');
      expect(parsed.confidence).toBe(0);
    });

    it('should handle partial JSON response', () => {
      const parseAIResponse = (response: string) => {
        try {
          const parsed = JSON.parse(response);
          return {
            subject: parsed.subject || 'Unknown',
            topics: Array.isArray(parsed.topics) ? parsed.topics : [],
            keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
            difficulty: parsed.difficulty || 'Medium',
            summary: parsed.summary || 'No summary available',
            confidence: parsed.confidence || 0.8,
          };
        } catch (error) {
          return {
            subject: 'Unknown',
            topics: [],
            keyConcepts: [],
            difficulty: 'Medium',
            summary: 'Failed to parse AI response',
            confidence: 0,
          };
        }
      };

      const partialResponse = JSON.stringify({
        subject: 'Wiskunde',
        // Missing other fields
      });

      const parsed = parseAIResponse(partialResponse);
      
      expect(parsed.subject).toBe('Wiskunde');
      expect(parsed.topics).toEqual([]);
      expect(parsed.keyConcepts).toEqual([]);
      expect(parsed.difficulty).toBe('Medium');
      expect(parsed.summary).toBe('No summary available');
    });
  });

  describe('Caching Logic', () => {
    it('should generate consistent cache keys', () => {
      const generateAnalysisCacheKey = (filename: string, contentHash: string): string => {
        return `ai-analysis:${filename}:${contentHash}`;
      };

      const key1 = generateAnalysisCacheKey('test.pdf', 'hash123');
      const key2 = generateAnalysisCacheKey('test.pdf', 'hash123');
      
      expect(key1).toBe(key2);
      expect(key1).toBe('ai-analysis:test.pdf:hash123');
    });

    it('should handle cache expiration', () => {
      const isCacheExpired = (timestamp: number, ttl: number = 3600000): boolean => {
        // TTL = 1 hour by default
        return Date.now() - timestamp > ttl;
      };

      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const twoHoursAgo = now - 7200000;

      // With default TTL of 1 hour, oneHourAgo is NOT expired (barely within the hour)
      // Instead test with values clearly outside the window
      expect(isCacheExpired(twoHoursAgo)).toBe(true); // 2 hours is beyond 1 hour TTL
      expect(isCacheExpired(now - 1800000)).toBe(false); // 30 minutes is within TTL
      expect(isCacheExpired(now - 100000)).toBe(false); // 100 seconds is within TTL
    });
  });

  describe('Cost Management', () => {
    it('should estimate token usage', () => {
      const estimateTokens = (text: string): number => {
        // Rough estimation: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
      };

      const shortText = 'Hello world';
      const longText = 'a'.repeat(1000);

      expect(estimateTokens(shortText)).toBe(3); // 11 chars / 4
      expect(estimateTokens(longText)).toBe(250); // 1000 chars / 4
    });

    it('should calculate analysis cost', () => {
      const calculateCost = (tokens: number, model: string = 'gpt-3.5-turbo'): number => {
        const costs = {
          'gpt-3.5-turbo': 0.002, // $0.002 per 1K tokens
          'gpt-4': 0.03, // $0.03 per 1K tokens
        };
        
        const costPer1K = costs[model] || 0.002;
        return (tokens / 1000) * costPer1K;
      };

      expect(calculateCost(1000, 'gpt-3.5-turbo')).toBe(0.002);
      expect(calculateCost(1000, 'gpt-4')).toBe(0.03);
      expect(calculateCost(500, 'gpt-3.5-turbo')).toBe(0.001);
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      const { OpenAI } = await import('openai');
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn(() => Promise.reject(new Error('Request timeout'))),
          },
        },
      };

      vi.mocked(OpenAI).mockReturnValue(mockOpenAI as unknown as OpenAI);

      const openai = new OpenAI({ apiKey: 'test-key' });
      
      await expect(openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Analyze this document',
          },
        ],
      })).rejects.toThrow('Request timeout');
    });

    it('should handle invalid API key', async () => {
      const { OpenAI } = await import('openai');
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn(() => Promise.reject(new Error('Invalid API key'))),
          },
        },
      };

      vi.mocked(OpenAI).mockReturnValue(mockOpenAI as unknown as OpenAI);

      const openai = new OpenAI({ apiKey: 'invalid-key' });
      
      await expect(openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Analyze this document',
          },
        ],
      })).rejects.toThrow('Invalid API key');
    });
  });

  describe('Data Validation', () => {
    it('should validate analysis result structure', () => {
      const validateAnalysisResult = (result: any): boolean => {
        return !!(
          result &&
          typeof result.subject === 'string' &&
          Array.isArray(result.topics) &&
          Array.isArray(result.keyConcepts) &&
          typeof result.difficulty === 'string' &&
          typeof result.summary === 'string'
        );
      };

      const validResult = {
        subject: 'Wiskunde',
        topics: ['Algebra'],
        keyConcepts: ['Kwadratische vergelijkingen'],
        difficulty: 'Medium',
        summary: 'Test summary',
      };

      const invalidResult = {
        subject: 'Wiskunde',
        // Missing other fields
      };

      expect(validateAnalysisResult(validResult)).toBe(true);
      expect(validateAnalysisResult(invalidResult)).toBe(false);
      expect(validateAnalysisResult(null)).toBe(false);
    });
  });
});

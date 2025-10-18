import { describe, it, expect } from 'vitest';

describe('AI Analysis Helpers', () => {
  describe('Prompt Generation', () => {
    const generateAnalysisPrompt = (filename: string, content: string): string => {
      return `Analyze this educational document: ${filename}

Content: ${content.substring(0, 1000)}...

Please provide a JSON response with:
- subject: Main subject/topic
- topics: Array of specific topics covered
- keyConcepts: Array of key concepts
- difficulty: Difficulty level (Easy/Medium/Hard)
- summary: Brief summary of the content

Format as valid JSON only.`;
    };

    it('should generate proper analysis prompts', () => {
      const filename = 'Priveles 8 Oct 2025.pdf';
      const content = 'This is a mathematics lesson about algebra...';
      
      const prompt = generateAnalysisPrompt(filename, content);
      
      expect(prompt).toContain(filename);
      expect(prompt).toContain('mathematics lesson');
      expect(prompt).toContain('JSON response');
      expect(prompt).toContain('subject');
      expect(prompt).toContain('topics');
      expect(prompt).toContain('keyConcepts');
      expect(prompt).toContain('difficulty');
      expect(prompt).toContain('summary');
    });

    it('should truncate long content', () => {
      const longContent = 'a'.repeat(2000);
      const prompt = generateAnalysisPrompt('test.pdf', longContent);
      
      expect(prompt).toContain('...');
      expect(prompt.length).toBeLessThan(1500); // Should be truncated
    });

    it('should handle empty content', () => {
      const prompt = generateAnalysisPrompt('test.pdf', '');
      expect(prompt).toContain('test.pdf');
      expect(prompt).toContain('Content: ...');
    });
  });

  describe('Response Parsing', () => {
    const parseAIResponse = (response: string) => {
      try {
        const parsed = JSON.parse(response);
        return {
          subject: parsed.subject || 'Unknown',
          topics: Array.isArray(parsed.topics) ? parsed.topics : [],
          keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
          difficulty: parsed.difficulty || 'Medium',
          summary: parsed.summary || 'No summary available'
        };
      } catch (error) {
        return {
          subject: 'Unknown',
          topics: [],
          keyConcepts: [],
          difficulty: 'Medium',
          summary: 'Failed to parse AI response'
        };
      }
    };

    it('should parse valid JSON responses', () => {
      const validResponse = JSON.stringify({
        subject: 'Wiskunde',
        topics: ['Algebra', 'Geometrie'],
        keyConcepts: ['Kwadratische vergelijkingen', 'Pythagoras'],
        difficulty: 'Medium',
        summary: 'Les over algebraïsche vergelijkingen'
      });

      const parsed = parseAIResponse(validResponse);
      
      expect(parsed.subject).toBe('Wiskunde');
      expect(parsed.topics).toEqual(['Algebra', 'Geometrie']);
      expect(parsed.keyConcepts).toEqual(['Kwadratische vergelijkingen', 'Pythagoras']);
      expect(parsed.difficulty).toBe('Medium');
      expect(parsed.summary).toBe('Les over algebraïsche vergelijkingen');
    });

    it('should handle invalid JSON responses', () => {
      const invalidResponse = 'This is not valid JSON';
      const parsed = parseAIResponse(invalidResponse);
      
      expect(parsed.subject).toBe('Unknown');
      expect(parsed.topics).toEqual([]);
      expect(parsed.keyConcepts).toEqual([]);
      expect(parsed.difficulty).toBe('Medium');
      expect(parsed.summary).toBe('Failed to parse AI response');
    });

    it('should handle partial JSON responses', () => {
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

    it('should handle non-array fields', () => {
      const invalidResponse = JSON.stringify({
        subject: 'Wiskunde',
        topics: 'Not an array',
        keyConcepts: 123
      });

      const parsed = parseAIResponse(invalidResponse);
      
      expect(parsed.subject).toBe('Wiskunde');
      expect(parsed.topics).toEqual([]);
      expect(parsed.keyConcepts).toEqual([]);
    });
  });

  describe('Content Extraction', () => {
    const extractTextFromContent = (content: string): string => {
      // Simulate text extraction from PDF content
      return content
        .replace(/[^\w\s]/g, ' ') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    it('should extract clean text from content', () => {
      const content = 'This is a test! With some special characters @#$%^&*()';
      const extracted = extractTextFromContent(content);
      
      expect(extracted).toBe('This is a test With some special characters');
    });

    it('should normalize whitespace', () => {
      const content = 'Multiple    spaces\n\nand\ttabs';
      const extracted = extractTextFromContent(content);
      
      expect(extracted).toBe('Multiple spaces and tabs');
    });

    it('should handle empty content', () => {
      const extracted = extractTextFromContent('');
      expect(extracted).toBe('');
    });
  });

  describe('Cache Key Generation', () => {
    const generateAnalysisCacheKey = (filename: string, contentHash: string): string => {
      return `ai-analysis:${filename}:${contentHash}`;
    };

    it('should generate consistent cache keys', () => {
      const key1 = generateAnalysisCacheKey('test.pdf', 'hash123');
      const key2 = generateAnalysisCacheKey('test.pdf', 'hash123');
      
      expect(key1).toBe(key2);
      expect(key1).toBe('ai-analysis:test.pdf:hash123');
    });

    it('should generate different keys for different files', () => {
      const key1 = generateAnalysisCacheKey('test1.pdf', 'hash123');
      const key2 = generateAnalysisCacheKey('test2.pdf', 'hash123');
      
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different content', () => {
      const key1 = generateAnalysisCacheKey('test.pdf', 'hash123');
      const key2 = generateAnalysisCacheKey('test.pdf', 'hash456');
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('Content Hashing', () => {
    const generateContentHash = (content: string): string => {
      // Simple hash function for testing
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16);
    };

    it('should generate consistent hashes', () => {
      const content = 'Test content';
      const hash1 = generateContentHash(content);
      const hash2 = generateContentHash(content);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = generateContentHash('Content 1');
      const hash2 = generateContentHash('Content 2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty content', () => {
      const hash = generateContentHash('');
      expect(hash).toBe('0');
    });
  });

  describe('Error Handling', () => {
    const handleAIError = (error: any): { success: boolean; error: string } => {
      if (error.message?.includes('rate limit')) {
        return { success: false, error: 'Rate limit exceeded' };
      }
      if (error.message?.includes('quota')) {
        return { success: false, error: 'Quota exceeded' };
      }
      if (error.message?.includes('timeout')) {
        return { success: false, error: 'Request timeout' };
      }
      return { success: false, error: 'Unknown error' };
    };

    it('should handle rate limit errors', () => {
      const error = { message: 'Rate limit exceeded' };
      const result = handleAIError(error);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should handle quota errors', () => {
      const error = { message: 'Quota exceeded' };
      const result = handleAIError(error);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Quota exceeded');
    });

    it('should handle timeout errors', () => {
      const error = { message: 'Request timeout' };
      const result = handleAIError(error);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('should handle unknown errors', () => {
      const error = { message: 'Something went wrong' };
      const result = handleAIError(error);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });
});

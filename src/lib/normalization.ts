/**
 * Normalization utilities for consistent subject, level, and topic categorization
 */

import { 
  Subject, 
  Level, 
  Topic,
  createSubject,
  createLevel,
  createTopic,
  Result,
  Ok,
  Err
} from './types';

// Subject canonicalization mapping
const SUBJECT_MAP: Record<string, string> = {
  'wiskunde': 'wiskunde',
  'wiskunde a': 'wiskunde-a',
  'wiskunde b': 'wiskunde-b',
  'wiskunde c': 'wiskunde-c',
  'wiskunde d': 'wiskunde-d',
  'statistiek': 'statistiek',
  'natuurkunde': 'natuurkunde',
  'scheikunde': 'scheikunde',
  'biologie': 'biologie',
  'nederlands': 'nederlands',
  'engels': 'engels',
  'duits': 'duits',
  'frans': 'frans',
  'spaans': 'spaans',
  'geschiedenis': 'geschiedenis',
  'aardrijkskunde': 'aardrijkskunde',
  'economie': 'economie',
  'bedrijfseconomie': 'bedrijfseconomie',
  'maatschappijleer': 'maatschappijleer',
  'filosofie': 'filosofie',
  'informatica': 'informatica',
  'rekenen': 'rekenen',
  'wiskunde-a': 'wiskunde-a',
  'wiskunde-b': 'wiskunde-b',
  'wiskunde-c': 'wiskunde-c',
  'wiskunde-d': 'wiskunde-d',
};

// Level canonicalization mapping
const LEVEL_MAP: Record<string, string> = {
  '4 havo': 'havo-4',
  'havo4': 'havo-4',
  'havo 4': 'havo-4',
  '3 havo': 'havo-3',
  'havo3': 'havo-3',
  'havo 3': 'havo-3',
  '5 havo': 'havo-5',
  'havo5': 'havo-5',
  'havo 5': 'havo-5',
  '4 vwo': 'vwo-4',
  'vwo4': 'vwo-4',
  'vwo 4': 'vwo-4',
  '3 vwo': 'vwo-3',
  'vwo3': 'vwo-3',
  'vwo 3': 'vwo-3',
  '5 vwo': 'vwo-5',
  'vwo5': 'vwo-5',
  'vwo 5': 'vwo-5',
  '6 vwo': 'vwo-6',
  'vwo6': 'vwo-6',
  'vwo 6': 'vwo-6',
  '3 vmbo': 'vmbo-3',
  'vmbo3': 'vmbo-3',
  'vmbo 3': 'vmbo-3',
  '4 vmbo': 'vmbo-4',
  'vmbo4': 'vmbo-4',
  'vmbo 4': 'vmbo-4',
  'vmbo bk 3': 'vmbo-bk-3',
  'vmbo bk3': 'vmbo-bk-3',
  'vmbo bk 4': 'vmbo-bk-4',
  'vmbo bk4': 'vmbo-bk-4',
  'vmbo tl 3': 'vmbo-tl-3',
  'vmbo tl3': 'vmbo-tl-3',
  'vmbo tl 4': 'vmbo-tl-4',
  'vmbo tl4': 'vmbo-tl-4',
  'vmbo gl 3': 'vmbo-gl-3',
  'vmbo gl3': 'vmbo-gl-3',
  'vmbo gl 4': 'vmbo-gl-4',
  'vmbo gl4': 'vmbo-gl-4',
  'vmbo kader 3': 'vmbo-kader-3',
  'vmbo kader3': 'vmbo-kader-3',
  'vmbo kader 4': 'vmbo-kader-4',
  'vmbo kader4': 'vmbo-kader-4',
  'vmbo basis 3': 'vmbo-basis-3',
  'vmbo basis3': 'vmbo-basis-3',
  'vmbo basis 4': 'vmbo-basis-4',
  'vmbo basis4': 'vmbo-basis-4',
};

// Topic canonicalization mapping
const TOPIC_MAP: Record<string, string> = {
  'breuken': 'breuken',
  'overbreuken': 'breuken',
  'logaritme': 'logaritmen',
  'logaritmen': 'logaritmen',
  'wispunten': 'wispunten',
  'wis punten': 'wispunten',
  'afgeleide': 'afgeleiden',
  'afgeleiden': 'afgeleiden',
  'differentiëren': 'afgeleiden',
  'differentieren': 'afgeleiden',
  'integraal': 'integralen',
  'integralen': 'integralen',
  'integreren': 'integralen',
  'goniometrie': 'goniometrie',
  'sinus': 'goniometrie',
  'cosinus': 'goniometrie',
  'tangens': 'goniometrie',
  'trigonometry': 'goniometrie',
  'vectoren': 'vectoren',
  'vector': 'vectoren',
  'lineaire algebra': 'lineaire-algebra',
  'lineaire-algebra': 'lineaire-algebra',
  'matrices': 'matrices',
  'matrix': 'matrices',
  'kansrekening': 'kansrekening',
  'kans': 'kansrekening',
  'statistiek': 'statistiek',
  'gemiddelde': 'statistiek',
  'standaarddeviatie': 'statistiek',
  'normale verdeling': 'normale-verdeling',
  'normale-verdeling': 'normale-verdeling',
  'binomiale verdeling': 'binomiale-verdeling',
  'binomiale-verdeling': 'binomiale-verdeling',
  'hypothesetoetsing': 'hypothesetoetsing',
  'hypothese toetsing': 'hypothesetoetsing',
  't-toets': 't-toets',
  'chi-kwadraat': 'chi-kwadraat',
  'regressie': 'regressie',
  'correlatie': 'correlatie',
  'functies': 'functies',
  'functie': 'functies',
  'lineaire functie': 'lineaire-functie',
  'lineaire-functie': 'lineaire-functie',
  'kwadratische functie': 'kwadratische-functie',
  'kwadratische-functie': 'kwadratische-functie',
  'exponentiële functie': 'exponentiele-functie',
  'exponentiele functie': 'exponentiele-functie',
  'logaritmische functie': 'logaritmische-functie',
  'logaritmische-functie': 'logaritmische-functie',
  'goniometrische functie': 'goniometrische-functie',
  'goniometrische-functie': 'goniometrische-functie',
  'vergelijkingen': 'vergelijkingen',
  'vergelijking': 'vergelijkingen',
  'lineaire vergelijking': 'lineaire-vergelijking',
  'lineaire-vergelijking': 'lineaire-vergelijking',
  'kwadratische vergelijking': 'kwadratische-vergelijking',
  'kwadratische-vergelijking': 'kwadratische-vergelijking',
  'stelsel': 'stelsel-vergelijkingen',
  'stelsel vergelijkingen': 'stelsel-vergelijkingen',
  'stelsel-vergelijkingen': 'stelsel-vergelijkingen',
  'ongelijkheden': 'ongelijkheden',
  'ongelijkheid': 'ongelijkheden',
  'lineaire ongelijkheid': 'lineaire-ongelijkheid',
  'lineaire-ongelijkheid': 'lineaire-ongelijkheid',
  'kwadratische ongelijkheid': 'kwadratische-ongelijkheid',
  'kwadratische-ongelijkheid': 'kwadratische-ongelijkheid',
};

/**
 * Convert string to normalized slug
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Canonicalize subject name
 */
export function canonSubject(input: string): Result<Subject> {
  const slug = slugify(input);
  const canonicalSubject = SUBJECT_MAP[slug] || slug;
  try {
    return Ok(createSubject(canonicalSubject));
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Invalid subject format'));
  }
}

/**
 * Canonicalize level name
 */
export function canonLevel(input: string): Result<Level> {
  const slug = slugify(input);
  const canonicalLevel = LEVEL_MAP[slug] || slug;
  try {
    return Ok(createLevel(canonicalLevel));
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Invalid level format'));
  }
}

/**
 * Canonicalize topic name
 */
export function canonTopic(input: string): Result<Topic> {
  const slug = slugify(input);
  const canonicalTopic = TOPIC_MAP[slug] || slug;
  try {
    return Ok(createTopic(canonicalTopic));
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Invalid topic format'));
  }
}

/**
 * Parse natural language input to extract subject, level, and topic
 * Example: "wispunten 3 HAVO overbreuken" -> { subject: "wiskunde", level: "havo-3", topic: "breuken" }
 */
export function parseNaturalLanguage(input: string): {
  subject?: Subject;
  level?: Level;
  topic?: Topic;
} {
  const words = input.toLowerCase().split(/\s+/);
  const result: { subject?: Subject; level?: Level; topic?: Topic } = {};
  
  // Look for level patterns first (most specific)
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check for level patterns like "3 havo", "havo 4", "vmbo bk 3"
    if (word.match(/^\d+$/)) {
      const nextWord = words[i + 1];
      if (nextWord && ['havo', 'vwo', 'vmbo'].includes(nextWord)) {
        const levelStr = `${word} ${nextWord}`;
        const levelResult = canonLevel(levelStr);
        if (levelResult.success) {
          result.level = levelResult.data;
        }
        words.splice(i, 2); // Remove matched words
        break;
      }
    } else if (['havo', 'vwo', 'vmbo'].includes(word)) {
      const prevWord = words[i - 1];
      if (prevWord && prevWord.match(/^\d+$/)) {
        const levelStr = `${prevWord} ${word}`;
        const levelResult = canonLevel(levelStr);
        if (levelResult.success) {
          result.level = levelResult.data;
        }
        words.splice(i - 1, 2); // Remove matched words
        break;
      }
    }
  }
  
  // Look for subject patterns
  for (const word of words) {
    if (SUBJECT_MAP[word]) {
      const subjectResult = canonSubject(word);
      if (subjectResult.success) {
        result.subject = subjectResult.data;
      }
      break;
    }
  }
  
  // Look for topic patterns
  for (const word of words) {
    if (TOPIC_MAP[word]) {
      const topicResult = canonTopic(word);
      if (topicResult.success) {
        result.topic = topicResult.data;
      }
      break;
    }
  }
  
  return result;
}

/**
 * Generate search tags for a note
 */
export function generateTags(subject: Subject, level: Level, topic: Topic): Array<{ key: string; value: string }> {
  const tags = [];
  
  tags.push({ key: 'subject', value: subject });
  tags.push({ key: 'level', value: level });
  tags.push({ key: 'topic', value: topic });
  
  return tags;
}

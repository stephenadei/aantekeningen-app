/**
 * Comprehensive multi-subject taxonomy for VO (vmbo/havo/vwo) education
 * Supports all major subjects with hierarchical topic groups and topics
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type Level =
  | 'po' | 'vo-vmbo-bb' | 'vo-vmbo-kb' | 'vo-vmbo-gt'
  | 'vo-havo-onderbouw' | 'vo-vwo-onderbouw'
  | 'vo-havo-bovenbouw' | 'vo-vwo-bovenbouw'
  | 'mbo' | 'hbo-propedeuse' | 'hbo-hoofdfase'
  | 'wo-bachelor' | 'wo-master' | 'wo-phd' | 'mixed';

export type Subject =
  | 'rekenen-basis' | 'wiskunde-a' | 'wiskunde-b' | 'wiskunde-c' | 'wiskunde-d'
  | 'economie' | 'natuurkunde' | 'scheikunde' | 'biologie'
  | 'nederlands' | 'engels' | 'informatica';

export type TopicGroup =
  // Wiskunde
  | 'rekenen-getallen' | 'algebra-vergelijkingen' | 'functies-grafieken'
  | 'meetkunde-ruimtelijk' | 'analyse-calculus' | 'kans-statistiek' | 'verdieping-vwo'
  // Economie
  | 'micro' | 'macro' | 'publiek-financien' | 'persoonlijke-financien' | 'internationaal' | 'vaardigheden-modelleren'
  // Natuurkunde
  | 'mechanica' | 'elektriciteit-magnetisme' | 'golf-optica' | 'thermodynamica' | 'moderne-fysica' | 'metingen-vaardigheden'
  // Scheikunde
  | 'materie-structuur' | 'stoichiometrie' | 'reacties' | 'kinetiek-evenwicht' | 'organische-chemie' | 'analyse-vaardigheden'
  // Biologie
  | 'cel-biochemie' | 'genetica-evolutie' | 'fysiologie-mens' | 'ecologie' | 'microbiologie-immuniteit' | 'planten' | 'bio-vaardigheden'
  // Nederlands
  | 'lezen-luisteren' | 'schrijven' | 'taalbeschouwing-grammatica' | 'literatuur' | 'nl-vaardigheden'
  // Engels
  | 'reading-listening' | 'writing' | 'speaking' | 'grammar-vocabulary' | 'literature-culture' | 'exam-skills'
  // Informatica
  | 'programmeren' | 'web-databases' | 'algoritmen' | 'ethiek-veiligheid';

export type Skill = 
  | 'modelleren' | 'redeneren' | 'berekenen' | 'interpreteren' | 'bewijzen' | 'schematiseren'
  | 'experimenteren' | 'rapporteren' | 'presenteren' | 'programmeren' | 'visualiseren';

export type Tool = 
  | 'GeoGebra' | 'Desmos' | 'Excel' | 'Python' | 'R' | 'SPSS' | 'JASP' | 'MATLAB'
  | 'Arduino' | 'LoggerPro' | 'LaTeX' | 'VS Code' | 'Google Sheets' | 'Wolfram Alpha';

export type Assessment = 
  | 'diagnostisch' | 'formatief' | 'summatief' | 'mondeling' | 'practicum'
  | 'PO' | 'handelingsdeel' | 'SE' | 'CE-oefening';

export type Theme = 
  | 'financiën' | 'duurzaamheid' | 'sport' | 'gezondheid' | 'natuur-techniek'
  | 'data-onderzoek' | 'samenleving' | 'bouwen-ruimte' | 'ICT-AI';

// ============================================================================
// SUBJECT TO TOPIC GROUP MAPPINGS
// ============================================================================

export const subjectToGroups: Record<Subject, TopicGroup[]> = {
  'rekenen-basis': ['rekenen-getallen'],
  'wiskunde-a': ['rekenen-getallen', 'algebra-vergelijkingen', 'functies-grafieken', 'kans-statistiek'],
  'wiskunde-b': ['algebra-vergelijkingen', 'functies-grafieken', 'meetkunde-ruimtelijk', 'analyse-calculus'],
  'wiskunde-c': ['rekenen-getallen', 'functies-grafieken', 'kans-statistiek'],
  'wiskunde-d': ['analyse-calculus', 'verdieping-vwo', 'kans-statistiek'],
  'economie': ['micro', 'macro', 'publiek-financien', 'persoonlijke-financien', 'internationaal', 'vaardigheden-modelleren'],
  'natuurkunde': ['mechanica', 'elektriciteit-magnetisme', 'golf-optica', 'thermodynamica', 'moderne-fysica', 'metingen-vaardigheden'],
  'scheikunde': ['materie-structuur', 'stoichiometrie', 'reacties', 'kinetiek-evenwicht', 'organische-chemie', 'analyse-vaardigheden'],
  'biologie': ['cel-biochemie', 'genetica-evolutie', 'fysiologie-mens', 'ecologie', 'microbiologie-immuniteit', 'planten', 'bio-vaardigheden'],
  'nederlands': ['lezen-luisteren', 'schrijven', 'taalbeschouwing-grammatica', 'literatuur', 'nl-vaardigheden'],
  'engels': ['reading-listening', 'writing', 'speaking', 'grammar-vocabulary', 'literature-culture', 'exam-skills'],
  'informatica': ['programmeren', 'web-databases', 'algoritmen', 'ethiek-veiligheid']
};

// ============================================================================
// TOPIC GROUP TO TOPICS MAPPINGS
// ============================================================================

export const groupToTopics: Record<TopicGroup, string[]> = {
  // --- WISKUNDE ---
  'rekenen-getallen': [
    'breuken-optellen', 'breuken-delen', 'breuken-vermenigvuldigen', 'breuken-herleiden',
    'kommagetallen', 'negatieve-getallen', 'balansmethode', 'rekenvolgorde',
    'machten', 'wortels', 'afronden', 'schatten',
    'procenten', 'korting', 'btw', 'rente-enkelvoudig', 'rente-samengesteld',
    'verhoudingen', 'schaal', 'eenheden-omrekenen', 'absolute-waarde'
  ],
  'algebra-vergelijkingen': [
    'formules-opstellen', 'herleiden', 'factoren-ontbinden',
    'lineaire-vergelijking', 'kwadratische-vergelijking', 'ongelijkheden',
    'vergelijking-met-breuken', 'substitutie', 'discriminant', 'nulpunten'
  ],
  'functies-grafieken': [
    'lineair', 'kwadratisch', 'wortel', 'exponentieel', 'logaritmisch', 'machts',
    'transformaties', 'domein-bereik', 'asymptoten', 'compositie', 'inverse', 'aflezen-grafiek'
  ],
  'meetkunde-ruimtelijk': [
    'pythagoras', 'trigonometrie', 'congruentie', 'gelijkenis', 'coordinatenmeetkunde-lijn', 'coordinatenmeetkunde-cirkel',
    'vectoren', 'oppervlakte', 'inhoud', 'prisma', 'cilinder', 'kegel', 'bol', 'schaalfactor'
  ],
  'analyse-calculus': [
    'limieten', 'differentiëren-somregel', 'differentiëren-productregel', 'kettingregel',
    'raaklijn-helling', 'extremum', 'optimaliseren',
    'integreren-onbepaald', 'integreren-bepaald', 'oppervlakte-onder-grafiek',
    'rijen', 'reeksen', 'taylor'
  ],
  'kans-statistiek': [
    'kansmodel', 'boomdiagram', 'productregel', 'voorwaardelijke-kans', 'bayes',
    'combinatoriek', 'binomiaalverdeling', 'normale-verdeling',
    'beschrijvende-statistiek', 'correlatie', 'regressie', 'toetsen', 'betrouwbaarheidsinterval'
  ],
  'verdieping-vwo': [
    'complexe-getallen', 'vectorrekening', 'lineair-programmeren', 'matrices-basis', 'numeriek-rekenen', 'differentialvergelijking-intro'
  ],

  // --- ECONOMIE ---
  'micro': [
    'vraag-en-aanbod', 'elasticiteit-prijs', 'elasticiteit-kruis', 'elasticiteit-inkomen',
    'consumentensurplus', 'producentensurplus', 'marktstructuren', 'prijsvorming', 'speltheorie-basis', 'externe-effecten'
  ],
  'macro': [
    'bbp-bbi', 'conjunctuur', 'inflatie-deflatie', 'werkloosheid', 'betalingsbalans', 'wisselkoers', 'economische-groei'
  ],
  'publiek-financien': [
    'belastingen', 'overheidstekort-schuld', 'inkomensverdeling', 'collectieve-goederen', 'beleid-fiscaal', 'beleid-monetair'
  ],
  'persoonlijke-financien': [
    'begroting', 'sparen', 'beleggen', 'rente', 'risico-verzekeren', 'hypotheek-annuiteit', 'hypotheek-lineair', 'pensioen'
  ],
  'internationaal': [
    'handel', 'comparatief-voordeel', 'globalisering', 'eu-ecb', 'handelsbarrieres'
  ],
  'vaardigheden-modelleren': [
    'grafiek-lezen', 'grafiek-tekenen', 'indexcijfers', 'defleren', 'procentrekenen-reëel-nominaal', 'economisch-redeneren', 'tabellen-interpretatie'
  ],

  // --- NATUURKUNDE ---
  'mechanica': [
    's-v-a-grafieken', 'newton', 'krachtensom', 'wrijvingskracht', 'arbeid', 'energie', 'vermogen', 'impuls', 'botsingen', 'cirkelbeweging', 'gravitatie'
  ],
  'elektriciteit-magnetisme': [
    'stroom-spanning-weerstand', 'ohm', 'vermogen-energie-elektrisch', 'serie-parallel', 'magnetische-velden', 'inductie-basis'
  ],
  'golf-optica': [
    'golven-basis', 'frequentie-golflengte-snelheid', 'interferentie', 'diffractie', 'lenzen', 'spiegels', 'beeldconstructie'
  ],
  'thermodynamica': [
    'temperatuur-warmte', 'soortelijke-warmte', 'faseovergangen', 'gaswetten'
  ],
  'moderne-fysica': [
    'atoommodel', 'radioactiviteit', 'halfwaardetijd', 'fotonen-kwantum-intro'
  ],
  'metingen-vaardigheden': [
    'si-eenheden', 'significante-cijfers', 'meetfout-onzekerheid', 'grafieken-analyse', 'practicum-ontwerp'
  ],

  // --- SCHEIKUNDE ---
  'materie-structuur': [
    'periodiek-systeem', 'atoom-ion-isotoop', 'binding-ion', 'binding-covalent', 'binding-metallisch', 'moleculaire-geometrie'
  ],
  'stoichiometrie': [
    'mol', 'concentratie', 'massabalans', 'reactievergelijking-kloppend-maken', 'gaswet', 'oplossingen'
  ],
  'reacties': [
    'zuur-base', 'ph', 'titratie', 'buffer', 'redox', 'oxidatiegetal', 'elektrochemie', 'neerslag', 'thermochemie'
  ],
  'kinetiek-evenwicht': [
    'reactiesnelheid', 'botsingstheorie', 'katalysator', 'le-chatelier', 'evenwichtsconstante', 'oplosbaarheid'
  ],
  'organische-chemie': [
    'alkanen-alkenen-alkynen', 'alcoholen', 'carbonzuren', 'esters', 'aminen', 'halogeenalkanen',
    'isomerie', 'additie', 'substitutie', 'esterificatie', 'polymerisatie'
  ],
  'analyse-vaardigheden': [
    'titratie-precisie', 'gravimetrie', 'chromatografie', 'uv-vis-ir-basis', 'labveiligheid'
  ],

  // --- BIOLOGIE ---
  'cel-biochemie': [
    'celkern-organellen', 'membraan-transport', 'dna-rna', 'eiwitsynthese', 'enzymen', 'stofwisseling'
  ],
  'genetica-evolutie': [
    'monohybride', 'dihybride', 'stamboom', 'mutaties', 'evolutie', 'natuurlijke-selectie', 'soortvorming'
  ],
  'fysiologie-mens': [
    'bloedsomloop', 'ademhaling', 'spijsvertering', 'uitscheiding', 'zenuwstelsel', 'hormonen', 'homeostase'
  ],
  'ecologie': [
    'ecosystemen', 'voedselwebben', 'populatiedynamiek', 'kringlopen', 'abiotisch-biotisch', 'biodiversiteit'
  ],
  'microbiologie-immuniteit': [
    'pathogenen', 'aangeboren-immuniteit', 'adaptieve-immuniteit', 'vaccinatie', 'antibiotica-resistentie'
  ],
  'planten': [
    'fotosynthese', 'transport-planten', 'groei-regulatie'
  ],
  'bio-vaardigheden': [
    'proeven-ontwerp', 'waarnemen-rapporteren', 'grafieken-bio', 'statistiek-basis', 'betrouwbaarheid-validiteit'
  ],

  // --- NEDERLANDS ---
  'lezen-luisteren': [
    'tekststructuur', 'hoofdzaken-bijzaken', 'samenvatten', 'betoog-beschouwing-beschrijving', 'argumentatie', 'drogredenen', 'kritisch-lezen'
  ],
  'schrijven': [
    'alineastructuur', 'opbouw-tekst', 'betoog', 'verslag-rapport', 'zakelijke-correspondentie', 'stijl-register', 'spelling', 'werkwoordspelling', 'interpunctie'
  ],
  'taalbeschouwing-grammatica': [
    'woordsoorten', 'zinsontleding', 'congruentie', 'zinsbouw-fouten', 'stijlmiddelen'
  ],
  'literatuur': [
    'tijdvakken', 'poëzie', 'proza', 'drama', 'analyse', 'interpretatie', 'leesdossier'
  ],
  'nl-vaardigheden': [
    'presenteren', 'debatteren', 'bronvermelding', 'onderzoek', 'argumentatie'
  ],

  // --- ENGELS ---
  'reading-listening': [
    'skimming', 'scanning', 'inference', 'argument-structures', 'exam-strategies'
  ],
  'writing': [
    'essay-types', 'paragraphing', 'cohesion', 'register', 'grammar-in-writing'
  ],
  'speaking': [
    'pronunciation', 'intonation', 'presentations', 'discussion', 'debate'
  ],
  'grammar-vocabulary': [
    'tenses', 'conditionals', 'modals', 'passive', 'indirect-speech', 'articles', 'prepositions', 'phrasal-verbs', 'collocations'
  ],
  'literature-culture': [
    'literary-devices', 'analysis', 'themes', 'context'
  ],
  'exam-skills': [
    'summaries', 'cefr-practice', 'error-correction'
  ],

  // --- INFORMATICA ---
  'programmeren': [
    'python', 'javascript', 'variabelen', 'condities', 'lussen', 'functies', 'oop-basis', 'recursie'
  ],
  'web-databases': [
    'html', 'css', 'rest-api', 'sql-basis', 'json'
  ],
  'algoritmen': [
    'sorteren', 'zoeken', 'complexiteit', 'datastructuren'
  ],
  'ethiek-veiligheid': [
    'privacy', 'bias-ai', 'beveiligingsprincipes'
  ]
};

// ============================================================================
// ADDITIONAL TAXONOMY DATA
// ============================================================================

export const skills: Skill[] = [
  'modelleren', 'redeneren', 'berekenen', 'interpreteren', 'bewijzen', 'schematiseren',
  'experimenteren', 'rapporteren', 'presenteren', 'programmeren', 'visualiseren'
];

export const tools: Tool[] = [
  'GeoGebra', 'Desmos', 'Excel', 'Python', 'R', 'SPSS', 'JASP', 'MATLAB',
  'Arduino', 'LoggerPro', 'LaTeX', 'VS Code', 'Google Sheets', 'Wolfram Alpha'
];

export const assessments: Assessment[] = [
  'diagnostisch', 'formatief', 'summatief', 'mondeling', 'practicum',
  'PO', 'handelingsdeel', 'SE', 'CE-oefening'
];

export const themes: Theme[] = [
  'financiën', 'duurzaamheid', 'sport', 'gezondheid', 'natuur-techniek',
  'data-onderzoek', 'samenleving', 'bouwen-ruimte', 'ICT-AI'
];

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function isValidSubject(subject: string): subject is Subject {
  return Object.keys(subjectToGroups).includes(subject);
}

export function isValidTopicGroup(topicGroup: string): topicGroup is TopicGroup {
  return Object.keys(groupToTopics).includes(topicGroup);
}

export function isValidLevel(level: string): level is Level {
  const validLevels: Level[] = [
    'po', 'vo-vmbo-bb', 'vo-vmbo-kb', 'vo-vmbo-gt',
    'vo-havo-onderbouw', 'vo-vwo-onderbouw',
    'vo-havo-bovenbouw', 'vo-vwo-bovenbouw',
    'mbo', 'hbo-propedeuse', 'hbo-hoofdfase',
    'wo-bachelor', 'wo-master', 'wo-phd', 'mixed'
  ];
  return validLevels.includes(level as Level);
}

export function getTopicGroupsForSubject(subject: Subject): TopicGroup[] {
  return subjectToGroups[subject] || [];
}

export function getTopicsForGroup(topicGroup: TopicGroup): string[] {
  return groupToTopics[topicGroup] || [];
}

export function validateTaxonomy(subject: string, topicGroup?: string, topic?: string): boolean {
  if (!isValidSubject(subject)) return false;
  
  if (topicGroup) {
    if (!isValidTopicGroup(topicGroup)) return false;
    const validGroups = getTopicGroupsForSubject(subject);
    if (!validGroups.includes(topicGroup as TopicGroup)) return false;
    
    if (topic) {
      const validTopics = getTopicsForGroup(topicGroup as TopicGroup);
      if (!validTopics.includes(topic)) return false;
    }
  }
  
  return true;
}

export function getSubjectDisplayName(subject: Subject): string {
  const displayNames: Record<Subject, string> = {
    'rekenen-basis': 'Rekenen (Basis)',
    'wiskunde-a': 'Wiskunde A',
    'wiskunde-b': 'Wiskunde B',
    'wiskunde-c': 'Wiskunde C',
    'wiskunde-d': 'Wiskunde D',
    'economie': 'Economie',
    'natuurkunde': 'Natuurkunde',
    'scheikunde': 'Scheikunde',
    'biologie': 'Biologie',
    'nederlands': 'Nederlands',
    'engels': 'Engels',
    'informatica': 'Informatica'
  };
  return displayNames[subject] || subject;
}

export function getSubjectDisplayNameFromString(subject: string): string {
  const displayNames: Record<string, string> = {
    'rekenen-basis': 'Rekenen (Basis)',
    'wiskunde-a': 'Wiskunde A',
    'wiskunde-b': 'Wiskunde B',
    'wiskunde-c': 'Wiskunde C',
    'wiskunde-d': 'Wiskunde D',
    'economie': 'Economie',
    'natuurkunde': 'Natuurkunde',
    'scheikunde': 'Scheikunde',
    'biologie': 'Biologie',
    'nederlands': 'Nederlands',
    'engels': 'Engels',
    'informatica': 'Informatica'
  };
  return displayNames[subject] || subject;
}

export function getTopicGroupDisplayName(topicGroup: TopicGroup): string {
  const displayNames: Record<TopicGroup, string> = {
    // Wiskunde
    'rekenen-getallen': 'Rekenen & Getallen',
    'algebra-vergelijkingen': 'Algebra & Vergelijkingen',
    'functies-grafieken': 'Functies & Grafieken',
    'meetkunde-ruimtelijk': 'Meetkunde & Ruimtelijk',
    'analyse-calculus': 'Analyse & Calculus',
    'kans-statistiek': 'Kans & Statistiek',
    'verdieping-vwo': 'Verdieping VWO',
    
    // Economie
    'micro': 'Micro-economie',
    'macro': 'Macro-economie',
    'publiek-financien': 'Publieke Financiën',
    'persoonlijke-financien': 'Persoonlijke Financiën',
    'internationaal': 'Internationale Economie',
    'vaardigheden-modelleren': 'Vaardigheden & Modelleren',
    
    // Natuurkunde
    'mechanica': 'Mechanica',
    'elektriciteit-magnetisme': 'Elektriciteit & Magnetisme',
    'golf-optica': 'Golven & Optica',
    'thermodynamica': 'Thermodynamica',
    'moderne-fysica': 'Moderne Fysica',
    'metingen-vaardigheden': 'Metingen & Vaardigheden',
    
    // Scheikunde
    'materie-structuur': 'Materie & Structuur',
    'stoichiometrie': 'Stoichiometrie',
    'reacties': 'Reacties',
    'kinetiek-evenwicht': 'Kinetiek & Evenwicht',
    'organische-chemie': 'Organische Chemie',
    'analyse-vaardigheden': 'Analyse & Vaardigheden',
    
    // Biologie
    'cel-biochemie': 'Cel & Biochemie',
    'genetica-evolutie': 'Genetica & Evolutie',
    'fysiologie-mens': 'Fysiologie Mens',
    'ecologie': 'Ecologie',
    'microbiologie-immuniteit': 'Microbiologie & Immuniteit',
    'planten': 'Planten',
    'bio-vaardigheden': 'Biologie Vaardigheden',
    
    // Nederlands
    'lezen-luisteren': 'Lezen & Luisteren',
    'schrijven': 'Schrijven',
    'taalbeschouwing-grammatica': 'Taalbeschouwing & Grammatica',
    'literatuur': 'Literatuur',
    'nl-vaardigheden': 'Nederlandse Vaardigheden',
    
    // Engels
    'reading-listening': 'Reading & Listening',
    'writing': 'Writing',
    'speaking': 'Speaking',
    'grammar-vocabulary': 'Grammar & Vocabulary',
    'literature-culture': 'Literature & Culture',
    'exam-skills': 'Exam Skills',
    
    // Informatica
    'programmeren': 'Programmeren',
    'web-databases': 'Web & Databases',
    'algoritmen': 'Algoritmen',
    'ethiek-veiligheid': 'Ethiek & Veiligheid'
  };
  return displayNames[topicGroup] || topicGroup;
}

export function getTopicGroupDisplayNameFromString(topicGroup: string): string {
  const displayNames: Record<string, string> = {
    // Wiskunde
    'rekenen-getallen': 'Rekenen & Getallen',
    'algebra-vergelijkingen': 'Algebra & Vergelijkingen',
    'functies-grafieken': 'Functies & Grafieken',
    'meetkunde-ruimtelijk': 'Meetkunde & Ruimtelijk',
    'analyse-calculus': 'Analyse & Calculus',
    'kans-statistiek': 'Kans & Statistiek',
    'verdieping-vwo': 'Verdieping VWO',
    
    // Economie
    'micro': 'Micro-economie',
    'macro': 'Macro-economie',
    'publiek-financien': 'Publieke Financiën',
    'persoonlijke-financien': 'Persoonlijke Financiën',
    'internationaal': 'Internationale Economie',
    'vaardigheden-modelleren': 'Vaardigheden & Modelleren',
    
    // Natuurkunde
    'mechanica': 'Mechanica',
    'elektriciteit-magnetisme': 'Elektriciteit & Magnetisme',
    'golf-optica': 'Golven & Optica',
    'thermodynamica': 'Thermodynamica',
    'moderne-fysica': 'Moderne Fysica',
    'metingen-vaardigheden': 'Metingen & Vaardigheden',
    
    // Scheikunde
    'materie-structuur': 'Materie & Structuur',
    'stoichiometrie': 'Stoichiometrie',
    'reacties': 'Reacties',
    'kinetiek-evenwicht': 'Kinetiek & Evenwicht',
    'organische-chemie': 'Organische Chemie',
    'analyse-vaardigheden': 'Analyse & Vaardigheden',
    
    // Biologie
    'cel-biochemie': 'Cel & Biochemie',
    'genetica-evolutie': 'Genetica & Evolutie',
    'fysiologie-mens': 'Fysiologie Mens',
    'ecologie': 'Ecologie',
    'microbiologie-immuniteit': 'Microbiologie & Immuniteit',
    'planten': 'Planten',
    'bio-vaardigheden': 'Biologie Vaardigheden',
    
    // Nederlands
    'lezen-luisteren': 'Lezen & Luisteren',
    'schrijven': 'Schrijven',
    'taalbeschouwing-grammatica': 'Taalbeschouwing & Grammatica',
    'literatuur': 'Literatuur',
    'nl-vaardigheden': 'Nederlandse Vaardigheden',
    
    // Engels
    'reading-listening': 'Reading & Listening',
    'writing': 'Writing',
    'speaking': 'Speaking',
    'grammar-vocabulary': 'Grammar & Vocabulary',
    'literature-culture': 'Literature & Culture',
    'exam-skills': 'Exam Skills',
    
    // Informatica
    'programmeren': 'Programmeren',
    'web-databases': 'Web & Databases',
    'algoritmen': 'Algoritmen',
    'ethiek-veiligheid': 'Ethiek & Veiligheid'
  };
  return displayNames[topicGroup] || topicGroup;
}

// ============================================================================
// SYNONYM MAPPINGS
// ============================================================================

export const subjectSynonyms: Record<string, Subject> = {
  // Wiskunde variants
  'wiskunde': 'wiskunde-a',
  'wiskunde a': 'wiskunde-a',
  'wiskunde-a': 'wiskunde-a',
  'wiskunde b': 'wiskunde-b',
  'wiskunde-b': 'wiskunde-b',
  'wiskunde c': 'wiskunde-c',
  'wiskunde-c': 'wiskunde-c',
  'wiskunde d': 'wiskunde-d',
  'wiskunde-d': 'wiskunde-d',
  'rekenen': 'rekenen-basis',
  'rekenen-basis': 'rekenen-basis',
  
  // Other subjects
  'economie': 'economie',
  'natuurkunde': 'natuurkunde',
  'scheikunde': 'scheikunde',
  'biologie': 'biologie',
  'nederlands': 'nederlands',
  'engels': 'engels',
  'informatica': 'informatica',
  'ict': 'informatica',
  'computer science': 'informatica'
};

export const topicGroupSynonyms: Record<string, TopicGroup> = {
  // Wiskunde
  'rekenen': 'rekenen-getallen',
  'getallen': 'rekenen-getallen',
  'algebra': 'algebra-vergelijkingen',
  'vergelijkingen': 'algebra-vergelijkingen',
  'functies': 'functies-grafieken',
  'grafieken': 'functies-grafieken',
  'meetkunde': 'meetkunde-ruimtelijk',
  'ruimtelijk': 'meetkunde-ruimtelijk',
  'calculus': 'analyse-calculus',
  'analyse-calc': 'analyse-calculus',
  'kans': 'kans-statistiek',
  'statistiek': 'kans-statistiek',
  
  // Economie
  'micro': 'micro',
  'macro': 'macro',
  'publiek': 'publiek-financien',
  'persoonlijk': 'persoonlijke-financien',
  'internationaal': 'internationaal',
  'modelleren': 'vaardigheden-modelleren',
  
  // Natuurkunde
  'mechanica': 'mechanica',
  'elektriciteit': 'elektriciteit-magnetisme',
  'magnetisme': 'elektriciteit-magnetisme',
  'golven': 'golf-optica',
  'optica': 'golf-optica',
  'thermodynamica': 'thermodynamica',
  'modern': 'moderne-fysica',
  'metingen': 'metingen-vaardigheden',
  
  // Scheikunde
  'materie': 'materie-structuur',
  'structuur': 'materie-structuur',
  'stoichiometrie': 'stoichiometrie',
  'reacties': 'reacties',
  'kinetiek': 'kinetiek-evenwicht',
  'evenwicht': 'kinetiek-evenwicht',
  'organisch': 'organische-chemie',
  'analyse-vaard': 'analyse-vaardigheden',
  
  // Biologie
  'cel': 'cel-biochemie',
  'biochemie': 'cel-biochemie',
  'genetica': 'genetica-evolutie',
  'evolutie': 'genetica-evolutie',
  'fysiologie': 'fysiologie-mens',
  'mens': 'fysiologie-mens',
  'ecologie': 'ecologie',
  'microbiologie': 'microbiologie-immuniteit',
  'immuniteit': 'microbiologie-immuniteit',
  'planten': 'planten',
  
  // Nederlands
  'lezen': 'lezen-luisteren',
  'luisteren': 'lezen-luisteren',
  'schrijven': 'schrijven',
  'grammatica': 'taalbeschouwing-grammatica',
  'taalbeschouwing': 'taalbeschouwing-grammatica',
  'literatuur': 'literatuur',
  
  // Engels
  'reading': 'reading-listening',
  'listening': 'reading-listening',
  'writing': 'writing',
  'speaking': 'speaking',
  'grammar': 'grammar-vocabulary',
  'vocabulary': 'grammar-vocabulary',
  'literature': 'literature-culture',
  'culture': 'literature-culture',
  'exam': 'exam-skills',
  
  // Informatica
  'programmeren': 'programmeren',
  'web': 'web-databases',
  'databases': 'web-databases',
  'algoritmen': 'algoritmen',
  'ethiek': 'ethiek-veiligheid',
  'veiligheid': 'ethiek-veiligheid'
};

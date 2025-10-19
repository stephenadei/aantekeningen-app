#!/usr/bin/env node

/**
 * Seed Subjects and Topics
 * 
 * This script initializes the subjects and topics collections in Firestore
 * based on the educational services offered.
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

config({ path: '.env.local' });

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'stephen-s-aantekeningen',
  credential: applicationDefault(),
};

const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
const db = getFirestore(app);

const subjects = [
  {
    id: 'primair-onderwijs',
    name: 'Primair Onderwijs',
    description: 'Onderwijsmateriaal voor de basisschool',
    color: '#3B82F6',
    icon: 'BookOpen',
    sortOrder: 1,
    topics: ['Rekenen', 'Taal', 'Engels', 'Wereldoriëntatie']
  },
  {
    id: 'voortgezet-onderwijs',
    name: 'Voortgezet Onderwijs',
    description: 'Onderwijsmateriaal voor het voortgezet onderwijs',
    color: '#8B5CF6',
    icon: 'BookMarked',
    sortOrder: 2,
    topics: [
      'Wiskunde A',
      'Wiskunde B',
      'Wiskunde C',
      'Wiskunde D',
      'Natuurkunde',
      'Scheikunde',
      'Biologie',
      'Engels',
      'Nederlands',
      'Aardrijkskunde',
      'Geschiedenis'
    ]
  },
  {
    id: 'hoger-onderwijs',
    name: 'Hoger Onderwijs/Programmeren',
    description: 'Materiaal voor hogere educatie en programmeertrainingen',
    color: '#EC4899',
    icon: 'Code',
    sortOrder: 3,
    topics: [
      'Bedrijfsstatistiek',
      'Calculus',
      'Economie',
      'Statistiek',
      'Kansberekening',
      'Lineaire Algebra',
      'Verzamelingenleer',
      'C',
      'C#',
      'C++',
      'Java',
      'Python',
      'JavaScript',
      'HTML',
      'CSS',
      'React',
      'SQL',
      'MATLAB',
      'R',
      'SPSS'
    ]
  },
  {
    id: 'examentraining',
    name: 'Examentraining',
    description: 'Gespecialiseerde voorbereiding op examens',
    color: '#F59E0B',
    icon: 'Target',
    sortOrder: 4,
    topics: [
      'Wiskunde A',
      'Wiskunde B',
      'Wiskunde C',
      'Wiskunde D',
      'Examenbundel',
      'Oefentoetsen'
    ]
  },
  {
    id: 'groepslessen',
    name: 'Groepslessen',
    description: 'Materiaal voor groepsonderwijs',
    color: '#10B981',
    icon: 'Users',
    sortOrder: 5,
    topics: [
      'Wiskunde A',
      'Wiskunde B',
      'Wiskunde C',
      'Programmeren',
      'Natuurkunde',
      'Scheikunde'
    ]
  }
];

async function seedSubjects() {
  try {
    console.log('🌱 Seeding subjects and topics...');

    for (const subjectData of subjects) {
      const { topics, ...subjectDoc } = subjectData;
      const subjectRef = db.collection('subjects').doc(subjectData.id);

      // Create subject document
      await subjectRef.set(subjectDoc);
      console.log(`✅ Created subject: ${subjectData.name}`);

      // Create topics subcollection
      if (topics && Array.isArray(topics)) {
        const batch = db.batch();
        topics.forEach((topicName, index) => {
          const topicRef = subjectRef.collection('topics').doc();
          batch.set(topicRef, {
            name: topicName,
            description: `Topic in ${subjectData.name}`,
            sortOrder: index + 1,
            createdAt: new Date()
          });
        });
        await batch.commit();
        console.log(`   📚 Added ${topics.length} topics`);
      }
    }

    console.log('\n🎉 Subjects and topics seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding subjects:', error);
    process.exit(1);
  }
}

seedSubjects();

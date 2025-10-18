import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Firebase Admin
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  // Use Application Default Credentials if available, otherwise use explicit config
  ...(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY ? {
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  } : {}),
};

const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
const db = getFirestore(app);

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection and data...');

    // Test students
    const studentsSnapshot = await db.collection('students').get();
    const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`\n👥 Found ${students.length} students:`);
    students.forEach((student, index) => {
      console.log(`${index + 1}. ${student.displayName}`);
    });

    // Test notes
    const notesSnapshot = await db.collection('notes').get();
    const notes = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`\n📝 Found ${notes.length} notes:`);
    notes.forEach((note, index) => {
      console.log(`${index + 1}. ${note.subject} - ${note.topic}`);
    });

    // Test key concepts
    const conceptsSnapshot = await db.collection('keyConcepts').get();
    const concepts = conceptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`\n🔑 Found ${concepts.length} key concepts:`);
    concepts.forEach((concept, index) => {
      console.log(`${index + 1}. ${concept.term}: ${concept.explanation}`);
    });

    // Test teachers
    const teachersSnapshot = await db.collection('teachers').get();
    const teachers = teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`\n👨‍🏫 Found ${teachers.length} teachers:`);
    teachers.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.name} (${teacher.email})`);
    });

    // Test student tags
    const tagsSnapshot = await db.collection('studentTags').get();
    const tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`\n🏷️ Found ${tags.length} student tags:`);
    tags.forEach((tag, index) => {
      console.log(`${index + 1}. ${tag.key}: ${tag.value}`);
    });

    console.log('\n✅ Database test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing database:', error);
  } finally {
    // Firebase doesn't need explicit disconnection
    console.log('✅ Database test completed');
  }
}

// Run the script
testDatabase();

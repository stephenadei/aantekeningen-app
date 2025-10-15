import { PrismaClient } from '@prisma/client';
// For now, we'll create sample data since Google Drive integration needs proper setup
// import { GoogleDriveService } from '../src/lib/google-drive-simple.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Simple PIN hashing function
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

async function initializeFromDrive() {
  try {
    console.log('🚀 Starting database initialization...');
    console.log('📝 Creating sample data for testing...');
    
    // For now, create sample data since Google Drive integration needs proper OAuth setup
    await createSampleData();
    
  } catch (error) {
    console.error('❌ Error during initialization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createSampleData() {
  console.log('📝 Creating sample data...');
  
  const sampleStudents = [
    { name: 'Jan de Vries', subject: 'Middelbareschool' },
    { name: 'Lisa van der Berg', subject: 'HBO/Universiteit' },
    { name: 'Ahmed Hassan', subject: 'MBO' },
    { name: 'Emma Jansen', subject: 'Middelbareschool' },
    { name: 'Tom Bakker', subject: 'HBO/Universiteit' }
  ];
  
  const sampleNotes = [
    { subject: 'Wiskunde', level: 'Havo 4', topic: 'Breuken' },
    { subject: 'Nederlands', level: 'Havo 5', topic: 'Literatuur' },
    { subject: 'Engels', level: 'Vwo 4', topic: 'Grammatica' },
    { subject: 'Geschiedenis', level: 'Havo 4', topic: 'Tweede Wereldoorlog' },
    { subject: 'Biologie', level: 'Vwo 5', topic: 'Genetica' }
  ];
  
  let studentsCreated = 0;
  let notesCreated = 0;
  
  for (const studentData of sampleStudents) {
    const student = await prisma.student.create({
      data: {
        displayName: studentData.name,
        pinHash: hashPin('1234'),
        subject: studentData.subject,
        folderConfirmed: true,
        folderLinkedAt: new Date(),
        folderConfirmedAt: new Date()
      }
    });
    
    studentsCreated++;
    console.log(`  ✅ Created sample student: ${student.displayName}`);
    
    // Create 2-3 sample notes per student
    const numNotes = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < numNotes; i++) {
      const noteData = sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
      
      await prisma.note.create({
        data: {
          studentId: student.id,
          contentMd: `# ${noteData.topic}\n\n## Inhoud\n\nDit is een voorbeeld notitie voor ${noteData.topic} op ${noteData.level} niveau.\n\n### Belangrijke punten:\n- Punt 1\n- Punt 2\n- Punt 3\n\n*Deze notitie is automatisch gegenereerd voor testdoeleinden.*`,
          subject: noteData.subject,
          level: noteData.level,
          topic: noteData.topic,
          aiGenerated: false,
          aiConfirmed: false,
          manuallyEdited: false
        }
      });
      
      notesCreated++;
    }
  }
  
  console.log(`\n🎉 Sample data created!`);
  console.log(`   Students created: ${studentsCreated}`);
  console.log(`   Notes created: ${notesCreated}`);
}

// Run the initialization
initializeFromDrive()
  .then(() => {
    console.log('✅ Database initialization completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection and data...');

    // Test students
    const students = await prisma.student.findMany({
      include: {
        _count: {
          select: {
            notes: true,
          },
        },
      },
    });

    console.log(`\n👥 Found ${students.length} students:`);
    students.forEach((student, index) => {
      console.log(`${index + 1}. ${student.displayName} (${student._count.notes} notes)`);
    });

    // Test notes
    const notes = await prisma.note.findMany({
      include: {
        student: {
          select: {
            displayName: true,
          },
        },
      },
    });

    console.log(`\n📝 Found ${notes.length} notes:`);
    notes.forEach((note, index) => {
      console.log(`${index + 1}. ${note.subject} - ${note.topic} (${note.student.displayName})`);
    });

    // Test key concepts
    const concepts = await prisma.keyConcept.findMany();
    console.log(`\n🔑 Found ${concepts.length} key concepts:`);
    concepts.forEach((concept, index) => {
      console.log(`${index + 1}. ${concept.term}: ${concept.explanation}`);
    });

    // Test teachers
    const teachers = await prisma.teacher.findMany();
    console.log(`\n👨‍🏫 Found ${teachers.length} teachers:`);
    teachers.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.name} (${teacher.email})`);
    });

    // Test users
    const users = await prisma.user.findMany();
    console.log(`\n👤 Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
    });

    console.log('\n✅ Database test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
testDatabase();

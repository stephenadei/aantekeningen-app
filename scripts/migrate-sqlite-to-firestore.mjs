#!/usr/bin/env node

/**
 * Migration script to move data from SQLite (Prisma) to Firestore
 * 
 * This script:
 * 1. Reads all data from SQLite via Prisma
 * 2. Transforms data to Firestore format
 * 3. Writes to Firestore in batches
 * 4. Validates the migration
 */

import { PrismaClient } from '@prisma/client';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Prisma (for reading existing data)
const prisma = new PrismaClient();

// Initialize Firebase Admin
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

const app = initializeApp(firebaseAdminConfig);
const db = getFirestore(app);

// Helper function to convert Date to Timestamp
const toTimestamp = (date) => {
  return Timestamp.fromDate(new Date(date));
};

// Helper function to convert Date to Timestamp or null
const toTimestampOrNull = (date) => {
  return date ? Timestamp.fromDate(new Date(date)) : null;
};

// Migration functions
async function migrateTeachers() {
  console.log('📚 Migrating teachers...');
  
  const teachers = await prisma.teacher.findMany();
  console.log(`Found ${teachers.length} teachers to migrate`);
  
  const batch = db.batch();
  let count = 0;
  
  for (const teacher of teachers) {
    const docRef = db.collection('teachers').doc(teacher.id);
    batch.set(docRef, {
      email: teacher.email,
      name: teacher.name,
      role: teacher.role,
      otpSecret: teacher.otpSecret,
      createdAt: toTimestamp(teacher.createdAt),
      updatedAt: toTimestamp(teacher.updatedAt),
    });
    count++;
    
    // Commit batch every 500 documents
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Migrated ${count} teachers...`);
    }
  }
  
  // Commit remaining documents
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Migrated ${count} teachers`);
  return count;
}

async function migrateStudents() {
  console.log('👥 Migrating students...');
  
  const students = await prisma.student.findMany();
  console.log(`Found ${students.length} students to migrate`);
  
  const batch = db.batch();
  let count = 0;
  
  for (const student of students) {
    const docRef = db.collection('students').doc(student.id);
    batch.set(docRef, {
      displayName: student.displayName,
      pinHash: student.pinHash,
      pinUpdatedAt: toTimestamp(student.pinUpdatedAt),
      driveFolderId: student.driveFolderId,
      driveFolderName: student.driveFolderName,
      subject: student.subject,
      folderConfirmed: student.folderConfirmed,
      folderLinkedAt: toTimestampOrNull(student.folderLinkedAt),
      folderConfirmedAt: toTimestampOrNull(student.folderConfirmedAt),
      createdAt: toTimestamp(student.createdAt),
      updatedAt: toTimestamp(student.updatedAt),
    });
    count++;
    
    // Commit batch every 500 documents
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Migrated ${count} students...`);
    }
  }
  
  // Commit remaining documents
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Migrated ${count} students`);
  return count;
}

async function migrateNotes() {
  console.log('📝 Migrating notes...');
  
  const notes = await prisma.note.findMany();
  console.log(`Found ${notes.length} notes to migrate`);
  
  const batch = db.batch();
  let count = 0;
  
  for (const note of notes) {
    const docRef = db.collection('notes').doc(note.id);
    batch.set(docRef, {
      studentId: note.studentId,
      contentMd: note.contentMd,
      subject: note.subject,
      level: note.level,
      topic: note.topic,
      driveFileId: note.driveFileId,
      driveFileName: note.driveFileName,
      aiGenerated: note.aiGenerated,
      aiConfirmed: note.aiConfirmed,
      manuallyEdited: note.manuallyEdited,
      createdAt: toTimestamp(note.createdAt),
      updatedAt: toTimestamp(note.updatedAt),
    });
    count++;
    
    // Commit batch every 500 documents
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Migrated ${count} notes...`);
    }
  }
  
  // Commit remaining documents
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Migrated ${count} notes`);
  return count;
}

async function migrateKeyConcepts() {
  console.log('🔑 Migrating key concepts...');
  
  const concepts = await prisma.keyConcept.findMany();
  console.log(`Found ${concepts.length} key concepts to migrate`);
  
  const batch = db.batch();
  let count = 0;
  
  for (const concept of concepts) {
    const docRef = db.collection('keyConcepts').doc(concept.id);
    batch.set(docRef, {
      driveFileId: concept.driveFileId,
      term: concept.term,
      explanation: concept.explanation,
      example: concept.example,
      orderIndex: concept.orderIndex,
      isAiGenerated: concept.isAiGenerated,
      createdAt: toTimestamp(concept.createdAt),
      updatedAt: toTimestamp(concept.updatedAt),
    });
    count++;
    
    // Commit batch every 500 documents
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Migrated ${count} key concepts...`);
    }
  }
  
  // Commit remaining documents
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Migrated ${count} key concepts`);
  return count;
}

async function migrateStudentTags() {
  console.log('🏷️ Migrating student tags...');
  
  const tags = await prisma.studentTag.findMany();
  console.log(`Found ${tags.length} student tags to migrate`);
  
  const batch = db.batch();
  let count = 0;
  
  for (const tag of tags) {
    const docRef = db.collection('studentTags').doc(tag.id);
    batch.set(docRef, {
      studentId: tag.studentId,
      key: tag.key,
      value: tag.value,
    });
    count++;
    
    // Commit batch every 500 documents
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Migrated ${count} student tags...`);
    }
  }
  
  // Commit remaining documents
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Migrated ${count} student tags`);
  return count;
}

async function migrateUnlinkedFolders() {
  console.log('📁 Migrating unlinked folders...');
  
  const folders = await prisma.unlinkedFolder.findMany();
  console.log(`Found ${folders.length} unlinked folders to migrate`);
  
  const batch = db.batch();
  let count = 0;
  
  for (const folder of folders) {
    const docRef = db.collection('unlinkedFolders').doc(folder.id);
    batch.set(docRef, {
      driveFolderId: folder.driveFolderId,
      folderName: folder.folderName,
      subject: folder.subject,
      suggestedStudentId: folder.suggestedStudentId,
      createdAt: toTimestamp(folder.createdAt),
    });
    count++;
    
    // Commit batch every 500 documents
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Migrated ${count} unlinked folders...`);
    }
  }
  
  // Commit remaining documents
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Migrated ${count} unlinked folders`);
  return count;
}

async function migrateLoginAudits() {
  console.log('📊 Migrating login audits...');
  
  const audits = await prisma.loginAudit.findMany();
  console.log(`Found ${audits.length} login audits to migrate`);
  
  const batch = db.batch();
  let count = 0;
  
  for (const audit of audits) {
    const docRef = db.collection('loginAudits').doc(audit.id);
    batch.set(docRef, {
      who: audit.who,
      action: audit.action,
      ip: audit.ip,
      userAgent: audit.userAgent,
      metadata: audit.metadata,
      teacherId: audit.teacherId,
      studentId: audit.studentId,
      createdAt: toTimestamp(audit.createdAt),
    });
    count++;
    
    // Commit batch every 500 documents
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Migrated ${count} login audits...`);
    }
  }
  
  // Commit remaining documents
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Migrated ${count} login audits`);
  return count;
}

// Validation functions
async function validateMigration() {
  console.log('\n🔍 Validating migration...');
  
  const sqliteCounts = {
    teachers: await prisma.teacher.count(),
    students: await prisma.student.count(),
    notes: await prisma.note.count(),
    keyConcepts: await prisma.keyConcept.count(),
    studentTags: await prisma.studentTag.count(),
    unlinkedFolders: await prisma.unlinkedFolder.count(),
    loginAudits: await prisma.loginAudit.count(),
  };
  
  const firestoreCounts = {
    teachers: (await db.collection('teachers').get()).size,
    students: (await db.collection('students').get()).size,
    notes: (await db.collection('notes').get()).size,
    keyConcepts: (await db.collection('keyConcepts').get()).size,
    studentTags: (await db.collection('studentTags').get()).size,
    unlinkedFolders: (await db.collection('unlinkedFolders').get()).size,
    loginAudits: (await db.collection('loginAudits').get()).size,
  };
  
  console.log('\n📊 Migration validation results:');
  console.log('Collection'.padEnd(20) + 'SQLite'.padEnd(10) + 'Firestore'.padEnd(10) + 'Status');
  console.log('-'.repeat(50));
  
  let allValid = true;
  for (const [collection, sqliteCount] of Object.entries(sqliteCounts)) {
    const firestoreCount = firestoreCounts[collection];
    const status = sqliteCount === firestoreCount ? '✅' : '❌';
    if (sqliteCount !== firestoreCount) allValid = false;
    
    console.log(
      collection.padEnd(20) + 
      sqliteCount.toString().padEnd(10) + 
      firestoreCount.toString().padEnd(10) + 
      status
    );
  }
  
  if (allValid) {
    console.log('\n🎉 Migration validation successful! All counts match.');
  } else {
    console.log('\n⚠️ Migration validation failed! Some counts do not match.');
  }
  
  return allValid;
}

// Main migration function
async function runMigration() {
  console.log('🚀 Starting SQLite to Firestore migration...\n');
  
  try {
    // Check environment variables
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL', 
      'FIREBASE_PRIVATE_KEY'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    console.log('✅ Environment variables validated');
    
    // Run migrations in order
    const results = {
      teachers: await migrateTeachers(),
      students: await migrateStudents(),
      notes: await migrateNotes(),
      keyConcepts: await migrateKeyConcepts(),
      studentTags: await migrateStudentTags(),
      unlinkedFolders: await migrateUnlinkedFolders(),
      loginAudits: await migrateLoginAudits(),
    };
    
    // Validate migration
    const isValid = await validateMigration();
    
    console.log('\n📈 Migration Summary:');
    console.log('Collection'.padEnd(20) + 'Migrated');
    console.log('-'.repeat(30));
    for (const [collection, count] of Object.entries(results)) {
      console.log(collection.padEnd(20) + count.toString());
    }
    
    if (isValid) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('You can now switch your application to use Firestore.');
    } else {
      console.log('\n⚠️ Migration completed with validation errors.');
      console.log('Please review the validation results before switching to Firestore.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
runMigration();


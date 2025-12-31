#!/usr/bin/env node

/**
 * Volledige analyse van alle Notability notes uit Drive/Datalake
 * Genereert een overzicht van alle metadata, vakken, topics, etc.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as MinIO from 'minio';
import { writeFile } from 'fs/promises';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

// MinIO config - use shared utility
import { createMinioClient } from '@stephen/datalake';

const BUCKET_NAME = process.env.MINIO_BRONZE_EDUCATION_BUCKET || 'bronze-education';
const BASE_PATH = 'notability/Priveles';
const SUBJECT_FOLDERS = ['VO', 'Rekenen', 'WO'];

// Initialize MinIO client
const minioClient = createMinioClient();

// Statistics
const stats = {
  totalPDFs: 0,
  totalMetadata: 0,
  missingMetadata: 0,
  subjects: {},
  topicGroups: {},
  topics: {},
  levels: {},
  students: {},
  years: {},
  keywords: new Set(),
  errors: [],
};

/**
 * Read metadata file from MinIO
 */
async function readMetadata(metadataPath) {
  try {
    const stream = await minioClient.getObject(BUCKET_NAME, metadataPath);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * Analyze all PDFs and metadata
 */
async function analyzeAllNotes() {
  console.log('🔍 Starting volledige analyse van alle Notability notes...\n');
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`📁 Base path: ${BASE_PATH}\n`);

  const startTime = Date.now();

  for (const subject of SUBJECT_FOLDERS) {
    const prefix = `${BASE_PATH}/${subject}/`;
    console.log(`\n📚 Analyseren van ${subject}...`);

    try {
      const objectsStream = minioClient.listObjects(BUCKET_NAME, prefix, true);
      const pdfs = [];
      const metadataFiles = [];

      // Collect all PDFs and metadata files
      for await (const obj of objectsStream) {
        if (obj.name && !obj.name.endsWith('/')) {
          if (obj.name.toLowerCase().endsWith('.pdf')) {
            pdfs.push(obj.name);
          } else if (obj.name.endsWith('.metadata.json')) {
            metadataFiles.push(obj.name);
          }
        }
      }

      console.log(`   📄 PDFs gevonden: ${pdfs.length}`);
      console.log(`   📋 Metadata bestanden: ${metadataFiles.length}`);

      stats.totalPDFs += pdfs.length;
      stats.totalMetadata += metadataFiles.length;

      // Process each PDF
      for (const pdfPath of pdfs) {
        const relativePath = pdfPath.replace(prefix, '');
        const parts = relativePath.split('/');
        const studentName = parts[0];
        const filename = parts[parts.length - 1];

        // Track student
        if (!stats.students[studentName]) {
          stats.students[studentName] = {
            count: 0,
            subjects: new Set(),
            subjectsList: [],
          };
        }
        stats.students[studentName].count++;
        stats.students[studentName].subjects.add(subject);

        // Try to read metadata
        const metadataPath = `${pdfPath}.metadata.json`;
        const metadata = await readMetadata(metadataPath);

        if (metadata) {
          // Process metadata
          if (metadata.subject) {
            stats.subjects[metadata.subject] = (stats.subjects[metadata.subject] || 0) + 1;
          }

          if (metadata.topicGroup) {
            stats.topicGroups[metadata.topicGroup] = (stats.topicGroups[metadata.topicGroup] || 0) + 1;
          }

          if (metadata.topic) {
            stats.topics[metadata.topic] = (stats.topics[metadata.topic] || 0) + 1;
          }

          if (metadata.level) {
            stats.levels[metadata.level] = (stats.levels[metadata.level] || 0) + 1;
          }

          if (metadata.schoolYear) {
            stats.years[metadata.schoolYear] = (stats.years[metadata.schoolYear] || 0) + 1;
          }

          if (metadata.keywords && Array.isArray(metadata.keywords)) {
            metadata.keywords.forEach(kw => stats.keywords.add(kw));
          }

          if (metadata.aiAnalyzedAt) {
            // Track when last analyzed
            const analyzedDate = new Date(metadata.aiAnalyzedAt);
            if (!stats.students[studentName].lastAnalyzed) {
              stats.students[studentName].lastAnalyzed = analyzedDate;
            } else if (analyzedDate > stats.students[studentName].lastAnalyzed) {
              stats.students[studentName].lastAnalyzed = analyzedDate;
            }
          }
        } else {
          stats.missingMetadata++;
          console.log(`   ⚠️  Geen metadata voor: ${filename}`);
        }
      }

      // Convert Sets to Arrays for students
      Object.keys(stats.students).forEach(student => {
        stats.students[student].subjectsList = Array.from(stats.students[student].subjects);
      });

    } catch (error) {
      console.error(`❌ Error analyzing ${subject}:`, error.message);
      stats.errors.push({ subject, error: error.message });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Analyse voltooid in ${elapsed} seconden\n`);

  return stats;
}

/**
 * Generate report
 */
function generateReport(stats) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPDFs: stats.totalPDFs,
      totalMetadata: stats.totalMetadata,
      missingMetadata: stats.missingMetadata,
      coverage: stats.totalPDFs > 0 
        ? ((stats.totalMetadata / stats.totalPDFs) * 100).toFixed(2) + '%'
        : '0%',
      totalStudents: Object.keys(stats.students).length,
      totalSubjects: Object.keys(stats.subjects).length,
      totalTopicGroups: Object.keys(stats.topicGroups).length,
      totalTopics: Object.keys(stats.topics).length,
      totalKeywords: stats.keywords.size,
    },
    subjects: Object.entries(stats.subjects)
      .sort((a, b) => b[1] - a[1])
      .map(([subject, count]) => ({ subject, count })),
    topicGroups: Object.entries(stats.topicGroups)
      .sort((a, b) => b[1] - a[1])
      .map(([topicGroup, count]) => ({ topicGroup, count })),
    topics: Object.entries(stats.topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50) // Top 50
      .map(([topic, count]) => ({ topic, count })),
    levels: Object.entries(stats.levels)
      .sort((a, b) => b[1] - a[1])
      .map(([level, count]) => ({ level, count })),
    schoolYears: Object.entries(stats.years)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, count]) => ({ year, count })),
    students: Object.entries(stats.students)
      .map(([name, data]) => ({
        name,
        fileCount: data.count,
        subjects: data.subjectsList,
        lastAnalyzed: data.lastAnalyzed ? data.lastAnalyzed.toISOString() : null,
      }))
      .sort((a, b) => b.fileCount - a.fileCount),
    keywords: Array.from(stats.keywords).sort(),
    errors: stats.errors,
  };

  return report;
}

/**
 * Print summary to console
 */
function printSummary(report) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 VOLLEDIGE ANALYSE RAPPORT - NOTABILITY NOTES');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📈 SAMENVATTING:');
  console.log(`   Totaal PDFs: ${report.summary.totalPDFs}`);
  console.log(`   Metadata bestanden: ${report.summary.totalMetadata}`);
  console.log(`   Ontbrekende metadata: ${report.summary.missingMetadata}`);
  console.log(`   Coverage: ${report.summary.coverage}`);
  console.log(`   Studenten: ${report.summary.totalStudents}`);
  console.log(`   Vakken: ${report.summary.totalSubjects}`);
  console.log(`   Topic Groups: ${report.summary.totalTopicGroups}`);
  console.log(`   Topics: ${report.summary.totalTopics}`);
  console.log(`   Keywords: ${report.summary.totalKeywords}`);

  if (report.subjects.length > 0) {
    console.log('\n📚 VAKKEN:');
    report.subjects.forEach(({ subject, count }) => {
      console.log(`   ${subject}: ${count} bestanden`);
    });
  }

  if (report.topicGroups.length > 0) {
    console.log('\n📂 TOPIC GROUPS (Top 10):');
    report.topicGroups.slice(0, 10).forEach(({ topicGroup, count }) => {
      console.log(`   ${topicGroup}: ${count} bestanden`);
    });
  }

  if (report.topics.length > 0) {
    console.log('\n📝 TOPICS (Top 10):');
    report.topics.slice(0, 10).forEach(({ topic, count }) => {
      console.log(`   ${topic}: ${count} bestanden`);
    });
  }

  if (report.levels.length > 0) {
    console.log('\n🎓 LEVELS:');
    report.levels.forEach(({ level, count }) => {
      console.log(`   ${level}: ${count} bestanden`);
    });
  }

  if (report.schoolYears.length > 0) {
    console.log('\n📅 SCHOOLJAREN:');
    report.schoolYears.forEach(({ year, count }) => {
      console.log(`   ${year}: ${count} bestanden`);
    });
  }

  if (report.students.length > 0) {
    console.log('\n👥 STUDENTEN (Top 10):');
    report.students.slice(0, 10).forEach(({ name, fileCount, subjects, lastAnalyzed }) => {
      const lastAnalyzedStr = lastAnalyzed 
        ? new Date(lastAnalyzed).toLocaleDateString('nl-NL')
        : 'Niet geanalyseerd';
      console.log(`   ${name}: ${fileCount} bestanden (${subjects.join(', ')}) - Laatste analyse: ${lastAnalyzedStr}`);
    });
  }

  if (report.errors.length > 0) {
    console.log('\n❌ FOUTEN:');
    report.errors.forEach(({ subject, error }) => {
      console.log(`   ${subject}: ${error}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════');
}

/**
 * Main
 */
async function main() {
  try {
    // Test MinIO connection
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
    if (!bucketExists) {
      console.error(`❌ Bucket ${BUCKET_NAME} bestaat niet`);
      process.exit(1);
    }

    // Run analysis
    const stats = await analyzeAllNotes();

    // Generate report
    const report = generateReport(stats);

    // Print summary
    printSummary(report);

    // Save full report to file
    const reportPath = join(__dirname, '..', 'logs', `notability-analysis-${new Date().toISOString().split('T')[0]}.json`);
    await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n💾 Volledig rapport opgeslagen: ${reportPath}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();


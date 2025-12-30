#!/usr/bin/env node

/**
 * Lijst alle PDFs in het datalake
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as MinIO from 'minio';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

// MinIO config - force localhost for direct access
let MINIO_ENDPOINT = 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9005'); // Use host port 9005
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin';
let MINIO_USE_SSL = false; // Always false for localhost

// If MINIO_ENDPOINT is set and is a container name, use localhost instead
if (process.env.MINIO_ENDPOINT && process.env.MINIO_ENDPOINT !== 'localhost' && !process.env.MINIO_ENDPOINT.includes('.')) {
  // It's a container name, use localhost with host port
  MINIO_ENDPOINT = 'localhost';
}

const BUCKET_NAME = process.env.MINIO_BRONZE_EDUCATION_BUCKET || 'bronze-education';
const BASE_PATH = 'notability/Priveles';
const SUBJECT_FOLDERS = ['VO', 'Rekenen', 'WO'];

// Initialize MinIO client
const minioClient = new MinIO.Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

// Statistics
const stats = {
  totalPDFs: 0,
  bySubject: {},
  byStudent: {},
  pdfs: [],
};

async function listPDFs() {
  console.log('🔍 Scannen van PDFs in datalake...\n');
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`📁 Base path: ${BASE_PATH}\n`);

  for (const subject of SUBJECT_FOLDERS) {
    const prefix = `${BASE_PATH}/${subject}/`;
    console.log(`📚 Scannen van ${subject}...`);

    try {
      const objectsStream = minioClient.listObjects(BUCKET_NAME, prefix, true);
      
      for await (const obj of objectsStream) {
        if (obj.name && obj.name.toLowerCase().endsWith('.pdf') && !obj.name.endsWith('/')) {
          const relativePath = obj.name.replace(prefix, '');
          const parts = relativePath.split('/');
          const studentName = parts[0];
          const filename = parts[parts.length - 1];

          stats.totalPDFs++;
          
          if (!stats.bySubject[subject]) {
            stats.bySubject[subject] = 0;
          }
          stats.bySubject[subject]++;

          if (!stats.byStudent[studentName]) {
            stats.byStudent[studentName] = [];
          }
          stats.byStudent[studentName].push({
            filename,
            path: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            subject,
          });

          stats.pdfs.push({
            filename,
            path: obj.name,
            studentName,
            subject,
            size: obj.size,
            lastModified: obj.lastModified,
          });
        }
      }

      console.log(`   ✅ ${stats.bySubject[subject] || 0} PDFs gevonden`);
    } catch (error) {
      console.error(`   ❌ Error scanning ${subject}:`, error.message);
    }
  }

  return stats;
}

function printSummary(stats) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 PDF OVERZICHT - DATALAKE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`📈 TOTAAL: ${stats.totalPDFs} PDFs\n`);

  console.log('📚 PER VAK:');
  Object.entries(stats.bySubject)
    .sort((a, b) => b[1] - a[1])
    .forEach(([subject, count]) => {
      console.log(`   ${subject}: ${count} PDFs`);
    });

  console.log(`\n👥 PER STUDENT (${Object.keys(stats.byStudent).length} studenten):`);
  Object.entries(stats.byStudent)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20)
    .forEach(([student, pdfs]) => {
      const subjects = [...new Set(pdfs.map(p => p.subject))];
      console.log(`   ${student}: ${pdfs.length} PDFs (${subjects.join(', ')})`);
    });

  if (Object.keys(stats.byStudent).length > 20) {
    console.log(`   ... en ${Object.keys(stats.byStudent).length - 20} meer studenten`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
}

async function main() {
  try {
    // Test MinIO connection
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
    if (!bucketExists) {
      console.error(`❌ Bucket ${BUCKET_NAME} bestaat niet`);
      process.exit(1);
    }

    // List PDFs
    const stats = await listPDFs();

    // Print summary
    printSummary(stats);

    // Optionally print all PDFs
    if (process.argv.includes('--full')) {
      console.log('\n📄 ALLE PDFs:');
      stats.pdfs
        .sort((a, b) => a.studentName.localeCompare(b.studentName))
        .forEach((pdf) => {
          const sizeKB = (pdf.size / 1024).toFixed(1);
          const date = pdf.lastModified ? new Date(pdf.lastModified).toLocaleDateString('nl-NL') : 'Onbekend';
          console.log(`   [${pdf.subject}] ${pdf.studentName}/${pdf.filename} (${sizeKB} KB, ${date})`);
        });
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();


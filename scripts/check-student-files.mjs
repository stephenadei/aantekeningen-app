#!/usr/bin/env node

/**
 * Check if student has files in MinIO datalake
 */

import * as MinIO from 'minio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const BUCKET_NAME = 'bronze-education';
const BASE_PATH = 'notability/Priveles';
const SUBJECT_FOLDERS = ['VO', 'Rekenen', 'WO'];

const studentNames = ['Teresa', 'Teressa'];

async function checkStudentFiles() {
  const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost:9005';
  // Handle both URLs and host:port formats
  let endpoint, port, useSSL;
  
  if (minioEndpoint.startsWith('http://') || minioEndpoint.startsWith('https://')) {
    const url = new URL(minioEndpoint);
    endpoint = url.hostname;
    port = url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80);
    useSSL = url.protocol === 'https:';
  } else {
    const parts = minioEndpoint.split(':');
    endpoint = parts[0];
    port = parts[1] ? parseInt(parts[1]) : 9005;
    useSSL = process.env.MINIO_SECURE === 'true';
  }
  
  // For development, always use localhost:9005 (Docker mapped port)
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    endpoint = 'localhost';
    port = 9005;
    useSSL = false;
    console.log('🔧 Development mode: using localhost:9005');
  }
  
  console.log(`Connecting to MinIO: ${endpoint}:${port} (SSL: ${useSSL})`);
  
  const minioClient = new MinIO.Client({
    endPoint: endpoint,
    port: port,
    useSSL: useSSL,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  });

  console.log('🔍 Checking for student files in MinIO...\n');
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Base Path: ${BASE_PATH}\n`);

  for (const studentName of studentNames) {
    console.log(`\n📚 Checking: ${studentName}`);
    let found = false;

    for (const subjectFolder of SUBJECT_FOLDERS) {
      const path = `${BASE_PATH}/${subjectFolder}/${studentName}/`;
      console.log(`  Checking: ${path}`);

      try {
        const objectsStream = minioClient.listObjects(BUCKET_NAME, path, false);
        const files = [];
        
        for await (const obj of objectsStream) {
          if (obj.name && !obj.name.endsWith('/')) {
            files.push(obj.name);
          }
        }

        if (files.length > 0) {
          console.log(`  ✅ Found ${files.length} files in ${subjectFolder}`);
          console.log(`  📁 Path: ${path}`);
          found = true;
          // Show first few files
          files.slice(0, 5).forEach(file => {
            console.log(`     - ${file.split('/').pop()}`);
          });
          if (files.length > 5) {
            console.log(`     ... and ${files.length - 5} more files`);
          }
        } else {
          console.log(`  ❌ No files found in ${subjectFolder}`);
        }
      } catch (error) {
        console.log(`  ⚠️  Error checking ${subjectFolder}:`, error.message || error.toString());
        if (error.code) {
          console.log(`     Error code: ${error.code}`);
        }
      }
    }

    if (!found) {
      console.log(`  ❌ No files found for ${studentName} in any subject folder`);
    }
  }
}

checkStudentFiles().catch(console.error);

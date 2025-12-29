#!/usr/bin/env node
/**
 * Script to create an admin user for the aantekeningen-app
 * Uses the same database as privelessen-dashboard
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'lessons@stephensprivelessen.nl';
  const password = process.argv[3] || 'admin123';
  const name = process.argv[4] || 'Admin User';

  console.log('🔐 Creating admin user...');
  console.log(`   Email: ${email}`);
  console.log(`   Name: ${name}`);

  try {
    // Check if password column exists, if not add it (safe for backward compatibility)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" TEXT;
      `);
      console.log('✅ Ensured password column exists in users table');
    } catch (error) {
      console.warn('⚠️  Could not add password column (might already exist or permission denied):', error.message);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('⚠️  User already exists!');
      console.log('   Updating password...');
      
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      
      console.log('✅ Password updated successfully!');
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      console.log('✅ Admin user created successfully!');
      console.log(`   User ID: ${user.id}`);
    }

    console.log('\n📝 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Remember to change the password after first login!');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');
const mongoose = require('mongoose');

// Load environment variables from backend/.env if present
dotenv.config({ path: path.join(__dirname, '../.env') });

const Admin = require('../src/models/adminModel');

async function runSeed() {
  const args = process.argv.slice(2);
  const hasReset = args.includes('--reset');
  const hasConfirm = args.includes('--confirm');

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  const adminEmail = (process.env.ADMIN_INITIAL_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  const mongoUri = process.env.MONGO_URI;

  // Validation: Email address format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!adminEmail || !emailRegex.test(adminEmail)) {
    console.error('[SEED ERROR] ADMIN_INITIAL_EMAIL is missing or not a valid email address.');
    process.exit(1);
  }

  // Validation: Password length >= 12 characters
  if (!adminPassword || adminPassword.length < 12) {
    console.error('[SEED ERROR] ADMIN_INITIAL_PASSWORD is missing or shorter than 12 characters.');
    process.exit(1);
  }

  // Production requirement: --confirm flag
  if (isProduction && !hasConfirm) {
    console.error('[SEED ERROR] In production (NODE_ENV=production), the explicit --confirm flag is required.');
    process.exit(1);
  }

  if (!mongoUri) {
    console.error('[SEED ERROR] MONGO_URI is missing from environment.');
    process.exit(1);
  }

  // Fallback DNS resolution to Google/Cloudflare for SRV queries on Windows
  if (mongoUri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch (dnsErr) {
      // Ignored
    }
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    const dbName = conn.connection.name;

    const existingAdmin = await Admin.findOne({ email: adminEmail }).select('+password');

    if (!existingAdmin) {
      // Create new admin user (Admin model pre-save hook handles bcrypt cost factor 12)
      const admin = new Admin({
        email: adminEmail,
        password: adminPassword,
        role: 'ADMIN',
        failedLoginAttempts: 0
      });
      await admin.save();

      if (isProduction) {
        console.log(`Database: ${dbName}`);
        console.log('Action: Created initial admin user');
      } else {
        console.log(`Database: ${dbName}`);
        console.log(`Action: Created initial admin user (${adminEmail})`);
      }
    } else if (hasReset) {
      // Reset existing admin's password
      existingAdmin.password = adminPassword;
      existingAdmin.failedLoginAttempts = 0;
      await existingAdmin.save();

      if (isProduction) {
        console.log(`Database: ${dbName}`);
        console.log('Action: Reset password for existing admin user');
      } else {
        console.log(`Database: ${dbName}`);
        console.log(`Action: Reset password for existing admin user (${adminEmail})`);
      }
    } else {
      // Admin already exists, no reset requested
      if (isProduction) {
        console.log(`Database: ${dbName}`);
        console.log('Action: Admin user already exists. No changes made');
      } else {
        console.log(`Database: ${dbName}`);
        console.log(`Action: Admin user already exists (${adminEmail}). No changes made. Pass --reset to update password.`);
      }
    }
  } catch (error) {
    console.error(`[SEED ERROR] Failed to seed admin: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch (closeErr) {
        // Ignored
      }
    }
    if (process.exitCode && process.exitCode !== 0) {
      process.exit(process.exitCode);
    }
  }
}

runSeed();

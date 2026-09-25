const mongoose = require('mongoose');
const dns = require('dns');
const env = require('./env');
const logger = require('./logger');

const connectDB = async () => {
  try {
    // Fallback DNS resolution to Google/Cloudflare DNS for SRV queries on Windows
    if (env.mongoUri && env.mongoUri.startsWith('mongodb+srv://')) {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
      } catch (dnsErr) {
        logger.warn(`Could not set custom DNS servers: ${dnsErr.message}`);
      }
    }

    const conn = await mongoose.connect(env.mongoUri);
    logger.info(`MongoDB Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;


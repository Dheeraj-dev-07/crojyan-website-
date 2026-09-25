const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const Admin = require('../models/adminModel');
const Product = require('../models/productModel');
const logger = require('../config/logger');

const sampleProducts = [
  {
    title: 'Velvet Rose Elegance Bouquet',
    slug: 'velvet-rose-elegance-bouquet',
    description: 'Handcrafted forever crochet bouquet featuring 7 deep crimson velvet roses, delicate baby’s breath accents, and eucalyptus leaves. Painstakingly stitched with soft cotton-blend yarn.',
    basePrice: 48.50,
    variantDeltas: [
      { name: 'Standard (7 Stems)', priceDelta: 0 },
      { name: 'Deluxe (12 Stems)', priceDelta: 22.00 }
    ],
    stemCount: 7,
    dimensions: { heightCm: 38, widthCm: 24 },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800',
        public_id: 'seed-rose-1',
        isPrimary: true
      },
      {
        url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=800',
        public_id: 'seed-rose-2',
        isPrimary: false
      }
    ],
    customization: {
      ribbonColors: ['Dusty Rose', 'Champagne Silk', 'Forest Sage', 'Burgundy Satin'],
      wrappingPaperShades: ['Cream Matte', 'Kraft Vintage', 'Blush Pink', 'Slate Grey'],
      defaultLeadTimeDays: 3
    },
    availability: 'available',
    stockCount: 15
  },
  {
    title: 'Sunny Daisy Meadow Arrangement',
    slug: 'sunny-daisy-meadow-arrangement',
    description: 'Bright and cheery handcrafted crochet daisies with golden centers and leafy foliage. Guaranteed never to wilt, bringing radiant sunshine into any cozy space.',
    basePrice: 36.00,
    variantDeltas: [],
    stemCount: 9,
    dimensions: { heightCm: 32, widthCm: 20 },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1606041008023-472dfb5e530f?auto=format&fit=crop&q=80&w=800',
        public_id: 'seed-daisy-1',
        isPrimary: true
      }
    ],
    customization: {
      ribbonColors: ['Buttercup Yellow', 'Sage Green', 'Pure White'],
      wrappingPaperShades: ['Natural Kraft', 'Soft Cream', 'Pastel Mint'],
      defaultLeadTimeDays: 2
    },
    availability: 'available',
    stockCount: 8
  },
  {
    title: 'Provence Lavender & White Lily Spray',
    slug: 'provence-lavender-white-lily-spray',
    description: 'Serene botanical arrangement featuring textured crochet lavender sprigs and 3 blooming white calla lilies. Hand-wrapped with premium eco-paper.',
    basePrice: 52.00,
    variantDeltas: [
      { name: 'Classic Spray', priceDelta: 0 },
      { name: 'Grand Bouquet', priceDelta: 18.00 }
    ],
    stemCount: 11,
    dimensions: { heightCm: 42, widthCm: 28 },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1591886960571-74d43a9d4166?auto=format&fit=crop&q=80&w=800',
        public_id: 'seed-lavender-1',
        isPrimary: true
      }
    ],
    customization: {
      ribbonColors: ['Lavender Mist', 'Champagne Silk', 'Olive Sage'],
      wrappingPaperShades: ['Cream Matte', 'Lilac Blush', 'Kraft Vintage'],
      defaultLeadTimeDays: 4
    },
    availability: 'made_to_order',
    stockCount: 0
  },
  {
    title: 'Vintage Blush Peony & Tulip Dream',
    slug: 'vintage-blush-peony-tulip-dream',
    description: 'Luxurious multi-layered crochet peonies accompanied by soft pastel pink tulips and sprigs of lavender. Designed for anniversaries, birthdays, and forever keepsake gifts.',
    basePrice: 65.00,
    variantDeltas: [],
    stemCount: 10,
    dimensions: { heightCm: 40, widthCm: 30 },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&q=80&w=800',
        public_id: 'seed-peony-1',
        isPrimary: true
      }
    ],
    customization: {
      ribbonColors: ['Dusty Rose', 'Rose Gold Satin', 'Ivory Cream'],
      wrappingPaperShades: ['Soft Cream', 'Blush Pink', 'Golden Edge White'],
      defaultLeadTimeDays: 5
    },
    availability: 'available',
    stockCount: 5
  },
  {
    title: 'Autumn Sunflower & Eucalyptus Bloom',
    slug: 'autumn-sunflower-eucalyptus-bloom',
    description: 'Warm rustic bouquet featuring 5 giant crocheted sunflowers with dark centers, paired with dusty eucalyptus and dried-look foliage. A cozy addition to autumn decor.',
    basePrice: 42.00,
    variantDeltas: [],
    stemCount: 8,
    dimensions: { heightCm: 36, widthCm: 26 },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800',
        public_id: 'seed-sunflower-1',
        isPrimary: true
      }
    ],
    customization: {
      ribbonColors: ['Rustic Twine', 'Terracotta Satin', 'Forest Green'],
      wrappingPaperShades: ['Kraft Vintage', 'Warm Cream', 'Chocolate Brown'],
      defaultLeadTimeDays: 3
    },
    availability: 'sold_out',
    stockCount: 0
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    logger.info('Connected to MongoDB for seeding...');

    // Clear old admin credentials
    await Admin.deleteMany({ email: { $ne: (env.adminInitialEmail || 'admin@crojyan.com').toLowerCase() } });

    // Hash initial admin password with bcrypt cost factor 12
    const adminEmail = (env.adminInitialEmail || 'admin@crojyan.com').toLowerCase();
    const adminPassword = env.adminInitialPassword || 'Crojyan@73951206';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Upsert Admin User with findOneAndUpdate
    const admin = await Admin.findOneAndUpdate(
      { email: adminEmail },
      {
        $set: {
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
          failedLoginAttempts: 0
        }
      },
      { upsert: true, new: true, runValidators: true }
    );
    logger.info(`Seeded/Updated Admin User: ${admin.email}`);

    // Seed Products if none exist
    const count = await Product.countDocuments();
    if (count === 0) {
      const products = await Product.create(sampleProducts);
      logger.info(`Seeded ${products.length} crochet bouquet products successfully.`);
    }

    process.exit(0);
  } catch (error) {
    logger.error(`Database seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();

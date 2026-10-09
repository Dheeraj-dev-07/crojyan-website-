const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const mongoose = require('mongoose');
const env = require('../config/env');
const Product = require('../models/productModel');
const logger = require('../config/logger');

const batch1Products = [
  {
    title: "Sunburst Sunflower Duo Bouquet",
    slug: "sunburst-sunflower-duo-bouquet",
    description: "Handcrafted forever bouquet featuring two golden sunflowers and charming white daisy accents wrapped in vintage newsprint kraft paper with an espresso brown ribbon.",
    basePrice: 1199,
    variantDeltas: [],
    stemCount: 4,
    dimensions: { heightCm: 38, widthCm: 24 },
    images: [
      {
        url: "/assets/bouquets/sunburst-sunflower-duo-bouquet.jpg",
        public_id: "batch1-sunburst-sunflower-duo-bouquet",
        isPrimary: true
      }
    ],
    customization: {
      ribbonColors: ["Espresso Brown", "Kraft Tan", "Golden Yellow"],
      wrappingPaperShades: ["Vintage Newsprint", "Kraft Brown"],
      defaultLeadTimeDays: 3
    },
    availability: "available",
    stockCount: 5
  },
  {
    title: "Spring Meadow Lily & Tulip Arrangement",
    slug: "spring-meadow-lily-tulip-arrangement",
    description: "A lush garden arrangement featuring a centerpiece pink lily, four hand-crocheted blush tulips, and white chamomile flowers wrapped in soft cloud mesh with a satin pink ribbon.",
    basePrice: 1799,
    variantDeltas: [],
    stemCount: 8,
    dimensions: { heightCm: 45, widthCm: 32 },
    images: [
      {
        url: "/assets/bouquets/spring-meadow-lily-tulip-arrangement.jpg",
        public_id: "batch1-spring-meadow-lily-tulip-arrangement",
        isPrimary: true
      }
    ],
    customization: {
      ribbonColors: ["Blush Pink", "Snow White", "Rose"],
      wrappingPaperShades: ["Translucent White", "Soft Pink"],
      defaultLeadTimeDays: 3
    },
    availability: "available",
    stockCount: 4
  },
  {
    title: "Pure Ivory Bloom Giant Lily Bunch",
    slug: "pure-ivory-bloom-giant-lily-bunch",
    description: "Four magnificent cream-ivory crochet lilies with realistic golden stamens and forest green foliage. Hand-tied stems perfect for direct vase placement.",
    basePrice: 1499,
    variantDeltas: [],
    stemCount: 4,
    dimensions: { heightCm: 48, widthCm: 28 },
    images: [
      {
        url: "/assets/bouquets/pure-ivory-bloom-giant-lily-bunch.jpg",
        public_id: "batch1-pure-ivory-bloom-giant-lily-bunch",
        isPrimary: true
      }
    ],
    customization: {
      ribbonColors: ["Forest Green", "Ivory Cream", "Gold"],
      wrappingPaperShades: ["Open Stem Tie", "Kraft Paper"],
      defaultLeadTimeDays: 3
    },
    availability: "available",
    stockCount: 6
  },
  {
    title: "Pastel Sky Lily & Berry Branch Stem Set",
    slug: "pastel-sky-lily-berry-branch-stem-set",
    description: "A calming artisan stem set featuring one pastel sky-blue lily, one cloud-white lily, and blue berry sprigs with delicate green leaves.",
    basePrice: 1299,
    variantDeltas: [],
    stemCount: 4,
    dimensions: { heightCm: 44, widthCm: 26 },
    images: [
      {
        url: "/assets/bouquets/pastel-sky-lily-berry-branch-stem-set.jpg",
        public_id: "batch1-pastel-sky-lily-berry-branch-stem-set",
        isPrimary: true
      }
    ],
    customization: {
      ribbonColors: ["Sky Blue", "White"],
      wrappingPaperShades: ["Open Stem Tie", "Minimal White"],
      defaultLeadTimeDays: 3
    },
    availability: "available",
    stockCount: 5
  },
  {
    title: "Serene Sky Lily & Berry Bouquet",
    slug: "serene-sky-lily-berry-bouquet",
    description: "Sky-blue and pure-white crochet lilies paired with cluster berries, layered inside vintage newsprint and clean white wrap with a royal blue satin bow.",
    basePrice: 1399,
    variantDeltas: [],
    stemCount: 4,
    dimensions: { heightCm: 42, widthCm: 26 },
    images: [
      {
        url: "/assets/bouquets/serene-sky-lily-berry-bouquet.jpg",
        public_id: "batch1-serene-sky-lily-berry-bouquet",
        isPrimary: true
      }
    ],
    customization: {
      ribbonColors: ["Royal Blue", "Sky Blue", "White"],
      wrappingPaperShades: ["Vintage Newsprint", "White Textured"],
      defaultLeadTimeDays: 3
    },
    availability: "available",
    stockCount: 5
  }
];

const seedBatch1 = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    logger.info('Connected to MongoDB for Batch 1 seeding...');

    // Clear old sample placeholder products if any exist
    await Product.deleteMany({ slug: { $nin: batch1Products.map(p => p.slug) } });

    for (const item of batch1Products) {
      const updated = await Product.findOneAndUpdate(
        { slug: item.slug },
        { $set: item },
        { upsert: true, new: true, runValidators: true }
      );
      logger.info(`Upserted Batch 1 product: ${updated.title} (₹${updated.basePrice})`);
    }

    logger.info('Successfully seeded Batch 1 products!');
    process.exit(0);
  } catch (err) {
    logger.error(`Failed to seed Batch 1 products: ${err.message}`);
    process.exit(1);
  }
};

seedBatch1();

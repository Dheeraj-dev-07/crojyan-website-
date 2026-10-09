const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const mongoose = require('mongoose');
const env = require('../config/env');
const Product = require('../models/productModel');
const logger = require('../config/logger');

const catalogProducts = [
  {
    title: "Sunflower Bouquet",
    slug: "sunflower-bouquet",
    description: "Handmade crochet sunflower bouquet with white accent flowers, wrapped in rustic kraft paper with a brown ribbon.",
    basePrice: 1199,
    variantDeltas: [],
    stemCount: 2,
    dimensions: { heightCm: 38, widthCm: 24 },
    images: [
      {
        url: "/uploads/sunburst-sunflower-duo-bouquet.jpg",
        public_id: "sunburst-sunflower-duo-bouquet",
        isPrimary: true,
        order: 0
      }
    ],
    customization: {
      ribbonColors: ["Brown", "Dark Brown"],
      wrappingPaperShades: ["Kraft Brown"],
      defaultLeadTimeDays: 4
    },
    availability: "made_to_order",
    stockCount: 10
  },
  {
    title: "Classic Lily Bouquet",
    slug: "classic-lily-bouquet",
    description: "Elegant crochet lily bouquet available in white, blush pink, or blue, with crochet leaves and tissue wrap.",
    basePrice: 1499,
    variantDeltas: [],
    stemCount: 4,
    dimensions: { heightCm: 48, widthCm: 28 },
    images: [
      {
        url: "/uploads/pure-ivory-bloom-giant-lily-bunch.jpg",
        public_id: "pure-ivory-bloom-giant-lily-bunch",
        isPrimary: true,
        order: 0
      },
      {
        url: "/uploads/serene-sky-lily-berry-bouquet.jpg",
        public_id: "serene-sky-lily-berry-bouquet",
        isPrimary: false,
        order: 1
      },
      {
        url: "/uploads/pastel-sky-lily-berry-branch-stem-set.jpg",
        public_id: "pastel-sky-lily-berry-branch-stem-set",
        isPrimary: false,
        order: 2
      }
    ],
    customization: {
      ribbonColors: ["White", "Blue", "Cream"],
      wrappingPaperShades: ["White Tissue", "Kraft Brown", "Pink"],
      defaultLeadTimeDays: 4
    },
    availability: "made_to_order",
    stockCount: 10
  },
  {
    title: "Red Rose Bouquet",
    slug: "red-rose-bouquet",
    description: "Deep red crochet roses with white crochet filler flowers, wrapped in black paper for a bold, romantic look.",
    basePrice: 1599,
    variantDeltas: [],
    stemCount: 5,
    dimensions: { heightCm: 40, widthCm: 26 },
    images: [
      {
        url: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800",
        public_id: "red-rose-bouquet-1",
        isPrimary: true,
        order: 0
      }
    ],
    customization: {
      ribbonColors: ["Red", "White"],
      wrappingPaperShades: ["Black", "Kraft Brown"],
      defaultLeadTimeDays: 4
    },
    availability: "made_to_order",
    stockCount: 10
  },
  {
    title: "Tulip Bouquet (Multi-color)",
    slug: "tulip-bouquet-multi-color",
    description: "Cheerful crochet tulip bouquet in your choice of pink, white, red, blue, purple, or yellow, with crochet leaves.",
    basePrice: 1399,
    variantDeltas: [],
    stemCount: 5,
    dimensions: { heightCm: 35, widthCm: 22 },
    images: [
      {
        url: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=800",
        public_id: "tulip-bouquet-1",
        isPrimary: true,
        order: 0
      }
    ],
    customization: {
      ribbonColors: ["Pink", "White", "Red", "Purple"],
      wrappingPaperShades: ["White Tissue", "Black", "Pink"],
      defaultLeadTimeDays: 4
    },
    availability: "made_to_order",
    stockCount: 10
  },
  {
    title: "Mixed Seasonal Bouquet",
    slug: "mixed-seasonal-bouquet",
    description: "A curated mix of crochet lilies, tulips, and daisies in seasonal color palettes — pink and magenta, red and white, or purple and yellow.",
    basePrice: 1799,
    variantDeltas: [],
    stemCount: 5,
    dimensions: { heightCm: 45, widthCm: 32 },
    images: [
      {
        url: "/uploads/spring-meadow-lily-tulip-arrangement.jpg",
        public_id: "spring-meadow-lily-tulip-arrangement",
        isPrimary: true,
        order: 0
      }
    ],
    customization: {
      ribbonColors: ["Pink", "Brown", "Purple", "White"],
      wrappingPaperShades: ["Kraft Brown", "White Tissue", "Purple"],
      defaultLeadTimeDays: 4
    },
    availability: "made_to_order",
    stockCount: 10
  }
];

const seedCatalog = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    logger.info('Connected to MongoDB for Catalog seeding...');

    // Clean old placeholder data and replace with exact 5 products
    await Product.deleteMany({ slug: { $nin: catalogProducts.map((p) => p.slug) } });

    for (const item of catalogProducts) {
      const updated = await Product.findOneAndUpdate(
        { slug: item.slug },
        { $set: item },
        { upsert: true, new: true, runValidators: true }
      );
      logger.info(`Upserted Catalog product: ${updated.title} (₹${updated.basePrice}, ${updated.availability})`);
    }

    logger.info('Successfully seeded 5 Catalog products!');
    process.exit(0);
  } catch (err) {
    logger.error(`Failed to seed Catalog products: ${err.message}`);
    process.exit(1);
  }
};

seedCatalog();

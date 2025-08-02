#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models
const AdminUser = require('../src/models/AdminUser');
const Category = require('../src/models/Category');
const Item = require('../src/models/Item');
const Order = require('../src/models/Order');
const Conversation = require('../src/models/Conversation');

// Database connection
const database = require('../src/config/database');
const logger = require('../src/config/logger');

class DatabaseSeeder {
  constructor() {
    this.categories = [];
    this.items = [];
    this.orders = [];
    this.conversations = [];
    this.adminUser = null;
  }

  async connect() {
    try {
      await database.connect();
      logger.info('Connected to MongoDB for seeding');
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await database.disconnect();
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Failed to disconnect from MongoDB:', error);
      throw error;
    }
  }

  async clearDatabase() {
    try {
      logger.info('Clearing existing data...');
      
      // Clear all collections in the correct order (to handle references)
      await Conversation.deleteMany({});
      await Order.deleteMany({});
      await Item.deleteMany({});
      await Category.deleteMany({});
      await AdminUser.deleteMany({});
      
      logger.info('Database cleared successfully');
    } catch (error) {
      logger.error('Error clearing database:', error);
      throw error;
    }
  }

  async createAdminUser() {
    try {
      logger.info('Creating admin user...');
      
      const adminData = {
        username: 'admin',
        email: 'admin@crochetbusiness.com',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true
      };

      // Use the static method to create user with hashed password
      this.adminUser = await AdminUser.createWithPassword(adminData, 'admin123');
      
      logger.info(`Admin user created: ${this.adminUser.username} (${this.adminUser.email})`);
      return this.adminUser;
    } catch (error) {
      logger.error('Error creating admin user:', error);
      throw error;
    }
  }

  async createCategories() {
    try {
      logger.info('Creating categories...');
      
      const categoryData = [
        {
          name: 'Blankets & Throws',
          description: 'Cozy blankets and throws for home decoration and warmth'
        },
        {
          name: 'Clothing & Accessories',
          description: 'Handmade clothing items and fashion accessories'
        },
        {
          name: 'Baby Items',
          description: 'Soft and safe crochet items for babies and toddlers'
        },
        {
          name: 'Home Decor',
          description: 'Decorative items to beautify your living space'
        },
        {
          name: 'Toys & Amigurumi',
          description: 'Cute stuffed animals and toys made with love'
        },
        {
          name: 'Bags & Purses',
          description: 'Stylish and functional bags for everyday use'
        }
      ];

      this.categories = await Category.insertMany(categoryData);
      logger.info(`Created ${this.categories.length} categories`);
      return this.categories;
    } catch (error) {
      logger.error('Error creating categories:', error);
      throw error;
    }
  }

  async createItems() {
    try {
      logger.info('Creating items...');
      
      const itemsData = [
        // Blankets & Throws
        {
          name: 'Granny Square Afghan',
          description: 'Classic granny square pattern blanket, perfect for any room. Made with soft acrylic yarn.',
          pricingType: 'fixed',
          price: { fixed: 85.00 },
          categoryId: this.categories[0]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Multi-color', 'Blue & White', 'Pink & White', 'Green & Cream']
        },
        {
          name: 'Baby Blanket',
          description: 'Soft and gentle baby blanket made with hypoallergenic yarn. Perfect for newborns.',
          pricingType: 'range',
          price: { min: 45.00, max: 65.00 },
          categoryId: this.categories[2]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Pastel Pink', 'Pastel Blue', 'Mint Green', 'Cream', 'Lavender']
        },
        {
          name: 'Custom Wedding Blanket',
          description: 'Personalized wedding blanket with custom colors and patterns. Perfect for special occasions.',
          pricingType: 'custom',
          price: {},
          categoryId: this.categories[0]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Custom - Please specify in order']
        },

        // Clothing & Accessories
        {
          name: 'Chunky Knit Scarf',
          description: 'Warm and stylish chunky knit scarf, perfect for cold weather.',
          pricingType: 'fixed',
          price: { fixed: 35.00 },
          categoryId: this.categories[1]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Charcoal Gray', 'Cream', 'Burgundy', 'Navy Blue', 'Forest Green']
        },
        {
          name: 'Beanie Hat',
          description: 'Cozy beanie hat with optional pom-pom. One size fits most adults.',
          pricingType: 'fixed',
          price: { fixed: 25.00 },
          categoryId: this.categories[1]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Black', 'Gray', 'Red', 'Blue', 'Pink', 'White']
        },

        // Baby Items
        {
          name: 'Baby Booties',
          description: 'Adorable baby booties to keep little feet warm. Available in multiple sizes.',
          pricingType: 'range',
          price: { min: 15.00, max: 20.00 },
          categoryId: this.categories[2]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Pink', 'Blue', 'Yellow', 'White', 'Mint Green']
        },
        {
          name: 'Baby Hat Set',
          description: 'Matching hat and mittens set for babies. Soft and comfortable.',
          pricingType: 'fixed',
          price: { fixed: 28.00 },
          categoryId: this.categories[2]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Pink', 'Blue', 'Yellow', 'Lavender', 'Mint']
        },

        // Home Decor
        {
          name: 'Decorative Pillow Cover',
          description: 'Beautiful decorative pillow cover with intricate stitch patterns.',
          pricingType: 'range',
          price: { min: 30.00, max: 45.00 },
          categoryId: this.categories[3]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Cream', 'Sage Green', 'Dusty Rose', 'Charcoal', 'Ivory']
        },
        {
          name: 'Plant Hanger',
          description: 'Macrame-style plant hanger perfect for hanging plants indoors.',
          pricingType: 'fixed',
          price: { fixed: 22.00 },
          categoryId: this.categories[3]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Natural', 'White', 'Cream']
        },

        // Toys & Amigurumi
        {
          name: 'Teddy Bear',
          description: 'Cute and cuddly teddy bear made with soft yarn. Perfect for children of all ages.',
          pricingType: 'fixed',
          price: { fixed: 40.00 },
          categoryId: this.categories[4]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Brown', 'Cream', 'Gray', 'Pink', 'Blue']
        },
        {
          name: 'Custom Amigurumi',
          description: 'Custom-made amigurumi based on your specifications. Send us a photo or description!',
          pricingType: 'custom',
          price: {},
          categoryId: this.categories[4]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Custom - Please specify in order']
        },

        // Bags & Purses
        {
          name: 'Market Tote Bag',
          description: 'Sturdy and eco-friendly market tote bag. Perfect for shopping or beach trips.',
          pricingType: 'fixed',
          price: { fixed: 32.00 },
          categoryId: this.categories[5]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Natural', 'Navy', 'Forest Green', 'Burgundy']
        },
        {
          name: 'Evening Clutch',
          description: 'Elegant evening clutch with beaded details. Perfect for special occasions.',
          pricingType: 'range',
          price: { min: 55.00, max: 75.00 },
          categoryId: this.categories[5]._id,
          isAvailable: true,
          imageUrls: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg'
          ],
          availableColors: ['Black', 'Silver', 'Gold', 'Navy', 'Burgundy']
        }
      ];

      this.items = await Item.insertMany(itemsData);
      logger.info(`Created ${this.items.length} items`);
      return this.items;
    } catch (error) {
      logger.error('Error creating items:', error);
      throw error;
    }
  }

  async createSampleOrders() {
    try {
      logger.info('Creating sample orders...');
      
      const ordersData = [
        {
          customerName: 'Sarah Johnson',
          customerEmail: 'sarah.johnson@email.com',
          customerPhone: '+1-555-0123',
          shippingAddress: '123 Main St, Anytown, ST 12345, USA',
          items: [
            {
              itemId: this.items[0]._id, // Granny Square Afghan
              quantity: 1,
              selectedColor: 'Blue & White',
              unitPrice: 85.00,
              subtotal: 85.00
            }
          ],
          totalAmount: 85.00,
          status: 'confirmed',
          hasCustomItems: false
        },
        {
          customerName: 'Michael Chen',
          customerEmail: 'michael.chen@email.com',
          customerPhone: '+1-555-0456',
          shippingAddress: '456 Oak Ave, Springfield, ST 67890, USA',
          items: [
            {
              itemId: this.items[3]._id, // Chunky Knit Scarf
              quantity: 2,
              selectedColor: 'Charcoal Gray',
              unitPrice: 35.00,
              subtotal: 70.00
            },
            {
              itemId: this.items[4]._id, // Beanie Hat
              quantity: 1,
              selectedColor: 'Gray',
              unitPrice: 25.00,
              subtotal: 25.00
            }
          ],
          totalAmount: 95.00,
          status: 'processing',
          hasCustomItems: false
        },
        {
          customerName: 'Emily Rodriguez',
          customerEmail: 'emily.rodriguez@email.com',
          customerPhone: '+1-555-0789',
          shippingAddress: '789 Pine Rd, Riverside, ST 13579, USA',
          items: [
            {
              itemId: this.items[2]._id, // Custom Wedding Blanket
              quantity: 1,
              selectedColor: 'Custom - Please specify in order',
              customRequirements: 'Wedding colors: blush pink and gold. Include initials "E&J" and wedding date "06/15/2024"'
            }
          ],
          status: 'quote_needed',
          hasCustomItems: true,
          notes: 'Customer wants custom wedding blanket for June wedding'
        },
        {
          customerName: 'David Thompson',
          customerEmail: 'david.thompson@email.com',
          shippingAddress: '321 Elm St, Lakeside, ST 24680, USA',
          items: [
            {
              itemId: this.items[1]._id, // Baby Blanket
              quantity: 1,
              selectedColor: 'Pastel Blue',
              unitPrice: 55.00,
              subtotal: 55.00
            },
            {
              itemId: this.items[5]._id, // Baby Booties
              quantity: 2,
              selectedColor: 'Blue',
              unitPrice: 18.00,
              subtotal: 36.00
            }
          ],
          totalAmount: 91.00,
          status: 'shipped',
          hasCustomItems: false
        },
        {
          customerName: 'Lisa Park',
          customerEmail: 'lisa.park@email.com',
          customerPhone: '+1-555-0321',
          shippingAddress: '654 Maple Dr, Hilltown, ST 97531, USA',
          items: [
            {
              itemId: this.items[10]._id, // Custom Amigurumi
              quantity: 1,
              selectedColor: 'Custom - Please specify in order',
              customRequirements: 'Please create a custom amigurumi of my cat "Whiskers" - orange tabby with white chest and paws'
            }
          ],
          status: 'quoted',
          estimatedAmount: 65.00,
          hasCustomItems: true,
          notes: 'Customer provided photos of her cat via email'
        }
      ];

      this.orders = await Order.insertMany(ordersData);
      logger.info(`Created ${this.orders.length} sample orders`);
      return this.orders;
    } catch (error) {
      logger.error('Error creating sample orders:', error);
      throw error;
    }
  }

  async createSampleConversations() {
    try {
      logger.info('Creating sample conversations...');
      
      // Find orders that need conversations (custom items or quotes)
      const customOrders = this.orders.filter(order => 
        order.hasCustomItems || order.status === 'quote_needed' || order.status === 'quoted'
      );

      const conversationsData = [];

      // Conversation for Custom Wedding Blanket order
      const weddingOrder = customOrders.find(order => 
        order.customerEmail === 'emily.rodriguez@email.com'
      );
      if (weddingOrder) {
        conversationsData.push({
          orderId: weddingOrder._id,
          customerEmail: weddingOrder.customerEmail,
          customerName: weddingOrder.customerName,
          messages: [
            {
              sender: 'admin',
              content: 'Hi Emily! Thank you for your custom wedding blanket order. I see you\'d like blush pink and gold colors with your initials "E&J" and wedding date "06/15/2024". Could you please let me know what size you\'re looking for and any specific pattern preferences?',
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            },
            {
              sender: 'customer',
              content: 'Hi! Thank you for reaching out. We\'d love a throw-size blanket, approximately 50x60 inches. For the pattern, we really like the granny square style but with a more elegant touch. Could you incorporate some gold metallic thread for accents?',
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
            },
            {
              sender: 'admin',
              content: 'That sounds absolutely beautiful! A 50x60 granny square throw with blush pink, gold accents, and metallic thread details will be stunning. Based on the size, materials, and custom work involved, the total would be $145. This includes the personalized initials and date embroidered in a corner. Would you like to proceed?',
              timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
              isQuote: true,
              quoteAmount: 145.00
            }
          ],
          isActive: true
        });
      }

      // Conversation for Custom Amigurumi order
      const amigurumiOrder = customOrders.find(order => 
        order.customerEmail === 'lisa.park@email.com'
      );
      if (amigurumiOrder) {
        conversationsData.push({
          orderId: amigurumiOrder._id,
          customerEmail: amigurumiOrder.customerEmail,
          customerName: amigurumiOrder.customerName,
          messages: [
            {
              sender: 'admin',
              content: 'Hello Lisa! I received your request for a custom amigurumi of your cat Whiskers. The photos you sent are adorable! I can definitely create an orange tabby with white chest and paws. What size would you prefer - small (6 inches), medium (8 inches), or large (10 inches)?',
              timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
            },
            {
              sender: 'customer',
              content: 'Thank you! I\'d love the medium size (8 inches). Whiskers has very distinctive green eyes and a pink nose - could you include those details? Also, he has a little white spot on his forehead that looks like a heart.',
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            },
            {
              sender: 'admin',
              content: 'Perfect! I love adding those special details that make each piece unique. An 8-inch custom amigurumi with green safety eyes, pink embroidered nose, and the heart-shaped white spot will be $65. The estimated completion time is 2-3 weeks. Does this work for you?',
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
              isQuote: true,
              quoteAmount: 65.00
            },
            {
              sender: 'customer',
              content: 'That sounds perfect and the price is very reasonable! Yes, please go ahead. I\'m so excited to see how it turns out!',
              timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
            }
          ],
          isActive: true
        });
      }

      if (conversationsData.length > 0) {
        this.conversations = await Conversation.insertMany(conversationsData);
        logger.info(`Created ${this.conversations.length} sample conversations`);
      } else {
        logger.info('No conversations created - no custom orders found');
      }

      return this.conversations;
    } catch (error) {
      logger.error('Error creating sample conversations:', error);
      throw error;
    }
  }

  async seedAll() {
    try {
      logger.info('Starting database seeding...');
      
      await this.connect();
      await this.clearDatabase();
      
      await this.createAdminUser();
      await this.createCategories();
      await this.createItems();
      await this.createSampleOrders();
      await this.createSampleConversations();
      
      logger.info('Database seeding completed successfully!');
      logger.info('='.repeat(50));
      logger.info('SEEDING SUMMARY:');
      logger.info(`Admin User: ${this.adminUser.username} (${this.adminUser.email})`);
      logger.info(`Password: admin123`);
      logger.info(`Categories: ${this.categories.length}`);
      logger.info(`Items: ${this.items.length}`);
      logger.info(`Orders: ${this.orders.length}`);
      logger.info(`Conversations: ${this.conversations.length}`);
      logger.info('='.repeat(50));
      
    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async reset() {
    try {
      logger.info('Resetting database...');
      await this.connect();
      await this.clearDatabase();
      logger.info('Database reset completed successfully!');
    } catch (error) {
      logger.error('Database reset failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
async function main() {
  const seeder = new DatabaseSeeder();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'reset':
        await seeder.reset();
        break;
      case 'seed':
      default:
        await seeder.seedAll();
        break;
    }
    process.exit(0);
  } catch (error) {
    logger.error('Seeding process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseSeeder;
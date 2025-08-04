#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

// Import AdminUser model
const AdminUser = require('../src/models/AdminUser');

async function createAdminUser() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });
    
    console.log('Connected to MongoDB successfully');
    
    // Check if admin user already exists
    const existingAdmin = await AdminUser.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      console.log('Active:', existingAdmin.isActive);
      return;
    }
    
    // Create admin user
    console.log('Creating admin user...');
    
    const adminData = {
      username: 'admin',
      email: 'admin@crochetbusiness.com',
      firstName: 'Admin',
      lastName: 'User',
      isActive: true
    };

    const adminUser = await AdminUser.createWithPassword(adminData, 'admin123');
    
    console.log('✅ Admin user created successfully!');
    console.log('Username:', adminUser.username);
    console.log('Email:', adminUser.email);
    console.log('Password: admin123');
    console.log('');
    console.log('You can now login with:');
    console.log('POST /api/v1/admin/auth/login');
    console.log('Body: { "username": "admin", "password": "admin123" }');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 11000) {
      console.log('Admin user might already exist. Checking...');
      try {
        const existingAdmin = await AdminUser.findOne({ 
          $or: [
            { username: 'admin' },
            { email: 'admin@crochetbusiness.com' }
          ]
        });
        if (existingAdmin) {
          console.log('Found existing admin user:', existingAdmin.username);
          console.log('Email:', existingAdmin.email);
          console.log('Active:', existingAdmin.isActive);
        }
      } catch (findError) {
        console.error('Error checking for existing admin:', findError.message);
      }
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createAdminUser();
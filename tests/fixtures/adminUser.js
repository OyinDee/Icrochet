const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { AdminUser } = require('../../src/models');
const config = require('../../src/config');

/**
 * Create a test admin user
 * @returns {Promise<Object>} Created admin user
 */
async function createTestAdmin() {
  const hashedPassword = await bcrypt.hash('testpassword123', 10);
  
  const adminData = {
    username: 'testadmin',
    email: 'admin@test.com',
    passwordHash: hashedPassword
  };

  const admin = new AdminUser(adminData);
  await admin.save();
  
  return admin;
}

/**
 * Get JWT token for test admin
 * @returns {Promise<string>} JWT token
 */
async function getAdminToken() {
  // Create admin if doesn't exist
  let admin = await AdminUser.findOne({ username: 'testadmin' });
  if (!admin) {
    admin = await createTestAdmin();
  }

  const payload = {
    id: admin._id,
    username: admin.username,
    email: admin.email,
    type: 'admin'
  };

  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

/**
 * Create multiple test admin users
 * @param {number} count - Number of admin users to create
 * @returns {Promise<Array>} Array of created admin users
 */
async function createTestAdmins(count = 3) {
  const admins = [];
  
  for (let i = 0; i < count; i++) {
    const hashedPassword = await bcrypt.hash(`testpassword${i}`, 10);
    
    const adminData = {
      username: `testadmin${i}`,
      email: `admin${i}@test.com`,
      passwordHash: hashedPassword
    };

    const admin = new AdminUser(adminData);
    await admin.save();
    admins.push(admin);
  }
  
  return admins;
}

module.exports = {
  createTestAdmin,
  getAdminToken,
  createTestAdmins
};
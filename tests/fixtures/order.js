const { Order, Item, Category } = require('../../src/models');

/**
 * Create a test order
 * @param {Object} overrides - Override default order data
 * @returns {Promise<Object>} Created order
 */
async function createTestOrder(overrides = {}) {
  // Create test category and item first
  const category = new Category({
    name: 'Test Category',
    description: 'Test category for orders'
  });
  await category.save();

  const item = new Item({
    name: 'Test Crochet Item',
    description: 'A beautiful test crochet item',
    pricingType: 'fixed',
    price: { fixed: 25.99 },
    categoryId: category._id,
    isAvailable: true,
    imageUrls: ['https://example.com/image1.jpg'],
    availableColors: ['Red', 'Blue', 'Green']
  });
  await item.save();

  const defaultOrderData = {
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    customerPhone: '+1234567890',
    shippingAddress: '123 Main St, Anytown, ST 12345',
    items: [{
      itemId: item._id,
      quantity: 2,
      selectedColor: 'Red',
      unitPrice: 25.99,
      subtotal: 51.98,
      customRequirements: 'Please make it extra soft'
    }],
    totalAmount: 51.98,
    status: 'pending',
    hasCustomItems: false
  };

  const orderData = { ...defaultOrderData, ...overrides };
  const order = new Order(orderData);
  await order.save();
  
  // Populate the order with item details
  await order.populate('items.itemId');
  
  return order;
}

/**
 * Create a test order with custom pricing
 * @param {Object} overrides - Override default order data
 * @returns {Promise<Object>} Created order
 */
async function createTestCustomOrder(overrides = {}) {
  // Create test category and custom item
  const category = new Category({
    name: 'Custom Category',
    description: 'Test category for custom orders'
  });
  await category.save();

  const customItem = new Item({
    name: 'Custom Crochet Item',
    description: 'A custom crochet item requiring quote',
    pricingType: 'custom',
    price: {},
    categoryId: category._id,
    isAvailable: true,
    imageUrls: ['https://example.com/custom-image.jpg'],
    availableColors: ['Custom Color']
  });
  await customItem.save();

  const defaultOrderData = {
    customerName: 'Jane Smith',
    customerEmail: 'jane.smith@example.com',
    customerPhone: '+1987654321',
    shippingAddress: '456 Oak Ave, Another City, ST 67890',
    items: [{
      itemId: customItem._id,
      quantity: 1,
      selectedColor: 'Custom Color',
      customRequirements: 'Custom size and pattern needed'
    }],
    status: 'quote_needed',
    hasCustomItems: true
  };

  const orderData = { ...defaultOrderData, ...overrides };
  const order = new Order(orderData);
  await order.save();
  
  // Populate the order with item details
  await order.populate('items.itemId');
  
  return order;
}

/**
 * Create multiple test orders
 * @param {number} count - Number of orders to create
 * @returns {Promise<Array>} Array of created orders
 */
async function createTestOrders(count = 3) {
  const orders = [];
  
  for (let i = 0; i < count; i++) {
    const order = await createTestOrder({
      customerName: `Customer ${i}`,
      customerEmail: `customer${i}@example.com`,
      status: i % 2 === 0 ? 'pending' : 'confirmed'
    });
    orders.push(order);
  }
  
  return orders;
}

/**
 * Create test order with specific status
 * @param {string} status - Order status
 * @param {Object} overrides - Override default order data
 * @returns {Promise<Object>} Created order
 */
async function createTestOrderWithStatus(status, overrides = {}) {
  return await createTestOrder({ status, ...overrides });
}

module.exports = {
  createTestOrder,
  createTestCustomOrder,
  createTestOrders,
  createTestOrderWithStatus
};
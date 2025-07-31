const express = require('express');
const PublicOrderController = require('../controllers/PublicOrderController');
const { validateBody } = require('../middleware/validation');
const { validateOrderCreate } = require('../utils/validation');

const router = express.Router();
const publicOrderController = new PublicOrderController();

/**
 * @route POST /api/v1/public/orders
 * @desc Create new order (customer order placement)
 * @access Public
 * @body {Object} orderData - Order data including customer info and items
 */
router.post('/', 
  validateBody(require('../utils/validation').orderValidation.create),
  publicOrderController.createOrder.bind(publicOrderController)
);

module.exports = router;
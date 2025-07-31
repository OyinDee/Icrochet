const express = require('express');
const PublicConversationController = require('../controllers/PublicConversationController');
const { validateMultiple, validateParams, validateBody } = require('../middleware/validation');
const { conversationValidation, patterns } = require('../utils/validation');
const Joi = require('joi');

const router = express.Router();
const publicConversationController = new PublicConversationController();

/**
 * @route GET /api/v1/public/conversations/:orderId
 * @desc Get conversation by order ID for customer view
 * @access Public
 */
router.get('/:orderId',
  validateParams(Joi.object({
    orderId: patterns.objectId.required()
  })),
  (req, res) => publicConversationController.getConversationByOrderId(req, res)
);

/**
 * @route POST /api/v1/public/conversations/:orderId/messages
 * @desc Send customer message in conversation
 * @access Public
 */
router.post('/:orderId/messages',
  validateMultiple({
    params: Joi.object({
      orderId: patterns.objectId.required()
    }),
    body: Joi.object({
      content: Joi.string().trim().min(1).max(2000).required()
    })
  }),
  (req, res) => publicConversationController.sendMessage(req, res)
);

module.exports = router;
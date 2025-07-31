const Joi = require('joi');

// Common validation patterns
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ObjectId format');
const email = Joi.string().email().lowercase().trim();
const phone = Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).message('Invalid phone number format');

// Category validation schemas
const categoryValidation = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().max(500).allow('', null)
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    description: Joi.string().trim().max(500).allow('', null)
  }).min(1)
};

// Item validation schemas
const itemValidation = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(200).required(),
    description: Joi.string().trim().max(2000).allow('', null),
    pricingType: Joi.string().valid('fixed', 'range', 'custom').required(),
    price: Joi.object({
      fixed: Joi.when('...pricingType', {
        is: 'fixed',
        then: Joi.number().positive().required(),
        otherwise: Joi.forbidden()
      }),
      min: Joi.when('...pricingType', {
        is: 'range',
        then: Joi.number().min(0).required(),
        otherwise: Joi.forbidden()
      }),
      max: Joi.when('...pricingType', {
        is: 'range',
        then: Joi.number().positive().greater(Joi.ref('min')).required(),
        otherwise: Joi.forbidden()
      })
    }).required(),
    categoryId: objectId.required(),
    isAvailable: Joi.boolean().default(true),
    imageUrls: Joi.array().items(Joi.string().uri()).max(10),
    availableColors: Joi.array().items(Joi.string().trim().min(2).max(50)).max(20)
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(2).max(200),
    description: Joi.string().trim().max(2000).allow('', null),
    pricingType: Joi.string().valid('fixed', 'range', 'custom'),
    price: Joi.object({
      fixed: Joi.when('...pricingType', {
        is: 'fixed',
        then: Joi.number().positive().required(),
        otherwise: Joi.forbidden()
      }),
      min: Joi.when('...pricingType', {
        is: 'range',
        then: Joi.number().min(0).required(),
        otherwise: Joi.forbidden()
      }),
      max: Joi.when('...pricingType', {
        is: 'range',
        then: Joi.number().positive().greater(Joi.ref('min')).required(),
        otherwise: Joi.forbidden()
      })
    }),
    categoryId: objectId,
    isAvailable: Joi.boolean(),
    imageUrls: Joi.array().items(Joi.string().uri()).max(10),
    availableColors: Joi.array().items(Joi.string().trim().min(2).max(50)).max(20)
  }).min(1)
};

// Order validation schemas
const orderValidation = {
  create: Joi.object({
    customerName: Joi.string().trim().min(2).max(100).required(),
    customerEmail: email.required(),
    customerPhone: phone.allow('', null),
    shippingAddress: Joi.string().trim().min(10).max(500).required(),
    items: Joi.array().items(
      Joi.object({
        itemId: objectId.required(),
        quantity: Joi.number().integer().min(1).max(100).required(),
        selectedColor: Joi.string().trim().max(50).allow('', null),
        customRequirements: Joi.string().trim().max(1000).allow('', null)
      })
    ).min(1).required(),
    notes: Joi.string().trim().max(1000).allow('', null)
  }),
  
  updateStatus: Joi.object({
    status: Joi.string().valid('pending', 'quote_needed', 'quoted', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').required(),
    notes: Joi.string().trim().max(1000).allow('', null)
  }),
  
  quote: Joi.object({
    totalAmount: Joi.number().positive().required(),
    notes: Joi.string().trim().max(1000).allow('', null)
  })
};

// Conversation validation schemas
const conversationValidation = {
  sendMessage: Joi.object({
    content: Joi.string().trim().min(1).max(2000).required(),
    isQuote: Joi.boolean().default(false),
    quoteAmount: Joi.when('isQuote', {
      is: true,
      then: Joi.number().positive().required(),
      otherwise: Joi.forbidden()
    })
  })
};

// Admin user validation schemas
const adminUserValidation = {
  login: Joi.object({
    username: Joi.string().trim().required(),
    password: Joi.string().required()
  }),
  
  create: Joi.object({
    username: Joi.string().trim().min(3).max(50).pattern(/^[a-zA-Z0-9_]+$/).required(),
    email: email.required(),
    password: Joi.string().min(8).max(128).required(),
    firstName: Joi.string().trim().max(50).allow('', null),
    lastName: Joi.string().trim().max(50).allow('', null)
  }),
  
  update: Joi.object({
    email: email,
    firstName: Joi.string().trim().max(50).allow('', null),
    lastName: Joi.string().trim().max(50).allow('', null),
    isActive: Joi.boolean()
  }).min(1),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required()
  })
};

// Email validation schemas
const emailValidation = {
  send: Joi.object({
    customerEmail: email.required(),
    customerName: Joi.string().trim().min(2).max(100).required(),
    subject: Joi.string().trim().min(1).max(200).required(),
    message: Joi.string().trim().min(1).max(5000).required(),
    template: Joi.string().valid('custom', 'order_followup', 'quote_discussion', 'shipping_update').default('custom'),
    orderId: objectId.allow(null)
  })
};

// Query parameter validation schemas
const queryValidation = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  
  sorting: Joi.object({
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  search: Joi.object({
    q: Joi.string().trim().min(1).max(100)
  }),
  
  dateRange: Joi.object({
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom'))
  }),
  
  orderFilter: Joi.object({
    status: Joi.string().valid('pending', 'quote_needed', 'quoted', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
    hasCustomItems: Joi.boolean(),
    customerEmail: email
  }),
  
  itemFilter: Joi.object({
    categoryId: objectId,
    isAvailable: Joi.boolean(),
    pricingType: Joi.string().valid('fixed', 'range', 'custom')
  })
};

// Validation helper functions
const validateEmailSend = (data) => {
  return emailValidation.send.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
};

const validateCategoryCreate = (data) => {
  return categoryValidation.create.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
};

const validateCategoryUpdate = (data) => {
  return categoryValidation.update.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
};

const validateItemCreate = (data) => {
  return itemValidation.create.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
};

const validateItemUpdate = (data) => {
  return itemValidation.update.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
};

const validateOrderCreate = (data) => {
  return orderValidation.create.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
};

const validateOrderStatusUpdate = (data) => {
  return orderValidation.updateStatus.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
};

const validateOrderQuote = (data) => {
  return orderValidation.quote.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
};

const validateConversationMessage = (data) => {
  return conversationValidation.sendMessage.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
};

const validateAdminLogin = (data) => {
  return adminUserValidation.login.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
};

// Public item validation schemas
const publicItemValidation = {
  getAllItems: Joi.object({
    query: Joi.object({
      categoryId: objectId,
      pricingType: Joi.string().valid('fixed', 'range', 'custom'),
      color: Joi.string().trim().min(1).max(50),
      minPrice: Joi.number().min(0),
      maxPrice: Joi.number().positive(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    }).custom((value, helpers) => {
      if (value.minPrice && value.maxPrice && value.minPrice >= value.maxPrice) {
        return helpers.error('custom.invalidPriceRange');
      }
      return value;
    }, 'Price range validation').messages({
      'custom.invalidPriceRange': 'minPrice must be less than maxPrice'
    })
  }),

  getItemById: Joi.object({
    params: Joi.object({
      id: objectId.required()
    })
  }),

  getItemsByCategory: Joi.object({
    params: Joi.object({
      categoryId: objectId.required()
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    })
  }),

  searchItems: Joi.object({
    query: Joi.object({
      q: Joi.string().trim().min(1).max(100).required(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    })
  }),

  getItemsByPricingType: Joi.object({
    params: Joi.object({
      pricingType: Joi.string().valid('fixed', 'range', 'custom').required()
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    })
  }),

  getItemsByColor: Joi.object({
    params: Joi.object({
      color: Joi.string().trim().min(2).max(50).required()
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    })
  })
};

module.exports = {
  categoryValidation,
  itemValidation,
  orderValidation,
  conversationValidation,
  adminUserValidation,
  emailValidation,
  queryValidation,
  publicItemValidation,
  patterns: {
    objectId,
    email,
    phone
  },
  // Validation helper functions
  validateEmailSend,
  validateCategoryCreate,
  validateCategoryUpdate,
  validateItemCreate,
  validateItemUpdate,
  validateOrderCreate,
  validateOrderStatusUpdate,
  validateOrderQuote,
  validateConversationMessage,
  validateAdminLogin
};
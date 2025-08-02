const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Crochet Business API',
      version: '1.0.0',
      description: 'Node.js API for iCrochet business management with custom orders, messaging, and flexible pricing',
      contact: {
        name: 'API Support',
        email: 'admin@crochetbusiness.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.crochetbusiness.com/api/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for admin authentication'
        }
      },
      schemas: {
        // Error Response Schema
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Validation failed'
                },
                details: {
                  type: 'object',
                  additionalProperties: true
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        
        // Success Response Schema
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully'
            },
            data: {
              type: 'object',
              additionalProperties: true
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },

        // Pagination Schema
        PaginationMeta: {
          type: 'object',
          properties: {
            currentPage: {
              type: 'integer',
              example: 1
            },
            totalPages: {
              type: 'integer',
              example: 5
            },
            totalItems: {
              type: 'integer',
              example: 50
            },
            itemsPerPage: {
              type: 'integer',
              example: 10
            },
            hasNextPage: {
              type: 'boolean',
              example: true
            },
            hasPrevPage: {
              type: 'boolean',
              example: false
            }
          }
        },

        // Category Schema
        Category: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              format: 'objectid',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'Blankets & Throws'
            },
            description: {
              type: 'string',
              maxLength: 500,
              example: 'Cozy blankets and throws for home decoration and warmth'
            },
            itemCount: {
              type: 'integer',
              example: 5
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          },
          required: ['name']
        },

        // Item Schema
        Item: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              format: 'objectid',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 200,
              example: 'Granny Square Afghan'
            },
            description: {
              type: 'string',
              maxLength: 2000,
              example: 'Classic granny square pattern blanket, perfect for any room. Made with soft acrylic yarn.'
            },
            pricingType: {
              type: 'string',
              enum: ['fixed', 'range', 'custom'],
              example: 'fixed'
            },
            price: {
              type: 'object',
              properties: {
                fixed: {
                  type: 'number',
                  minimum: 0,
                  example: 85.00
                },
                min: {
                  type: 'number',
                  minimum: 0,
                  example: 45.00
                },
                max: {
                  type: 'number',
                  minimum: 0,
                  example: 65.00
                }
              }
            },
            categoryId: {
              type: 'string',
              format: 'objectid',
              example: '507f1f77bcf86cd799439011'
            },
            isAvailable: {
              type: 'boolean',
              example: true
            },
            imageUrls: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri'
              },
              example: ['https://res.cloudinary.com/demo/image/upload/sample.jpg']
            },
            availableColors: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Multi-color', 'Blue & White', 'Pink & White']
            },
            priceDisplay: {
              type: 'string',
              example: '85.00'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          },
          required: ['name', 'pricingType', 'categoryId']
        },

        // Order Item Schema
        OrderItem: {
          type: 'object',
          properties: {
            itemId: {
              type: 'string',
              format: 'objectid',
              example: '507f1f77bcf86cd799439011'
            },
            quantity: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              example: 1
            },
            selectedColor: {
              type: 'string',
              maxLength: 50,
              example: 'Blue & White'
            },
            unitPrice: {
              type: 'number',
              minimum: 0,
              example: 85.00
            },
            subtotal: {
              type: 'number',
              minimum: 0,
              example: 85.00
            },
            customRequirements: {
              type: 'string',
              maxLength: 1000,
              example: 'Please add custom embroidery with initials "JD"'
            }
          },
          required: ['itemId', 'quantity']
        },

        // Order Schema
        Order: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              format: 'objectid',
              example: '507f1f77bcf86cd799439011'
            },
            customerName: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'Sarah Johnson'
            },
            customerEmail: {
              type: 'string',
              format: 'email',
              example: 'sarah.johnson@email.com'
            },
            customerPhone: {
              type: 'string',
              example: '+1-555-0123'
            },
            shippingAddress: {
              type: 'string',
              minLength: 10,
              maxLength: 500,
              example: '123 Main St, Anytown, ST 12345, USA'
            },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrderItem'
              }
            },
            totalAmount: {
              type: 'number',
              minimum: 0,
              example: 85.00
            },
            estimatedAmount: {
              type: 'number',
              minimum: 0,
              example: 85.00
            },
            status: {
              type: 'string',
              enum: ['pending', 'quote_needed', 'quoted', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
              example: 'confirmed'
            },
            hasCustomItems: {
              type: 'boolean',
              example: false
            },
            notes: {
              type: 'string',
              maxLength: 1000,
              example: 'Customer requested rush delivery'
            },
            calculatedTotal: {
              type: 'number',
              example: 85.00
            },
            itemCount: {
              type: 'integer',
              example: 1
            },
            statusDisplay: {
              type: 'string',
              example: 'Confirmed'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          },
          required: ['customerName', 'customerEmail', 'shippingAddress', 'items']
        },

        // Conversation Message Schema
        ConversationMessage: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              format: 'objectid',
              example: '507f1f77bcf86cd799439011'
            },
            sender: {
              type: 'string',
              enum: ['admin', 'customer'],
              example: 'admin'
            },
            content: {
              type: 'string',
              minLength: 1,
              maxLength: 2000,
              example: 'Thank you for your order! I will start working on it right away.'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            isQuote: {
              type: 'boolean',
              example: false
            },
            quoteAmount: {
              type: 'number',
              minimum: 0,
              example: 145.00
            },
            isRead: {
              type: 'boolean',
              example: false
            }
          },
          required: ['sender', 'content']
        },

        // Conversation Schema
        Conversation: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              format: 'objectid',
              example: '507f1f77bcf86cd799439011'
            },
            orderId: {
              type: 'string',
              format: 'objectid',
              example: '507f1f77bcf86cd799439011'
            },
            messages: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ConversationMessage'
              }
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            lastMessageAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            customerEmail: {
              type: 'string',
              format: 'email',
              example: 'sarah.johnson@email.com'
            },
            customerName: {
              type: 'string',
              example: 'Sarah Johnson'
            },
            unreadByAdmin: {
              type: 'integer',
              example: 2
            },
            unreadByCustomer: {
              type: 'integer',
              example: 0
            },
            lastMessage: {
              $ref: '#/components/schemas/ConversationMessage'
            },
            messageCount: {
              type: 'integer',
              example: 5
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          },
          required: ['orderId', 'customerEmail', 'customerName']
        },

        // Admin User Schema
        AdminUser: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              format: 'objectid',
              example: '507f1f77bcf86cd799439011'
            },
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              example: 'admin'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@crochetbusiness.com'
            },
            firstName: {
              type: 'string',
              maxLength: 50,
              example: 'Admin'
            },
            lastName: {
              type: 'string',
              maxLength: 50,
              example: 'User'
            },
            fullName: {
              type: 'string',
              example: 'Admin User'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          },
          required: ['username', 'email']
        },

        // Login Request Schema
        LoginRequest: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Username or email',
              example: 'admin'
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'admin123'
            }
          },
          required: ['identifier', 'password']
        },

        // Login Response Schema
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Login successful'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/AdminUser'
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: {
                      type: 'string',
                      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    },
                    refreshToken: {
                      type: 'string',
                      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    },
                    expiresIn: {
                      type: 'string',
                      example: '24h'
                    }
                  }
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Admin Auth',
        description: 'Admin authentication endpoints'
      },
      {
        name: 'Admin Categories',
        description: 'Admin category management endpoints'
      },
      {
        name: 'Admin Items',
        description: 'Admin item management endpoints'
      },
      {
        name: 'Admin Orders',
        description: 'Admin order management endpoints'
      },
      {
        name: 'Admin Conversations',
        description: 'Admin conversation management endpoints'
      },
      {
        name: 'Admin Upload',
        description: 'Admin file upload endpoints'
      },
      {
        name: 'Admin Email',
        description: 'Admin email management endpoints'
      },
      {
        name: 'Public Items',
        description: 'Public item browsing endpoints'
      },
      {
        name: 'Public Orders',
        description: 'Public order placement endpoints'
      },
      {
        name: 'Public Conversations',
        description: 'Public conversation endpoints'
      },
      {
        name: 'Utility',
        description: 'Utility endpoints (health, info)'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/swagger/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
  options
};
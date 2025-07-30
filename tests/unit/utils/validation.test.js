const {
    categoryValidation,
    itemValidation,
    orderValidation,
    conversationValidation,
    adminUserValidation,
    emailValidation,
    queryValidation,
    patterns
} = require('../../../src/utils/validation');

describe('Validation Schemas', () => {
    describe('Category Validation', () => {
        describe('create', () => {
            it('should validate valid category data', () => {
                const validData = {
                    name: 'Test Category',
                    description: 'A test category description'
                };

                const { error, value } = categoryValidation.create.validate(validData);
                expect(error).toBeUndefined();
                expect(value.name).toBe('Test Category');
            });

            it('should require name field', () => {
                const invalidData = {
                    description: 'A test category description'
                };

                const { error } = categoryValidation.create.validate(invalidData);
                expect(error).toBeDefined();
                expect(error.details[0].path).toEqual(['name']);
            });

            it('should trim and validate name length', () => {
                const invalidData = {
                    name: 'A' // Too short
                };

                const { error } = categoryValidation.create.validate(invalidData);
                expect(error).toBeDefined();
            });
        });

        describe('update', () => {
            it('should validate partial update data', () => {
                const validData = {
                    name: 'Updated Category'
                };

                const { error, value } = categoryValidation.update.validate(validData);
                expect(error).toBeUndefined();
                expect(value.name).toBe('Updated Category');
            });

            it('should require at least one field', () => {
                const invalidData = {};

                const { error } = categoryValidation.update.validate(invalidData);
                expect(error).toBeDefined();
            });
        });
    });

    describe('Item Validation', () => {
        describe('create', () => {
            it('should validate fixed pricing item', () => {
                const validData = {
                    name: 'Test Item',
                    description: 'A test item',
                    pricingType: 'fixed',
                    price: { fixed: 25.99 },
                    categoryId: '507f1f77bcf86cd799439011',
                    availableColors: ['Red', 'Blue']
                };

                const { error, value } = itemValidation.create.validate(validData);
                expect(error).toBeUndefined();
                expect(value.pricingType).toBe('fixed');
                expect(value.price.fixed).toBe(25.99);
            });

            it('should validate range pricing item', () => {
                const validData = {
                    name: 'Test Item',
                    pricingType: 'range',
                    price: { min: 10, max: 50 },
                    categoryId: '507f1f77bcf86cd799439011'
                };

                const { error, value } = itemValidation.create.validate(validData);
                expect(error).toBeUndefined();
                expect(value.price.min).toBe(10);
                expect(value.price.max).toBe(50);
            });

            it('should validate custom pricing item', () => {
                const validData = {
                    name: 'Custom Item',
                    pricingType: 'custom',
                    price: {},
                    categoryId: '507f1f77bcf86cd799439011'
                };

                const { error } = itemValidation.create.validate(validData);
                expect(error).toBeUndefined();
            });

            it('should reject invalid pricing type combinations', () => {
                const invalidData = {
                    name: 'Test Item',
                    pricingType: 'fixed',
                    price: { min: 10, max: 50 }, // Wrong price structure for fixed
                    categoryId: '507f1f77bcf86cd799439011'
                };

                const { error } = itemValidation.create.validate(invalidData);
                expect(error).toBeDefined();
            });

            it('should validate image URLs', () => {
                const validData = {
                    name: 'Test Item',
                    pricingType: 'fixed',
                    price: { fixed: 25.99 },
                    categoryId: '507f1f77bcf86cd799439011',
                    imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
                };

                const { error } = itemValidation.create.validate(validData);
                expect(error).toBeUndefined();
            });

            it('should reject invalid image URLs', () => {
                const invalidData = {
                    name: 'Test Item',
                    pricingType: 'fixed',
                    price: { fixed: 25.99 },
                    categoryId: '507f1f77bcf86cd799439011',
                    imageUrls: ['not-a-url', 'also-not-a-url']
                };

                const { error } = itemValidation.create.validate(invalidData);
                expect(error).toBeDefined();
            });
        });
    });

    describe('Order Validation', () => {
        describe('create', () => {
            it('should validate valid order data', () => {
                const validData = {
                    customerName: 'John Doe',
                    customerEmail: 'john@example.com',
                    customerPhone: '+1234567890',
                    shippingAddress: '123 Main St, City, State 12345',
                    items: [{
                        itemId: '507f1f77bcf86cd799439011',
                        quantity: 2,
                        selectedColor: 'Red'
                    }]
                };

                const { error, value } = orderValidation.create.validate(validData);
                expect(error).toBeUndefined();
                expect(value.customerEmail).toBe('john@example.com');
                expect(value.items).toHaveLength(1);
            });

            it('should require at least one item', () => {
                const invalidData = {
                    customerName: 'John Doe',
                    customerEmail: 'john@example.com',
                    shippingAddress: '123 Main St, City, State 12345',
                    items: []
                };

                const { error } = orderValidation.create.validate(invalidData);
                expect(error).toBeDefined();
            });

            it('should validate email format', () => {
                const invalidData = {
                    customerName: 'John Doe',
                    customerEmail: 'invalid-email',
                    shippingAddress: '123 Main St, City, State 12345',
                    items: [{
                        itemId: '507f1f77bcf86cd799439011',
                        quantity: 1
                    }]
                };

                const { error } = orderValidation.create.validate(invalidData);
                expect(error).toBeDefined();
            });
        });

        describe('updateStatus', () => {
            it('should validate status update', () => {
                const validData = {
                    status: 'processing',
                    notes: 'Order is being processed'
                };

                const { error } = orderValidation.updateStatus.validate(validData);
                expect(error).toBeUndefined();
            });

            it('should reject invalid status', () => {
                const invalidData = {
                    status: 'invalid-status'
                };

                const { error } = orderValidation.updateStatus.validate(invalidData);
                expect(error).toBeDefined();
            });
        });

        describe('quote', () => {
            it('should validate quote data', () => {
                const validData = {
                    totalAmount: 150.50,
                    notes: 'Custom quote for special requirements'
                };

                const { error } = orderValidation.quote.validate(validData);
                expect(error).toBeUndefined();
            });

            it('should require positive total amount', () => {
                const invalidData = {
                    totalAmount: -50
                };

                const { error } = orderValidation.quote.validate(invalidData);
                expect(error).toBeDefined();
            });
        });
    });

    describe('Conversation Validation', () => {
        describe('sendMessage', () => {
            it('should validate regular message', () => {
                const validData = {
                    content: 'Hello, I have a question about my order.'
                };

                const { error } = conversationValidation.sendMessage.validate(validData);
                expect(error).toBeUndefined();
            });

            it('should validate quote message', () => {
                const validData = {
                    content: 'Here is your custom quote.',
                    isQuote: true,
                    quoteAmount: 75.00
                };

                const { error } = conversationValidation.sendMessage.validate(validData);
                expect(error).toBeUndefined();
            });

            it('should require quote amount when isQuote is true', () => {
                const invalidData = {
                    content: 'Here is your quote.',
                    isQuote: true
                    // Missing quoteAmount
                };

                const { error } = conversationValidation.sendMessage.validate(invalidData);
                expect(error).toBeDefined();
            });

            it('should reject empty content', () => {
                const invalidData = {
                    content: ''
                };

                const { error } = conversationValidation.sendMessage.validate(invalidData);
                expect(error).toBeDefined();
            });
        });
    });

    describe('Admin User Validation', () => {
        describe('login', () => {
            it('should validate login data', () => {
                const validData = {
                    username: 'admin',
                    password: 'password123'
                };

                const { error } = adminUserValidation.login.validate(validData);
                expect(error).toBeUndefined();
            });

            it('should require both username and password', () => {
                const invalidData = {
                    username: 'admin'
                    // Missing password
                };

                const { error } = adminUserValidation.login.validate(invalidData);
                expect(error).toBeDefined();
            });
        });

        describe('create', () => {
            it('should validate admin user creation', () => {
                const validData = {
                    username: 'newadmin',
                    email: 'admin@example.com',
                    password: 'securepassword123',
                    firstName: 'John',
                    lastName: 'Doe'
                };

                const { error } = adminUserValidation.create.validate(validData);
                expect(error).toBeUndefined();
            });

            it('should validate username pattern', () => {
                const invalidData = {
                    username: 'invalid-username!', // Contains invalid characters
                    email: 'admin@example.com',
                    password: 'securepassword123'
                };

                const { error } = adminUserValidation.create.validate(invalidData);
                expect(error).toBeDefined();
            });

            it('should require minimum password length', () => {
                const invalidData = {
                    username: 'admin',
                    email: 'admin@example.com',
                    password: '123' // Too short
                };

                const { error } = adminUserValidation.create.validate(invalidData);
                expect(error).toBeDefined();
            });
        });
    });

    describe('Query Validation', () => {
        describe('pagination', () => {
            it('should validate pagination parameters', () => {
                const validData = {
                    page: 2,
                    limit: 20
                };

                const { error, value } = queryValidation.pagination.validate(validData);
                expect(error).toBeUndefined();
                expect(value.page).toBe(2);
                expect(value.limit).toBe(20);
            });

            it('should apply default values', () => {
                const { error, value } = queryValidation.pagination.validate({});
                expect(error).toBeUndefined();
                expect(value.page).toBe(1);
                expect(value.limit).toBe(10);
            });

            it('should enforce maximum limit', () => {
                const invalidData = {
                    limit: 200 // Exceeds maximum
                };

                const { error } = queryValidation.pagination.validate(invalidData);
                expect(error).toBeDefined();
            });
        });

        describe('dateRange', () => {
            it('should validate date range', () => {
                const validData = {
                    dateFrom: '2023-01-01T00:00:00.000Z',
                    dateTo: '2023-12-31T23:59:59.999Z'
                };

                const { error } = queryValidation.dateRange.validate(validData);
                expect(error).toBeUndefined();
            });

            it('should reject invalid date range', () => {
                const invalidData = {
                    dateFrom: '2023-12-31T00:00:00.000Z',
                    dateTo: '2023-01-01T00:00:00.000Z' // dateTo before dateFrom
                };

                const { error } = queryValidation.dateRange.validate(invalidData);
                expect(error).toBeDefined();
            });
        });
    });

    describe('Pattern Validation', () => {
        describe('objectId', () => {
            it('should validate valid ObjectId', () => {
                const validId = '507f1f77bcf86cd799439011';
                const { error } = patterns.objectId.validate(validId);
                expect(error).toBeUndefined();
            });

            it('should reject invalid ObjectId', () => {
                const invalidId = 'invalid-id';
                const { error } = patterns.objectId.validate(invalidId);
                expect(error).toBeDefined();
            });
        });

        describe('email', () => {
            it('should validate and normalize email', () => {
                const email = 'TEST@EXAMPLE.COM';
                const { error, value } = patterns.email.validate(email);
                expect(error).toBeUndefined();
                expect(value).toBe('test@example.com');
            });

            it('should reject invalid email', () => {
                const invalidEmail = 'not-an-email';
                const { error } = patterns.email.validate(invalidEmail);
                expect(error).toBeDefined();
            });
        });

        describe('phone', () => {
            it('should validate phone number', () => {
                const validPhone = '+1234567890';
                const { error } = patterns.phone.validate(validPhone);
                expect(error).toBeUndefined();
            });

            it('should reject invalid phone number', () => {
                const invalidPhone = 'not-a-phone';
                const { error } = patterns.phone.validate(invalidPhone);
                expect(error).toBeDefined();
            });
        });
    });
});
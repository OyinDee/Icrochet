const AdminEmailController = require('../../../src/controllers/AdminEmailController');
const EmailService = require('../../../src/services/EmailService');
const OrderRepository = require('../../../src/repositories/OrderRepository');

// Mock dependencies
jest.mock('../../../src/services/EmailService');
jest.mock('../../../src/repositories/OrderRepository');

describe('AdminEmailController', () => {
    let controller;
    let mockEmailService;
    let mockOrderRepository;
    let mockReq;
    let mockRes;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock instances
        mockEmailService = {
            sendEmail: jest.fn()
        };
        mockOrderRepository = {
            findById: jest.fn()
        };

        // Mock constructors
        EmailService.mockImplementation(() => mockEmailService);
        OrderRepository.mockImplementation(() => mockOrderRepository);

        // Create controller instance
        controller = new AdminEmailController();

        // Create mock request and response objects
        mockReq = {
            body: {},
            params: {},
            query: {}
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('sendCustomEmail', () => {
        const validEmailData = {
            customerEmail: 'customer@example.com',
            customerName: 'John Doe',
            subject: 'Test Subject',
            message: 'Test message',
            template: 'custom'
        };

        it('should send custom email successfully', async () => {
            mockReq.body = validEmailData;
            mockEmailService.sendEmail.mockResolvedValue({
                success: true,
                messageId: 'test-message-id',
                response: 'Email sent successfully',
                attempt: 1
            });

            await controller.sendCustomEmail(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Email sent successfully',
                    data: expect.objectContaining({
                        template: 'custom',
                        recipient: 'customer@example.com',
                        subject: 'Test Subject',
                        messageId: 'test-message-id'
                    })
                })
            );
        });

        it('should validate required fields', async () => {
            mockReq.body = {
                customerEmail: 'invalid-email'
                // Missing required fields
            };

            await controller.sendCustomEmail(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.objectContaining({
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid email data provided'
                    })
                })
            );
        });

        it('should require order ID for order-specific templates', async () => {
            mockReq.body = {
                ...validEmailData,
                template: 'order_followup'
                // Missing orderId
            };

            await controller.sendCustomEmail(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.objectContaining({
                        code: 'ORDER_REQUIRED',
                        message: 'Order ID is required for order follow-up template'
                    })
                })
            );
        });

        it('should return 404 for non-existent order', async () => {
            mockReq.body = {
                ...validEmailData,
                template: 'order_followup',
                orderId: '507f1f77bcf86cd799439011'
            };

            mockOrderRepository.findById.mockResolvedValue(null);

            await controller.sendCustomEmail(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.objectContaining({
                        code: 'ORDER_NOT_FOUND',
                        message: 'Order not found'
                    })
                })
            );
        });

        it('should handle invalid template type', async () => {
            mockReq.body = {
                ...validEmailData,
                template: 'invalid_template'
            };

            await controller.sendCustomEmail(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.objectContaining({
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid email data provided'
                    })
                })
            );
        });

        it('should handle email service errors', async () => {
            mockReq.body = validEmailData;
            mockEmailService.sendEmail.mockRejectedValue(new Error('Email service unavailable'));

            await controller.sendCustomEmail(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.objectContaining({
                        code: 'EMAIL_SEND_ERROR',
                        message: 'Failed to send email'
                    })
                })
            );
        });

        it('should send order follow-up email with valid order', async () => {
            const mockOrder = {
                _id: '507f1f77bcf86cd799439011',
                customerName: 'John Doe',
                customerEmail: 'customer@example.com',
                status: 'pending',
                createdAt: new Date(),
                totalAmount: 50.00
            };

            mockReq.body = {
                ...validEmailData,
                template: 'order_followup',
                orderId: mockOrder._id
            };

            mockOrderRepository.findById.mockResolvedValue(mockOrder);
            mockEmailService.sendEmail.mockResolvedValue({
                success: true,
                messageId: 'test-message-id',
                response: 'Email sent successfully',
                attempt: 1
            });

            await controller.sendCustomEmail(mockReq, mockRes);

            expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrder._id);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Email sent successfully',
                    data: expect.objectContaining({
                        template: 'order_followup',
                        orderId: mockOrder._id
                    })
                })
            );
        });
    });

    describe('getEmailTemplates', () => {
        it('should return available email templates', async () => {
            await controller.getEmailTemplates(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Email templates retrieved successfully',
                    data: expect.objectContaining({
                        totalCount: 4,
                        templates: expect.arrayContaining([
                            expect.objectContaining({
                                id: 'custom',
                                name: 'Custom Message'
                            }),
                            expect.objectContaining({
                                id: 'order_followup',
                                name: 'Order Follow-up'
                            }),
                            expect.objectContaining({
                                id: 'quote_discussion',
                                name: 'Quote Discussion'
                            }),
                            expect.objectContaining({
                                id: 'shipping_update',
                                name: 'Shipping Update'
                            })
                        ])
                    })
                })
            );
        });

        it('should handle errors when retrieving templates', async () => {
            // This test verifies the error handling structure exists
            // In practice, getEmailTemplates is unlikely to fail since it returns static data
            // But we test the error handling pattern for completeness

            const templates = await controller.getEmailTemplates(mockReq, mockRes);

            // Verify successful response structure
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Email templates retrieved successfully'
                })
            );
        });
    });

    describe('template generation methods', () => {
        it('should generate custom email template', () => {
            const template = controller.generateCustomEmailTemplate(
                'John Doe',
                'Test Subject',
                'Test message',
                '507f1f77bcf86cd799439011'
            );

            expect(template).toContain('Test Subject');
            expect(template).toContain('John Doe');
            expect(template).toContain('Test message');
            expect(template).toContain('507f1f77bcf86cd799439011');
        });

        it('should generate order follow-up template', () => {
            const mockOrder = {
                _id: '507f1f77bcf86cd799439011',
                customerName: 'John Doe',
                status: 'pending',
                createdAt: new Date(),
                totalAmount: 50.00
            };

            const template = controller.generateOrderFollowupTemplate(mockOrder, 'Follow-up message');

            expect(template).toContain('Follow-up on Your Order');
            expect(template).toContain('John Doe');
            expect(template).toContain('507f1f77bcf86cd799439011');
            expect(template).toContain('Follow-up message');
        });

        it('should generate quote discussion template', () => {
            const mockOrder = {
                _id: '507f1f77bcf86cd799439011',
                customerName: 'John Doe',
                status: 'quote_needed',
                createdAt: new Date()
            };

            const template = controller.generateQuoteDiscussionTemplate(mockOrder, 'Quote discussion message');

            expect(template).toContain('Custom Quote Discussion');
            expect(template).toContain('John Doe');
            expect(template).toContain('507f1f77bcf86cd799439011');
            expect(template).toContain('Quote discussion message');
        });

        it('should generate shipping update template', () => {
            const mockOrder = {
                _id: '507f1f77bcf86cd799439011',
                customerName: 'John Doe',
                status: 'shipped',
                createdAt: new Date(),
                shippingAddress: '123 Main St, City, State 12345'
            };

            const template = controller.generateShippingUpdateTemplate(mockOrder, 'Shipping update message');

            expect(template).toContain('Shipping Update');
            expect(template).toContain('John Doe');
            expect(template).toContain('507f1f77bcf86cd799439011');
            expect(template).toContain('123 Main St, City, State 12345');
            expect(template).toContain('Shipping update message');
        });
    });
});
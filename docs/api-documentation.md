# Crochet Business API Documentation

## Overview

The Crochet Business API is a comprehensive Node.js REST API designed for managing a crochet business with custom orders, real-time messaging, and flexible pricing. The API supports both admin operations and public customer interactions.

## Features

- **Flexible Pricing**: Support for fixed, range, and custom pricing types
- **Real-time Messaging**: Socket.io integration for live conversations
- **Image Management**: Cloudinary integration for image uploads and transformations
- **Email Notifications**: Automated email system with templates
- **Order Management**: Complete order lifecycle management
- **Category Management**: Organize items by categories
- **Admin Authentication**: JWT-based authentication for admin users

## API Documentation

### Interactive Documentation
- **Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **API Info**: [http://localhost:3000/api/v1/info](http://localhost:3000/api/v1/info)
- **Health Check**: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

### Base URL
```
Development: http://localhost:3000/api/v1
Production: https://icrochet.vercel.app
```

## Authentication

### Admin Authentication
Admin endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Getting Started
1. Login with admin credentials:
   ```http
   POST /api/v1/admin/auth/login
   Content-Type: application/json

   {
     "identifier": "admin",
     "password": "admin123"
   }
   ```

2. Use the returned access token for authenticated requests.

## API Endpoints

### Admin Endpoints

#### Authentication (`/admin/auth`)
- `POST /login` - Admin login
- `POST /refresh` - Refresh access token
- `GET /profile` - Get current admin profile
- `PUT /change-password` - Change admin password
- `POST /logout` - Admin logout
- `GET /validate` - Validate token

#### Categories (`/admin/categories`)
- `GET /` - Get all categories with pagination and filtering
- `POST /` - Create new category
- `GET /statistics` - Get category statistics
- `POST /bulk` - Bulk create categories
- `GET /:id` - Get category by ID
- `PUT /:id` - Update category
- `DELETE /:id` - Delete category

#### Items (`/admin/items`)
- `GET /` - Get all items with filtering and pagination
- `POST /` - Create new item
- `GET /statistics` - Get item statistics
- `GET /colors` - Get all unique colors
- `GET /search` - Search items
- `GET /category/:categoryId` - Get items by category
- `GET /:id` - Get item by ID
- `PUT /:id` - Update item
- `PUT /:id/availability` - Update item availability
- `DELETE /:id` - Delete item

#### Orders (`/admin/orders`)
- `GET /` - Get all orders with filtering and pagination
- `GET /statistics` - Get order statistics
- `GET /recent` - Get recent orders
- `GET /quotes-needed` - Get orders needing quotes
- `GET /search` - Search orders
- `GET /status/:status` - Get orders by status
- `GET /:id` - Get order by ID
- `PUT /:id/status` - Update order status
- `PUT /:id/quote` - Set custom quote for order

#### Conversations (`/admin/conversations`)
- `GET /` - Get all conversations with filtering
- `GET /statistics` - Get conversation statistics
- `GET /unread` - Get conversations with unread messages
- `GET /search` - Search conversations
- `GET /:id` - Get conversation by ID
- `POST /:id/messages` - Add message to conversation
- `PUT /:id/mark-read` - Mark messages as read
- `PUT /:id/archive` - Archive conversation
- `PUT /:id/reactivate` - Reactivate conversation

#### Upload (`/admin/upload`)
- `POST /image` - Upload single image
- `POST /images` - Upload multiple images
- `DELETE /delete` - Delete image from Cloudinary
- `POST /transform` - Transform existing image

#### Email (`/admin/emails`)
- `POST /send` - Send custom email to customer
- `GET /templates` - Get email templates
- `GET /templates/:templateId` - Get email template by ID
- `POST /send-template` - Send templated email
- `GET /history` - Get email history

### Public Endpoints

#### Items (`/public/items`)
- `GET /` - Get all available items with filtering
- `GET /search` - Search available items
- `GET /colors` - Get all available colors
- `GET /pricing/:pricingType` - Get items by pricing type
- `GET /color/:color` - Get items by color
- `GET /category/:categoryId` - Get items by category
- `GET /:id` - Get specific item by ID

#### Orders (`/public/orders`)
- `POST /` - Create new order (customer order placement)

#### Conversations (`/public/conversations`)
- `GET /:orderId` - Get conversation by order ID (requires customer email)
- `POST /:orderId` - Add message to conversation (customer message)
- `PUT /:orderId/mark-read` - Mark admin messages as read

### Utility Endpoints

#### Health & Info
- `GET /health` - API health check
- `GET /info` - API information and endpoints

## Data Models

### Item
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Granny Square Afghan",
  "description": "Classic granny square pattern blanket...",
  "pricingType": "fixed",
  "price": {
    "fixed": 85.00
  },
  "categoryId": "507f1f77bcf86cd799439012",
  "isAvailable": true,
  "imageUrls": ["https://res.cloudinary.com/demo/image/upload/sample.jpg"],
  "availableColors": ["Multi-color", "Blue & White", "Pink & White"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Order
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "customerName": "Sarah Johnson",
  "customerEmail": "sarah.johnson@email.com",
  "customerPhone": "+1-555-0123",
  "shippingAddress": "123 Main St, Anytown, ST 12345, USA",
  "items": [
    {
      "itemId": "507f1f77bcf86cd799439011",
      "quantity": 1,
      "selectedColor": "Blue & White",
      "unitPrice": 85.00,
      "subtotal": 85.00
    }
  ],
  "totalAmount": 85.00,
  "status": "confirmed",
  "hasCustomItems": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Category
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "name": "Blankets & Throws",
  "description": "Cozy blankets and throws for home decoration and warmth",
  "itemCount": 5,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Pricing Types

### Fixed Pricing
Items with a set price:
```json
{
  "pricingType": "fixed",
  "price": {
    "fixed": 85.00
  }
}
```

### Range Pricing
Items with a price range:
```json
{
  "pricingType": "range",
  "price": {
    "min": 45.00,
    "max": 65.00
  }
}
```

### Custom Pricing
Items requiring quotes:
```json
{
  "pricingType": "custom",
  "price": {}
}
```

## Order Statuses

- `pending` - Order received, awaiting processing
- `quote_needed` - Custom order requiring price quote
- `quoted` - Quote provided, awaiting customer approval
- `confirmed` - Order confirmed and approved
- `processing` - Order is being worked on
- `shipped` - Order has been shipped
- `delivered` - Order has been delivered
- `cancelled` - Order has been cancelled

## Error Handling

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Access denied
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Resource already exists
- `INTERNAL_SERVER_ERROR` - Server error

## Pagination

List endpoints support pagination with the following parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100 for admin, 50 for public)
- `sortBy` - Field to sort by
- `sortOrder` - Sort order (`asc` or `desc`)

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## Real-time Features

### Socket.io Integration
The API includes Socket.io for real-time messaging:

- **Connection**: Connect to `/socket.io/`
- **Events**: 
  - `new_message` - New conversation message
  - `order_status_update` - Order status changed
  - `quote_ready` - Custom quote is ready

### Example Socket.io Usage
```javascript
const socket = io('http://localhost:3000');

socket.on('new_message', (data) => {
  console.log('New message:', data);
});

socket.on('order_status_update', (data) => {
  console.log('Order status updated:', data);
});
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Admin endpoints**: 1000 requests per hour
- **Public endpoints**: 100 requests per hour
- **Upload endpoints**: 50 requests per hour

## File Upload

### Image Upload
- **Supported formats**: JPEG, PNG, WebP
- **Maximum file size**: 10MB
- **Storage**: Cloudinary
- **Transformations**: Automatic optimization and resizing

### Upload Response
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/demo/image/upload/v1234567890/items/sample.jpg",
    "publicId": "items/sample",
    "width": 800,
    "height": 600,
    "format": "jpg",
    "bytes": 245760
  }
}
```

## Environment Variables

Required environment variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/crochet-business
MONGODB_TEST_URI=mongodb://localhost:27017/crochet-business-test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Admin Configuration
ADMIN_EMAIL=admin@crochetbusiness.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Seed Database**
   ```bash
   npm run seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Documentation**
   - Swagger UI: http://localhost:3000/api-docs
   - API Info: http://localhost:3000/api/v1/info

## Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Support

For API support and questions:
- Email: admin@crochetbusiness.com
- Documentation: http://localhost:3000/api-docs
- Health Check: http://localhost:3000/api/v1/health

## License

MIT License - see LICENSE file for details.
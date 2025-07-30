# Crochet Business API

A comprehensive Node.js API for managing a crochet business with support for custom orders, flexible pricing, real-time messaging, and customer communication.

## Features

- **Product Management**: CRUD operations for crochet items with flexible pricing (fixed, range, custom)
- **Category Management**: Organize products into categories
- **Order Management**: Handle customer orders with custom requirements
- **Real-time Messaging**: Admin-customer chat for custom order discussions
- **Email Notifications**: Automated emails for order updates and communications
- **Image Upload**: Cloudinary integration for product images
- **Authentication**: JWT-based admin authentication
- **Flexible Pricing**: Support for fixed prices, price ranges, and custom quotes

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Image Storage**: Cloudinary
- **Email**: Nodemailer
- **Real-time Communication**: Socket.io
- **Testing**: Jest with MongoDB Memory Server

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account
- Email service (Gmail, SendGrid, etc.)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   copy .env.example .env
   ```

4. Fill in your environment variables in `.env`

5. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

See `.env.example` for all required environment variables including:
- MongoDB connection string
- JWT secrets
- Cloudinary credentials
- Email service configuration
- Admin user credentials

## API Endpoints

### Admin Endpoints (Protected)
- `POST /api/v1/admin/auth/login` - Admin login
- `GET /api/v1/admin/items` - Get all items
- `POST /api/v1/admin/items` - Create new item
- `PUT /api/v1/admin/items/:id` - Update item
- `DELETE /api/v1/admin/items/:id` - Delete item
- `GET /api/v1/admin/orders` - Get all orders
- `PUT /api/v1/admin/orders/:id/quote` - Set custom quote
- `GET /api/v1/admin/conversations` - Get all conversations
- `POST /api/v1/admin/conversations/:orderId/messages` - Send message

### Public Endpoints
- `GET /api/v1/public/items` - Browse available items
- `GET /api/v1/public/items/:id` - Get item details
- `POST /api/v1/public/orders` - Place order
- `GET /api/v1/public/conversations/:orderId` - View conversation
- `POST /api/v1/public/conversations/:orderId/messages` - Reply to admin

## Testing

Run tests with:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Development

Start development server with auto-reload:
```bash
npm run dev
```

## Database Seeding

Seed the database with initial data:
```bash
npm run seed
```

## License

MIT
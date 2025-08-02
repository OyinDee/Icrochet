# Database Seeding Guide

This document explains how to use the database seeding functionality for the Crochet Business API.

## Overview

The seeding system provides a way to populate the database with initial data for development and testing purposes. It includes:

- Admin user creation with hashed passwords
- Sample categories for organizing products
- Sample items with different pricing types and color options
- Sample orders with various statuses
- Sample conversations for custom orders

## Available Commands

### Seed Database
```bash
npm run seed
# or
npm run db:seed
```
This command will:
1. Clear all existing data
2. Create an admin user
3. Create sample categories
4. Create sample items with flexible pricing
5. Create sample orders
6. Create sample conversations

### Reset Database
```bash
npm run seed:reset
# or
npm run db:reset
```
This command will clear all data from the database without adding new data.

## Default Admin User

After seeding, you can log in with:
- **Username**: `admin`
- **Email**: `admin@crochetbusiness.com`
- **Password**: `admin123`

## Sample Data Created

### Categories (6 total)
- Blankets & Throws
- Clothing & Accessories
- Baby Items
- Home Decor
- Toys & Amigurumi
- Bags & Purses

### Items (13 total)
Items are created with different pricing types:
- **Fixed pricing**: Items with set prices (e.g., Beanie Hat - $25.00)
- **Range pricing**: Items with price ranges (e.g., Baby Blanket - $45.00-$65.00)
- **Custom pricing**: Items requiring quotes (e.g., Custom Wedding Blanket)

Each item includes:
- Multiple available colors
- Category assignment
- Sample images (placeholder URLs)
- Availability status

### Orders (5 total)
Sample orders with different statuses:
- **Confirmed**: Regular orders ready for processing
- **Processing**: Orders currently being worked on
- **Shipped**: Orders that have been sent
- **Quote Needed**: Custom orders requiring pricing discussion
- **Quoted**: Custom orders with provided quotes

### Conversations (2 total)
Sample conversations for custom orders:
- Wedding blanket customization discussion
- Custom amigurumi creation discussion

## Environment Requirements

Make sure your `.env` file has the correct MongoDB connection string:

```env
MONGODB_URI=your-mongodb-connection-string
```

## Testing

The seeding functionality is thoroughly tested. Run the tests with:

```bash
npm test tests/integration/seed.test.js
```

## Customization

To modify the seed data, edit the `scripts/seed.js` file:

- **Admin user**: Modify the `createAdminUser()` method
- **Categories**: Update the `categoryData` array in `createCategories()`
- **Items**: Update the `itemsData` array in `createItems()`
- **Orders**: Update the `ordersData` array in `createSampleOrders()`
- **Conversations**: Update the logic in `createSampleConversations()`

## Production Warning

⚠️ **Never run seeding commands in production!** The seeding process clears all existing data before adding sample data. This is intended only for development and testing environments.

## Troubleshooting

### Connection Issues
If you encounter MongoDB connection errors:
1. Verify your `MONGODB_URI` in the `.env` file
2. Ensure MongoDB is running (for local installations)
3. Check network connectivity (for cloud databases)

### Permission Issues
If you encounter permission errors:
1. Ensure your MongoDB user has read/write permissions
2. Check that the database specified in the connection string exists

### Data Validation Errors
If seeding fails due to validation errors:
1. Check that all required environment variables are set
2. Verify that the MongoDB schema matches the model definitions
3. Review the error logs for specific validation failures
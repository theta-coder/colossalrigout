import { z } from 'zod';

// Shipping Information Schema
export const shippingInfoSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100, 'Name cannot exceed 100 characters.'),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  phone: z.string().trim().min(7, 'Phone number must be at least 7 digits.').max(30, 'Phone number is too long.').regex(/^[+\d\s().-]+$/, 'Please enter a valid phone number format.'),
  address: z.string().trim().min(5, 'Delivery address must be at least 5 characters.').max(500, 'Address is too long.'),
  city: z.string().trim().min(2, 'City name is required.').max(100, 'City name is too long.'),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
});

// Cart Item Schema
export const checkoutItemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  productId: z.union([z.string(), z.number()]).optional(),
  variantId: z.string().min(1, 'Inventory variant ID is required.'),
  name: z.string().min(1, 'Product name is required.'),
  price: z.number().nonnegative('Price must be non-negative.'),
  quantity: z.number().int().positive('Quantity must be at least 1.').optional().default(1),
  qty: z.number().int().positive().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  imageUrl: z.string().optional(),
  img: z.string().optional(),
});

// Checkout Payload Schema
export const checkoutInputSchema = z.object({
  shippingInfo: shippingInfoSchema,
  shipCost: z.number().nonnegative().optional().default(0),
  payMethod: z.string().optional().default('Cash on Delivery'),
  items: z.array(checkoutItemSchema).min(1, 'Cart is empty. Select items to proceed.'),
  ownerId: z.string().nullable().optional(),
  promoCodeApplied: z.string().nullable().optional(),
});

// Contact Inquiry Schema
export const contactInquiryInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be between 2 and 100 characters.').max(100, 'Name cannot exceed 100 characters.'),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address.'),
  phone: z.string().trim().max(30, 'Phone number is too long.').regex(/^[+\d\s().-]*$/, 'Please provide a valid phone number.').optional(),
  orderId: z.string().trim().max(50, 'Order ID is too long.').regex(/^[a-zA-Z0-9_-]*$/, 'Please provide a valid order ID format.').optional(),
  subjectId: z.string().trim().optional().default('general'),
  subject: z.string().trim().optional(),
  subjectLabel: z.string().trim().optional(),
  message: z.string().trim().min(10, 'Message must be at least 10 characters.').max(3000, 'Message cannot exceed 3000 characters.'),
  honeypot: z.string().optional(),
  website: z.string().optional(),
});

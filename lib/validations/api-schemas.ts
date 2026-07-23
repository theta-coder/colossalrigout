import { z } from 'zod';

// Shipping Information Schema
export const shippingInfoSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required.').max(200),
  email: z.string().trim().toLowerCase().min(3, 'Email is required.'),
  phone: z.string().trim().min(3, 'Phone number is required.').max(50),
  address: z.string().trim().min(1, 'Delivery address is required.').max(1000),
  city: z.string().trim().min(1, 'City is required.').max(200),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
});

// Cart Item Schema
export const checkoutItemSchema = z.object({
  id: z.any().optional(),
  productId: z.any().optional(),
  variantId: z.any().optional(),
  sku: z.string().optional(),
  name: z.string().optional().default('Product'),
  price: z.number().optional().default(0),
  quantity: z.number().optional().default(1),
  qty: z.number().optional().default(1),
  size: z.string().optional(),
  color: z.string().optional(),
  imageUrl: z.string().optional(),
  img: z.string().optional(),
});

// Checkout Payload Schema
export const checkoutInputSchema = z.object({
  shippingInfo: shippingInfoSchema,
  shipCost: z.number().optional().default(0),
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

import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.ORDER_EMAIL_FROM || 'orders@colossalrigout.pk';
const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'who1sdanish011@gmail.com';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface OrderEmailData {
  orderId: string;
  publicTrackingId: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  city: string;
  items: Array<{
    name: string;
    size?: string;
    color?: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  shipCost: number;
  totalAmount: number;
  createdAt: string;
}

/** Sends a styled HTML Order Receipt to the customer */
export async function sendCustomerOrderReceipt(order: OrderEmailData) {
  if (!resend) {
    console.log(`[Email Service Notice]: RESEND_API_KEY is not set. Order email skipped for ${order.orderId}.`);
    return { success: false, reason: 'RESEND_API_KEY missing' };
  }

  const trackingUrl = `https://colossalrigout.pk/track-order?trackingId=${encodeURIComponent(order.publicTrackingId)}&email=${encodeURIComponent(order.customerEmail)}`;

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${item.name}</strong><br/>
        <span style="font-size: 11px; color: #666;">Size: ${item.size || 'N/A'} | Color: ${item.color || 'N/A'}</span>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">x${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 25px; border: 1px solid #eaeaea; border-radius: 8px;">
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="font-size: 24px; font-weight: 900; letter-spacing: 2px; margin: 0; color: #000;">COLOSSAL RIGOUT</h1>
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #777; margin-top: 4px;">Order Receipt & Confirmation</p>
      </div>

      <p style="font-size: 14px; color: #333;">Dear <strong>${order.customerName}</strong>,</p>
      <p style="font-size: 14px; color: #444; line-height: 1.5;">Thank you for shopping with Colossal Rigout! Your order <strong>${order.orderId}</strong> has been received and is being prepared for fulfillment.</p>

      <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Order Reference</p>
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #000;">#${order.orderId} <span style="font-size: 12px; font-weight: normal; color: #666;">(Tracking ID: ${order.publicTrackingId})</span></p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #111; color: #fff; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: center;">Qty</th>
            <th style="padding: 10px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="text-align: right; font-size: 13px; line-height: 1.8; margin-bottom: 25px;">
        <p style="margin: 0;">Subtotal: <strong>Rs. ${order.subtotal.toLocaleString()}</strong></p>
        <p style="margin: 0;">Shipping: <strong>${order.shipCost > 0 ? `Rs. ${order.shipCost}` : 'FREE'}</strong></p>
        <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: bold; color: #000; border-top: 1px dashed #ccc; padding-top: 8px;">Total Amount: Rs. ${order.totalAmount.toLocaleString()}</p>
      </div>

      <div style="text-align: center; margin: 30px 0 15px 0;">
        <a href="${trackingUrl}" style="background: #000; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; font-size: 12px; text-transform: uppercase; display: inline-block; letter-spacing: 1px;">
          Track Your Shipment Live
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0 15px 0;" />
      <p style="font-size: 11px; color: #888; text-align: center;">If you have any questions, contact us at support@colossalrigout.pk.</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `Colossal Rigout <${fromEmail}>`,
      to: [order.customerEmail],
      subject: `Order Confirmation #${order.orderId} — Colossal Rigout`,
      html,
    });

    if (error) {
      console.error(`Resend Customer Email Error for ${order.orderId}:`, error);
      // Resend Free Tier restriction: onboarding@resend.dev can only send to registered Resend account owner.
      // If customer email is different, fallback send to adminEmail so the receipt can be inspected during testing.
      if (order.customerEmail !== adminEmail) {
        console.log(`[Resend Test Mode Fallback]: Forwarding customer receipt for ${order.customerEmail} to ${adminEmail}`);
        await resend.emails.send({
          from: `Colossal Rigout <${fromEmail}>`,
          to: [adminEmail],
          subject: `[Customer Copy for ${order.customerEmail}] Order Confirmation #${order.orderId} — Colossal Rigout`,
          html,
        });
      }
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error(`Error sending customer email:`, err);
    return { success: false, error: err.message };
  }
}

/** Sends an instant notification email to Admin on new orders */
export async function sendAdminOrderNotification(order: OrderEmailData) {
  if (!resend) return { success: false, reason: 'RESEND_API_KEY missing' };

  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e0e0e0;">
      <h2 style="color: #222;">🚀 New Order Received: #${order.orderId}</h2>
      <p><strong>Customer:</strong> ${order.customerName} (${order.customerEmail})</p>
      <p><strong>Shipping Address:</strong> ${order.shippingAddress}, ${order.city}</p>
      <p><strong>Total Value:</strong> Rs. ${order.totalAmount.toLocaleString()}</p>
      <p><strong>Items Ordered:</strong> ${order.items.length}</p>
      <a href="https://colossalrigout.pk/admin" style="display: inline-block; background: #000; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-top: 10px;">View Order in Admin Dashboard</a>
    </div>
  `;

  try {
    await resend.emails.send({
      from: `Colossal Rigout Admin <${fromEmail}>`,
      to: [adminEmail],
      subject: `🚨 NEW ORDER #${order.orderId} - Rs. ${order.totalAmount.toLocaleString()}`,
      html,
    });
    return { success: true };
  } catch (err: any) {
    console.error("Admin Email Notification Error:", err);
    return { success: false };
  }
}

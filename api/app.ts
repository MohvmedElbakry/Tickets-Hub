// api/app.ts - Pure Express Application (Synchronous Route Registration)
console.log('[App] Initializing Express Application...');

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import prisma from './lib/prisma.js';
import { db } from './lib/db-service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_fallback_123';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET + '_refresh');

const generateTokens = (user: any) => {
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role, gender: user.gender };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken, user: payload };
};

const app = express();
app.set('trust proxy', 1);

// --- Initialization Logging ---
console.log('[App] Registering core middleware...');

app.get('/api/health', async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    let host = 'n/a', port = 'n/a';
    try {
      if (dbUrl) {
        const match = dbUrl.match(/@([^:\/]+):?(\d+)?/);
        if (match) { host = match[1]; port = match[2] || '5432 (default)'; }
      }
    } catch (e) {}
    const connectTest = prisma.$queryRaw`SELECT 1`.catch(e => { throw e; });
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Query Timeout')), 5000));
    await Promise.race([connectTest, timeout]);
    res.json({ status: 'ok', database: 'connected', env: process.env.NODE_ENV, vercel: !!process.env.VERCEL, db_host: host, db_port: port, url_masked: maskedUrl, time: new Date().toISOString() });
  } catch (err: any) {
    console.error('[Health Check] DB Failure:', err.message);
    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    res.status(503).json({ status: 'error', database: 'disconnected', url_masked: maskedUrl, error: err.message });
  }
});

app.use(helmet({ contentSecurityPolicy: { directives: { ...helmet.contentSecurityPolicy.getDefaultDirectives(), "img-src": ["'self'", "data:", "https:", "blob:", "*"], "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*"], "connect-src": ["'self'", "*"], "frame-ancestors": ["'self'", "*"], }, }, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false, }));

// --- DIAGNOSTIC MIDDLEWARE ---
app.use((req, res, next) => {
  console.log('[API DIAGNOSTIC]', req.method, req.originalUrl || req.url, 'Headers:', JSON.stringify(req.headers));
  next();
});

app.options('*', cors());
app.use(cors());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, please try again later.' }, skip: (req) => process.env.NODE_ENV !== 'production' || !!process.env.AIS_PREVIEW, });
app.use('/api/', limiter);
app.use(express.json({ limit: '50mb' }));

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token.' });
    if (!decoded || !decoded.id) return res.status(401).json({ error: 'Invalid token payload.' });
    req.user = decoded;
    next();
  });
};

const authorizeRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Access denied.' });
    next();
  };
};

// --- AUTH ROUTES ---
console.log('[App] Registering Auth Routes...');
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, phone, role, birthdate, gender } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Required fields missing.' });
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) return res.status(400).json({ error: 'Email already in use.' });
    const passwordHash = await bcrypt.hash(password, 10);
    const users = await db.getUsers();
    const userRole = users.length === 0 ? 'admin' : (role || 'user');
    const newUser = await db.addUser({ name, email, password_hash: passwordHash, phone, role: userRole, birthdate: birthdate || '2000-01-01', gender });
    const { accessToken, refreshToken, user } = generateTokens(newUser);
    res.status(201).json({ user, accessToken, refreshToken });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('[API] Login hit! Email:', email, 'Method:', req.method, 'Path:', req.path);
  try {
    if (!email || !password) return res.status(400).json({ error: 'Required fields missing.' });
    const user = await db.getUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid email or password.' });
    const { accessToken, refreshToken, user: userPayload } = generateTokens(user);
    res.json({ user: userPayload, accessToken, refreshToken });
  } catch (error: any) { res.status(500).json({ error: 'Failed to login', details: error.message }); }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password_hash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required.' });
  jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err: any, decoded: any) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });
    const user = await db.getUserById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(generateTokens(user));
  });
});

// --- NOTIFICATION ROUTES ---
console.log('[App] Registering Notification Routes...');
app.get('/api/notifications', authenticateToken, async (req: any, res) => {
  try { res.json(await db.getNotificationsByUserId(parseInt(req.user.id))); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req: any, res) => {
  try { res.json(await db.markNotificationAsRead(parseInt(req.params.id))); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- EVENT ROUTES ---
console.log('[App] Registering Event Routes...');
app.get('/api/events', async (req, res) => {
  try {
    const events = await db.getEvents();
    const result = await Promise.all(events.map(async (e) => {
      const tt = await db.getTicketTypesByEventId(e.id);
      const pr = await db.getPreRegistrationsByEventId(e.id);
      return { ...e, ticket_types: tt, pre_registration_count: pr.length };
    }));
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.cleanupExpiredReservations();
    const event = await db.getEventById(id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    const tt = await db.getTicketTypesByEventId(id);
    const pr = await db.getPreRegistrationsByEventId(id);
    res.json({ ...event, ticket_types: tt, pre_registration_count: pr.length });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/events', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const { ticket_types, ...data } = req.body;
    const newEvent = await db.addEvent({ ...data, organizer_id: req.user.id });
    if (ticket_types) await db.setTicketTypesForEvent(newEvent.id, ticket_types);
    res.status(201).json({ ...newEvent, ticket_types: await db.getTicketTypesByEventId(newEvent.id) });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/events/:id', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { ticket_types, ...data } = req.body;
    const updated = await db.updateEvent(id, data);
    if (ticket_types) await db.setTicketTypesForEvent(id, ticket_types);
    res.json({ ...updated, ticket_types: await db.getTicketTypesByEventId(id) });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/events/:id', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try { await db.deleteEvent(parseInt(req.params.id)); res.json({ message: 'Deleted' }); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- ORDER ROUTES ---
console.log('[App] Registering Order Routes...');
app.post('/api/orders', authenticateToken, async (req: any, res) => {
  try {
    const { event_id, tickets, ...data } = req.body;
    
    if (!event_id) return res.status(400).json({ error: 'event_id is required' });
    if (!Array.isArray(tickets)) return res.status(400).json({ error: 'tickets must be an array' });

    const parsedEventId = parseInt(event_id.toString());
    const normalizedTickets = tickets.map((t: any) => ({
      ...t,
      ticket_type_id: parseInt(t.ticket_type_id.toString()),
      quantity: parseInt(t.quantity.toString())
    }));

    const result = await prisma.$transaction(async (tx) => {
       const event = await tx.event.findUnique({ where: { id: parsedEventId } });
       if (!event) throw new Error('Event not found');
       
       let total = 0;
       for (const t of normalizedTickets) {
         if (isNaN(t.ticket_type_id)) throw new Error('Invalid ticket_type_id provided');
         const tt = await tx.ticketType.findUnique({ where: { id: t.ticket_type_id } });
         if (!tt) throw new Error(`Ticket type ${t.ticket_type_id} not found`);
         total += tt.price * t.quantity;
       }
       
       const order = await tx.order.create({ 
         data: { 
           user_id: parseInt(req.user.id.toString()), 
           event_id: parsedEventId, 
           total_price: total, 
           order_status: event.require_approval ? 'pending_approval' : 'pending', 
           instagram_username: data.instagram_username || null, 
           phone: data.phone || null, 
           age: parseInt(data.age?.toString() || '0'), 
           is_paid: false, 
           processing_payment: false 
         } 
       });

       for (const t of normalizedTickets) {
         await tx.orderTicket.create({ 
           data: { 
             order_id: order.id, 
             ticket_type_id: t.ticket_type_id, 
             quantity: t.quantity, 
             price_each: 0 // Will be set during actual payment calculation if needed
           } 
         });
       }
       return order;
    });
    res.status(201).json(result);
  } catch (error: any) { 
    console.error('[Order Error]', error);
    res.status(500).json({ error: error.message }); 
  }
});

app.get('/api/orders', authenticateToken, async (req: any, res) => {
  try { res.json(await db.getOrdersByUserId(req.user.id)); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/orders/:id', async (req: any, res) => {
  try { res.json(await db.getOrderById(parseInt(req.params.id))); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- SETTINGS ROUTES ---
console.log('[App] Registering Settings Routes...');
app.get('/api/settings', async (req, res) => {
  try { res.json(await db.getSettings()); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/settings', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try { res.json(await db.updateSettings(req.body)); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- ADMIN ROUTES ---
console.log('[App] Registering Admin Routes...');
app.get('/api/admin/orders', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try { res.json(await db.getOrders()); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/vouchers', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try { res.json(await db.getVouchers()); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/vouchers', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try { res.json(await db.addVoucher(req.body)); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/vouchers/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try { await db.deleteVoucher(parseInt(req.params.id)); res.json({ message: 'Deleted' }); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/invitations', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try { res.json(await db.getInvitations()); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/invitations', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try { res.json(await db.addInvitation(req.body)); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/invitations/:id', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try { res.json(await db.updateInvitation(parseInt(req.params.id), req.body)); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/invitations/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try { await db.deleteInvitation(parseInt(req.params.id)); res.json({ message: 'Deleted' }); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

  // --- Kashier Payment API (Payment Sessions) ---
  app.post('/api/payments/create-session', authenticateToken, async (req: any, res) => {
    console.log('[Payment] Create session request received');
    console.log('[Payment] Headers:', req.headers);
    console.log('[Payment] Body type:', typeof req.body);
    console.log('[Payment] Body:', req.body);
    
    // FIX 1: REMOVE req.body.amount to prevent client-side price manipulation
    const { order_id, currency = 'EGP' } = req.body;
    
    if (!order_id) {
      return res.status(400).json({ error: 'order_id is required' });
    }

    try {
      // Fetch order with user relation to dynamically extract customer data
      const order = await db.getOrderById(parseInt(order_id));

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Security: Ensure the order belongs to the authenticated user
      if (order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized access to order' });
      }

      // Business Logic: Only approved orders (or pending if no approval required) can proceed to payment
      const event = await db.getEventById(order.event_id);
      const isAllowedToPay = order.order_status === 'approved' || (order.order_status === 'pending' && !event?.require_approval);

      if (!isAllowedToPay) {
        return res.status(400).json({ 
          error: order.order_status === 'pending' 
            ? `Your booking for ${event?.title} is pending admin approval.` 
            : `Payment not allowed for status: ${order.order_status}.`
        });
      }

      // FIX 1 (Cont.): SECURE AMOUNT SOURCE
      // Dynamically calculate total amount from DB price + service fees from settings
      const settings = await db.getSettings();
      const serviceFeePercent = settings?.service_fee_percent ?? 10;
      const basePrice = order.total_price || 0;
      const finalAmount = Number((basePrice * (1 + serviceFeePercent / 100)).toFixed(2));

      const KASHIER_API_KEY = process.env.KASHIER_API_KEY;
      const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY;
      const KASHIER_MERCHANT_ID = process.env.KASHIER_MERCHANT_ID;
      const KASHIER_TEST_MODE = process.env.KASHIER_TEST_MODE === 'true';
      
      // Dynamic URL detection for redirects
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('host');
      const APP_URL = process.env.APP_URL || `${protocol}://${host}`;

      if (!KASHIER_API_KEY || !KASHIER_SECRET_KEY || !KASHIER_MERCHANT_ID) {
        console.error('[Kashier] Configuration missing (API Key, Secret Key, or Merchant ID)');
        return res.status(500).json({ error: 'Kashier configuration missing. Please contact support.' });
      }

      const kashierApiUrl = KASHIER_TEST_MODE 
        ? 'https://test-api.kashier.io/v3/payment/sessions' 
        : 'https://api.kashier.io/v3/payment/sessions';

      const expireAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      console.log('[Payment] Creating Kashier session for order:', order_id);
      console.log(`[Payment] URL: ${kashierApiUrl}`);
      console.log(`[Payment] Merchant ID: ${KASHIER_MERCHANT_ID}`);
      console.log(`[Payment] Amount: ${finalAmount}`);

      const response = await fetch(kashierApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': KASHIER_SECRET_KEY,
          'api-key': KASHIER_API_KEY
        },
        body: JSON.stringify({
          amount: finalAmount.toString(),
          currency: 'EGP',
          order: order_id.toString(),
          merchantId: KASHIER_MERCHANT_ID,
          merchantRedirect: `${APP_URL}/payment-return?order_id=${order_id}&origin=kashier`,
          expireAt: expireAt,
          display: 'en',
          type: 'one-time',
          customer: {
            email: req.user.email,
            reference: req.user.id.toString()
          }
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[Payment] Kashier API returned non-JSON response:', responseText);
        return res.status(500).json({ error: 'Invalid response from payment gateway.' });
      }

      console.log('[Kashier FULL response]:', data);
      
      if (response.ok && data.sessionUrl) {
        console.log(`[Payment] Session created successfully for order #${order_id}.`);
        
        // FIX 1: Store Kashier's UUID orderID in our DB for reliable webhook matching
        const kashierOrderId = data.orderId || (data.session && data.session.orderId);
        if (kashierOrderId) {
          console.log(`[Payment] Mapping internal #${order_id} to Kashier UUID: ${kashierOrderId}`);
          await db.updateOrder(order_id, { kashier_order_id: kashierOrderId });
        }

        res.json({ payment_url: data.sessionUrl });
      } else {
        console.error('[Kashier ERROR]:', data);
        res.status(500).json({ 
          error: 'Kashier session creation failed',
          details: data
        });
      }
    } catch (error: any) {
      console.error('[Kashier] Internal Error:', error);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        details: error.message 
      });
    }
  });

  app.get('/api/payments/verify/:orderId', async (req: any, res) => {
    const orderIdParam = req.params.orderId;
    console.log(`[API] Checking payment verify state for order identifier: ${orderIdParam}`);

    try {
      // 1. Try numeric internal ID
      let order: any = null;
      if (!isNaN(Number(orderIdParam))) {
        order = await db.getOrderById(Number(orderIdParam));
      }

      // 2. Fallback to Kashier UUID
      if (!order) {
        order = await db.getOrderByKashierOrderId(orderIdParam);
      }

      if (!order) {
        console.warn(`[API] Order for verification not found: ${orderIdParam}`);
        return res.status(404).json({ error: 'Order not found' });
      }

      // 3. RULE: Return current DB state ONLY (Read-only)
      console.log(`[API] Returning payment state for order #${order.id}: ${order.is_paid ? 'PAID' : 'NOT PAID'}`);
      return res.json({ 
        success: order.is_paid, 
        is_paid: order.is_paid,
        status: order.is_paid ? 'paid' : order.order_status,
        order: order 
      });

    } catch (error: any) {
      console.error(`[API ERROR] /api/payments/verify/${orderIdParam}:`, error);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        details: error.message 
      });
    }
  });

  app.post('/api/payments/confirm-from-return', async (req, res) => {
    const { orderId, transactionId, status } = req.body;
    
    console.log(`[API] Confirm from return signal received for order ${orderId}, status ${status}, transaction ${transactionId}`);

    if (status !== 'SUCCESS') {
      console.log(`[API FAILED] Invalid status from kashier return: ${status}`);
      return res.status(400).json({ error: 'Invalid status for confirmation.' });
    }

    try {
      // 1. Resolve order
      let order: any = null;
      if (!isNaN(Number(orderId))) {
        order = await db.getOrderById(Number(orderId));
      }
      if (!order) {
        order = await db.getOrderByKashierOrderId(orderId);
      }

      if (!order) {
        console.warn(`[API] Order for confirm-from-return not found: ${orderId}`);
        return res.status(404).json({ error: 'Order not found.' });
      }

      // FIX 2: BACKEND IDEMPOTENCY (MANDATORY)
      if (order.is_paid) {
        console.log(`[API] Order #${order.id} already marked as paid. Returning cached success.`);
        return res.json({ success: true, is_paid: true, order });
      }

      // 2. Trigger idempotent payment finalization
      const result = await db.markOrderAsPaid(order.id, transactionId);
      
      // 3. RULE: Return success if the order is now paid (or was already paid)
      if (result.success) {
        console.log(`[API SUCCESS] Order #${order.id} confirmed via return.`);
        return res.json({ success: true, is_paid: true, order: result.order });
      } else {
        console.warn(`[API FAILED] Order #${order.id} confirmation failed: ${result.reason}`);
        return res.status(400).json({ success: false, error: result.reason });
      }
    } catch (error: any) {
      console.error(`[API ERROR] /api/payments/confirm-from-return:`, error);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        details: error.message 
      });
    }
  });

  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }) as any, async (req: any, res: any) => {
    console.log('[Webhook] Receive trigger');
    try {
      const rawBody = req.body;
      if (!rawBody || rawBody.length === 0) return res.status(200).send();

      const payload = JSON.parse(rawBody.toString());
      const signature = req.headers['x-kashier-signature'] as string;
      const KASHIER_API_KEY = process.env.KASHIER_API_KEY;

      if (!KASHIER_API_KEY) return res.status(200).send(); // Always 200 to Kashier unless strictly auth/sig fail

      if (signature) {
        const expectedSignature = crypto.createHmac('sha256', KASHIER_API_KEY).update(rawBody).digest('hex');
        if (signature !== expectedSignature) return res.status(200).send();
      }

      const transactionId = payload.transactionId || payload.referenceNumber;
      const orderIdStr = payload.orderId || payload.merchantOrderId;
      const status = payload.status || (payload.response && payload.response.status);
      
      if (!orderIdStr || !transactionId || status !== 'SUCCESS') {
        console.log('[Webhook] Skipping incomplete or non-success payload');
        return res.status(200).send();
      }

      // Resolve order and trigger markOrderAsPaid
      let order: any = null;
      if (!isNaN(Number(orderIdStr))) {
        order = await db.getOrderById(Number(orderIdStr));
      }
      if (!order) {
        order = await db.getOrderByKashierOrderId(orderIdStr);
      }

      if (order) {
        console.log(`[Webhook] Triggering markOrderAsPaid for order #${order.id}`);
        await db.markOrderAsPaid(order.id, transactionId);
      }

      return res.status(200).send();
    } catch (error) {
      console.error('[Webhook] Error:', error);
      return res.status(200).send(); // Always converge to 200 for webhooks
    }
  });

// --- FINALIZATION ---
console.log('[App] All routes registered synchronously.');

const listRoutes = () => {
    const registered: string[] = [];
    app._router.stack.forEach((middleware: any) => {
        if (middleware.route) {
            registered.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
        }
    });
    console.log('--- FINAL REGISTERED ROUTES ---');
    registered.sort().forEach(r => console.log(r));
    console.log('-------------------------------');
};

listRoutes();

// --- CATCH ALL 404 ---
app.use((req, res) => {
    console.log('[EXPRESS 404]', req.method, req.url);
    res.status(404).json({ 
        error: 'Route not found in Express', 
        method: req.method, 
        url: req.url,
        timestamp: new Date().toISOString()
    });
});

export default app;

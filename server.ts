import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      rawBody?: Buffer;
    }
  }
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[Auth] JWT_SECRET is not set in environment');
  process.exit(1); 
}
console.log("[Auth] JWT_SECRET loaded:", !!JWT_SECRET);

import prisma from './src/lib/prisma.ts';

// --- Helper Functions ---
const parseSafeDate = (input: any, required: boolean = false) => {
  if (!input) {
    if (required) throw new Error("Required date missing");
    return null;
  }
  const parsedDate = new Date(input);
  if (isNaN(parsedDate.getTime())) {
    if (required) throw new Error("Invalid date provided");
    return null;
  }
  return parsedDate;
};

// --- Prisma Database Service ---
class PrismaDB {
  // Settings
  async getSettings() {
    let settings = await prisma.setting.findFirst();
    if (!settings) {
      settings = await prisma.setting.create({ data: { service_fee_percent: 10 } });
    }
    return settings;
  }

  async updateSettings(updates: any) {
    const settings = await this.getSettings();
    return await prisma.setting.update({
      where: { id: settings.id },
      data: updates
    });
  }

  // Users
  async getUsers() {
    return await prisma.user.findMany();
  }

  async getUserById(id: number) {
    return await prisma.user.findUnique({ where: { id } });
  }

  async getUserByEmail(email: string) {
    return await prisma.user.findUnique({ where: { email } });
  }

  async addUser(user: any) {
    const { id, ...data } = user;
    return await prisma.user.create({ data });
  }

  async updateUser(id: number, updates: any) {
    return await prisma.user.update({ where: { id }, data: updates });
  }

  async deleteUser(id: number) {
    try {
      await prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // Events
  async getEvents() {
    return await prisma.event.findMany();
  }

  async getEventById(id: number) {
    return await prisma.event.findUnique({ where: { id } });
  }

  async addEvent(event: any) {
    const { id, ...data } = event;
    const eventDate = data.date || data.event_date;
    const parsedDate = parseSafeDate(eventDate, true);

    // Ensure event_date is a string for Prisma
    if (data.event_date) {
      data.event_date = typeof data.event_date === 'string' ? data.event_date : parsedDate!.toISOString();
    }

    return await prisma.event.create({
      data: {
        ...data,
        date: parsedDate!,
        government: data.government || 'Other',
        require_approval: data.require_approval || false,
        qr_enabled_manual: false
      }
    });
  }

  async updateEvent(id: number, updates: any) {
    const data = { ...updates };
    if (data.date !== undefined) {
      data.date = parseSafeDate(data.date);
      if (data.date === null) delete data.date;
    }
    if (data.event_date !== undefined) {
      const parsed = parseSafeDate(data.event_date);
      if (parsed === null) {
        delete data.event_date;
      } else {
        // Prisma expects a String for event_date, not a Date object
        data.event_date = typeof data.event_date === 'string' ? data.event_date : parsed.toISOString();
      }
    }
    return await prisma.event.update({ where: { id }, data });
  }

  async deleteEvent(id: number) {
    try {
      await prisma.event.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // Pre-Registrations
  async getPreRegistrations() {
    return await prisma.preRegistration.findMany();
  }

  async getPreRegistrationsByEventId(eventId: number) {
    return await prisma.preRegistration.findMany({ where: { event_id: eventId } });
  }

  async getPreRegistrationsByUserId(userId: number) {
    return await prisma.preRegistration.findMany({ where: { user_id: userId } });
  }

  async addPreRegistration(pr: any) {
    const { id, ...data } = pr;
    return await prisma.preRegistration.create({ data });
  }

  async removePreRegistration(userId: number, eventId: number) {
    await prisma.preRegistration.deleteMany({
      where: { user_id: userId, event_id: eventId }
    });
  }

  // Notifications
  async getNotificationsByUserId(userId: number) {
    return await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
  }

  async addNotification(n: any) {
    const { id, ...data } = n;
    return await prisma.notification.create({
      data: { ...data, read: false }
    });
  }

  async markNotificationAsRead(id: number) {
    return await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
  }

  // Ticket Types
  async getTicketTypes() {
    return await prisma.ticketType.findMany();
  }

  async getTicketTypesByEventId(eventId: number) {
    return await prisma.ticketType.findMany({ where: { event_id: eventId } });
  }

  async addTicketType(ticketType: any) {
    const { id, ...data } = ticketType;
    return await prisma.ticketType.create({
      data: {
        ...data,
        description: data.description || null,
        sale_start: parseSafeDate(data.sale_start),
        sale_end: parseSafeDate(data.sale_end),
        resale_queue: 0
      }
    });
  }

  async getTicketTypeById(id: number) {
    return await prisma.ticketType.findUnique({ where: { id } });
  }

  async updateTicketType(id: number, updates: any) {
    const current = await prisma.ticketType.findUnique({ where: { id } });
    if (!current) return null;
    
    const data = { ...updates };
    if (data.sale_start !== undefined) data.sale_start = parseSafeDate(data.sale_start);
    if (data.sale_end !== undefined) data.sale_end = parseSafeDate(data.sale_end);

    const next = { ...current, ...data };
    if (next.quantity_sold > next.quantity_total) {
      throw new Error(`CRITICAL: quantity_sold (${next.quantity_sold}) exceeds quantity_total (${next.quantity_total}) for ticket type ${id}`);
    }
    
    return await prisma.ticketType.update({ where: { id }, data });
  }

  async deleteTicketType(id: number) {
    await prisma.ticketType.delete({ where: { id } });
  }

  async setTicketTypesForEvent(eventId: number, ticketTypes: any[]) {
    return await prisma.$transaction(async (tx) => {
      await tx.ticketType.deleteMany({ where: { event_id: eventId } });
      const created = [];
      for (const tt of ticketTypes) {
        const { id, ...data } = tt;
        created.push(await tx.ticketType.create({
          data: {
            ...data,
            event_id: eventId,
            description: data.description || null,
            sale_start: parseSafeDate(data.sale_start),
            sale_end: parseSafeDate(data.sale_end),
            resale_queue: tt.resale_queue || 0
          }
        }));
      }
      return created;
    });
  }

  // Vouchers
  async getVouchers() {
    return await prisma.voucher.findMany();
  }

  async getVoucherByCode(code: string) {
    return await prisma.voucher.findUnique({ where: { code } });
  }

  async addVoucher(voucher: any) {
    const { id, ...data } = voucher;
    return await prisma.voucher.create({
      data: {
        ...data,
        expiration_date: parseSafeDate(data.expiration_date, true)!,
        current_uses: 0
      }
    });
  }

  async updateVoucher(id: number, updates: any) {
    const current = await prisma.voucher.findUnique({ where: { id } });
    if (!current) return null;
    
    const data = { ...updates };
    if (data.expiration_date !== undefined) {
      data.expiration_date = parseSafeDate(data.expiration_date, true);
    }

    const next = { ...current, ...data };
    if (next.current_uses > next.max_uses) {
      throw new Error(`CRITICAL: current_uses (${next.current_uses}) exceeds max_uses (${next.max_uses}) for voucher ${id}`);
    }
    
    return await prisma.voucher.update({ where: { id }, data });
  }

  async deleteVoucher(id: number) {
    await prisma.voucher.delete({ where: { id } });
  }

  // Resell Requests
  async getResellRequests() {
    return await prisma.resellRequest.findMany();
  }

  async getResellRequestById(id: number) {
    return await prisma.resellRequest.findUnique({ where: { id } });
  }

  async addResellRequest(request: any) {
    const { id, ...data } = request;
    return await prisma.resellRequest.create({
      data: { ...data, status: 'pending' }
    });
  }

  async updateResellRequest(id: number, updates: any) {
    return await prisma.resellRequest.update({ where: { id }, data: updates });
  }

  // Invitations
  async getInvitations() {
    return await prisma.invitation.findMany();
  }

  async addInvitation(invitation: any) {
    const { id, ...data } = invitation;
    return await prisma.invitation.create({
      data: { ...data, status: 'pending' }
    });
  }

  async updateInvitation(id: number, updates: any) {
    return await prisma.invitation.update({ where: { id }, data: updates });
  }

  async deleteInvitation(id: number) {
    await prisma.invitation.delete({ where: { id } });
  }

  // Orders
  async getOrders() {
    return await prisma.order.findMany();
  }

  async getOrdersByUserId(userId: number) {
    return await prisma.order.findMany({ where: { user_id: userId } });
  }

  async getOrderById(id: number) {
    return await prisma.order.findUnique({ 
      where: { id },
      include: { user: true }
    });
  }

  async addOrder(order: any) {
    const { id, ...data } = order;
    return await prisma.order.create({
      data: {
        ...data,
        is_paid: data.is_paid || false,
        order_status: data.order_status || 'pending',
        qr_code_token: null,
        kashier_transaction_id: null,
        processing_payment: false,
        points_awarded: false
      }
    });
  }

  async updateOrder(id: number, updates: any) {
    const data = { ...updates };
    if (data.paid_at) data.paid_at = new Date(data.paid_at);
    return await prisma.order.update({ where: { id }, data });
  }

  async markOrderAsPaid(orderId: number, transactionId: string) {
    return await prisma.$transaction(async (tx) => {
      // Read order with FOR UPDATE behavior
      const orders = await tx.$queryRaw<any[]>`SELECT * FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      const order = orders[0];
      if (!order) return { success: false, reason: 'not_found' };
      
      if (order.processing_payment) return { success: false, reason: 'processing' };
      
      // Check if transaction ID already exists
      const existingTransaction = await tx.order.findFirst({ where: { kashier_transaction_id: transactionId } });
      if (existingTransaction) return { success: true, already_paid: true, order: existingTransaction };

      if (order.is_paid) return { success: true, already_paid: true, order };
      
      await tx.order.update({
        where: { id: orderId },
        data: { processing_payment: true }
      });

      try {
        const qrToken = crypto.randomBytes(16).toString('hex');
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            order_status: 'paid',
            is_paid: true,
            paid_at: new Date(),
            kashier_transaction_id: transactionId,
            qr_code_token: qrToken,
            processing_payment: false
          }
        });
        
        if (!updatedOrder.points_awarded) {
          const points = Math.floor(updatedOrder.total_price * 0.1);
          const user = await tx.user.findUnique({ where: { id: updatedOrder.user_id! } });
          if (user) {
            await tx.user.update({
              where: { id: user.id },
              data: { points: (user.points || 0) + points }
            });
            await tx.pointsHistory.create({
              data: {
                user_id: user.id,
                order_id: orderId,
                points,
                type: 'earn',
                description: `Points earned from order #${orderId} (via webhook)`
              }
            });
            await tx.order.update({
              where: { id: orderId },
              data: { points_awarded: true }
            });
          }
        }
        return { success: true, order: updatedOrder };
      } catch (error) {
        await tx.order.update({
          where: { id: orderId },
          data: { processing_payment: false }
        });
        throw error;
      }
    });
  }

  // Order Tickets
  async getOrderTicketsByOrderId(orderId: number) {
    return await prisma.orderTicket.findMany({ where: { order_id: orderId } });
  }

  async addOrderTicket(orderTicket: any) {
    const { id, ...data } = orderTicket;
    return await prisma.orderTicket.create({
      data: { ...data, scanned_count: 0, is_used: false }
    });
  }

  async updateOrderTicket(id: number, updates: any) {
    return await prisma.orderTicket.update({ where: { id }, data: updates });
  }

  async getOrderTicketById(id: number) {
    return await prisma.orderTicket.findUnique({ where: { id } });
  }

  // Points History
  async getPointsHistoryByUserId(userId: number) {
    return await prisma.pointsHistory.findMany({ where: { user_id: userId } });
  }

  async addPointsHistory(history: any) {
    const { id, ...data } = history;
    return await prisma.pointsHistory.create({ data });
  }

  // Compatibility methods
  async init() {}
  async save() {}
}

const db = new PrismaDB();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(cors());

  await db.init();

  // Seed test admin user
  const seedAdmin = async () => {
    const adminEmail = 'admin@tkt.com';
    const existingAdmin = await db.getUserByEmail(adminEmail);
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('123123', 10);
      try {
        await db.addUser({
          name: 'mohamed elbakry',
          email: adminEmail,
          password_hash: passwordHash,
          phone: '123456789',
          role: 'admin',
          birthdate: '1990-01-01'
        });
        console.log('Test admin user seeded.');
      } catch (error) {
        console.error('Failed to seed admin user:', error);
      }
    }
  };
  await seedAdmin();

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    console.log('[Auth] Authorization header:', req.headers['authorization']);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.error('[Auth] No token provided.');
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    console.log('[Auth] Token received for verification');

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        console.error('[Auth] Invalid or expired token:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }
      
      if (!decoded || !decoded.id) {
        console.error('[Auth] Token decoded but user ID missing.');
        return res.status(401).json({ error: 'Invalid token payload.' });
      }

      req.user = decoded;
      console.log(`[Auth] Token verified successfully for user ID: ${decoded.id}`);
      next();
    });
  };

  const authorizeRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user) {
        console.error('[Auth] authorizeRole called without req.user');
        return res.status(401).json({ error: 'Authentication required.' });
      }
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      }
      next();
    };
  };

  // --- Auth API ---

  app.post('/api/auth/signup', async (req, res) => {
    console.log('[API] Signup request received:', req.body.email);
    try {
      const { name, email, password, phone, role, birthdate } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      const users = await db.getUsers();
      const userRole = users.length === 0 ? 'admin' : (role || 'user');

      const calculateAge = (dateString: string) => {
        if (!dateString) return 0;
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      const newUser = await db.addUser({
        name,
        email,
        password_hash: passwordHash,
        phone,
        role: userRole,
        birthdate: birthdate || '2000-01-01',
        age: calculateAge(birthdate || '2000-01-01')
      });

      const user = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, birthdate: newUser.birthdate };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

      res.status(201).json({ user, token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    console.log('[API] Login request received:', req.body.email);
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = await db.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const userPayload = { id: user.id, name: user.name, email: user.email, role: user.role };
      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

      res.json({ user: userPayload, token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
      const user = await db.getUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      
      const { password_hash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Notification Routes ---
  app.get('/api/notifications', authenticateToken, async (req: any, res) => {
    const userId = parseInt(req.user.id); // Ensure it's an Int for Prisma
    console.log(`[API] Fetching notifications for user ${userId}`);
    try {
      const notifications = await db.getNotificationsByUserId(userId);
      console.log(`[API] Found ${notifications.length} notifications for user ${userId}`);
      res.json(notifications);
    } catch (error: any) {
      console.error(`[API] Error fetching notifications for user ${userId}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/notifications/:id/read', authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await db.markNotificationAsRead(id);
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- User Management API ---

  app.get('/api/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const users = await db.getUsers();
      const usersWithoutPasswords = users.map(({ password_hash, ...u }) => u);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/users/:id', authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      const user = await db.getUserById(userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      
      const { password_hash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/:id', authenticateToken, async (req: any, res) => {
    try {
      const { name, phone, role } = req.body;
      const userId = parseInt(req.params.id);

      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (req.user.role === 'admin' && role !== undefined) updates.role = role;

      const updatedUser = await db.updateUser(userId, updates);
      if (!updatedUser) return res.status(404).json({ error: 'User not found.' });

      const { password_hash, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const success = await db.deleteUser(parseInt(req.params.id));
      if (!success) return res.status(404).json({ error: 'User not found.' });
      res.json({ message: 'User deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/:id/role', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const { role } = req.body;
      const userId = parseInt(req.params.id);

      if (!role || !['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role.' });
      }

      const updatedUser = await db.updateUser(userId, { role });
      if (!updatedUser) return res.status(404).json({ error: 'User not found.' });

      const { password_hash, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Events API ---

  app.get('/api/events', async (req, res) => {
    try {
      const events = await db.getEvents();
      const eventsWithTickets = await Promise.all(events.map(async (e) => {
        const ticketTypes = await db.getTicketTypesByEventId(e.id);
        const preRegistrations = await db.getPreRegistrationsByEventId(e.id);
        return { ...e, ticket_types: ticketTypes, pre_registration_count: preRegistrations.length };
      }));
      res.json(eventsWithTickets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/events/:id', async (req, res) => {
    try {
      const event = await db.getEventById(parseInt(req.params.id));
      if (!event) return res.status(404).json({ error: 'Event not found.' });
      const ticketTypes = await db.getTicketTypesByEventId(event.id);
      const preRegistrations = await db.getPreRegistrationsByEventId(event.id);
      res.json({ ...event, ticket_types: ticketTypes, pre_registration_count: preRegistrations.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/events', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const { title, description, location, venue, event_date, event_time, image_url, status, ticket_types, company_name, rules, google_maps_url, government, require_approval } = req.body;
      
      if (!title || !event_date || !event_time) {
        return res.status(400).json({ error: 'Title, date, and time are required.' });
      }

      // Validate event_date
      parseSafeDate(event_date, true);

      const newEvent = await db.addEvent({
        title,
        description,
        location,
        venue,
        event_date,
        event_time,
        organizer_id: req.user.id,
        image_url,
        company_name,
        rules,
        google_maps_url,
        status: status || 'draft',
        government: government || 'Other',
        require_approval: require_approval || false,
        qr_enabled_manual: false
      });

      if (ticket_types && Array.isArray(ticket_types)) {
        const ticketTypesWithDefaults = ticket_types.map(tt => {
          // Validate ticket type fields
          if (!tt.name || tt.price === undefined || tt.quantity_total === undefined) {
            throw new Error(`Invalid ticket type data for ${tt.name || 'unnamed'}`);
          }
          return {
            ...tt,
            price: parseFloat(tt.price),
            quantity_total: parseInt(tt.quantity_total),
            quantity_sold: tt.quantity_sold ? parseInt(tt.quantity_sold) : 0,
            sale_start: tt.sale_start || null,
            sale_end: tt.sale_end || null,
            description: tt.description || null
          };
        });
        await db.setTicketTypesForEvent(newEvent.id, ticketTypesWithDefaults);
      }

      const eventWithTickets = { ...newEvent, ticket_types: await db.getTicketTypesByEventId(newEvent.id) };
      res.status(201).json(eventWithTickets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/events/:id', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await db.getEventById(eventId);
      
      if (!event) return res.status(404).json({ error: 'Event not found.' });
      
      const { title, description, location, venue, event_date, event_time, image_url, status, ticket_types, company_name, rules, google_maps_url, show_qr_codes, government, require_approval } = req.body;
      
      const oldStatus = event.status;
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (location !== undefined) updates.location = location;
      if (venue !== undefined) updates.venue = venue;
      if (event_date !== undefined) {
        parseSafeDate(event_date, true);
        updates.event_date = event_date;
      }
      if (event_time !== undefined) updates.event_time = event_time;
      if (image_url !== undefined) updates.image_url = image_url;
      if (status !== undefined) updates.status = status;
      if (company_name !== undefined) updates.company_name = company_name;
      if (rules !== undefined) updates.rules = rules;
      if (google_maps_url !== undefined) updates.google_maps_url = google_maps_url;
      if (show_qr_codes !== undefined) updates.show_qr_codes = show_qr_codes;
      if (government !== undefined) updates.government = government;
      if (require_approval !== undefined) updates.require_approval = require_approval;

      const updatedEvent = await db.updateEvent(eventId, updates);

      // Notify users if status changed to 'live'
      if (oldStatus === 'upcoming' && status === 'live') {
        const preRegistrations = await db.getPreRegistrationsByEventId(eventId);
        for (const pr of preRegistrations) {
          await db.addNotification({
            user_id: pr.user_id,
            title: 'Tickets Available!',
            message: `Tickets for ${updatedEvent.title} are now available. Book now before they sell out.`,
            event_id: eventId,
            type: 'event_live'
          });
        }
      }

      if (ticket_types && Array.isArray(ticket_types)) {
        const ticketTypesWithDefaults = ticket_types.map(tt => {
          if (!tt.name || tt.price === undefined || tt.quantity_total === undefined) {
            throw new Error(`Invalid ticket type data for ${tt.name || 'unnamed'}`);
          }
          return {
            ...tt,
            price: parseFloat(tt.price),
            quantity_total: parseInt(tt.quantity_total),
            quantity_sold: tt.quantity_sold ? parseInt(tt.quantity_sold) : 0,
            sale_start: tt.sale_start || null,
            sale_end: tt.sale_end || null,
            description: tt.description || null
          };
        });
        await db.setTicketTypesForEvent(eventId, ticketTypesWithDefaults);
      }

      const eventWithTickets = { ...updatedEvent, ticket_types: await db.getTicketTypesByEventId(eventId) };
      res.json(eventWithTickets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/events/:id', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await db.getEventById(eventId);
      
      if (!event) return res.status(404).json({ error: 'Event not found.' });
      
      await db.deleteEvent(eventId);
      res.json({ message: 'Event deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Pre-Registration Routes ---
  app.get('/api/pre-registrations', authenticateToken, async (req: any, res) => {
    try {
      const registrations = await db.getPreRegistrationsByUserId(req.user.id);
      const registrationsWithEvents = await Promise.all(registrations.map(async (r) => {
        const event = await db.getEventById(r.event_id);
        return { ...r, event };
      }));
      res.json(registrationsWithEvents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/events/:id/pre-register', authenticateToken, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const existing = await db.getPreRegistrationsByUserId(userId);
      if (existing.find(r => r.event_id === eventId)) {
        return res.status(400).json({ error: 'Already pre-registered for this event.' });
      }

      const registration = await db.addPreRegistration({ user_id: userId, event_id: eventId });
      res.status(201).json(registration);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/events/:id/pre-register', authenticateToken, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id;
      await db.removePreRegistration(userId, eventId);
      res.json({ message: 'Pre-registration removed.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Ticket Types API ---

  app.get('/api/ticket-types/:eventId', async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const ticketTypes = await db.getTicketTypesByEventId(eventId);
      res.json(ticketTypes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ticket-types', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const { event_id, name, description, price, quantity_total, sale_start, sale_end } = req.body;
      
      if (!event_id || !name || price === undefined || quantity_total === undefined) {
        return res.status(400).json({ error: 'Event ID, name, price, and quantity total are required.' });
      }

      const newTicketType = await db.addTicketType({
        event_id: parseInt(event_id),
        name,
        description: description || null,
        price: parseFloat(price),
        quantity_total: parseInt(quantity_total),
        quantity_sold: 0,
        sale_start: sale_start || null,
        sale_end: sale_end || null
      });

      res.status(201).json(newTicketType);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/ticket-types/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, price, quantity_total, quantity_sold, sale_start, sale_end } = req.body;
      
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (price !== undefined) updates.price = parseFloat(price);
      if (quantity_total !== undefined) updates.quantity_total = parseInt(quantity_total);
      if (quantity_sold !== undefined) updates.quantity_sold = parseInt(quantity_sold);
      if (sale_start !== undefined) updates.sale_start = sale_start;
      if (sale_end !== undefined) updates.sale_end = sale_end;

      const updated = await db.updateTicketType(id, updates);
      if (!updated) return res.status(404).json({ error: 'Ticket type not found.' });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/ticket-types/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.deleteTicketType(id);
      res.json({ message: 'Ticket type deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Purchase API (Overselling Prevention) ---
  app.post('/api/tickets/purchase', authenticateToken, async (req: any, res) => {
    try {
      const { ticket_type_id, quantity } = req.body;
      
      if (!ticket_type_id || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Ticket type ID and valid quantity are required.' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Read ticket_type with FOR UPDATE behavior
        const ticketTypes = await tx.$queryRaw<any[]>`SELECT * FROM "TicketType" WHERE id = ${parseInt(ticket_type_id)} FOR UPDATE`;
        const ticketType = ticketTypes[0];
        
        if (!ticketType) return { error: 'Ticket type not found.', status: 404 };

        // Check if sale has started and not ended
        const now = new Date();
        if (ticketType.sale_start) {
          const startDate = new Date(ticketType.sale_start);
          if (!isNaN(startDate.getTime()) && startDate > now) {
            return { error: 'Ticket sale has not started yet.', status: 400 };
          }
        }
        if (ticketType.sale_end) {
          const endDate = new Date(ticketType.sale_end);
          if (!isNaN(endDate.getTime()) && endDate < now) {
            return { error: 'Ticket sale has ended.', status: 400 };
          }
        }

        // Validate quantity_sold before purchase
        if (ticketType.quantity_sold + quantity > ticketType.quantity_total) {
          throw new Error('Overselling: Not enough tickets available.');
        }

        // Update quantity_sold
        const updated = await tx.ticketType.update({
          where: { id: ticketType.id },
          data: { quantity_sold: ticketType.quantity_sold + quantity }
        });

        return { success: true, ticket_type: updated };
      });

      if (result.error) {
        return res.status(result.status).json({ error: result.error });
      }

      res.json({ message: 'Purchase successful.', ticket_type: result.ticket_type });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Order Management API ---
  app.post('/api/orders', authenticateToken, async (req: any, res) => {
    try {
      const { event_id, tickets, instagram_username, phone, age, voucher_code, ticket_holders } = req.body; // tickets: [{ ticket_type_id, quantity }]
      
      if (!event_id || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
        return res.status(400).json({ error: 'Event ID and tickets are required.' });
      }

      if (!instagram_username || !phone || !age) {
        return res.status(400).json({ error: 'Instagram username, phone, and age are required.' });
      }

      // Validate ticket holders if provided
      if (ticket_holders && !Array.isArray(ticket_holders)) {
        return res.status(400).json({ error: 'Ticket holders must be an array.' });
      }

      // Use a transaction to prevent race conditions across multiple ticket types and vouchers
      const result = await prisma.$transaction(async (tx) => {
        const event = await tx.event.findUnique({ where: { id: parseInt(event_id) } });
        if (!event) throw new Error('Event not found.');

        let totalPrice = 0;
        const orderItems = [];

        // Validate voucher if provided
        let discountPercent = 0;
        let voucherId = null;
        if (voucher_code) {
          // Read voucher with FOR UPDATE behavior
          const vouchers = await tx.$queryRaw<any[]>`SELECT * FROM "Voucher" WHERE code = ${voucher_code} FOR UPDATE`;
          const voucher = vouchers[0];
          if (!voucher) throw new Error('Invalid voucher code.');
          
          const now = new Date();
          if (new Date(voucher.expiration_date) < now) throw new Error('Voucher has expired.');
          if (voucher.current_uses >= voucher.max_uses) throw new Error('Voucher usage limit reached.');
          
          discountPercent = voucher.discount_percent;
          voucherId = voucher.id;
        }

        // Validate all tickets first
        for (const item of tickets) {
          // Read ticket_type with FOR UPDATE behavior
          const ticketTypes = await tx.$queryRaw<any[]>`SELECT * FROM "TicketType" WHERE id = ${parseInt(item.ticket_type_id)} FOR UPDATE`;
          const ticketType = ticketTypes[0];
          if (!ticketType || ticketType.event_id !== event.id) {
            throw new Error(`Invalid ticket type: ${item.ticket_type_id}`);
          }

          const now = new Date();
          if (ticketType.sale_start) {
            const startDate = new Date(ticketType.sale_start);
            if (!isNaN(startDate.getTime()) && startDate > now) {
              throw new Error(`Sale for ${ticketType.name} has not started.`);
            }
          }
          if (ticketType.sale_end) {
            const endDate = new Date(ticketType.sale_end);
            if (!isNaN(endDate.getTime()) && endDate < now) {
              throw new Error(`Sale for ${ticketType.name} has ended.`);
            }
          }

          // Check availability (original + resale)
          const availableOriginal = ticketType.quantity_total - ticketType.quantity_sold;
          const availableResale = ticketType.resale_queue || 0;
          const totalAvailable = availableOriginal + availableResale;

          if (item.quantity > totalAvailable) {
            throw new Error(`Overselling: Not enough tickets available for ${ticketType.name}.`);
          }

          totalPrice += ticketType.price * item.quantity;
          orderItems.push({
            ticket_type_id: ticketType.id,
            quantity: item.quantity,
            price_each: ticketType.price,
            name: ticketType.name,
            is_resale: availableOriginal < item.quantity // If we need more than available original, some are resale
          });
        }

        // Apply discount
        if (discountPercent > 0) {
          totalPrice = totalPrice * (1 - discountPercent / 100);
        }

        if (instagram_username) {
          const user = await tx.user.findUnique({ where: { id: req.user.id } });
          if (user && !user.instagram_username) {
            await tx.user.update({ where: { id: user.id }, data: { instagram_username } });
          }
        }

        // Create order
        const initialStatus = event.require_approval ? 'pending_approval' : 'approved';
        const newOrder = await tx.order.create({
          data: {
            user_id: req.user.id,
            event_id: event.id,
            total_price: totalPrice,
            order_status: initialStatus,
            instagram_username,
            phone,
            age: age !== undefined ? parseInt(age) : 0,
            voucher_id: voucherId,
            is_paid: false,
            processing_payment: false,
            points_awarded: false
          }
        });

        // Update voucher usage
        if (voucherId) {
          await tx.voucher.update({
            where: { id: voucherId },
            data: { current_uses: { increment: 1 } }
          });
        }

        // Create order tickets and update quantities
        let holderIndex = 0;
        for (const item of orderItems) {
          // Re-fetch ticketType inside transaction to ensure we have latest state (though locked)
          const ticketType = await tx.ticketType.findUnique({ where: { id: item.ticket_type_id } });
          if (!ticketType) throw new Error('Ticket type not found');
          
          // Logic for resale vs original
          let qtyFromOriginal = Math.min(item.quantity, ticketType.quantity_total - ticketType.quantity_sold);
          let qtyFromResale = item.quantity - qtyFromOriginal;

          // Extract holders for this ticket type
          const currentHolders = ticket_holders ? ticket_holders.slice(holderIndex, holderIndex + item.quantity) : [];
          holderIndex += item.quantity;

          await tx.orderTicket.create({
            data: {
              order_id: newOrder.id,
              ticket_type_id: item.ticket_type_id,
              quantity: item.quantity,
              price_each: item.price_each,
              qty_original: qtyFromOriginal,
              qty_resale: qtyFromResale,
              holder_name: currentHolders.join(', ')
            }
          });

          await tx.ticketType.update({
            where: { id: ticketType.id },
            data: {
              quantity_sold: { increment: qtyFromOriginal },
              resale_queue: { decrement: qtyFromResale }
            }
          });

          // If resale tickets were sold, mark the oldest pending resale requests as 'resold'
          if (qtyFromResale > 0) {
            const resaleRequests = await tx.resellRequest.findMany({
              where: { status: 'pending', ticket_type_id: item.ticket_type_id },
              orderBy: { created_at: 'asc' },
              take: qtyFromResale
            });
            
            for (const rr of resaleRequests) {
              await tx.resellRequest.update({
                where: { id: rr.id },
                data: { status: 'resold' }
              });
              // Also mark the original ticket as resold if order_ticket_id is provided
              if (rr.order_ticket_id) {
                await tx.orderTicket.update({
                  where: { id: rr.order_ticket_id },
                  data: { status: 'resold' }
                });
              }
            }
          }
        }
        return { success: true, order: newOrder, items: orderItems, event };
      });

      // Notify admin of new request (outside transaction)
      const admins = (await db.getUsers()).filter(u => u.role === 'admin');
      for (const admin of admins) {
        await db.addNotification({
          user_id: admin.id,
          title: 'New Ticket Request',
          message: `${req.user.name} has requested tickets for ${result.event.title}.`,
          type: 'info'
        });
      }

      res.status(201).json({ ...result.order, items: result.items, event: result.event });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/orders/:id/status', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body; // 'approved' | 'rejected' | 'paid' | 'cancelled'
      
      const result = await prisma.$transaction(async (tx) => {
        // Read order with FOR UPDATE behavior
        const orders = await tx.$queryRaw<any[]>`SELECT * FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
        const order = orders[0];
        if (!order) throw new Error('Order not found.');

        const oldStatus = order.order_status;
        const updates: any = { order_status: status };
        
        if (status === 'approved') {
          // Set 24h payment deadline
          const deadline = new Date();
          deadline.setHours(deadline.getHours() + 24);
          updates.payment_deadline = deadline;
        }

        // Restore tickets if moving FROM a reserved state TO a non-reserved state
        const isReserved = (s: string) => ['pending', 'approved', 'paid', 'pending_approval', 'invited'].includes(s);
        const isNotReserved = (s: string) => ['rejected', 'cancelled'].includes(s);

        if (isReserved(oldStatus) && isNotReserved(status)) {
          // Restore ticket quantities
          const items = await tx.orderTicket.findMany({ where: { order_id: orderId } });
          for (const item of items) {
            // Read ticket_type with FOR UPDATE behavior
            const ticketTypes = await tx.$queryRaw<any[]>`SELECT * FROM "TicketType" WHERE id = ${item.ticket_type_id} FOR UPDATE`;
            const ticketType = ticketTypes[0];
            if (ticketType) {
              await tx.ticketType.update({
                where: { id: ticketType.id },
                data: {
                  quantity_sold: Math.max(0, ticketType.quantity_sold - (item.qty_original || 0)),
                  resale_queue: (ticketType.resale_queue || 0) + (item.qty_resale || 0)
                }
              });
            }
          }
        }

        // Re-reserve tickets if moving FROM a non-reserved state TO a reserved state
        if (isNotReserved(oldStatus) && isReserved(status)) {
          const items = await tx.orderTicket.findMany({ where: { order_id: orderId } });
          for (const item of items) {
            // Read ticket_type with FOR UPDATE behavior
            const ticketTypes = await tx.$queryRaw<any[]>`SELECT * FROM "TicketType" WHERE id = ${item.ticket_type_id} FOR UPDATE`;
            const ticketType = ticketTypes[0];
            if (ticketType) {
              // Validate availability before re-reserving
              if (ticketType.quantity_sold + (item.qty_original || 0) > ticketType.quantity_total) {
                throw new Error(`Overselling: Not enough tickets available for ${ticketType.name} to re-reserve.`);
              }
              await tx.ticketType.update({
                where: { id: ticketType.id },
                data: {
                  quantity_sold: ticketType.quantity_sold + (item.qty_original || 0),
                  resale_queue: Math.max(0, (ticketType.resale_queue || 0) - (item.qty_resale || 0))
                }
              });
            }
          }
        }

        const updatedOrder = await tx.order.update({ where: { id: orderId }, data: updates });
        return updatedOrder;
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- QR Scanning API ---
  app.post('/api/admin/scan', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const { ticket_id, event_id } = req.body;
      if (!ticket_id || !event_id) return res.status(400).json({ error: 'Ticket ID and Event ID are required.' });

      const ticket = await db.getOrderTicketById(parseInt(ticket_id));
      if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

      const order = await db.getOrderById(ticket.order_id);
      if (!order || order.event_id !== parseInt(event_id)) {
        return res.status(400).json({ error: 'Ticket does not belong to this event.' });
      }

      if (order.order_status !== 'paid') {
        return res.status(400).json({ error: 'Ticket has not been paid for.' });
      }

      if (ticket.is_used) {
        return res.status(400).json({ 
          error: 'Ticket already scanned.', 
          scanned_count: ticket.scanned_count 
        });
      }

      await db.updateOrderTicket(ticket.id, { is_used: true, scanned_count: 1 });
      res.json({ message: 'Entry approved.', ticket });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Voucher Management API ---
  app.put('/api/orders/:id/approve', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await db.getOrderById(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found.' });

      const updatedOrder = await db.updateOrder(orderId, { order_status: 'approved' });
      const event = await db.getEventById(order.event_id);

      // Notify user
      await db.addNotification({
        user_id: order.user_id,
        title: 'Booking Approved!',
        message: `Your booking request for ${event?.title} has been approved. Please proceed to payment.`,
        type: 'success'
      });

      res.json(updatedOrder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/orders/:id/reject', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await db.getOrderById(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found.' });

      const updatedOrder = await db.updateOrder(orderId, { order_status: 'rejected' });
      const event = await db.getEventById(order.event_id);

      // Notify user
      await db.addNotification({
        user_id: order.user_id,
        title: 'Booking Rejected',
        message: `Your booking request for ${event?.title} was unfortunately rejected.`,
        type: 'error'
      });

      res.json(updatedOrder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/events/:id/toggle-qr', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const { enabled } = req.body;
      const updatedEvent = await db.updateEvent(parseInt(req.params.id), { qr_enabled_manual: enabled });
      if (!updatedEvent) return res.status(404).json({ error: 'Event not found.' });
      res.json(updatedEvent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/orders/:id/pay', authenticateToken, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await db.getOrderById(orderId);
      
      if (!order) return res.status(404).json({ error: 'Order not found.' });
      if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized.' });
      if (order.order_status !== 'approved') return res.status(400).json({ error: 'Order must be approved before payment.' });

      const updatedOrder = await db.updateOrder(orderId, { 
        order_status: 'paid', 
        is_paid: true,
        paid_at: new Date().toISOString() 
      });

      res.json(updatedOrder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/vouchers', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const vouchers = await db.getVouchers();
      const users = await db.getUsers();
      
      const enrichedVouchers = vouchers.map(v => {
        let creatorName = v.name || 'System';
        if (v.created_by_type === 'points') {
          const user = users.find(u => u.id === v.created_by_id);
          creatorName = user ? user.name : 'Unknown User';
        }
        
        const now = new Date();
        const isExpired = new Date(v.expiration_date) < now;
        const isRedeemed = v.current_uses >= v.max_uses;
        
        let status = 'active';
        if (isExpired) status = 'expired';
        else if (isRedeemed) status = 'redeemed';
        
        return { ...v, creatorName, status };
      });
      
      res.json(enrichedVouchers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/vouchers', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const { code, discount_percent, max_uses, expiration_date, name } = req.body;
      if (!code || discount_percent === undefined || max_uses === undefined || !expiration_date) {
        return res.status(400).json({ error: 'Code, discount, max uses, and expiration date are required.' });
      }

      // Validate expiration_date
      parseSafeDate(expiration_date, true);

      const newVoucher = await db.addVoucher({
        code,
        discount_percent: parseFloat(discount_percent),
        max_uses: parseInt(max_uses),
        current_uses: 0,
        expiration_date,
        name: name || null,
        created_by_type: 'admin',
        created_by_id: req.user.id
      });

      res.status(201).json(newVoucher);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Reward Points API ---
  app.get('/api/user/points', authenticateToken, async (req: any, res) => {
    try {
      const user = await db.getUserById(req.user.id);
      const history = await db.getPointsHistoryByUserId(req.user.id);
      res.json({ balance: user?.points || 0, history });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/user/redeem', authenticateToken, async (req: any, res) => {
    try {
      const { points_to_redeem } = req.body;
      const user = await db.getUserById(req.user.id);
      
      if (!user || (user.points || 0) < points_to_redeem) {
        return res.status(400).json({ error: 'Insufficient points.' });
      }

      // Logic: 100 points = 10% discount voucher
      if (points_to_redeem < 100) {
        return res.status(400).json({ error: 'Minimum 100 points required for redemption.' });
      }

      const discount = Math.floor(points_to_redeem / 10); // e.g., 100 points = 10%
      const code = `REWARD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1);

      const voucher = await db.addVoucher({
        code,
        discount_percent: Math.min(discount, 50), // Max 50% discount
        max_uses: 1,
        current_uses: 0,
        expiration_date: expirationDate.toISOString(),
        created_by_type: 'points',
        created_by_id: user.id
      });

      await db.updateUser(user.id, { points: user.points - points_to_redeem });
      await db.addPointsHistory({
        user_id: user.id,
        points: -points_to_redeem,
        type: 'redeem',
        description: `Redeemed points for voucher ${code}`
      });

      res.json({ message: 'Points redeemed successfully.', voucher });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Ticket Resale API ---
  app.post('/api/tickets/resale', authenticateToken, async (req: any, res) => {
    try {
      const { ticket_id, payout_method, payout_address } = req.body;
      if (!ticket_id || !payout_method || !payout_address) {
        return res.status(400).json({ error: 'Ticket ID, payout method, and address are required.' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Read ticket with FOR UPDATE behavior
        const tickets = await tx.$queryRaw<any[]>`SELECT * FROM "OrderTicket" WHERE id = ${parseInt(ticket_id)} FOR UPDATE`;
        const ticket = tickets[0];
        if (!ticket) throw new Error('Ticket not found.');

        const order = await tx.order.findUnique({ where: { id: ticket.order_id } });
        if (!order || order.user_id !== req.user.id) {
          throw new Error('You do not own this ticket.');
        }

        if (order.order_status !== 'paid') {
          throw new Error('Only paid tickets can be resold.');
        }

        if (ticket.status === 'reselling' || ticket.status === 'resold') {
          throw new Error('Ticket is already in resale process.');
        }

        // Mark ticket as reselling
        await tx.orderTicket.update({
          where: { id: ticket.id },
          data: { status: 'reselling' }
        });

        // Add to resale queue for the ticket type
        const ticketTypes = await tx.$queryRaw<any[]>`SELECT * FROM "TicketType" WHERE id = ${ticket.ticket_type_id} FOR UPDATE`;
        const ticketType = ticketTypes[0];
        if (ticketType) {
          await tx.ticketType.update({
            where: { id: ticketType.id },
            data: {
              quantity_sold: Math.max(0, ticketType.quantity_sold - 1),
              resale_queue: (ticketType.resale_queue || 0) + 1
            }
          });
        }

        const resaleRequest = await tx.resellRequest.create({
          data: {
            user_id: req.user.id,
            order_ticket_id: ticket.id,
            ticket_type_id: ticket.ticket_type_id,
            order_id: order.id,
            status: 'pending'
          }
        });

        return resaleRequest;
      });

      res.json({ message: 'Resale request submitted.', resaleRequest: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/resale', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const requests = await db.getResellRequests();
      const users = await db.getUsers();
      const enriched = requests.map(r => ({
        ...r,
        userName: users.find(u => u.id === r.user_id)?.name || 'Unknown'
      }));
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/resale/:id/payout', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await db.getResellRequestById(requestId);
      if (!request) return res.status(404).json({ error: 'Resale request not found.' });

      await db.updateResellRequest(requestId, { status: 'paid', paid_at: new Date().toISOString() });
      res.json({ message: 'Payout marked as completed.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/orders/:id', authenticateToken, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await db.getOrderById(orderId);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Security: Ensure the order belongs to the user or user is admin
      if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized access to order' });
      }

      const items = await db.getOrderTicketsByOrderId(order.id);
      const event = await db.getEventById(order.event_id);
      
      res.json({ ...order, items, event });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/orders', authenticateToken, async (req: any, res) => {
    try {
      const orders = await db.getOrdersByUserId(req.user.id);
      const now = new Date();
      
      const ordersWithDetails = await Promise.all(orders.map(async (o) => {
        // Check for expiration
        if (o.order_status === 'approved' && o.payment_deadline && new Date(o.payment_deadline) < now) {
          await db.updateOrder(o.id, { order_status: 'expired' });
          o.order_status = 'expired';
          
          // Restore ticket quantities
          const items = await db.getOrderTicketsByOrderId(o.id);
          for (const item of items) {
            const ticketType = (await db.getTicketTypes()).find(t => t.id === item.ticket_type_id);
            if (ticketType) {
              await db.updateTicketType(ticketType.id, {
                quantity_sold: Math.max(0, ticketType.quantity_sold - (item.qty_original || 0)),
                resale_queue: (ticketType.resale_queue || 0) + (item.qty_resale || 0)
              });
            }
          }
        }

        const items = await db.getOrderTicketsByOrderId(o.id);
        const event = await db.getEventById(o.event_id);
        return { ...o, items, event };
      }));
      res.json(ordersWithDetails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/orders', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const orders = await db.getOrders();
      const now = new Date();

      const ordersWithDetails = await Promise.all(orders.map(async (o) => {
        // Check for expiration
        if (o.order_status === 'approved' && o.payment_deadline && new Date(o.payment_deadline) < now) {
          await db.updateOrder(o.id, { order_status: 'expired' });
          o.order_status = 'expired';

          // Restore ticket quantities
          const items = await db.getOrderTicketsByOrderId(o.id);
          for (const item of items) {
            const ticketType = (await db.getTicketTypes()).find(t => t.id === item.ticket_type_id);
            if (ticketType) {
              await db.updateTicketType(ticketType.id, {
                quantity_sold: Math.max(0, ticketType.quantity_sold - (item.qty_original || 0)),
                resale_queue: (ticketType.resale_queue || 0) + (item.qty_resale || 0)
              });
            }
          }
        }

        const items = await db.getOrderTicketsByOrderId(o.id);
        const event = await db.getEventById(o.event_id);
        const user = await db.getUserById(o.user_id);
        return { ...o, items, event, user: user ? { name: user.name, email: user.email, phone: user.phone } : null };
      }));
      res.json(ordersWithDetails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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

      // Business Logic: Only approved orders can proceed to payment
      if (order.order_status !== 'approved') {
        return res.status(400).json({ 
          error: `Payment not allowed for status: ${order.order_status}. Order must be 'approved' first.` 
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
          merchantRedirect: `${APP_URL}/?order_id=${order_id}&origin=kashier`,
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
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/payments/verify/:orderId', authenticateToken, async (req: any, res) => {
    console.log("[VERIFY HIT] starting");
    const { orderId } = req.params;
    const orderIdNum = Number(orderId);

    if (!orderId || isNaN(orderIdNum)) {
      console.log("[VERIFY EXIT] Invalid orderId:", orderId);
      return res.status(400).json({ error: 'Invalid orderId' });
    }

    console.log(`[VERIFY HIT] Received request for orderId: ${orderId}`);
    console.log(`[AUTH USER ID] Authenticated user ID: ${req.user?.id}`);
    
    try {
      const order = await db.getOrderById(parseInt(orderId));
      if (!order) {
        console.error(`[ORDER NOT FOUND] Order not found: ${orderId}`);
        return res.status(404).json({ error: 'Order not found' });
      }
      
      console.log(`[ORDER FOUND] Owner ID: ${order.user_id}, Status: ${order.order_status}, Paid: ${order.is_paid}`);

      if (order.user_id !== req.user.id) {
        console.error(`[VERIFY EXIT] Unauthorized access. Order owner: ${order.user_id}, Request user: ${req.user.id}`);
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const responseData = { 
        success: order.is_paid,
        status: order.order_status, 
        is_paid: order.is_paid,
        order 
      };
      
      console.log('[RETURN RESPONSE] Sending success response');
      res.json(responseData);
    } catch (err: any) {
      console.error('[VERIFY EXIT] Error during verification:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }) as any, async (req: any, res: any) => {
    console.log('[Kashier Webhook] Received webhook notification');
    try {
      const rawBody = req.body;
      if (!rawBody || rawBody.length === 0) {
        console.error('[Webhook] Raw body missing. Verification impossible.');
        return res.status(400).json({ error: 'Raw body missing.' });
      }

      const payload = JSON.parse(rawBody.toString());
      const signature = req.headers['x-kashier-signature'] as string;
      const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY;

      if (!KASHIER_SECRET_KEY) {
        console.error('[Webhook] KASHIER_SECRET_KEY is missing. Webhook verification failed.');
        return res.status(500).json({ error: 'KASHIER_SECRET_KEY is missing.' });
      }

      if (signature) {
        const expectedSignature = crypto
          .createHmac('sha256', KASHIER_SECRET_KEY)
          .update(rawBody)
          .digest('hex');

        if (signature !== expectedSignature) {
          console.error('[Webhook] Invalid signature detected.');
          return res.status(401).json({ error: 'Invalid signature.' });
        }
      }

      const transactionId = payload.transactionId || payload.referenceNumber;
      const orderIdStr = payload.orderId || payload.merchantOrderId;
      
      if (!orderIdStr || !transactionId) {
        console.error('[Webhook] Missing required fields:', { orderIdStr, transactionId });
        return res.status(400).json({ error: 'Missing required fields.' });
      }

      const orderId = parseInt(orderIdStr);
      const order = await db.getOrderById(orderId);
      if (!order) {
        console.error('[Webhook] Order not found:', orderId);
        return res.status(404).json({ error: 'Order not found.' });
      }

      if (payload.status === 'SUCCESS') {
        console.log(`[Kashier Webhook] Payment SUCCESS for order #${orderId}`);
        await db.markOrderAsPaid(orderId, transactionId);
      } else {
        console.log(`[Kashier Webhook] Payment FAILED for order #${orderId}. Status: ${payload.status}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('[Webhook] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- QR Code Visibility Endpoint ---
  app.get('/api/orders/:id/qr-status', authenticateToken, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await db.getOrderById(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found.' });
      if (order.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized.' });
      }

      const event = await db.getEventById(order.event_id);
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      if (!order.is_paid || !order.qr_code_token) {
        return res.json({ visible: false, reason: 'Payment not confirmed' });
      }

      // Visibility Rules:
      // 1. Admin manually enabled
      // 2. 1 hour before event
      const eventTime = event.date.getTime();
      const oneHourBefore = eventTime - (60 * 60 * 1000);
      const currentTime = Date.now();

      const isVisible = event.qr_enabled_manual || currentTime >= oneHourBefore;

      if (isVisible) {
        return res.json({ 
          visible: true, 
          qr_data: `TicketsHub-Order-${order.qr_code_token}` 
        });
      } else {
        return res.json({ 
          visible: false, 
          reason: 'QR code will be available 1 hour before the event.' 
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Vouchers API ---
  app.get('/api/vouchers', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const vouchers = await db.getVouchers();
      res.json(vouchers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/vouchers', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const voucher = await db.addVoucher(req.body);
      res.status(201).json(voucher);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/vouchers/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      await db.deleteVoucher(parseInt(req.params.id));
      res.json({ message: 'Voucher deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Resell API ---
  app.get('/api/resell', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const requests = await db.getResellRequests();
      const requestsWithDetails = await Promise.all(requests.map(async (r) => {
        const order = await db.getOrderById(r.order_id);
        const user = await db.getUserById(r.user_id);
        const event = order ? await db.getEventById(order.event_id) : null;
        return { ...r, order, user, event };
      }));
      res.json(requestsWithDetails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/resell', authenticateToken, async (req: any, res) => {
    try {
      const { order_id, reason, price } = req.body;
      const order = await db.getOrderById(parseInt(order_id));
      if (!order || order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Invalid order.' });
      }
      const request = await db.addResellRequest({
        order_id: order.id,
        user_id: req.user.id,
        reason,
        price: price !== undefined ? parseFloat(price) : null
      });
      res.status(201).json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/resell/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const updated = await db.updateResellRequest(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: 'Request not found.' });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Settings API ---
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await db.getSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/settings', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const settings = await db.updateSettings(req.body);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Invitations API ---
  app.get('/api/admin/invitations', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const invitations = await db.getInvitations();
      const invitationsWithDetails = await Promise.all(invitations.map(async (i) => {
        const event = await db.getEventById(i.event_id);
        return { ...i, event };
      }));
      res.json(invitationsWithDetails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/invitations', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      const { email, event_id, ticket_type_id } = req.body;
      const result = await prisma.$transaction(async (tx) => {
        const event = await tx.event.findUnique({ where: { id: parseInt(event_id) } });
        if (!event) throw new Error('Event not found.');

        // Read ticket_type with FOR UPDATE behavior
        const ticketTypes = await tx.$queryRaw<any[]>`SELECT * FROM "TicketType" WHERE id = ${parseInt(ticket_type_id)} FOR UPDATE`;
        const ticketType = ticketTypes[0];
        if (!ticketType || ticketType.event_id !== event.id) {
          throw new Error('Invalid ticket type for this event.');
        }

        // Check availability
        if (ticketType.quantity_sold >= ticketType.quantity_total) {
          throw new Error('Overselling: Event is sold out for this ticket type.');
        }

        const invitation = await tx.invitation.create({
          data: {
            email,
            event_id: parseInt(event_id),
            ticket_type_id: parseInt(ticket_type_id),
            status: 'pending'
          }
        });

        // Automatically create a free order for the user if they exist
        const user = await tx.user.findUnique({ where: { email } });
        if (user) {
          const order = await tx.order.create({
            data: {
              user_id: user.id,
              event_id: parseInt(event_id),
              total_price: 0,
              order_status: 'invited',
              instagram_username: 'invited',
              phone: user.phone || 'N/A',
              age: user.age || 0,
              is_paid: true,
              processing_payment: false,
              points_awarded: false
            }
          });

          await tx.orderTicket.create({
            data: {
              order_id: order.id,
              ticket_type_id: parseInt(ticket_type_id),
              quantity: 1,
              price_each: 0,
              qty_original: 1,
              qty_resale: 0
            }
          });

          // Update quantity_sold
          await tx.ticketType.update({
            where: { id: ticketType.id },
            data: { quantity_sold: { increment: 1 } }
          });

          // Notify user
          await tx.notification.create({
            data: {
              user_id: user.id,
              title: 'New Invitation!',
              message: `You have been invited to ${event.title} by ${req.user.name}. Check your dashboard to accept.`,
              type: 'info'
            }
          });
        }
        return { invitation, user };
      });

      res.status(201).json(result.invitation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/invitations/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
      await db.deleteInvitation(parseInt(req.params.id));
      res.json({ message: 'Invitation deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'connected' });
    } catch (error: any) {
      console.error('[API] Health check failed:', error);
      res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
    }
  });

  // --- Vite Integration ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

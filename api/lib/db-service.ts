import prisma from './prisma.js';
import crypto from 'crypto';

export const parseSafeDate = (input: any, required: boolean = false) => {
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

class PrismaDB {
  async getSettings() {
    try {
      let settings = await prisma.setting.findFirst();
      if (!settings) {
        settings = await prisma.setting.create({ 
          data: { 
            service_fee_percent: 10,
            processing_fee_percent: 2.75,
            fixed_fee_egp: 3
          } 
        });
        console.log('[DB SUCCESS] Settings created');
      } else {
        console.log('[DB SUCCESS] Settings fetched');
      }
      return {
        ...settings,
        service_fee_percent: settings.service_fee_percent ?? 10,
        processing_fee_percent: settings.processing_fee_percent ?? 2.75,
        fixed_fee_egp: settings.fixed_fee_egp ?? 3
      };
    } catch (err) {
      console.error('[DB ERROR] getSettings:', err);
      // Critical fallback for production stability
      return {
        id: 0,
        service_fee_percent: 10,
        processing_fee_percent: 2.75,
        fixed_fee_egp: 3
      };
    }
  }

  async updateSettings(updates: any) {
    try {
      const settings = await this.getSettings();
      const result = await prisma.setting.update({
        where: { id: settings.id },
        data: updates
      });
      console.log('[DB SUCCESS] Settings updated:', result);
      return result;
    } catch (err) {
      console.error('[DB ERROR] updateSettings:', err);
      throw err;
    }
  }

  async getUsers() {
    try {
      const result = await prisma.user.findMany({ include: { points_history: true } });
      console.log(`[DB SUCCESS] Fetched ${result.length} users`);
      return result;
    } catch (err) {
      console.error('[DB ERROR] getUsers:', err);
      throw err;
    }
  }

  async getUserById(id: number) {
    try {
      const result = await prisma.user.findUnique({ 
        where: { id },
        include: { points_history: true }
      });
      console.log(`[DB SUCCESS] User fetched by ID ${id}:`, !!result);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getUserById(${id}):`, err);
      throw err;
    }
  }

  async getUserByEmail(email: string) {
    try {
      const result = await prisma.user.findUnique({ where: { email } });
      console.log(`[DB SUCCESS] User fetched by email ${email}:`, !!result);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getUserByEmail(${email}):`, err);
      throw err;
    }
  }

  async addUser(user: any) {
    try {
      const { id, ...data } = user;
      const result = await prisma.user.create({ data });
      console.log('[DB SUCCESS] User added:', result.id);
      return result;
    } catch (err) {
      console.error('[DB ERROR] addUser:', err);
      throw err;
    }
  }

  async updateUser(id: number, updates: any) {
    try {
      const result = await prisma.user.update({ where: { id }, data: updates });
      console.log('[DB SUCCESS] User updated:', id);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] updateUser(${id}):`, err);
      throw err;
    }
  }

  async deleteUser(id: number) {
    try {
      await prisma.user.delete({ where: { id } });
      console.log('[DB SUCCESS] User deleted:', id);
      return true;
    } catch (err) {
      console.error(`[DB ERROR] deleteUser(${id}):`, err);
      return false;
    }
  }

  async getEvents() {
    try {
      const result = await prisma.event.findMany({
        include: { 
          ticket_types: true,
          pre_registrations: true
        }
      });
      console.log(`[DB SUCCESS] Fetched ${result.length} events enriched`);
      return result;
    } catch (err) {
      console.error('[DB ERROR] getEvents:', err);
      throw err;
    }
  }

  async getEventById(id: number) {
    try {
      const result = await prisma.event.findUnique({ 
        where: { id },
        include: {
          ticket_types: true,
          pre_registrations: true
        }
      });
      console.log(`[DB SUCCESS] Event fetched by ID ${id}:`, !!result);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getEventById(${id}):`, err);
      throw err;
    }
  }

  async addEvent(event: any) {
    try {
      const { id, ...data } = event;
      const eventDate = data.date || data.event_date;
      const parsedDate = parseSafeDate(eventDate, true);
      if (data.event_date) {
        data.event_date = typeof data.event_date === 'string' ? data.event_date : parsedDate!.toISOString();
      }
      const result = await prisma.event.create({
        data: {
          ...data,
          date: parsedDate!,
          government: data.government || 'Other',
          require_approval: data.require_approval || false,
          qr_enabled_manual: data.qr_enabled_manual ?? false
        }
      });
      console.log('[DB SUCCESS] Event added:', result.id);
      return result;
    } catch (err) {
      console.error('[DB ERROR] addEvent:', err);
      throw err;
    }
  }

  async updateEvent(id: number, updates: any) {
    try {
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
          data.event_date = typeof data.event_date === 'string' ? data.event_date : parsed.toISOString();
        }
      }
      const result = await prisma.event.update({ where: { id }, data });
      console.log('[DB SUCCESS] Event updated:', id);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] updateEvent(${id}):`, err);
      throw err;
    }
  }

  async deleteEvent(id: number) {
    try {
      await prisma.event.delete({ where: { id } });
      console.log('[DB SUCCESS] Event deleted:', id);
      return true;
    } catch (err) {
      console.error(`[DB ERROR] deleteEvent(${id}):`, err);
      return false;
    }
  }

  async getPreRegistrations() {
    try {
      const result = await prisma.preRegistration.findMany();
      console.log(`[DB SUCCESS] Fetched ${result.length} pre-registrations`);
      return result;
    } catch (err) {
      console.error('[DB ERROR] getPreRegistrations:', err);
      throw err;
    }
  }

  async getPreRegistrationsByEventId(eventId: number) {
    try {
      const result = await prisma.preRegistration.findMany({ where: { event_id: eventId } });
      console.log(`[DB SUCCESS] Fetched ${result.length} pre-registrations for event ${eventId}`);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getPreRegistrationsByEventId(${eventId}):`, err);
      throw err;
    }
  }

  async getPreRegistrationsByUserId(userId: number) {
    try {
      const result = await prisma.preRegistration.findMany({ where: { user_id: userId } });
      console.log(`[DB SUCCESS] Fetched ${result.length} pre-registrations for user ${userId}`);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getPreRegistrationsByUserId(${userId}):`, err);
      throw err;
    }
  }

  async addPreRegistration(pr: any) {
    try {
      const { id, ...data } = pr;
      const result = await prisma.preRegistration.create({ data });
      console.log('[DB SUCCESS] Pre-registration added:', result.id);
      return result;
    } catch (err) {
      console.error('[DB ERROR] addPreRegistration:', err);
      throw err;
    }
  }

  async removePreRegistration(userId: number, eventId: number) {
    try {
      await prisma.preRegistration.deleteMany({
        where: { user_id: userId, event_id: eventId }
      });
      console.log(`[DB SUCCESS] Pre-registration removed for user ${userId} and event ${eventId}`);
    } catch (err) {
      console.error('[DB ERROR] removePreRegistration:', err);
      throw err;
    }
  }

  async getNotificationsByUserId(userId: number) {
    try {
      const result = await prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });
      console.log(`[DB SUCCESS] Fetched ${result.length} notifications for user ${userId}`);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getNotificationsByUserId(${userId}):`, err);
      throw err;
    }
  }

  async addNotification(n: any) {
    try {
      const { id, ...data } = n;
      const result = await prisma.notification.create({
        data: { ...data, read: false }
      });
      console.log('[DB SUCCESS] Notification added:', result.id);
      return result;
    } catch (err) {
      console.error('[DB ERROR] addNotification:', err);
      throw err;
    }
  }

  async markNotificationAsRead(id: number) {
    try {
      const result = await prisma.notification.update({
        where: { id },
        data: { read: true }
      });
      console.log('[DB SUCCESS] Notification marked as read:', id);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] markNotificationAsRead(${id}):`, err);
      throw err;
    }
  }

  async getTicketTypes() {
    try {
      const result = await prisma.ticketType.findMany();
      console.log(`[DB SUCCESS] Fetched ${result.length} ticket types`);
      return result;
    } catch (err) {
      console.error('[DB ERROR] getTicketTypes:', err);
      throw err;
    }
  }

  async getTicketTypesByEventId(eventId: number) {
    try {
      const result = await prisma.ticketType.findMany({ where: { event_id: eventId } });
      console.log(`[DB SUCCESS] Fetched ${result.length} ticket types for event ${eventId}`);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getTicketTypesByEventId(${eventId}):`, err);
      throw err;
    }
  }

  async addTicketType(ticketType: any) {
    try {
      const { id, ...data } = ticketType;
      const result = await prisma.ticketType.create({
        data: {
          ...data,
          description: data.description || null,
          sale_start: parseSafeDate(data.sale_start),
          sale_end: parseSafeDate(data.sale_end),
          resale_queue: 0
        }
      });
      console.log('[DB SUCCESS] Ticket type added:', result.id);
      return result;
    } catch (err) {
      console.error('[DB ERROR] addTicketType:', err);
      throw err;
    }
  }

  async getTicketTypeById(id: number) {
    try {
      const result = await prisma.ticketType.findUnique({ where: { id } });
      console.log(`[DB SUCCESS] Ticket type fetched by ID ${id}:`, !!result);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getTicketTypeById(${id}):`, err);
      throw err;
    }
  }

  async updateTicketType(id: number, updates: any) {
    try {
      const current = await prisma.ticketType.findUnique({ where: { id } });
      if (!current) return null;
      const data = { ...updates };
      if (data.sale_start !== undefined) data.sale_start = parseSafeDate(data.sale_start);
      if (data.sale_end !== undefined) data.sale_end = parseSafeDate(data.sale_end);
      const next = { ...current, ...data };
      if (next.quantity_sold > next.quantity_total) {
        throw new Error(`CRITICAL: quantity_sold exceeds quantity_total for ticket type ${id}`);
      }
      const result = await prisma.ticketType.update({ where: { id }, data });
      console.log('[DB SUCCESS] Ticket type updated:', id);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] updateTicketType(${id}):`, err);
      throw err;
    }
  }

  async deleteTicketType(id: number) {
    try {
      await prisma.ticketType.delete({ where: { id } });
      console.log('[DB SUCCESS] Ticket type deleted:', id);
    } catch (err) {
      console.error(`[DB ERROR] deleteTicketType(${id}):`, err);
      throw err;
    }
  }

  async setTicketTypesForEvent(eventId: number, ticketTypes: any[]) {
    try {
      const result = await prisma.$transaction(async (tx) => {
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
      console.log(`[DB SUCCESS] Set ${ticketTypes.length} ticket types for event ${eventId}`);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] setTicketTypesForEvent(${eventId}):`, err);
      throw err;
    }
  }

  async getVouchers() {
    try {
      const result = await prisma.voucher.findMany();
      console.log(`[DB SUCCESS] Fetched ${result.length} vouchers`);
      return result;
    } catch (err) {
      console.error('[DB ERROR] getVouchers:', err);
      throw err;
    }
  }

  async getVoucherByCode(code: string) {
    try {
      const result = await prisma.voucher.findUnique({ where: { code } });
      console.log(`[DB SUCCESS] Voucher fetched by code ${code}:`, !!result);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getVoucherByCode(${code}):`, err);
      throw err;
    }
  }

  async addVoucher(voucher: any) {
    try {
      const { id, ...data } = voucher;
      const result = await prisma.voucher.create({
        data: {
          ...data,
          expiration_date: parseSafeDate(data.expiration_date, true)!,
          current_uses: 0
        }
      });
      console.log('[DB SUCCESS] Voucher added:', result.id);
      return result;
    } catch (err) {
      console.error('[DB ERROR] addVoucher:', err);
      throw err;
    }
  }

  async updateVoucher(id: number, updates: any) {
    try {
      const current = await prisma.voucher.findUnique({ where: { id } });
      if (!current) return null;
      const data = { ...updates };
      if (data.expiration_date !== undefined) data.expiration_date = parseSafeDate(data.expiration_date, true);
      const next = { ...current, ...data };
      if (next.current_uses > next.max_uses) throw new Error(`CRITICAL: uses exceed max for voucher ${id}`);
      const result = await prisma.voucher.update({ where: { id }, data });
      console.log('[DB SUCCESS] Voucher updated:', id);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] updateVoucher(${id}):`, err);
      throw err;
    }
  }

  async deleteVoucher(id: number) {
    try {
      await prisma.voucher.delete({ where: { id } });
      console.log('[DB SUCCESS] Voucher deleted:', id);
    } catch (err) {
      console.error(`[DB ERROR] deleteVoucher(${id}):`, err);
      throw err;
    }
  }

  async getResellRequests() {
    try {
      const result = await prisma.resellRequest.findMany();
      console.log(`[DB SUCCESS] Fetched ${result.length} resell requests`);
      return result;
    } catch (err) {
      console.error('[DB ERROR] getResellRequests:', err);
      throw err;
    }
  }

  async getResellRequestById(id: number) {
    try {
      const result = await prisma.resellRequest.findUnique({ where: { id } });
      console.log(`[DB SUCCESS] Resell request fetched by ID ${id}:`, !!result);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getResellRequestById(${id}):`, err);
      throw err;
    }
  }

  async addResellRequest(request: any) {
    try {
      const { id, ...data } = request;
      const result = await prisma.resellRequest.create({
        data: { ...data, status: 'pending' }
      });
      console.log('[DB SUCCESS] Resell request added:', result.id);
      return result;
    } catch (err) {
      console.error('[DB ERROR] addResellRequest:', err);
      throw err;
    }
  }

  async updateResellRequest(id: number, updates: any) {
    try {
      const result = await prisma.resellRequest.update({ where: { id }, data: updates });
      console.log('[DB SUCCESS] Resell request updated:', id);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] updateResellRequest(${id}):`, err);
      throw err;
    }
  }

  async getInvitations() {
    try {
      const result = await prisma.invitation.findMany();
      console.log(`[DB SUCCESS] Fetched ${result.length} invitations`);
      return result;
    } catch (err) {
      console.error('[DB ERROR] getInvitations:', err);
      throw err;
    }
  }

  async addInvitation(invitation: any) {
    try {
      const { id, ...data } = invitation;
      const result = await prisma.invitation.create({
        data: { ...data, status: 'pending' }
      });
      console.log('[DB SUCCESS] Invitation added:', result.id);
      return result;
    } catch (err) {
      console.error('[DB ERROR] addInvitation:', err);
      throw err;
    }
  }

  async updateInvitation(id: number, updates: any) {
    try {
      const result = await prisma.invitation.update({ where: { id }, data: updates });
      console.log('[DB SUCCESS] Invitation updated:', id);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] updateInvitation(${id}):`, err);
      throw err;
    }
  }

  async deleteInvitation(id: number) {
    try {
      await prisma.invitation.delete({ where: { id } });
      console.log('[DB SUCCESS] Invitation deleted:', id);
    } catch (err) {
      console.error(`[DB ERROR] deleteInvitation(${id}):`, err);
      throw err;
    }
  }

  async getOrders() {
    try {
      const result = await prisma.order.findMany({
        include: { user: true, event: true, order_tickets: { include: { ticket_type: true } } }
      });
      console.log(`[DB SUCCESS] Fetched ${result.length} orders`);
      return result;
    } catch (err) {
      console.error('[DB ERROR] getOrders:', err);
      throw err;
    }
  }

  async getOrdersByUserId(userId: number) {
    try {
      const result = await prisma.order.findMany({ 
        where: { user_id: userId },
        include: { user: true, event: true, order_tickets: { include: { ticket_type: true } } }
      });
      console.log(`[DB SUCCESS] Fetched ${result.length} orders for user ${userId}`);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getOrdersByUserId(${userId}):`, err);
      throw err;
    }
  }

  async getOrderById(id: number) {
    try {
      const order = await prisma.order.findUnique({ 
        where: { id },
        include: { user: true, event: true, order_tickets: { include: { ticket_type: true } } }
      });
      if (order && (order as any).order_tickets) (order as any).items = (order as any).order_tickets;
      console.log(`[DB SUCCESS] Order fetched by ID ${id}:`, !!order);
      return order;
    } catch (err) {
      console.error(`[DB ERROR] getOrderById(${id}):`, err);
      throw err;
    }
  }

  async getOrderByKashierOrderId(kashierOrderId: string) {
    try {
      const result = await prisma.order.findUnique({
        where: { kashier_order_id: kashierOrderId },
        include: { user: true, event: true, order_tickets: { include: { ticket_type: true } } }
      });
      console.log(`[DB SUCCESS] Order fetched by Kashier order ID ${kashierOrderId}:`, !!result);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getOrderByKashierOrderId(${kashierOrderId}):`, err);
      throw err;
    }
  }

  async addOrder(order: any) {
    try {
      const { id, ...data } = order;
      const result = await prisma.order.create({
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
      console.log('[DB SUCCESS] Order added:', result.id);
      return result;
    } catch (err) {
      console.error('[DB ERROR] addOrder:', err);
      throw err;
    }
  }

  async updateOrder(id: number, updates: any) {
    try {
      const data = { ...updates };
      if (data.paid_at) data.paid_at = new Date(data.paid_at);
      const result = await prisma.order.update({ where: { id }, data });
      console.log('[DB SUCCESS] Order updated:', id);
      return result;
    } catch (err) {
      console.error(`[DB ERROR] updateOrder(${id}):`, err);
      throw err;
    }
  }

  async cleanupExpiredReservations() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const expiredOrders = await prisma.order.findMany({
      where: { order_status: 'pending', reserved_at: { lt: oneHourAgo }, is_paid: false },
      include: { order_tickets: true }
    });
    if (expiredOrders.length === 0) return;
    for (const order of expiredOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          const currentOrder = await tx.order.findUnique({ where: { id: order.id } });
          if (!currentOrder || currentOrder.order_status !== 'pending' || currentOrder.is_paid) return;
          await tx.order.update({ where: { id: order.id }, data: { order_status: 'cancelled' } });
          for (const item of order.order_tickets) {
            if (item.qty_original) await tx.ticketType.update({ where: { id: item.ticket_type_id }, data: { quantity_sold: { decrement: item.qty_original } } });
            if (item.qty_resale) await tx.ticketType.update({ where: { id: item.ticket_type_id }, data: { resale_queue: { increment: item.qty_resale } } });
          }
        });
      } catch (err) {
        console.error(`[Cleanup] Failed to expire reservation #${order.id}:`, err);
      }
    }
  }

  async markOrderAsPaid(orderId: number, transactionId: string, kashierOrderId?: string) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const orders = await tx.$queryRaw<any[]>`SELECT * FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
        const order = orders[0];
        if (!order) return { success: false, reason: 'not_found' };
        if (order.is_paid) return { success: true, already_paid: true, order };
        const existingTransaction = await tx.order.findFirst({ where: { kashier_transaction_id: transactionId, id: { not: orderId } } });
        if (existingTransaction) return { success: false, reason: 'transaction_reused' };
        const updateData: any = { order_status: 'paid', is_paid: true, paid_at: new Date(), kashier_transaction_id: transactionId, processing_payment: false };
        if (!order.qr_code_token) updateData.qr_code_token = crypto.randomBytes(16).toString('hex');
        if (kashierOrderId) updateData.kashier_order_id = kashierOrderId;
        const updatedOrder = await tx.order.update({ where: { id: orderId }, data: updateData });
        if (!updatedOrder.points_awarded) {
          try {
            const points = Math.floor(updatedOrder.total_price * 0.1);
            const user = await tx.user.findUnique({ where: { id: updatedOrder.user_id! } });
            if (user) {
              await tx.user.update({ where: { id: user.id }, data: { points: { increment: points } } });
              await tx.pointsHistory.create({ data: { user_id: user.id, order_id: orderId, points, type: 'earn', description: `Points earned from order #${orderId}` } });
              await tx.order.update({ where: { id: orderId }, data: { points_awarded: true } });
            }
          } catch (e) {}
        }
        try {
          await tx.notification.create({ data: { user_id: updatedOrder.user_id, title: 'Payment Confirmed', message: `Your payment was successful for order #${orderId}!`, type: 'payment' } });
        } catch (e) {}
        return { success: true, order: updatedOrder };
      }, { timeout: 15000 });
      return result;
    } catch (err) {
      console.error(`[DB ERROR] markOrderAsPaid(${orderId}):`, err);
      throw err;
    }
  }

  async getOrderTicketsByOrderId(orderId: number) {
    try {
      const result = await prisma.orderTicket.findMany({ where: { order_id: orderId } });
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getOrderTicketsByOrderId(${orderId}):`, err);
      throw err;
    }
  }

  async addOrderTicket(orderTicket: any) {
    try {
      const { id, ...data } = orderTicket;
      const result = await prisma.orderTicket.create({ data: { ...data, scanned_count: 0, is_used: false } });
      return result;
    } catch (err) {
      console.error('[DB ERROR] addOrderTicket:', err);
      throw err;
    }
  }

  async updateOrderTicket(id: number, updates: any) {
    try {
      const result = await prisma.orderTicket.update({ where: { id }, data: updates });
      return result;
    } catch (err) {
      console.error(`[DB ERROR] updateOrderTicket(${id}):`, err);
      throw err;
    }
  }

  async getOrderTicketById(id: number) {
    try {
      const result = await prisma.orderTicket.findUnique({ where: { id } });
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getOrderTicketById(${id}):`, err);
      throw err;
    }
  }

  async getPointsHistoryByUserId(userId: number) {
    try {
      const result = await prisma.pointsHistory.findMany({ where: { user_id: userId } });
      return result;
    } catch (err) {
      console.error(`[DB ERROR] getPointsHistoryByUserId(${userId}):`, err);
      throw err;
    }
  }

  async addPointsHistory(history: any) {
    try {
      const { id, ...data } = history;
      const result = await prisma.pointsHistory.create({ data });
      return result;
    } catch (err) {
      console.error('[DB ERROR] addPointsHistory:', err);
      throw err;
    }
  }

  async init() {}
  async save() {}
}

export const db = new PrismaDB();

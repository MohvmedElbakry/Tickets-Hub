
import * as ordersApi from '../lib/api/ordersApi';
import { normalizeEvent } from '../lib/utils';

export const orderService = {
  async createOrder(params: {
    event_id: string | number;
    tickets: { ticket_type_id: string | number; quantity: number }[];
    instagram_username: string;
    phone: string;
    birthdate: string;
    age: number;
    voucher_code?: string;
    ticket_holders?: any[];
  }) {
    return await ordersApi.createOrder(params);
  },

  async getOrders() {
    const data = await ordersApi.getOrders();
    if (data && Array.isArray(data)) {
      return data.map((o: any) => ({
        ...o,
        event: o.event ? normalizeEvent(o.event) : null
      }));
    }
    return data;
  },

  async getOrder(id: string | number) {
    const data = await ordersApi.getOrder(id);
    if (data && data.event) {
      data.event = normalizeEvent(data.event);
    }
    return data;
  },

  async getOrderQRStatus(id: string | number) {
    return await ordersApi.getOrderQRStatus(id);
  },

  async payOrder(id: string | number) {
    return await ordersApi.payOrder(id);
  },

  async rejectInvitation(id: string | number) {
    return await ordersApi.rejectInvitation(id);
  },

  async createResaleRequest(params: {
    order_ticket_id: number;
    payout_method: 'instapay' | 'vodafone';
    payout_address: string;
    amount: number;
  }) {
    return await ordersApi.createResaleRequest(params);
  },

  async createPaymentSession(orderId: number | string) {
    return await ordersApi.createPaymentSession(orderId);
  },

  async verifyPayment(params: { orderId: string | number }) {
    return await ordersApi.verifyPayment(params);
  },

  async confirmPaymentFromReturn(data: { orderId: string | number; transactionId: string; status: string }) {
    return await ordersApi.confirmPaymentFromReturn(data);
  },

  async adminGetOrders() {
    return await ordersApi.adminGetOrders();
  },

  async adminGetResellRequests() {
    return await ordersApi.adminGetResellRequests();
  },

  async adminGetInvitations() {
    return await ordersApi.adminGetInvitations();
  },

  async adminCreateInvitation(params: any) {
    return await ordersApi.adminCreateInvitation(params);
  },

  async adminMarkResalePaid(id: string | number) {
    return await ordersApi.adminMarkResalePaid(id);
  },

  async adminDeleteInvitation(id: string | number) {
    return await ordersApi.adminDeleteInvitation(id);
  },

  async adminApproveOrder(id: number | string) {
    return await ordersApi.adminApproveOrder(id);
  },

  async adminRejectOrder(id: number | string) {
    return await ordersApi.adminRejectOrder(id);
  }
};

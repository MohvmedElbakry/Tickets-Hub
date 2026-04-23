
import * as ordersApi from '../lib/api/ordersApi';

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
    return await ordersApi.getOrders();
  },

  async getOrder(id: string | number) {
    return await ordersApi.getOrder(id);
  },

  async getOrderQRStatus(id: string | number) {
    return await ordersApi.getOrderQRStatus(Number(id));
  },

  async payOrder(id: string | number) {
    return await ordersApi.payOrder(Number(id));
  },

  async rejectInvitation(id: string | number) {
    return await ordersApi.rejectInvitation(Number(id));
  },

  async createResaleRequest(params: {
    order_ticket_id: number;
    payout_method: 'instapay' | 'vodafone';
    payout_address: string;
    amount: number;
  }) {
    return await ordersApi.createResaleRequest(params);
  },

  async createPaymentSession(orderId: number) {
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

  async adminMarkResalePaid(id: number) {
    return await ordersApi.adminMarkResalePaid(id);
  },

  async adminDeleteInvitation(id: number) {
    return await ordersApi.adminDeleteInvitation(id);
  },

  async adminApproveOrder(id: number | string) {
    return await ordersApi.adminApproveOrder(Number(id));
  },

  async adminRejectOrder(id: number | string) {
    return await ordersApi.adminRejectOrder(Number(id));
  }
};

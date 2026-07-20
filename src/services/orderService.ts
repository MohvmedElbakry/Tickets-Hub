
import * as ordersApi from '../lib/api/ordersApi';
import { normalizeEvent } from '../lib/utils';
import { OrderPublicId } from '../types';

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

  async getOrder(id: OrderPublicId) {
    const data = await ordersApi.getOrder(id);
    if (data && data.event) {
      data.event = normalizeEvent(data.event);
    }
    return data;
  },

  async getOrderQRStatus(id: OrderPublicId) {
    return await ordersApi.getOrderQRStatus(id);
  },

  async payOrder(id: OrderPublicId) {
    return await ordersApi.payOrder(id);
  },

  async rejectInvitation(id: OrderPublicId) {
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

  async createPaymentSession(orderId: OrderPublicId) {
    return await ordersApi.createPaymentSession(orderId);
  },

  async verifyPayment(params: { orderId: OrderPublicId }) {
    return await ordersApi.verifyPayment(params);
  },

  async confirmPaymentFromReturn(data: { orderId: OrderPublicId; transactionId: string; status: string }) {
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

  async adminApproveOrder(id: OrderPublicId) {
    return await ordersApi.adminApproveOrder(id);
  },

  async adminRejectOrder(id: OrderPublicId) {
    return await ordersApi.adminRejectOrder(id);
  },

  async getTickets() {
    return await ordersApi.getTickets();
  },

  async getTicket(publicId: string) {
    return await ordersApi.getTicket(publicId);
  },

  async getTicketQRStatus(publicId: string) {
    return await ordersApi.getTicketQRStatus(publicId);
  },

  async transferTicket(publicId: string, email: string) {
    return await ordersApi.transferTicket(publicId, email);
  },

  async acceptTransfer(params: { token?: string; transferId?: number }) {
    return await ordersApi.acceptTransfer(params);
  },

  async declineTransfer(params: { token?: string; transferId?: number }) {
    return await ordersApi.declineTransfer(params);
  },

  async cancelTransfer(transferId: number) {
    return await ordersApi.cancelTransfer(transferId);
  },

  async getPendingTransfers() {
    return await ordersApi.getPendingTransfers();
  },

  async getTransferHistory() {
    return await ordersApi.getTransferHistory();
  },

  async adminCancelTransfer(transferId: number) {
    return await ordersApi.adminCancelTransfer(transferId);
  }
};


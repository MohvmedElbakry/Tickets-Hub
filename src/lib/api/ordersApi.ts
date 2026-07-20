
import { fetchWithAuth } from './client';
import { Order, OrderPublicId, OrderId } from '../../types';

export const getOrders = async (): Promise<Order[]> => {
  return await fetchWithAuth('/api/orders');
};

export const getOrder = async (id: OrderPublicId): Promise<Order> => {
  return await fetchWithAuth(`/api/orders/${id}`);
};

export const createOrder = async (data: any): Promise<any> => {
  return await fetchWithAuth('/api/orders', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const verifyPayment = async (params: { orderId: OrderPublicId }): Promise<any> => {
  return await fetchWithAuth(`/api/payments/verify/${params.orderId}`);
};

export const getOrderQRStatus = async (orderId: OrderPublicId): Promise<any> => {
  return await fetchWithAuth(`/api/orders/${orderId}/qr-status`);
};

export const createResaleRequest = async (data: any): Promise<any> => {
  return await fetchWithAuth('/api/tickets/resale', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const confirmPaymentFromReturn = async (data: { orderId: OrderPublicId; transactionId: string; status: string }): Promise<any> => {
  return await fetchWithAuth('/api/payments/confirm-from-return', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const adminGetOrders = async (): Promise<Order[]> => {
  return await fetchWithAuth('/api/admin/orders');
};

export const adminUpdateOrderStatus = async (id: OrderPublicId, status: string): Promise<any> => {
  return await fetchWithAuth(`/api/admin/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
};

export const adminApproveOrder = async (id: OrderPublicId): Promise<any> => {
  return await fetchWithAuth(`/api/orders/${id}/approve`, {
    method: 'PUT'
  });
};

export const adminRejectOrder = async (id: OrderPublicId): Promise<any> => {
  return await fetchWithAuth(`/api/orders/${id}/reject`, {
    method: 'PUT'
  });
};

export const adminGetResellRequests = async (): Promise<any[]> => {
  return await fetchWithAuth('/api/admin/resale');
};

export const adminUpdateResellStatus = async (id: number, status: string): Promise<any> => {
  return await fetchWithAuth(`/api/admin/resale/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
};

export const adminMarkResalePaid = async (id: number | string): Promise<any> => {
  return await fetchWithAuth(`/api/admin/resale/${id}/payout`, {
    method: 'PUT'
  });
};

export const adminGetInvitations = async (): Promise<any[]> => {
  return await fetchWithAuth('/api/admin/invitations');
};

export const adminCreateInvitation = async (data: any): Promise<any> => {
  return await fetchWithAuth('/api/admin/invitations', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const adminDeleteInvitation = async (id: number | string): Promise<any> => {
  return await fetchWithAuth(`/api/admin/invitations/${id}`, {
    method: 'DELETE'
  });
};

export const payOrder = async (id: OrderPublicId): Promise<any> => {
  return await fetchWithAuth(`/api/orders/${id}/pay`, {
    method: 'PUT'
  });
};

export const rejectInvitation = async (id: OrderPublicId): Promise<any> => {
  return await fetchWithAuth(`/api/orders/${id}/reject`, {
    method: 'PUT'
  });
};

export const createPaymentSession = async (orderId: OrderPublicId): Promise<any> => {
  return await fetchWithAuth('/api/payments/create-session', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId })
  });
};

export const getTickets = async (): Promise<any[]> => {
  return await fetchWithAuth('/api/tickets');
};

export const getTicket = async (publicId: string): Promise<any> => {
  return await fetchWithAuth(`/api/tickets/${publicId}`);
};

export const getTicketQRStatus = async (publicId: string): Promise<any> => {
  return await fetchWithAuth(`/api/tickets/${publicId}/qr-status`);
};

export const transferTicket = async (publicId: string, email: string): Promise<any> => {
  return await fetchWithAuth(`/api/tickets/${publicId}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ email })
  });
};

export const acceptTransfer = async (params: { token?: string; transferId?: number }): Promise<any> => {
  return await fetchWithAuth('/api/transfers/accept', {
    method: 'POST',
    body: JSON.stringify(params)
  });
};

export const declineTransfer = async (params: { token?: string; transferId?: number }): Promise<any> => {
  return await fetchWithAuth('/api/transfers/decline', {
    method: 'POST',
    body: JSON.stringify(params)
  });
};

export const cancelTransfer = async (transferId: number): Promise<any> => {
  return await fetchWithAuth('/api/transfers/cancel', {
    method: 'POST',
    body: JSON.stringify({ transferId })
  });
};

export const getPendingTransfers = async (): Promise<any> => {
  return await fetchWithAuth('/api/transfers/pending');
};

export const getTransferHistory = async (): Promise<any> => {
  return await fetchWithAuth('/api/transfers/history');
};

export const adminCancelTransfer = async (transferId: number): Promise<any> => {
  return await fetchWithAuth('/api/admin/transfers/cancel', {
    method: 'POST',
    body: JSON.stringify({ transferId })
  });
};


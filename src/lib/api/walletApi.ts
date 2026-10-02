import { fetchWithAuth } from './client';
import { SellerBalance, PayoutDestination, PayoutRequest } from '../../types';

export interface SellerPayoutsResponse {
  payouts: PayoutRequest[];
  balance: SellerBalance;
}

export interface SellerBalanceResponse {
  balance: SellerBalance;
}

export interface PayoutDestinationsResponse {
  destinations: PayoutDestination[];
}

export const getSellerBalance = async (): Promise<SellerBalance> => {
  const data: SellerBalanceResponse = await fetchWithAuth('/api/seller/balance');
  return data.balance;
};

export const getSellerPayouts = async (): Promise<SellerPayoutsResponse> => {
  return await fetchWithAuth('/api/seller/payouts');
};

export const requestPayout = async (destinationId: number, amount: number): Promise<{ message: string; payoutRequest: PayoutRequest }> => {
  return await fetchWithAuth('/api/seller/payouts', {
    method: 'POST',
    body: JSON.stringify({ destinationId, amount })
  });
};

export const getPayoutDestinations = async (): Promise<PayoutDestination[]> => {
  const data: PayoutDestinationsResponse = await fetchWithAuth('/api/seller/payout-destinations');
  return data.destinations;
};

export const addPayoutDestination = async (
  type: 'BANK_ACCOUNT' | 'INSTAPAY' | 'VODAFONE_CASH',
  accountName: string,
  accountDetails: string
): Promise<{ message: string; destination: PayoutDestination }> => {
  return await fetchWithAuth('/api/seller/payout-destinations', {
    method: 'POST',
    body: JSON.stringify({ type, accountName, accountDetails })
  });
};

export const deletePayoutDestination = async (id: number): Promise<{ message: string }> => {
  return await fetchWithAuth(`/api/seller/payout-destinations/${id}`, {
    method: 'DELETE'
  });
};

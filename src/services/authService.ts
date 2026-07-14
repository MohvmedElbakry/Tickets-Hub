
import * as authApi from '../lib/api/authApi';
import { UserProfile } from '../types';

export const authService = {
  async getCurrentUser(): Promise<UserProfile | null> {
    return await authApi.getCurrentUser();
  },

  async login(params: any) {
    return await authApi.login(params);
  },

  async signup(params: any) {
    return await authApi.signup(params);
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  async getUserPoints() {
    return await authApi.getUserPoints();
  },

  async adminGetUsers() {
    return await authApi.adminGetUsers();
  },

  async adminGetVouchers() {
    return await authApi.adminGetVouchers();
  },

  async adminUpdateUserRole(userId: number, newRole: 'admin' | 'user') {
    return await authApi.adminUpdateUserRole(userId, newRole);
  },

  async adminCreateVoucher(params: {
    code: string;
    discount_percent: number;
    max_uses: number;
    expiration_date: string;
    name: string;
  }) {
    return await authApi.adminCreateVoucher(params);
  },

  async redeemPoints(points: number) {
    return await authApi.redeemPoints(points);
  },

  async forgotPassword(email: string) {
    return await authApi.forgotPassword(email);
  },

  async verifyResetPassword(token: string) {
    return await authApi.verifyResetPassword(token);
  },

  async resetPassword(data: any) {
    return await authApi.resetPassword(data);
  },

  async changePassword(data: any) {
    return await authApi.changePassword(data);
  },

  async verifyEmail(token: string) {
    return await authApi.verifyEmail(token);
  },

  async resendVerification() {
    return await authApi.resendVerification();
  },

  async updateProfile(id: number, data: any) {
    return await authApi.updateProfile(id, data);
  },

  async requestAccountDeletion(password: string) {
    return await authApi.requestAccountDeletion(password);
  },

  async confirmAccountDeletion(token: string, reason?: string) {
    return await authApi.confirmAccountDeletion(token, reason);
  }
};

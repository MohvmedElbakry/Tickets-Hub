
import * as notificationsApi from '../lib/api/notificationsApi';

export const notificationService = {
  async getNotifications() {
    return await notificationsApi.getNotifications();
  },

  async markAsRead(id: number) {
    return await notificationsApi.markNotificationRead(id);
  }
};

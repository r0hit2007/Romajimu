const { prisma } = require('../config/db');

class SosService {
  async getSettings(userId) {
    let settings = await prisma.sosSettings.findUnique({
      where: { user_id: userId },
    });

    if (!settings) {
      settings = await prisma.sosSettings.create({
        data: {
          user_id: userId,
          countdown: 5,
          practice_mode: false,
          custom_message: 'Emergency: I need assistance immediately. Please check my location.',
          region: 'US',
          include_location: true,
          include_audio: false,
        },
      });
    }

    return settings;
  }

  async updateSettings(userId, data) {
    return prisma.sosSettings.upsert({
      where: { user_id: userId },
      update: data,
      create: {
        user_id: userId,
        ...data,
      },
    });
  }

  async recordSosAlert(userId, { latitude, longitude, message, trigger_method, status, recipient_count }) {
    return prisma.sosHistory.create({
      data: {
        user_id: userId,
        latitude: latitude !== undefined ? latitude : null,
        longitude: longitude !== undefined ? longitude : null,
        message,
        trigger_method: trigger_method || 'manual', // 'shake', 'calculator', 'manual'
        status: status || 'sent',                   // 'sent', 'cancelled', 'practice', 'failed'
        recipient_count: recipient_count || 0,
      },
    });
  }

  async getSosHistory(userId) {
    return prisma.sosHistory.findMany({
      where: { user_id: userId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  }

  /**
   * Sync offline queued alerts once internet is restored
   */
  async syncOfflineQueue(userId, queueItems = []) {
    if (!Array.isArray(queueItems) || queueItems.length === 0) return [];

    const synced = [];
    for (const item of queueItems) {
      const record = await prisma.sosHistory.create({
        data: {
          user_id: userId,
          timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
          latitude: item.latitude || item.coords?.latitude || null,
          longitude: item.longitude || item.coords?.longitude || null,
          message: item.message || 'Emergency alert (offline sync)',
          trigger_method: item.trigger_method || item.triggerMethod || 'manual',
          status: item.status || 'sent',
          recipient_count: item.recipient_count || item.recipientCount || 0,
        },
      });
      synced.push(record);
    }

    return synced;
  }
}

module.exports = new SosService();

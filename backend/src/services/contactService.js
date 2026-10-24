const { prisma } = require('../config/db');

class ContactService {
  async getContacts(userId) {
    return prisma.emergencyContact.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });
  }

  async addContact(userId, { name, phone, relationship, is_sos_enabled }) {
    // Sanitize phone number
    const sanitizedPhone = String(phone).trim();

    return prisma.emergencyContact.create({
      data: {
        user_id: userId,
        name: name.trim(),
        phone: sanitizedPhone,
        relationship: relationship || 'Other',
        is_sos_enabled: is_sos_enabled !== undefined ? is_sos_enabled : true,
      },
    });
  }

  async updateContact(userId, contactId, data) {
    // Ensure contact belongs to user
    const contact = await prisma.emergencyContact.findFirst({
      where: { id: contactId, user_id: userId },
    });

    if (!contact) {
      const err = new Error('Contact not found or does not belong to you.');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.phone !== undefined) updateData.phone = String(data.phone).trim();
    if (data.relationship !== undefined) updateData.relationship = data.relationship;
    if (data.is_sos_enabled !== undefined) updateData.is_sos_enabled = data.is_sos_enabled;

    return prisma.emergencyContact.update({
      where: { id: contactId },
      data: updateData,
    });
  }

  async deleteContact(userId, contactId) {
    const contact = await prisma.emergencyContact.findFirst({
      where: { id: contactId, user_id: userId },
    });

    if (!contact) {
      const err = new Error('Contact not found or does not belong to you.');
      err.statusCode = 404;
      throw err;
    }

    return prisma.emergencyContact.delete({
      where: { id: contactId },
    });
  }

  async toggleSos(userId, contactId) {
    const contact = await prisma.emergencyContact.findFirst({
      where: { id: contactId, user_id: userId },
    });

    if (!contact) {
      const err = new Error('Contact not found.');
      err.statusCode = 404;
      throw err;
    }

    return prisma.emergencyContact.update({
      where: { id: contactId },
      data: { is_sos_enabled: !contact.is_sos_enabled },
    });
  }

  /**
   * Batch sync offline contacts with server database
   */
  async syncContacts(userId, contactsList) {
    if (!Array.isArray(contactsList)) return [];

    const results = [];
    for (const item of contactsList) {
      if (item.id && !item.id.startsWith('local_')) {
        // Try update existing
        const updated = await prisma.emergencyContact.updateMany({
          where: { id: item.id, user_id: userId },
          data: {
            name: item.name,
            phone: item.phone,
            relationship: item.relationship || 'Other',
            is_sos_enabled: item.is_sos_enabled ?? item.selectedForSOS ?? true,
          },
        });
        if (updated.count > 0) {
          results.push(item);
          continue;
        }
      }

      // Otherwise insert as new
      const created = await prisma.emergencyContact.create({
        data: {
          user_id: userId,
          name: item.name,
          phone: item.phone,
          relationship: item.relationship || 'Other',
          is_sos_enabled: item.is_sos_enabled ?? item.selectedForSOS ?? true,
        },
      });
      results.push(created);
    }

    return this.getContacts(userId);
  }
}

module.exports = new ContactService();

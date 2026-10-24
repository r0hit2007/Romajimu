const { prisma } = require('../config/db');

const FALLBACK_RESOURCES = {
  US: [
    { name: 'National Domestic Violence Hotline', phone: '1-800-799-7233', description: '24/7 free, confidential support for victims and survivors.', type: 'hotline', region: 'US' },
    { name: 'Crisis Text Line', phone: 'Text HOME to 741741', description: 'Free, 24/7 crisis support via SMS messaging.', type: 'online', region: 'US' },
    { name: 'RAINN Sexual Assault Hotline', phone: '1-800-656-4673', description: 'Confidential 24/7 support for sexual assault victims.', type: 'hotline', region: 'US' },
  ],
  UK: [
    { name: 'Refuge National Domestic Abuse Helpline', phone: '0808 2000 247', description: '24/7 free confidential hotline for women in the UK.', type: 'hotline', region: 'UK' },
    { name: 'Men\'s Advice Line', phone: '0808 8010 327', description: 'Confidential support for male victims of domestic abuse.', type: 'hotline', region: 'UK' },
  ],
  IN: [
    { name: 'National Commission for Women (NCW)', phone: '7827-170-170', description: '24/7 dedicated helpline for women facing domestic violence in India.', type: 'hotline', region: 'IN' },
    { name: 'Women Helpline Scheme (All India)', phone: '181', description: '24-hour toll-free emergency response and rescue services.', type: 'hotline', region: 'IN' },
  ],
  CA: [
    { name: 'ShelterSafe Canada', phone: 'sheltersafe.ca', description: 'Find nearest emergency shelters across Canada.', type: 'shelter', region: 'CA' },
    { name: 'Assaulted Women\'s Helpline', phone: '1-866-863-0511', description: '24/7 crisis line providing safety planning and support.', type: 'hotline', region: 'CA' },
  ],
  AU: [
    { name: '1800RESPECT', phone: '1800 737 732', description: '24/7 national domestic, family and sexual violence counselling.', type: 'hotline', region: 'AU' },
    { name: 'Lifeline Australia', phone: '13 11 14', description: '24-hour telephone crisis support and suicide prevention.', type: 'counseling', region: 'AU' },
  ],
};

class ResourceService {
  async getResourcesByRegion(region = 'US') {
    const normalizedRegion = String(region).toUpperCase();

    try {
      const resources = await prisma.supportResource.findMany({
        where: { region: normalizedRegion, is_verified: true },
        orderBy: { name: 'asc' },
      });

      if (resources && resources.length > 0) {
        return resources;
      }
    } catch (e) {
      console.warn('Database query for resources failed, using fallback:', e.message);
    }

    // Return static curated fallback
    return FALLBACK_RESOURCES[normalizedRegion] || FALLBACK_RESOURCES['US'];
  }

  async getAllResources() {
    try {
      return await prisma.supportResource.findMany({
        where: { is_verified: true },
        orderBy: [{ region: 'asc' }, { name: 'asc' }],
      });
    } catch {
      return Object.values(FALLBACK_RESOURCES).flat();
    }
  }
}

module.exports = new ResourceService();

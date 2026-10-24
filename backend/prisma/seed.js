// Seed initial verified support resources into database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const INITIAL_RESOURCES = [
  // US
  {
    name: 'National Domestic Violence Hotline',
    phone: '1-800-799-7233',
    description: '24/7 free, confidential support for victims and survivors of domestic abuse.',
    type: 'hotline',
    region: 'US',
  },
  {
    name: 'Crisis Text Line',
    phone: 'Text HOME to 741741',
    description: 'Free, 24/7 crisis support via SMS messaging.',
    type: 'online',
    region: 'US',
  },
  {
    name: 'National Sexual Assault Hotline (RAINN)',
    phone: '1-800-656-4673',
    description: 'Confidential 24/7 specialized support for sexual assault victims.',
    type: 'hotline',
    region: 'US',
  },
  {
    name: 'WomensLaw Email Hotline',
    phone: 'womenslaw.org',
    description: 'Plain-language legal information and support for victims of domestic violence.',
    type: 'legal',
    region: 'US',
  },
  // UK
  {
    name: 'Refuge National Domestic Abuse Helpline',
    phone: '0808 2000 247',
    description: '24/7 free confidential hotline for women escaping domestic abuse in the UK.',
    type: 'hotline',
    region: 'UK',
  },
  {
    name: 'Men\'s Advice Line',
    phone: '0808 8010 327',
    description: 'Confidential helpline and emotional support for male victims of domestic abuse.',
    type: 'hotline',
    region: 'UK',
  },
  {
    name: 'Rights of Women Legal Advice',
    phone: '020 7251 6577',
    description: 'Free confidential legal advice by women solicitors for women experiencing violence.',
    type: 'legal',
    region: 'UK',
  },
  // India
  {
    name: 'National Commission for Women (NCW)',
    phone: '7827-170-170',
    description: '24/7 dedicated helpline for women facing domestic violence in India.',
    type: 'hotline',
    region: 'IN',
  },
  {
    name: 'Women Helpline Scheme (All India)',
    phone: '181',
    description: '24-hour toll-free emergency response and rescue services for women in distress.',
    type: 'hotline',
    region: 'IN',
  },
  {
    name: 'AASRA Crisis Center',
    phone: '+91-9820466726',
    description: '24/7 confidential crisis intervention and mental health support line.',
    type: 'counseling',
    region: 'IN',
  },
  // Canada
  {
    name: 'ShelterSafe Canada',
    phone: 'sheltersafe.ca',
    description: 'Interactive directory helping women quickly find nearest emergency shelters across Canada.',
    type: 'shelter',
    region: 'CA',
  },
  {
    name: 'Assaulted Women\'s Helpline (AWHL)',
    phone: '1-866-863-0511',
    description: '24/7 crisis line providing safety planning, emotional support, and referrals.',
    type: 'hotline',
    region: 'CA',
  },
  // Australia
  {
    name: '1800RESPECT',
    phone: '1800 737 732',
    description: '24/7 national domestic, family and sexual violence counselling service.',
    type: 'hotline',
    region: 'AU',
  },
  {
    name: 'Lifeline Australia',
    phone: '13 11 14',
    description: '24-hour telephone crisis support and suicide prevention services.',
    type: 'counseling',
    region: 'AU',
  },
];

async function main() {
  console.log('Seeding initial support resources...');
  for (const resource of INITIAL_RESOURCES) {
    const existing = await prisma.supportResource.findFirst({
      where: { name: resource.name, region: resource.region },
    });
    if (!existing) {
      await prisma.supportResource.create({ data: resource });
    }
  }
  console.log(`Seeded ${INITIAL_RESOURCES.length} resources successfully.`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

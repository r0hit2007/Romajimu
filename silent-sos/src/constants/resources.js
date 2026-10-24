// Fallback support resources (used when AI is unavailable)
export const FALLBACK_RESOURCES = {
  US: [
    { name: 'National DV Hotline', phone: '1-800-799-7233', description: '24/7 confidential support for domestic violence survivors.', type: 'hotline' },
    { name: 'Crisis Text Line', phone: 'Text HOME to 741741', description: 'Free 24/7 text crisis counseling.', type: 'online' },
    { name: 'NNEDV', phone: '202-543-5566', description: 'Policy and advocacy for domestic violence survivors.', type: 'legal' },
    { name: 'Safe Horizon', phone: '1-800-621-4673', description: 'Shelter and counseling services across New York.', type: 'shelter' },
    { name: 'WomensLaw.org', phone: '1-844-762-8483', description: 'Free legal information and referrals for abuse survivors.', type: 'legal' },
    { name: 'RAINN', phone: '1-800-656-4673', description: 'Support for sexual assault survivors 24/7.', type: 'counseling' },
  ],
  UK: [
    { name: 'National Domestic Abuse Helpline', phone: '0808 2000 247', description: '24-hour freephone helpline for women.', type: 'hotline' },
    { name: "Women's Aid", phone: '0808 2000 247', description: 'Support and refuge for women experiencing domestic abuse.', type: 'shelter' },
    { name: 'ManKind Initiative', phone: '01823 334244', description: 'Support for male victims of domestic abuse.', type: 'counseling' },
    { name: 'Refuge', phone: '0808 2000 247', description: 'Emergency safe houses and specialist support services.', type: 'shelter' },
    { name: 'Galop', phone: '0800 999 5428', description: 'LGBT+ specific domestic abuse support.', type: 'counseling' },
    { name: 'Victim Support', phone: '0808 168 9111', description: 'Free, confidential support for crime victims.', type: 'legal' },
  ],
  IN: [
    { name: 'iCall', phone: '9152987821', description: 'Psychosocial helpline for emotional support.', type: 'counseling' },
    { name: 'National Commission for Women', phone: '7827170170', description: 'Complaints and legal support for women.', type: 'legal' },
    { name: 'Vandrevala Foundation', phone: '1860-2662-345', description: '24/7 mental health support helpline.', type: 'hotline' },
    { name: 'Majlis', phone: '022-2388-5042', description: 'Legal advocacy and counseling for women in distress.', type: 'legal' },
    { name: 'Snehi', phone: '044-24640050', description: 'Emotional support and crisis intervention.', type: 'counseling' },
    { name: 'Police Emergency', phone: '100', description: 'National police emergency line.', type: 'hotline' },
  ],
  CA: [
    { name: 'ShelterSafe.ca', phone: '1-877-977-0007', description: 'Shelter finder for abuse survivors across Canada.', type: 'shelter' },
    { name: 'Assaulted Women\'s Helpline', phone: '1-866-863-0511', description: '24/7 support in 200+ languages.', type: 'hotline' },
    { name: 'Kids Help Phone', phone: '1-800-668-6868', description: 'Crisis support for youth across Canada.', type: 'counseling' },
    { name: 'Victim Link BC', phone: '1-800-563-0808', description: 'Multilingual support for crime and trauma.', type: 'hotline' },
    { name: 'BCSTH', phone: '604-633-2506', description: 'Technology safety for those experiencing abuse.', type: 'online' },
    { name: 'Canadian DV Hotline', phone: '1-888-373-7888', description: 'Support for all victims of domestic violence.', type: 'hotline' },
  ],
  AU: [
    { name: '1800RESPECT', phone: '1800 737 732', description: '24/7 national sexual assault and domestic violence service.', type: 'hotline' },
    { name: 'Safe Steps', phone: '1800 015 188', description: '24-hour family violence response centre.', type: 'hotline' },
    { name: 'Lifeline Australia', phone: '13 11 14', description: 'Crisis support and suicide prevention.', type: 'counseling' },
    { name: 'DV Connect', phone: '1800 811 811', description: 'Domestic violence safety planning support.', type: 'hotline' },
    { name: 'MensLine', phone: '1300 78 99 78', description: 'Support for men dealing with relationship issues.', type: 'counseling' },
    { name: 'Police Emergency', phone: '000', description: 'Australian national police emergency line.', type: 'hotline' },
  ],
};

export const REGIONS = [
  { code: 'US', label: 'United States', flag: '🇺🇸' },
  { code: 'UK', label: 'United Kingdom', flag: '🇬🇧' },
  { code: 'IN', label: 'India', flag: '🇮🇳' },
  { code: 'CA', label: 'Canada', flag: '🇨🇦' },
  { code: 'AU', label: 'Australia', flag: '🇦🇺' },
];

export const RESOURCE_TYPE_LABELS = {
  hotline: { label: 'Hotline', color: '#4A90D9' },
  shelter: { label: 'Shelter', color: '#38B2AC' },
  legal: { label: 'Legal', color: '#D4A843' },
  counseling: { label: 'Counseling', color: '#9B7ED9' },
  online: { label: 'Online', color: '#60A0C0' },
};

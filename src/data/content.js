export const serviceDetails = {
  'Company Formation': {
    description: 'Establish and prepare your business for the UAE market.',
    points: ['Understand available business setup pathways', 'Connect with appropriately licensed specialists', 'Plan next steps based on your activity and goals'],
  },
  'Business Exchange & Delegations': {
    description: 'Explore markets through purposeful introductions and structured business missions.',
    points: ['Clarify your target sector and market', 'Identify relevant partner conversations', 'Plan a focused delegation brief'],
  },
  'Summits & Events': {
    description: 'Join purposeful gatherings of business and leadership communities.',
    points: ['Explore upcoming event themes', 'Register interest and participation goals', 'Receive confirmed details when available'],
  },
};

export const services = [
  { title: 'Company Formation', icon: '▣', summary: 'Establish and prepare your business for the UAE market.', imageClass: 'company-photo', image: '/assets/company-formation-daylight.png', alt: 'Dubai marina skyline and waterfront' },
  { title: 'Business Exchange & Delegations', icon: '♟', summary: 'Meet partners, explore markets and join structured missions.', imageClass: 'delegation-sample', image: '/assets/business-exchange-clear.png', alt: 'African business delegates meeting an Emirati business representative' },
  { title: 'Summits & Events', icon: '▦', summary: 'Participate in purposeful business and leadership events.', imageClass: 'summit-photo', image: '/assets/summits-events-clear.png', alt: 'Keynote speaker addressing African and Emirati delegates at a business summit' },
];

export const goals = [
  { value: 'Set up a company', icon: '▣', interest: 'Company Formation' },
  { value: 'Expand into a market', icon: '▥', interest: 'Market Expansion' },
  { value: 'Attend an event', icon: '▦', interest: 'AFRIGULF Global Business Summit 2026' },
  { value: 'Organise a delegation', icon: '♟', interest: 'Business Exchange & Delegations' },
];

export const heroSlides = [
  { className: 'hero-skyline', src: '/assets/hero-dubai-marina.jpg', width: 2048, height: 1365 },
  { className: 'hero-exchange', src: '/assets/business-exchange-clear.png', width: 1672, height: 941 },
  { className: 'hero-airport', src: '/assets/hero.webp', width: 1672, height: 941 },
  { className: 'hero-presentation', src: '/assets/hero-nigerian-presentation.png', width: 1672, height: 941 },
  { className: 'hero-exhibition', src: '/assets/hero-dubai-exhibition.png', width: 1672, height: 941 },
  { className: 'hero-minerals', src: '/assets/hero-african-minerals.png', width: 1672, height: 941 },
  { className: 'hero-summit', src: '/assets/summits-events-clear.png', width: 1672, height: 941 },
];

export const fallbackEvents = [
  { slug: 'afrigulf-2026', title: 'AFRIGULF Exchange Global Business Summit 2026', location: 'Dubai', period: 'December 2026', organiser: 'AFRIGULF Exchange initiative · Powered by TWB Global Tourism', summary: 'Moving People, Trade and Capital Between Africa and the Gulf', label: 'View Summit', image: 'afrigulf-summit-image' },
  { slug: 'lccm-2026', title: 'LCCM Global Leadership Summit 2026', location: 'Dubai', period: 'December 2026', organiser: 'Organised by London College of Creative Media', summary: 'Connect. Collaborate. Create Global Impact.', label: 'View Event', image: 'image-three' },
];

export const baseInterestOptions = [
  'Company Formation',
  'Business Exchange & Delegations',
  'Market Expansion',
  'AFRIGULF Global Business Summit 2026',
  'LCCM Global Leadership Summit 2026',
];

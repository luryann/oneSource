// Site-wide settings. Change these before launch.
export const config = {
  // Full public URL. Used for canonical links, hreflang, sitemap and social cards.
  // The GitHub workflow sets SITE_URL automatically; the fallback is only for local builds.
  siteUrl: (process.env.SITE_URL || 'http://localhost:4173').replace(/\/+$/, ''),

  name: 'One Source Entertainment',
  legalLine: 'A DJ LX & Associates company',
  phone: '(323) 522-7162',
  phoneE164: '+13235227162',
  email: 'Alex@DJLX-LSV.com',
  city: 'Los Angeles',
  region: 'CA',
  founded: 2008,
  djSince: 1997,
  instagram: 'https://www.instagram.com/onesourceentertainment',
  instagramHandle: '@onesourceentertainment',
  instagramDjlx: 'https://www.instagram.com/djlx2000',
  facebook: 'https://www.facebook.com/DJLX2000',

  // Booking form. Leave empty to run the form as a mock (shows the confirmation, sends nothing).
  // To go live, create a free form at https://formspree.io and paste its endpoint here,
  // e.g. 'https://formspree.io/f/abcdwxyz'.
  formEndpoint: '',

  // Set to true once real client reviews are added in content/en.mjs and content/es.mjs.
  showReviews: true,
};

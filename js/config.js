/* Clash Esports: where the bookings live.
   Empty: the site and the staff panel run in demo mode, with the bookings kept in this browser only.
   Filled in: they use the Supabase project set up with supabase/schema.sql (see supabase/SETUP.md).
   Both values are public by design (Supabase's "anon" key); the database rules decide what each visitor may do. */
window.CLASH_CONFIG = {
  supabaseUrl: 'https://cahmrpglmwxfmppnkmsb.supabase.co',
  supabaseAnonKey: 'sb_publishable_3eqOdUx2WacHf9lgSgTWOQ_IS3aEkYN',
  // the member portal's data: 'mock' (made-up PCs and member, in this browser) or 'http' (the Clash API, once it exists)
  CLASH_API_MODE: 'mock',
  // where the Clash API listens (used in 'http' mode)
  CLASH_API_URL: 'http://127.0.0.1:8787',
  // the test server, used with ?api=staging on any host (set to https://clash-api-staging.<subdomain>.workers.dev after the first staging deploy)
  CLASH_API_STAGING_URL: 'https://clash-api-staging.clash-api.workers.dev',
  // member signup with Google: the OAuth web client id (Google Cloud console); empty = the Google buttons show "Soon"
  GOOGLE_CLIENT_ID: '757498736430-s63549jpkr1viie6o10q96fhhq68654u.apps.googleusercontent.com',
  // member signup bot check: the Cloudflare Turnstile site key (public); empty = no check widget (the form sends 'mock')
  TURNSTILE_SITE_KEY: '0x4AAAAAAF3c71UR8bvfhxZQ',
};

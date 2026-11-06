/* Clash Esports: where the bookings live.
   Empty: the site and the staff panel run in demo mode, with the bookings kept in this browser only.
   Filled in: they use the Supabase project set up with supabase/schema.sql (see supabase/SETUP.md).
   Both values are public by design (Supabase's "anon" key); the database rules decide what each visitor may do. */
window.CLASH_CONFIG = {
  supabaseUrl: 'https://cahmrpglmwxfmppnkmsb.supabase.co',
  supabaseAnonKey: 'sb_publishable_3eqOdUx2WacHf9lgSgTWOQ_IS3aEkYN',
  // the member portal's data: 'mock' (made-up PCs and member, in this browser) or 'http' (the Clash API, once it exists)
  CLASH_API_MODE: 'mock',
};

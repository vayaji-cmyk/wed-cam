import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type WedcamPhoto = {
  id: string;
  guest_id: string;
  guest_name: string;
  image_url: string;
  cloudinary_public_id: string;
  created_at: string;
};

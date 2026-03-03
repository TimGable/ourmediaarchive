import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig, getSupabaseServiceRoleKey } from "./config";

export function createSupabaseServerClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createClient(url, publishableKey);
}

export function createSupabaseServiceRoleClient() {
  const { url } = getSupabasePublicConfig();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  return createClient(url, serviceRoleKey);
}

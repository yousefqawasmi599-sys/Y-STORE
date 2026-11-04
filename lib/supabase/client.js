import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

let client;

export function createClient() {
  if (!client) {
    const { url, anonKey } = getSupabaseConfig();
    client = createBrowserClient(url, anonKey);
  }
  return client;
}
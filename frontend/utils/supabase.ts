import "react-native-url-polyfill/auto"
import { Platform, AppState } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient, type SupabaseClientOptions, processLock } from "@supabase/supabase-js"
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env"

if (!EXPO_PUBLIC_SUPABASE_URL || !EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("⚠️ Missing Supabase environment variables!")
}

const options: SupabaseClientOptions = {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    detectSessionInUrl: Platform.OS === "web",
    autoRefreshToken: true,
    persistSession: true,
    lock: processLock,
  },
}

export const supabase = createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, options)

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

// Helper function to check if Supabase is initialized
export const isSupabaseInitialized = () => {
  return !!EXPO_PUBLIC_SUPABASE_URL && !!EXPO_PUBLIC_SUPABASE_ANON_KEY
}

import { createClient } from "@supabase/supabase-js"
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Initialize Supabase
const supabase = createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY)

// Storage keys
const STORAGE_KEYS = {
  DEV_MODE: "DEV_MODE_ENABLED",
  CURRENT_USER: "CURRENT_USER_EMAIL",
}

// Admin emails that can use dev mode
const DEV_MODE_ADMIN_EMAILS = ["alice.admin@example.com", "bob.boss@example.com"]

// Updated Store interface to match your schema
export interface Store {
  id: string
  name: string
  address?: string | null
  city?: string | null
  created_at?: string
  category_id?: number | null
  image_urls?: string[] | null
  image_url?: string | null
  menu_pdf_url?: string | null
  owner_id?: string | null
}

// Updated Table interface
export interface Table {
  id: string
  store_id: string
  name: string
  capacity: number
  location: "in" | "out"
  smoking_allowed: boolean
  status: "available" | "reserved" | "occupied"
  description?: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

// Debug logging
const debugLog = (message: string, data?: any): void => {
  console.log(`[AUTH API] ${message}`, data || "")
}

// Authentication Functions
// -------------------------------------------------------------------------

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    return !error && !!user
  } catch (error) {
    debugLog("Authentication check failed:", error)
    return false
  }
}

// Check if user is admin
export const isAdmin = async (): Promise<boolean> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    // Check if user has admin role in your users table
    const { data, error } = await supabase.from("users").select("is_admin, role").eq("id", user.id).single()

    if (error) {
      debugLog("Admin check failed:", error)
      return false
    }

    return data?.is_admin === true || data?.role === "admin"
  } catch (error) {
    debugLog("Admin check failed:", error)
    return false
  }
}

// Get the current auth session
export const getAuthSession = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user) return null

    // Get additional user data from your users table
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single()

    return {
      ...user,
      ...userData,
      isAdmin: userData?.is_admin === true || userData?.role === "admin",
    }
  } catch (error) {
    debugLog("Failed to get auth session:", error)
    return null
  }
}

// Register a new user
export const register = async (userData: {
  email: string
  password: string
  name: string
}): Promise<{ success: boolean; userId?: string }> => {
  try {
    debugLog("Registering user:", userData.email)

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    })

    if (authError) {
      debugLog("Auth signup error:", authError)
      throw new Error(authError.message)
    }

    if (!authData.user) {
      throw new Error("User creation failed")
    }

    // Create user profile in your users table
    const { error: profileError } = await supabase.from("users").insert({
      id: authData.user.id,
      email: userData.email,
      name: userData.name,
      role: "user",
      is_admin: false,
      email_verified: false,
    })

    if (profileError) {
      debugLog("Profile creation error:", profileError)
      // Note: User is created in auth but profile failed
      throw new Error("Failed to create user profile")
    }

    debugLog("User registered successfully:", authData.user.id)
    return { success: true, userId: authData.user.id }
  } catch (error: any) {
    debugLog("Registration failed:", error)
    throw error
  }
}

// Login
export const login = async (email: string, password: string): Promise<{ isAdmin: boolean }> => {
  try {
    debugLog("Logging in user:", email)

    // Store the email for dev mode check
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, email.toLowerCase())

    // Check if this is a dev admin email
    if (DEV_MODE_ADMIN_EMAILS.includes(email.toLowerCase())) {
      await enableDevModeWithAdminPrivileges()
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      debugLog("Login error:", error)
      throw new Error(error.message)
    }

    if (!data.user) {
      throw new Error("Login failed")
    }

    // Check if user is admin
    const adminStatus = await isAdmin()

    debugLog("Login successful:", { userId: data.user.id, isAdmin: adminStatus })
    return { isAdmin: adminStatus }
  } catch (error: any) {
    debugLog("Login failed:", error)
    throw error
  }
}

// Logout
export const logout = async (): Promise<{ done: boolean }> => {
  try {
    debugLog("Logging out user")

    // Clear dev mode on logout
    await disableDevMode()
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER)

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()

    if (error) {
      debugLog("Logout error:", error)
      throw new Error(error.message)
    }

    debugLog("Logout successful")
    return { done: true }
  } catch (error: any) {
    debugLog("Logout failed:", error)
    throw error
  }
}

// Update profile
export const updateProfile = async (profileData: {
  name?: string
  email?: string
}): Promise<{ success: boolean }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    // Update email in auth if provided
    if (profileData.email) {
      const { error: authError } = await supabase.auth.updateUser({
        email: profileData.email,
      })
      if (authError) throw new Error(authError.message)
    }

    // Update profile in users table
    const { error } = await supabase
      .from("users")
      .update({
        name: profileData.name,
        email: profileData.email,
      })
      .eq("id", user.id)

    if (error) {
      debugLog("Profile update error:", error)
      throw new Error(error.message)
    }

    debugLog("Profile updated successfully")
    return { success: true }
  } catch (error: any) {
    debugLog("Profile update failed:", error)
    throw error
  }
}

// Change password
export const changePassword = async (passwordData: {
  currentPassword: string
  newPassword: string
}): Promise<{ success: boolean }> => {
  try {
    // Supabase doesn't require current password for password updates
    // You might want to verify the current password first if needed
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    })

    if (error) {
      debugLog("Password change error:", error)
      throw new Error(error.message)
    }

    debugLog("Password changed successfully")
    return { success: true }
  } catch (error: any) {
    debugLog("Password change failed:", error)
    throw error
  }
}

// Store Management Functions
// -------------------------------------------------------------------------

// Get all stores
export const getStores = async (): Promise<Store[]> => {
  try {
    debugLog("Fetching all stores")

    const { data, error } = await supabase.from("stores").select("*").order("name")

    if (error) {
      debugLog("Error fetching stores:", error)
      throw new Error(error.message)
    }

    debugLog(`Fetched ${data?.length || 0} stores`)
    return data || []
  } catch (error: any) {
    debugLog("Failed to fetch stores:", error)
    throw error
  }
}

// Get a single store
export const getStore = async (id: string): Promise<Store> => {
  try {
    debugLog(`Fetching store: ${id}`)

    const { data, error } = await supabase.from("stores").select("*").eq("id", id).single()

    if (error) {
      debugLog("Error fetching store:", error)
      throw new Error(error.message)
    }

    debugLog("Store fetched successfully:", data?.name)
    return data
  } catch (error: any) {
    debugLog("Failed to fetch store:", error)
    throw error
  }
}

// Create a new store
export const createStore = async (storeData: Partial<Store>): Promise<Store> => {
  try {
    debugLog("Creating store:", storeData)

    // Get current user (you might need to implement authentication)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const payload = {
      name: storeData.name,
      address: storeData.address || null,
      city: storeData.city || null,
      owner_id: user?.id || null, // Set owner_id from authenticated user
      category_id: storeData.category_id || null,
    }

    const { data, error } = await supabase.from("stores").insert(payload).select().single()

    if (error) {
      debugLog("Error creating store:", error)
      throw new Error(error.message)
    }

    debugLog("Store created successfully:", data.id)
    return data
  } catch (error: any) {
    debugLog("Failed to create store:", error)
    throw error
  }
}

// Update a store
export const updateStore = async (id: string, storeData: Partial<Store>): Promise<Store> => {
  try {
    debugLog(`Updating store ${id}:`, storeData)

    const payload = {
      name: storeData.name,
      address: storeData.address || null,
      city: storeData.city || null,
      category_id: storeData.category_id || null,
    }

    const { data, error } = await supabase.from("stores").update(payload).eq("id", id).select().single()

    if (error) {
      debugLog("Error updating store:", error)
      throw new Error(error.message)
    }

    debugLog("Store updated successfully")
    return data
  } catch (error: any) {
    debugLog("Failed to update store:", error)
    throw error
  }
}

// Delete a store
export const deleteStore = async (id: string): Promise<boolean> => {
  try {
    debugLog(`Deleting store: ${id}`)

    // First delete associated tables
    await supabase.from("tables").delete().eq("store_id", id)

    // Delete store images from storage if they exist
    const store = await getStore(id)
    if (store.image_url) {
      await deleteStoreImage(id)
    }
    if (store.menu_pdf_url) {
      await deleteMenuFile(id)
    }

    // Delete the store
    const { error } = await supabase.from("stores").delete().eq("id", id)

    if (error) {
      debugLog("Error deleting store:", error)
      throw new Error(error.message)
    }

    debugLog("Store deleted successfully")
    return true
  } catch (error: any) {
    debugLog("Failed to delete store:", error)
    throw error
  }
}

// Table Management Functions
// -------------------------------------------------------------------------

// Get tables for a store
export const getTables = async (storeId: string): Promise<Table[]> => {
  try {
    debugLog(`Fetching tables for store: ${storeId}`)

    const { data, error } = await supabase.from("tables").select("*").eq("store_id", storeId).order("name")

    if (error) {
      debugLog("Error fetching tables:", error)
      throw new Error(error.message)
    }

    debugLog(`Fetched ${data?.length || 0} tables`)
    return data || []
  } catch (error: any) {
    debugLog("Failed to fetch tables:", error)
    throw error
  }
}

// Create a new table
export const createTable = async (storeId: string, tableData: Partial<Table>): Promise<Table> => {
  try {
    debugLog(`Creating table for store ${storeId}:`, tableData)

    const payload = {
      store_id: storeId,
      name: tableData.name,
      capacity: tableData.capacity,
      location: tableData.location,
      smoking_allowed: tableData.smoking_allowed,
      status: "available",
      description: tableData.description || null,
      is_active: true,
    }

    const { data, error } = await supabase.from("tables").insert(payload).select().single()

    if (error) {
      debugLog("Error creating table:", error)
      throw new Error(error.message)
    }

    debugLog("Table created successfully:", data.id)
    return data
  } catch (error: any) {
    debugLog("Failed to create table:", error)
    throw error
  }
}

// Update table
export const updateTable = async (tableId: string, tableData: Partial<Table>): Promise<Table> => {
  try {
    debugLog(`Updating table ${tableId}:`, tableData)

    const payload = {
      name: tableData.name,
      capacity: tableData.capacity,
      location: tableData.location,
      smoking_allowed: tableData.smoking_allowed,
      description: tableData.description || null,
    }

    const { data, error } = await supabase.from("tables").update(payload).eq("id", tableId).select().single()

    if (error) {
      debugLog("Error updating table:", error)
      throw new Error(error.message)
    }

    debugLog("Table updated successfully")
    return data
  } catch (error: any) {
    debugLog("Failed to update table:", error)
    throw error
  }
}

// Delete table
export const deleteTable = async (tableId: string): Promise<boolean> => {
  try {
    debugLog(`Deleting table: ${tableId}`)

    const { error } = await supabase.from("tables").delete().eq("id", tableId)

    if (error) {
      debugLog("Error deleting table:", error)
      throw new Error(error.message)
    }

    debugLog("Table deleted successfully")
    return true
  } catch (error: any) {
    debugLog("Failed to delete table:", error)
    throw error
  }
}

// Update table status
export const updateTableStatus = async (
  tableId: string,
  status: "available" | "reserved" | "occupied",
): Promise<boolean> => {
  try {
    debugLog(`Updating table ${tableId} status to ${status}`)

    const { error } = await supabase.from("tables").update({ status }).eq("id", tableId)

    if (error) {
      debugLog("Error updating table status:", error)
      throw new Error(error.message)
    }

    debugLog("Table status updated successfully")
    return true
  } catch (error: any) {
    debugLog("Failed to update table status:", error)
    throw error
  }
}

// File Upload Functions
// -------------------------------------------------------------------------

/**
 * Upload store image and save URL to stores table
 */
export const uploadStoreImage = async (storeId: string, formData: FormData): Promise<{ url: string }> => {
  try {
    debugLog(`🖼️ Starting image upload for store ${storeId}`)

    // Verify store exists first
    const store = await getStore(storeId)
    if (!store) {
      throw new Error(`Store with ID ${storeId} not found`)
    }
    debugLog(`✅ Store verified: ${store.name}`)

    // Try to ensure the bucket exists, but continue if it fails
    try {
      await ensureBucketExists("store-images")
    } catch (bucketError) {
      debugLog("⚠️ Bucket creation/check failed, attempting upload anyway:", bucketError)
    }

    // Get the file from FormData
    const file = formData.get("imageFile") as any
    if (!file) {
      throw new Error("No file provided in FormData")
    }

    debugLog("📁 Processing file for upload:", {
      name: file.name,
      type: file.type,
      size: file.size,
      uri: file.uri,
    })

    // Generate a unique filename
    const fileExt = file.name?.split(".").pop() || "jpg"
    const fileName = `${storeId}/${Date.now()}.${fileExt}`
    debugLog(`📝 Generated filename: ${fileName}`)

    // Convert file to ArrayBuffer for upload
    let fileData: ArrayBuffer
    try {
      if (file.uri) {
        // React Native file
        debugLog("📱 Reading React Native file from URI:", file.uri)
        const response = await fetch(file.uri)
        if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`)
        fileData = await response.arrayBuffer()
      } else {
        // Web file
        debugLog("🌐 Reading web file as ArrayBuffer")
        fileData = await file.arrayBuffer()
      }

      debugLog(`✅ File data prepared, size: ${fileData.byteLength} bytes`)
    } catch (fileError: any) {
      debugLog("❌ Error reading file:", fileError)
      throw new Error(`Failed to read file: ${fileError.message}`)
    }

    // Upload to Supabase Storage
    debugLog(`⬆️ Uploading file to store-images/${fileName}`)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("store-images")
      .upload(fileName, fileData, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      })

    if (uploadError) {
      debugLog("❌ Upload error:", uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    if (!uploadData || !uploadData.path) {
      debugLog("❌ Upload succeeded but no path returned:", uploadData)
      throw new Error("Upload succeeded but no file path was returned")
    }

    debugLog(`✅ File uploaded successfully to: ${uploadData.path}`)

    // Get public URL
    debugLog(`🔗 Getting public URL for ${uploadData.path}`)
    const { data: urlData } = supabase.storage.from("store-images").getPublicUrl(uploadData.path)

    if (!urlData || !urlData.publicUrl) {
      debugLog("❌ Failed to get public URL:", urlData)
      throw new Error("Failed to get public URL for uploaded file")
    }

    const publicUrl = urlData.publicUrl
    debugLog(`✅ Public URL generated: ${publicUrl}`)

    // Update store record with image URL in the stores table
    debugLog(`💾 Updating stores table for store ${storeId} with image_url: ${publicUrl}`)

    const { data: updateData, error: updateError } = await supabase
      .from("stores")
      .update({
        image_url: publicUrl,
        updated_at: new Date().toISOString(), // Optional: track when updated
      })
      .eq("id", storeId)
      .select() // Return the updated record

    if (updateError) {
      debugLog("❌ Error updating stores table with image URL:", updateError)

      // Try to clean up the uploaded file since database update failed
      try {
        await supabase.storage.from("store-images").remove([uploadData.path])
        debugLog("🧹 Cleaned up uploaded file due to database update failure")
      } catch (cleanupError) {
        debugLog("⚠️ Failed to cleanup uploaded file:", cleanupError)
      }

      throw new Error(`Failed to update store record in database: ${updateError.message}`)
    }

    if (!updateData || updateData.length === 0) {
      debugLog("❌ Store update succeeded but no data returned")
      throw new Error("Store update succeeded but no updated record returned")
    }

    debugLog("✅ Store record updated successfully in database:", {
      storeId: updateData[0].id,
      storeName: updateData[0].name,
      imageUrl: updateData[0].image_url,
    })

    debugLog("🎉 Image upload and database update completed successfully!")
    return { url: publicUrl }
  } catch (error: any) {
    debugLog("💥 Failed to upload image and update database:", error)
    throw error
  }
}

// Delete store image
export const deleteStoreImage = async (storeId: string): Promise<boolean> => {
  try {
    debugLog(`🗑️ Deleting image for store ${storeId}`)

    // Get current image URL from stores table
    const store = await getStore(storeId)
    if (!store || !store.image_url) {
      debugLog("ℹ️ No image to delete")
      return true
    }

    debugLog(`📍 Current image URL: ${store.image_url}`)

    // Extract file path from URL
    try {
      const url = new URL(store.image_url)
      const pathParts = url.pathname.split("/")
      const fileName = pathParts[pathParts.length - 1]
      const filePath = `${storeId}/${fileName}`

      debugLog(`🗂️ Deleting file from storage: ${filePath}`)

      // Delete from storage
      const { error: deleteError } = await supabase.storage.from("store-images").remove([filePath])

      if (deleteError) {
        debugLog("⚠️ Error deleting image from storage:", deleteError)
        // Don't throw error if file doesn't exist in storage
      } else {
        debugLog("✅ File deleted from storage successfully")
      }
    } catch (urlError) {
      debugLog("⚠️ Error parsing image URL for deletion:", urlError)
      // Continue to update database even if storage deletion fails
    }

    // Update store record in stores table to remove image_url
    debugLog(`💾 Updating stores table to remove image_url for store ${storeId}`)

    const { data: updateData, error: updateError } = await supabase
      .from("stores")
      .update({
        image_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId)
      .select()

    if (updateError) {
      debugLog("❌ Error updating stores table:", updateError)
      throw new Error(`Failed to update store record: ${updateError.message}`)
    }

    debugLog("✅ Store record updated successfully - image_url removed from database")
    return true
  } catch (error: any) {
    debugLog("💥 Failed to delete image:", error)
    throw error
  }
}

// Upload menu file and save URL to stores table
export const uploadMenuFile = async (storeId: string, formData: FormData): Promise<{ url: string }> => {
  try {
    debugLog(`📄 Starting menu file upload for store ${storeId}`)

    // Verify store exists first
    const store = await getStore(storeId)
    if (!store) {
      throw new Error(`Store with ID ${storeId} not found`)
    }
    debugLog(`✅ Store verified: ${store.name}`)

    // Try to ensure the bucket exists, but continue if it fails
    try {
      await ensureBucketExists("menu-files")
    } catch (bucketError) {
      debugLog("⚠️ Bucket creation/check failed, attempting upload anyway:", bucketError)
    }

    // Get the file from FormData
    const file = formData.get("menuFile") as any
    if (!file) {
      throw new Error("No file provided in FormData")
    }

    debugLog("📁 Processing file for upload:", {
      name: file.name,
      type: file.type,
      size: file.size,
      uri: file.uri,
    })

    // Generate a unique filename
    const fileExt = file.name?.split(".").pop() || "pdf"
    const fileName = `${storeId}/${Date.now()}.${fileExt}`
    debugLog(`📝 Generated filename: ${fileName}`)

    // Convert file to ArrayBuffer for upload
    let fileData: ArrayBuffer
    try {
      if (file.uri) {
        // React Native file
        debugLog("📱 Reading React Native file from URI:", file.uri)
        const response = await fetch(file.uri)
        if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`)
        fileData = await response.arrayBuffer()
      } else {
        // Web file
        debugLog("🌐 Reading web file as ArrayBuffer")
        fileData = await file.arrayBuffer()
      }

      debugLog(`✅ File data prepared, size: ${fileData.byteLength} bytes`)
    } catch (fileError: any) {
      debugLog("❌ Error reading file:", fileError)
      throw new Error(`Failed to read file: ${fileError.message}`)
    }

    // Upload to Supabase Storage
    debugLog(`⬆️ Uploading file to menu-files/${fileName}`)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("menu-files")
      .upload(fileName, fileData, {
        contentType: file.type || "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      debugLog("❌ Upload error:", uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    if (!uploadData || !uploadData.path) {
      debugLog("❌ Upload succeeded but no path returned:", uploadData)
      throw new Error("Upload succeeded but no file path was returned")
    }

    debugLog(`✅ File uploaded successfully to: ${uploadData.path}`)

    // Get public URL
    debugLog(`🔗 Getting public URL for ${uploadData.path}`)
    const { data: urlData } = supabase.storage.from("menu-files").getPublicUrl(uploadData.path)

    if (!urlData || !urlData.publicUrl) {
      debugLog("❌ Failed to get public URL:", urlData)
      throw new Error("Failed to get public URL for uploaded file")
    }

    const publicUrl = urlData.publicUrl
    debugLog(`✅ Public URL generated: ${publicUrl}`)

    // Update store record with menu URL in the stores table
    debugLog(`💾 Updating stores table for store ${storeId} with menu_pdf_url: ${publicUrl}`)

    const { data: updateData, error: updateError } = await supabase
      .from("stores")
      .update({
        menu_pdf_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId)
      .select()

    if (updateError) {
      debugLog("❌ Error updating stores table with menu URL:", updateError)

      // Try to clean up the uploaded file since database update failed
      try {
        await supabase.storage.from("menu-files").remove([uploadData.path])
        debugLog("🧹 Cleaned up uploaded file due to database update failure")
      } catch (cleanupError) {
        debugLog("⚠️ Failed to cleanup uploaded file:", cleanupError)
      }

      throw new Error(`Failed to update store record in database: ${updateError.message}`)
    }

    if (!updateData || updateData.length === 0) {
      debugLog("❌ Store update succeeded but no data returned")
      throw new Error("Store update succeeded but no updated record returned")
    }

    debugLog("✅ Store record updated successfully in database:", {
      storeId: updateData[0].id,
      storeName: updateData[0].name,
      menuUrl: updateData[0].menu_pdf_url,
    })

    debugLog("🎉 Menu file upload and database update completed successfully!")
    return { url: publicUrl }
  } catch (error: any) {
    debugLog("💥 Failed to upload menu file and update database:", error)
    throw error
  }
}

// Delete menu file
export const deleteMenuFile = async (storeId: string): Promise<boolean> => {
  try {
    debugLog(`🗑️ Deleting menu file for store ${storeId}`)

    // Get current menu URL from stores table
    const store = await getStore(storeId)
    if (!store || !store.menu_pdf_url) {
      debugLog("ℹ️ No menu file to delete")
      return true
    }

    debugLog(`📍 Current menu URL: ${store.menu_pdf_url}`)

    // Extract file path from URL
    try {
      const url = new URL(store.menu_pdf_url)
      const pathParts = url.pathname.split("/")
      const fileName = pathParts[pathParts.length - 1]
      const filePath = `${storeId}/${fileName}`

      debugLog(`🗂️ Deleting file from storage: ${filePath}`)

      // Delete from storage
      const { error: deleteError } = await supabase.storage.from("menu-files").remove([filePath])

      if (deleteError) {
        debugLog("⚠️ Error deleting menu file from storage:", deleteError)
        // Don't throw error if file doesn't exist in storage
      } else {
        debugLog("✅ File deleted from storage successfully")
      }
    } catch (urlError) {
      debugLog("⚠️ Error parsing menu URL for deletion:", urlError)
      // Continue to update database even if storage deletion fails
    }

    // Update store record in stores table to remove menu_pdf_url
    debugLog(`💾 Updating stores table to remove menu_pdf_url for store ${storeId}`)

    const { data: updateData, error: updateError } = await supabase
      .from("stores")
      .update({
        menu_pdf_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId)
      .select()

    if (updateError) {
      debugLog("❌ Error updating stores table:", updateError)
      throw new Error(`Failed to update store record: ${updateError.message}`)
    }

    debugLog("✅ Store record updated successfully - menu_pdf_url removed from database")
    return true
  } catch (error: any) {
    debugLog("💥 Failed to delete menu file:", error)
    throw error
  }
}

/**
 * Ensure storage bucket exists, create if it doesn't
 */
const ensureBucketExists = async (bucketName: string): Promise<void> => {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      debugLog("Error listing buckets:", listError)
      // If we can't list buckets, assume they exist and continue
      debugLog(`Assuming bucket ${bucketName} exists due to permissions`)
      return
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === bucketName)

    if (!bucketExists) {
      debugLog(`Creating bucket: ${bucketName}`)

      // Create bucket with minimal configuration
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
      })

      if (createError) {
        debugLog(`Error creating bucket ${bucketName}:`, createError)

        // If bucket creation fails due to RLS, check if it actually exists
        if (createError.message.includes("row-level security") || createError.message.includes("policy")) {
          debugLog(`Bucket creation blocked by RLS, checking if ${bucketName} exists anyway...`)

          // Try to upload a test file to see if bucket exists
          try {
            const { data: testData } = await supabase.storage.from(bucketName).list("", { limit: 1 })
            debugLog(`Bucket ${bucketName} appears to exist despite creation error`)
            return
          } catch (testError) {
            debugLog(`Bucket ${bucketName} does not exist and cannot be created due to RLS policies`)
            throw new Error(
              `Storage bucket '${bucketName}' does not exist and cannot be created. Please create it manually in the Supabase dashboard.`,
            )
          }
        }

        throw new Error(createError.message)
      }

      debugLog(`Bucket ${bucketName} created successfully`)
    } else {
      debugLog(`Bucket ${bucketName} already exists`)
    }
  } catch (error: any) {
    debugLog(`Failed to ensure bucket ${bucketName} exists:`, error)
    throw error
  }
}

// Development Mode Helpers
// -------------------------------------------------------------------------

// Check if dev mode is enabled
export const isDevMode = async (): Promise<boolean> => {
  try {
    const devMode = await AsyncStorage.getItem(STORAGE_KEYS.DEV_MODE)
    return devMode === "true"
  } catch (error) {
    debugLog("Error checking dev mode:", error)
    return false
  }
}

// Check if current user is a dev admin
export const isDevAdmin = async (): Promise<boolean> => {
  try {
    const currentUser = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER)
    return currentUser !== null && DEV_MODE_ADMIN_EMAILS.includes(currentUser.toLowerCase())
  } catch (error) {
    debugLog("Error checking dev admin status:", error)
    return false
  }
}

// Enable dev mode with admin privileges
export const enableDevModeWithAdminPrivileges = async (): Promise<boolean> => {
  try {
    const isAdminUser = await isDevAdmin()
    if (isAdminUser) {
      debugLog("Dev mode enabled for admin user")
      await AsyncStorage.setItem(STORAGE_KEYS.DEV_MODE, "true")
      return true
    } else {
      debugLog("Dev mode can only be enabled for authorized admin emails")
      return false
    }
  } catch (error) {
    debugLog("Failed to enable dev mode:", error)
    return false
  }
}

// Disable dev mode
export const disableDevMode = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.DEV_MODE)
    debugLog("Dev mode disabled")
    return true
  } catch (error) {
    debugLog("Failed to disable dev mode:", error)
    return false
  }
}

// Health Check
// -------------------------------------------------------------------------

// Check if Supabase is healthy
export const checkHealth = async () => {
  try {
    // Simple query to check if Supabase is responding
    const { data, error } = await supabase.from("stores").select("count").limit(1)

    if (error) {
      throw new Error(error.message)
    }

    return { status: "healthy", timestamp: new Date().toISOString() }
  } catch (error: any) {
    debugLog("Health check failed:", error)
    throw error
  }
}

// Export all functions
export default {
  // Authentication
  isAuthenticated,
  isAdmin,
  getAuthSession,
  register,
  login,
  logout,
  updateProfile,
  changePassword,

  // Store functions
  getStore,
  getStores,
  createStore,
  updateStore,
  deleteStore,

  // Table functions
  getTables,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,

  // File upload functions
  uploadStoreImage,
  deleteStoreImage,
  uploadMenuFile,
  deleteMenuFile,

  // Development mode
  isDevMode,
  isDevAdmin,
  enableDevModeWithAdminPrivileges,
  disableDevMode,

  // Health check
  checkHealth,
}

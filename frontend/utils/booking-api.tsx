import { createClient } from "@supabase/supabase-js"
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env"

// Initialize Supabase
const supabase = createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY)

/**
 * Booking interface matching your database schema
 */
export interface Booking {
  id?: string
  user_id?: string
  owner_id: string
  store_id?: string
  booked_at: string
  created_at?: string
  approved: boolean
  status?: "pending" | "approved" | "declined" | "cancelled"
  customer_name: string
  customer_email?: string
  customer_phone?: string
  party_size: number
  duration_minutes?: number
  table_id?: number
  special_requests?: string
}

/**
 * Store interface matching your database schema
 */
export interface Store {
  id: string
  name: string
  description?: string
  address?: string
  city?: string
  phone?: string
  email?: string
  website?: string
  opening_hours?: any
  image_url?: string
  is_active?: boolean
  created_by?: string
  created_at?: string
  updated_at?: string
}

/**
 * Table interface matching your database schema
 */
export interface Table {
  id: string
  store_id: string
  name: string
  capacity: number
  location: "in" | "out"
  smoking_allowed: boolean
  status: "available" | "reserved" | "occupied"
  description?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

// Debug logging
const debugLog = (message: string, data?: any): void => {
  console.log(`[BOOKING API] ${message}`, data || "")
}

// ===== STORE FUNCTIONS =====

/**
 * Get store by ID
 */
export const getStore = async (storeId: string): Promise<Store | null> => {
  try {
    debugLog(`Fetching store: ${storeId}`)

    const { data, error } = await supabase.from("stores").select("*").eq("id", storeId).eq("is_active", true).single()

    if (error) {
      debugLog("Error fetching store:", error)
      return null
    }

    debugLog("Store fetched successfully:", data?.name)
    return data
  } catch (error) {
    debugLog("Failed to fetch store:", error)
    return null
  }
}

/**
 * Get all active stores
 */
export const getStores = async (): Promise<Store[]> => {
  try {
    debugLog("Fetching all stores")

    const { data, error } = await supabase.from("stores").select("*").eq("is_active", true).order("name")

    if (error) {
      debugLog("Error fetching stores:", error)
      return []
    }

    debugLog(`Fetched ${data?.length || 0} stores`)
    return data || []
  } catch (error) {
    debugLog("Failed to fetch stores:", error)
    return []
  }
}

// ===== TABLE FUNCTIONS =====

/**
 * Get table by ID
 */
export const getTable = async (tableId: string | number): Promise<Table | null> => {
  try {
    debugLog(`Fetching table: ${tableId}`)

    const { data, error } = await supabase.from("tables").select("*").eq("id", tableId).single()

    if (error) {
      debugLog("Error fetching table:", error)
      return null
    }

    debugLog("Table fetched successfully")
    return data
  } catch (error) {
    debugLog("Failed to fetch table:", error)
    return null
  }
}

/**
 * Get tables for a store
 */
export const getTables = async (storeId: string): Promise<Table[]> => {
  try {
    debugLog(`Fetching tables for store: ${storeId}`)

    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("name")

    if (error) {
      debugLog("Error fetching tables:", error)
      return []
    }

    debugLog(`Fetched ${data?.length || 0} tables`)
    return data || []
  } catch (error) {
    debugLog("Failed to fetch tables:", error)
    return []
  }
}

/**
 * Check if a specific table is available using your database function
 */
export const checkTableAvailability = async (
  tableId: number,
  bookingTime: string,
  durationMinutes = 120,
): Promise<boolean> => {
  try {
    debugLog(`Checking if table ${tableId} is available at ${bookingTime}`)

    const { data, error } = await supabase.rpc("is_table_available", {
      p_table_id: tableId,
      p_booked_at: bookingTime,
      p_duration_minutes: durationMinutes,
    })

    if (error) {
      debugLog("Error checking table availability:", error)
      return false
    }

    return data || false
  } catch (error) {
    debugLog("Failed to check table availability:", error)
    return false
  }
}

// ===== BOOKING FUNCTIONS =====

/**
 * Create a booking
 */
export const createBooking = async (bookingData: Booking): Promise<string | null> => {
  try {
    debugLog("Creating booking:", bookingData)

    // Validate required fields
    if (!bookingData.owner_id || !bookingData.customer_name || !bookingData.party_size || !bookingData.booked_at) {
      debugLog("Missing required booking fields")
      return null
    }

    // Prepare data for your database schema
    const payload = {
      user_id: bookingData.user_id || null,
      owner_id: bookingData.owner_id,
      store_id: bookingData.store_id || bookingData.owner_id,
      customer_name: bookingData.customer_name,
      customer_email: bookingData.customer_email || null,
      customer_phone: bookingData.customer_phone || null,
      party_size: bookingData.party_size,
      booked_at: bookingData.booked_at,
      duration_minutes: bookingData.duration_minutes || 120,
      approved: bookingData.approved || false,
      status: bookingData.status || "pending",
      table_id: bookingData.table_id || null,
      special_requests: bookingData.special_requests || null,
    }

    const { data, error: bookingError } = await supabase.from("bookings").insert(payload).select("id").single()

    if (bookingError) {
      debugLog("Booking error:", bookingError)
      return null
    }

    debugLog("Booking created successfully!", data.id)
    return data.id
  } catch (error) {
    debugLog("Booking failed:", error)
    return null
  }
}

/**
 * Get all bookings
 */
export const getBookings = async (): Promise<Booking[]> => {
  try {
    debugLog("Fetching all bookings")

    const { data, error } = await supabase.from("bookings").select("*").order("booked_at", { ascending: true })

    if (error) {
      debugLog("Error fetching bookings:", error)
      return []
    }

    debugLog(`Fetched ${data?.length || 0} bookings`)
    return data || []
  } catch (error) {
    debugLog("Failed to fetch bookings:", error)
    return []
  }
}

/**
 * Get bookings for a specific user
 */
export const getUserBookings = async (userId: string): Promise<Booking[]> => {
  try {
    debugLog(`Fetching bookings for user: ${userId}`)

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", userId)
      .order("booked_at", { ascending: true })

    if (error) {
      debugLog("Error fetching user bookings:", error)
      return []
    }

    debugLog(`Fetched ${data?.length || 0} bookings for user`)
    return data || []
  } catch (error) {
    debugLog("Failed to fetch user bookings:", error)
    return []
  }
}

/**
 * Get bookings for a specific store
 */
export const getStoreBookings = async (storeId: string): Promise<Booking[]> => {
  try {
    debugLog(`Fetching bookings for store: ${storeId}`)

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("store_id", storeId)
      .order("booked_at", { ascending: true })

    if (error) {
      debugLog("Error fetching bookings:", error)
      return []
    }

    debugLog(`Fetched ${data?.length || 0} bookings`)
    return data || []
  } catch (error) {
    debugLog("Failed to fetch bookings:", error)
    return []
  }
}

/**
 * Get booking details
 */
export const getBookingDetails = async (bookingId: string): Promise<any> => {
  try {
    debugLog(`Fetching booking details: ${bookingId}`)

    // First try to get from the booking_details view
    let { data, error } = await supabase.from("booking_details").select("*").eq("id", bookingId).single()

    // If the view doesn't exist or has an error, fall back to the bookings table
    if (error) {
      debugLog("Error fetching from booking_details view, falling back to bookings table:", error)

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single()

      if (bookingError) {
        debugLog("Error fetching booking:", bookingError)
        return null
      }

      data = bookingData
    }

    debugLog("Booking details fetched successfully")
    return data
  } catch (error) {
    debugLog("Failed to fetch booking details:", error)
    return null
  }
}

/**
 * Approve a booking
 */
export const approveBooking = async (bookingId: string): Promise<boolean> => {
  try {
    debugLog(`Approving booking ${bookingId}`)

    const { error } = await supabase
      .from("bookings")
      .update({
        approved: true,
        status: "approved",
      })
      .eq("id", bookingId)

    if (error) {
      debugLog("Error approving booking:", error)
      return false
    }

    debugLog("Booking approved successfully")
    return true
  } catch (error) {
    debugLog("Failed to approve booking:", error)
    return false
  }
}

/**
 * Accept a booking (approve it)
 */
export const acceptBooking = async (bookingId: string): Promise<boolean> => {
  return approveBooking(bookingId)
}

/**
 * Decline a booking
 */
export const declineBooking = async (bookingId: string): Promise<boolean> => {
  try {
    debugLog(`Declining booking ${bookingId}`)

    const { error } = await supabase
      .from("bookings")
      .update({
        approved: false,
        status: "declined",
      })
      .eq("id", bookingId)

    if (error) {
      debugLog("Error declining booking:", error)
      return false
    }

    debugLog("Booking declined successfully")
    return true
  } catch (error) {
    debugLog("Failed to decline booking:", error)
    return false
  }
}

/**
 * Update booking status
 */
export const updateBookingStatus = async (
  bookingId: string,
  status: "pending" | "approved" | "declined" | "cancelled",
): Promise<boolean> => {
  try {
    debugLog(`Updating booking ${bookingId} status to ${status}`)

    const updateData: any = { status }

    // Update approved field based on status
    if (status === "approved") {
      updateData.approved = true
    } else if (status === "declined" || status === "cancelled") {
      updateData.approved = false
    }

    const { error } = await supabase.from("bookings").update(updateData).eq("id", bookingId)

    if (error) {
      debugLog("Error updating booking status:", error)
      return false
    }

    debugLog("Booking status updated successfully")
    return true
  } catch (error) {
    debugLog("Failed to update booking status:", error)
    return false
  }
}

/**
 * Cancel a booking
 */
export const cancelBooking = async (bookingId: string): Promise<boolean> => {
  try {
    debugLog(`Cancelling booking ${bookingId}`)

    const { error } = await supabase
      .from("bookings")
      .update({
        approved: false,
        status: "cancelled",
      })
      .eq("id", bookingId)

    if (error) {
      debugLog("Error cancelling booking:", error)
      return false
    }

    debugLog("Booking cancelled successfully")
    return true
  } catch (error) {
    debugLog("Failed to cancel booking:", error)
    return false
  }
}

/**
 * Delete a booking
 */
export const deleteBooking = async (bookingId: string): Promise<boolean> => {
  try {
    debugLog(`Deleting booking: ${bookingId}`)

    const { error } = await supabase.from("bookings").delete().eq("id", bookingId)

    if (error) {
      debugLog("Error deleting booking:", error)
      return false
    }

    debugLog("Booking deleted successfully")
    return true
  } catch (error) {
    debugLog("Failed to delete booking:", error)
    return false
  }
}

/**
 * Get bookings for a specific table
 */
export const getBookingsForTable = async (tableId: number): Promise<Booking[]> => {
  try {
    debugLog(`Getting bookings for table ${tableId}`)

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("table_id", tableId)
      .order("booked_at", { ascending: true })

    if (error) {
      debugLog("Error getting table bookings:", error)
      return []
    }

    return data || []
  } catch (error) {
    debugLog("Failed to get table bookings:", error)
    return []
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Format booking date for display
 */
export const formatBookingDate = (bookedAt: string): string => {
  return new Date(bookedAt).toLocaleString()
}

/**
 * Check if booking is in the future
 */
export const isBookingInFuture = (bookedAt: string): boolean => {
  return new Date(bookedAt) > new Date()
}

/**
 * Validate booking data against your schema constraints
 */
export const validateBooking = (booking: Partial<Booking>): string[] => {
  const errors: string[] = []

  if (!booking.customer_name?.trim()) {
    errors.push("Customer name is required")
  }

  if (!booking.party_size || booking.party_size < 1) {
    errors.push("Party size must be at least 1")
  }

  if (booking.party_size && booking.party_size > 20) {
    errors.push("Party size cannot exceed 20 (database constraint)")
  }

  if (!booking.booked_at) {
    errors.push("Booking date/time is required")
  } else if (!isBookingInFuture(booking.booked_at)) {
    errors.push("Booking must be in the future")
  }

  if (booking.customer_email && !booking.customer_email.includes("@")) {
    errors.push("Please enter a valid email address")
  }

  return errors
}

// Add a new function to update table status
export const updateTableStatus = async (
  tableId: string,
  status: "available" | "reserved" | "occupied",
): Promise<boolean> => {
  try {
    debugLog(`Updating table ${tableId} status to ${status}`)

    const { error } = await supabase.from("tables").update({ status }).eq("id", tableId)

    if (error) {
      debugLog("Error updating table status:", error)
      return false
    }

    debugLog("Table status updated successfully")
    return true
  } catch (error) {
    debugLog("Failed to update table status:", error)
    return false
  }
}

// ===== DEFAULT EXPORT =====
export default {
  // Store functions
  getStore,
  getStores,

  // Table functions
  getTable,
  getTables,
  checkTableAvailability,
  updateTableStatus,

  // Booking functions
  createBooking,
  getBookings,
  getUserBookings,
  getStoreBookings,
  getBookingDetails,
  getBookingsForTable,
  approveBooking,
  acceptBooking,
  declineBooking,
  updateBookingStatus,
  cancelBooking,
  deleteBooking,

  // Utility functions
  formatBookingDate,
  isBookingInFuture,
  validateBooking,
}

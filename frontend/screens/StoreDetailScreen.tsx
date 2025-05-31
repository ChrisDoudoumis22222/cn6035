"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Linking,
  Modal,
  TextInput,
  SafeAreaView,
  FlatList,
  Dimensions,
  Share,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import DateTimePicker from "@react-native-community/datetimepicker"
import { createClient } from "@supabase/supabase-js"
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env"
import { LinearGradient } from "expo-linear-gradient"

// Get screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get("window")

// Initialize Supabase client
const supabase = createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY)

// Types
type Store = {
  id: string
  name: string
  city: string | null
  address: string | null
  menu_pdf_url?: string | null
  image_url?: string | null
  description?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  created_at?: string
  is_active?: boolean
  opening_hours?: any
}

type Table = {
  id: number
  name: string
  capacity: number
  menu_image_url?: string
  store_id: string
  category?: string
  location?: string
  is_indoor: boolean
  smoking_allowed: boolean
  status: string
  owner_id?: string
}

// Add these type definitions after the existing types
type Booking = {
  id: string
  user_id: string
  owner_id: string
  booked_at: string
  created_at?: string
  approved: boolean | null
  customer_name: string
  customer_email?: string
  customer_phone?: string
  party_size: number
  duration_minutes?: number
  table_id?: number
  accept_code?: string
  status?: "pending" | "approved" | "declined"
}

// Mock data for fallback
const MOCK_TABLES: Table[] = [
  {
    id: 1,
    name: "Window Table 1",
    capacity: 4,
    store_id: "store-1",
    is_indoor: true,
    smoking_allowed: false,
    status: "available",
    location: "Main Floor",
  },
  {
    id: 2,
    name: "Patio Table 1",
    capacity: 6,
    store_id: "store-1",
    is_indoor: false,
    smoking_allowed: true,
    status: "reserved",
    location: "Patio",
  },
  {
    id: 3,
    name: "Bar Table 1",
    capacity: 2,
    store_id: "store-1",
    is_indoor: true,
    smoking_allowed: false,
    status: "occupied",
    location: "Bar Area",
  },
  {
    id: 4,
    name: "Corner Table",
    capacity: 4,
    store_id: "store-1",
    is_indoor: true,
    smoking_allowed: false,
    status: "available",
    location: "Main Floor",
  },
  {
    id: 5,
    name: "Garden Table",
    capacity: 8,
    store_id: "store-1",
    is_indoor: false,
    smoking_allowed: true,
    status: "available",
    location: "Garden",
  },
]

// Simple Icon component
const Icon = ({
  name,
  size = 24,
  color = "#000",
  style = {},
}: { name: string; size?: number; color?: string; style?: any }) => {
  // Map of icon names to text representations
  const iconMap: Record<string, string> = {
    "arrow-left": "←",
    "map-marker": "📍",
    "office-building": "🏢",
    phone: "📞",
    email: "✉️",
    globe: "🌐",
    calendar: "📅",
    clock: "🕒",
    user: "👤",
    users: "👥",
    smoking: "🚬",
    "smoking-off": "🚭",
    indoor: "🏠",
    outdoor: "🌳",
    menu: "📋",
    table: "🪑",
    check: "✓",
    close: "✕",
    info: "ℹ️",
    star: "⭐",
    heart: "❤️",
    share: "📤",
    bookmark: "🔖",
    "bookmark-outline": "☆",
    "chevron-down": "▼",
    "chevron-up": "▲",
    "chevron-right": "▶",
    plus: "+",
    minus: "-",
    category: "🏷️",
    time: "⏰",
    stats: "📊",
    bug: "🐛",
    warning: "⚠️",
    duration: "⌛",
  }

  return (
    <Text style={[{ fontSize: size, color, fontWeight: "bold", textAlign: "center" }, style]}>
      {iconMap[name] || "•"}
    </Text>
  )
}

// Table Item Component
const TableItem = React.memo(
  ({
    table,
    onPress,
    selectedTableId,
  }: {
    table: Table
    onPress: (table: Table) => void
    selectedTableId: number | null
  }) => {
    const isSelected = selectedTableId === table.id
    const isAvailable = table.status === "available"

    return (
      <TouchableOpacity
        style={[
          styles.tableCard,
          table.is_indoor ? styles.tableCardIn : styles.tableCardOut,
          isSelected && styles.tableCardSelected,
          !isAvailable && styles.tableCardUnavailable,
        ]}
        onPress={() => isAvailable && onPress(table)}
        disabled={!isAvailable}
        activeOpacity={isAvailable ? 0.7 : 1}
      >
        <View style={styles.tableHeader}>
          <Text style={styles.tableName}>{table.name}</Text>
          <View style={styles.tableCapacity}>
            <Icon name="users" size={14} color="#4F46E5" style={{ marginRight: 4 }} />
            <Text style={styles.tableCapacityText}>{table.capacity}</Text>
          </View>
        </View>

        <View style={styles.tableDetails}>
          <View style={styles.tableDetail}>
            <Icon
              name={table.is_indoor ? "indoor" : "outdoor"}
              size={14}
              color={table.is_indoor ? "#4F46E5" : "#10B981"}
            />
            <Text style={styles.tableDetailText}>{table.is_indoor ? "Indoor" : "Outdoor"}</Text>
          </View>
          <View style={styles.tableDetail}>
            <Icon
              name={table.smoking_allowed ? "smoking" : "smoking-off"}
              size={14}
              color={table.smoking_allowed ? "#F59E0B" : "#6B7280"}
            />
            <Text style={styles.tableDetailText}>{table.smoking_allowed ? "Smoking allowed" : "No smoking"}</Text>
          </View>
          {table.location && (
            <View style={styles.tableDetail}>
              <Icon name="map-marker" size={14} color="#4F46E5" />
              <Text style={styles.tableDetailText}>{table.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.tableStatus}>
          {isAvailable ? (
            <View style={styles.tableStatusAvailable}>
              <Text style={styles.tableStatusText}>Available</Text>
            </View>
          ) : table.status === "reserved" ? (
            <View style={styles.tableStatusReserved}>
              <Text style={styles.tableStatusText}>Reserved</Text>
            </View>
          ) : (
            <View style={styles.tableStatusOccupied}>
              <Text style={styles.tableStatusText}>Occupied</Text>
            </View>
          )}
        </View>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Icon name="check" size={16} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    )
  },
)

// Helper function to check if a table is available
const isTableAvailable = async (
  tableId: number,
  bookingDateTime: string,
  durationMinutes: number,
): Promise<boolean> => {
  try {
    // Query bookings that overlap with the requested time
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("table_id", tableId)
      .gte("booked_at", bookingDateTime)
      .lte("booked_at", new Date(new Date(bookingDateTime).getTime() + durationMinutes * 60000).toISOString())

    if (error) {
      console.error("Error checking table availability:", error)
      return false
    }

    // If there are any overlapping bookings, the table is not available
    return data.length === 0
  } catch (error) {
    console.error("Error checking table availability:", error)
    return false
  }
}

// Helper function to create a booking and reserve the table
const createBookingWithTable = async (bookingData: any, tableId: number): Promise<string | null> => {
  try {
    // Insert the booking data into the bookings table
    const { data, error } = await supabase
      .from("bookings")
      .insert([{ ...bookingData, table_id: tableId }])
      .select()

    if (error) {
      console.error("Error creating booking:", error)
      return null
    }

    // Return the ID of the newly created booking
    return data && data.length > 0 ? data[0].id : null
  } catch (error) {
    console.error("Error creating booking:", error)
    return null
  }
}

export default function StoreDetailScreen({ route, navigation }: any) {
  // Debug route params
  console.log("StoreDetailScreen - Route params:", route?.params)

  // Safely extract storeId and userId from route params
  const storeId = route?.params?.storeId || "default-store-id"
  const userId = route?.params?.userId || "anonymous"

  console.log("Using storeId:", storeId, "userId:", userId)

  const insets = useSafeAreaInsets()

  // State
  const [store, setStore] = useState<Store | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [tablesLoading, setTablesLoading] = useState(true)
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
  const [bookingDate, setBookingDate] = useState(new Date())
  const [bookingTime, setBookingTime] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [bookingModalVisible, setBookingModalVisible] = useState(false)
  const [bookingName, setBookingName] = useState("")
  const [bookingEmail, setBookingEmail] = useState("")
  const [bookingPhone, setBookingPhone] = useState("")
  const [partySize, setPartySize] = useState("2")
  const [bookingDuration, setBookingDuration] = useState(120) // Default 2 hours (120 minutes)
  const [bookingInProgress, setBookingInProgress] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "in" | "out">("all")
  const [imageError, setImageError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [usingMockData, setUsingMockData] = useState(false)

  // New state for booking management
  const [newBookingModal, setNewBookingModal] = useState(false)
  const [bookingDetailsModal, setBookingDetailsModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([])
  const [acceptCode, setAcceptCode] = useState("")
  const [isStoreOwner, setIsStoreOwner] = useState(false)

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [300, 100],
    extrapolate: "clamp",
  })
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  })
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 100, 200],
    outputRange: [0, 0.5, 1],
    extrapolate: "clamp",
  })
  const imageOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0],
    extrapolate: "clamp",
  })

  // Fetch store data directly from Supabase
  const fetchStore = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setDebugInfo(null)
      console.log("Fetching store with ID:", storeId)

      // Try to fetch from Supabase
      const { data, error } = await supabase.from("stores").select("*").eq("id", storeId).single()

      if (error) {
        console.error("Error fetching store:", error)
        setDebugInfo(`Supabase error: ${error.message}`)
        throw error
      }

      if (data) {
        console.log("Store data fetched successfully:", data.name)
        setStore(data)
        setUsingMockData(false)
      } else {
        console.log("No store found, using mock data")
        setDebugInfo("No store found in database, using mock data")
        // Fallback to mock data
        setStore({
          id: storeId || "store-1",
          name: "Coffee House",
          city: "New York",
          address: "123 Main St, New York, NY 10001",
          image_url: "https://picsum.photos/seed/store1/800/600",
          description:
            "A cozy coffee house in the heart of New York City. We serve specialty coffee, pastries, and light meals in a relaxed atmosphere.",
          phone: "+1 (555) 123-4567",
          email: "info@coffeehouse.com",
          website: "https://coffeehouse.example.com",
          is_active: true,
        })
        setUsingMockData(true)
      }
    } catch (error) {
      console.error("Failed to fetch store:", error)
      setDebugInfo(`Fetch error: ${error instanceof Error ? error.message : String(error)}`)
      // Fallback to mock data
      setStore({
        id: storeId || "store-1",
        name: "Coffee House",
        city: "New York",
        address: "123 Main St, New York, NY 10001",
        image_url: "https://picsum.photos/seed/store1/800/600",
        description:
          "A cozy coffee house in the heart of New York City. We serve specialty coffee, pastries, and light meals in a relaxed atmosphere.",
        phone: "+1 (555) 123-4567",
        email: "info@coffeehouse.com",
        website: "https://coffeehouse.example.com",
        is_active: true,
      })
      setUsingMockData(true)
    } finally {
      setLoading(false)
    }
  }, [storeId])

  // Fetch tables directly from Supabase
  const fetchTables = useCallback(async () => {
    try {
      setTablesLoading(true)
      console.log("Fetching tables for store:", storeId)

      // Try to fetch from Supabase
      const { data, error } = await supabase.from("tables").select("*").eq("store_id", storeId).order("name")

      if (error) {
        console.error("Error fetching tables:", error)
        setDebugInfo((prev) => `${prev ? prev + "\n" : ""}Tables error: ${error.message}`)
        throw error
      }

      if (data && data.length > 0) {
        console.log(`${data.length} tables fetched successfully`)
        setTables(data)
        setUsingMockData(false)
      } else {
        console.log("No tables found, using mock data")
        setDebugInfo((prev) => `${prev ? prev + "\n" : ""}No tables found, using mock data`)
        // Fallback to mock data
        setTables(MOCK_TABLES)
        setUsingMockData(true)
      }
    } catch (error) {
      console.error("Failed to fetch tables:", error)
      // Fallback to mock data
      setTables(MOCK_TABLES)
      setUsingMockData(true)
    } finally {
      setTablesLoading(false)
    }
  }, [storeId])

  // Load data on mount
  useEffect(() => {
    fetchStore()
    fetchTables()
  }, [fetchStore, fetchTables])

  // Check if user is store owner and fetch pending bookings
  useEffect(() => {
    const checkOwnershipAndBookings = async () => {
      try {
        // Check if current user owns this store
        const { data: storeData } = await supabase.from("stores").select("owner_id").eq("id", storeId).single()

        if (storeData && storeData.owner_id === userId) {
          setIsStoreOwner(true)

          // Fetch pending bookings for this store
          const { data: bookings } = await supabase
            .from("bookings")
            .select("*")
            .eq("owner_id", storeData.owner_id)
            .eq("approved", false)
            .order("created_at", { ascending: false })

          if (bookings && bookings.length > 0) {
            setPendingBookings(bookings)
            // Show notification for the newest booking
            setSelectedBooking(bookings[0])
            setNewBookingModal(true)
          }
        }
      } catch (error) {
        console.error("Error checking ownership:", error)
      }
    }

    if (storeId && userId) {
      checkOwnershipAndBookings()

      // Set up interval to check for new bookings every 30 seconds
      const interval = setInterval(checkOwnershipAndBookings, 30000)

      return () => clearInterval(interval)
    }
  }, [storeId, userId])

  // Filter tables based on active tab
  const filteredTables = tables.filter((table) => {
    if (activeTab === "all") return true
    return activeTab === "in" ? table.is_indoor : !table.is_indoor
  })

  // Handle table selection
  const handleTableSelect = (table: Table) => {
    if (table.status !== "available") {
      Alert.alert("Table Unavailable", "This table is not available for booking.")
      return
    }

    setSelectedTableId(table.id)
    setBookingModalVisible(true)
  }

  // Handle accepting a booking
  const handleAcceptBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ approved: true, status: "approved" })
        .eq("id", bookingId)

      if (error) throw error

      Alert.alert("Success", "Booking accepted successfully!")
      setNewBookingModal(false)
      setBookingDetailsModal(false)

      // Remove from pending bookings
      setPendingBookings((prev) => prev.filter((b) => b.id !== bookingId))
    } catch (error) {
      console.error("Error accepting booking:", error)
      Alert.alert("Error", "Failed to accept booking")
    }
  }

  // Handle declining a booking
  const handleDeclineBooking = async (bookingId: string) => {
    Alert.alert("Decline Booking", "Are you sure you want to decline this booking?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("bookings")
              .update({ approved: false, status: "declined" })
              .eq("id", bookingId)

            if (error) throw error

            Alert.alert("Success", "Booking declined")
            setNewBookingModal(false)
            setBookingDetailsModal(false)

            // Remove from pending bookings
            setPendingBookings((prev) => prev.filter((b) => b.id !== bookingId))
          } catch (error) {
            console.error("Error declining booking:", error)
            Alert.alert("Error", "Failed to decline booking")
          }
        },
      },
    ])
  }

  // Format booking date for display
  const formatBookingDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Update the handleBookingSubmit function to match your schema
  const handleBookingSubmit = async () => {
    if (!selectedTableId) {
      Alert.alert("Error", "Please select a table")
      return
    }

    if (!bookingName.trim()) {
      Alert.alert("Error", "Please enter your name")
      return
    }

    // Combine date and time
    const bookingDateTime = new Date(bookingDate)
    bookingDateTime.setHours(bookingTime.getHours())
    bookingDateTime.setMinutes(bookingTime.getMinutes())

    setBookingInProgress(true)

    try {
      console.log("Creating booking for table:", selectedTableId)

      // Check if the table is still available
      const isAvailable = await isTableAvailable(selectedTableId, bookingDateTime.toISOString(), bookingDuration)

      if (!isAvailable) {
        throw new Error("This table is no longer available for the selected time. Please choose another table or time.")
      }

      // Create a booking object matching the actual database schema
      const bookingData = {
        user_id: userId,
        owner_id: userId, // Using userId as owner_id for now
        customer_name: bookingName,
        customer_email: bookingEmail || null,
        customer_phone: bookingPhone || null,
        party_size: Number.parseInt(partySize) || 2,
        booked_at: bookingDateTime.toISOString(),
        duration_minutes: bookingDuration,
        approved: false, // Default to not approved
        accept_code: acceptCode || null, // Add accept code
        status: "pending" as const,
      }

      console.log("Booking data:", bookingData)

      // Create the booking and reserve the table
      const bookingId = await createBookingWithTable(bookingData, selectedTableId)

      if (!bookingId) {
        throw new Error("Failed to create booking and reserve table")
      }

      console.log("Booking created successfully with ID:", bookingId)

      // Update the local table status
      setTables((prevTables) =>
        prevTables.map((table) => (table.id === selectedTableId ? { ...table, status: "reserved" } : table)),
      )

      // Close modal and reset form
      setBookingModalVisible(false)
      setSelectedTableId(null)
      setBookingName("")
      setBookingEmail("")
      setBookingPhone("")
      setPartySize("2")
      setBookingDuration(120) // Reset to default 2 hours
      setAcceptCode("") // Reset accept code

      // Show success message
      Alert.alert(
        "Booking Confirmed!",
        `Your reservation at ${store?.name} has been successfully saved for ${bookingDuration / 60} ${
          bookingDuration === 60 ? "hour" : "hours"
        }. Please note that your booking needs to be approved by the restaurant.`,
        [{ text: "OK" }],
      )
    } catch (error) {
      console.error("Booking failed:", error)

      // Show a more detailed error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Unknown error"

      Alert.alert("Booking Failed", `There was an error creating your booking: ${errorMessage}. Please try again.`)
    } finally {
      setBookingInProgress(false)
    }
  }

  // Handle opening menu
  const handleOpenMenu = () => {
    if (!store?.menu_pdf_url) {
      Alert.alert("Menu Unavailable", "This store has not uploaded a menu yet.")
      return
    }

    Linking.openURL(store.menu_pdf_url).catch((err) => {
      console.error("Error opening menu:", err)
      Alert.alert("Error", "Could not open the menu file")
    })
  }

  // Handle contact actions
  const handleContact = (type: "phone" | "email" | "website") => {
    if (!store) return

    switch (type) {
      case "phone":
        if (store.phone) {
          Linking.openURL(`tel:${store.phone}`)
        } else {
          Alert.alert("Contact Information", "Phone number not available")
        }
        break
      case "email":
        if (store.email) {
          Linking.openURL(`mailto:${store.email}`)
        } else {
          Alert.alert("Contact Information", "Email not available")
        }
        break
      case "website":
        if (store.website) {
          Linking.openURL(store.website)
        } else {
          Alert.alert("Contact Information", "Website not available")
        }
        break
    }
  }

  // Handle sharing store information
  const handleShare = async () => {
    if (!store) return

    try {
      const shareContent = {
        title: store.name,
        message: `Check out ${store.name}${store.city ? ` in ${store.city}` : ""}!\n\n${
          store.description ? `${store.description}\n\n` : ""
        }${store.address ? `Located at: ${store.address}${store.city ? `, ${store.city}` : ""}\n\n` : ""}`,
        // In a real app, this would be a deep link to the store
        url: store.website || "https://example.com/stores/" + store.id,
      }

      const result = await Share.share(shareContent)

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type of result.activityType
          console.log(`Shared via ${result.activityType}`)
        } else {
          // Shared
          console.log("Shared successfully")
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
        console.log("Share dismissed")
      }
    } catch (error) {
      console.error("Error sharing:", error)
      Alert.alert("Error", "Could not share this store")
    }
  }

  // Handle retry
  const handleRetry = () => {
    fetchStore()
    fetchTables()
  }

  // Format opening hours from JSON if available
  const formatOpeningHours = useCallback(() => {
    if (!store?.opening_hours) return null

    try {
      // If opening_hours is a string, parse it
      const hours = typeof store.opening_hours === "string" ? JSON.parse(store.opening_hours) : store.opening_hours

      if (typeof hours !== "object") return null

      // Format the hours for display
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      return days.map((day) => {
        const timeRange = hours[day] || "Closed"
        return { day: day.charAt(0).toUpperCase() + day.slice(1), hours: timeRange }
      })
    } catch (e) {
      console.error("Error parsing opening hours:", e)
      return null
    }
  }, [store?.opening_hours])

  const openingHours = formatOpeningHours()

  // Debug screen for troubleshooting
  if (debugInfo && !store) {
    return (
      <SafeAreaView style={[styles.debugContainer, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <Icon name="bug" size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
        <Text style={styles.debugTitle}>Debug Information</Text>
        <Text style={styles.debugMessage}>Store ID: {storeId}</Text>
        <ScrollView style={styles.debugScroll}>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </ScrollView>
        <View style={styles.debugButtons}>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading store details...</Text>
        <Text style={styles.loadingSubText}>Store ID: {storeId}</Text>
      </SafeAreaView>
    )
  }

  if (!store) {
    return (
      <SafeAreaView style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <Icon name="warning" size={48} color="#F59E0B" />
        <Text style={styles.errorTitle}>Store Not Found</Text>
        <Text style={styles.errorMessage}>The store you're looking for doesn't exist or has been removed.</Text>
        <Text style={styles.errorDetail}>Store ID: {storeId}</Text>
        <View style={styles.errorButtons}>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Animated Header */}
      <Animated.View
        style={[
          styles.header,
          {
            height: headerHeight,
            opacity: headerOpacity,
          },
        ]}
      >
        {/* Store Image */}
        <Animated.View style={[styles.imageContainer, { opacity: imageOpacity }]}>
          {imageError ? (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>🏪</Text>
            </View>
          ) : (
            <Image
              source={{ uri: store.image_url || `https://picsum.photos/seed/${store.id}/800/600` }}
              style={styles.storeImage}
              onError={() => setImageError(true)}
            />
          )}
          <LinearGradient colors={["rgba(0,0,0,0.7)", "transparent", "rgba(0,0,0,0.7)"]} style={styles.imageGradient} />
        </Animated.View>

        {/* Header Content */}
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButtonHeader}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Animated.Text style={[styles.headerTitle, { opacity: titleOpacity }]} numberOfLines={1}>
            {store.name}
          </Animated.Text>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", onPress: () => navigation.replace("Login"), style: "destructive" },
              ])
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="user" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Main Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Store Info Section */}
        <View style={styles.storeInfoSection}>
          <Text style={styles.storeName}>{store.name}</Text>

          {/* Store Status Badge */}
          <View style={styles.storeMetaRow}>
            {store.is_active !== undefined && (
              <View style={[styles.statusBadge, store.is_active ? styles.statusActive : styles.statusInactive]}>
                <Text style={styles.statusText}>{store.is_active ? "Open" : "Closed"}</Text>
              </View>
            )}

            {usingMockData && (
              <View style={styles.mockDataBadge}>
                <Text style={styles.mockDataText}>Using Mock Data</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {store.description && <Text style={styles.descriptionText}>{store.description}</Text>}

          {/* Address */}
          {(store.address || store.city) && (
            <View style={styles.addressContainer}>
              <Icon name="map-marker" size={18} color="#4F46E5" style={{ marginRight: 8 }} />
              <Text style={styles.addressText}>
                {store.address || ""} {store.city ? `${store.address ? "," : ""} ${store.city}` : ""}
              </Text>
            </View>
          )}

          {/* Contact Buttons */}
          <View style={styles.contactButtons}>
            {store.phone && (
              <TouchableOpacity style={styles.contactButton} onPress={() => handleContact("phone")} activeOpacity={0.7}>
                <Icon name="phone" size={20} color="#4F46E5" />
                <Text style={styles.contactButtonText}>Call</Text>
              </TouchableOpacity>
            )}

            {store.email && (
              <TouchableOpacity style={styles.contactButton} onPress={() => handleContact("email")} activeOpacity={0.7}>
                <Icon name="email" size={20} color="#4F46E5" />
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            )}

            {store.website && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleContact("website")}
                activeOpacity={0.7}
              >
                <Icon name="globe" size={20} color="#4F46E5" />
                <Text style={styles.contactButtonText}>Website</Text>
              </TouchableOpacity>
            )}

            {store.menu_pdf_url && (
              <TouchableOpacity style={styles.contactButton} onPress={handleOpenMenu} activeOpacity={0.7}>
                <Icon name="menu" size={20} color="#4F46E5" />
                <Text style={styles.contactButtonText}>Menu</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tables Section */}
        <View style={styles.tablesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Tables</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={fetchTables}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Table Tabs */}
          <View style={styles.tableTabs}>
            <TouchableOpacity
              style={[styles.tableTab, activeTab === "all" && styles.tableTabActive]}
              onPress={() => setActiveTab("all")}
            >
              <Text style={[styles.tableTabText, activeTab === "all" && styles.tableTabTextActive]}>All Tables</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tableTab, activeTab === "in" && styles.tableTabActive]}
              onPress={() => setActiveTab("in")}
            >
              <Icon name="indoor" size={16} color={activeTab === "in" ? "#FFFFFF" : "#4B5563"} />
              <Text style={[styles.tableTabText, activeTab === "in" && styles.tableTabTextActive]}>Indoor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tableTab, activeTab === "out" && styles.tableTabActive]}
              onPress={() => setActiveTab("out")}
            >
              <Icon name="outdoor" size={16} color={activeTab === "out" ? "#FFFFFF" : "#4B5563"} />
              <Text style={[styles.tableTabText, activeTab === "out" && styles.tableTabTextActive]}>Outdoor</Text>
            </TouchableOpacity>
          </View>

          {tablesLoading ? (
            <View style={styles.tablesLoading}>
              <ActivityIndicator size="small" color="#6366F1" />
              <Text style={styles.tablesLoadingText}>Loading tables...</Text>
            </View>
          ) : filteredTables.length === 0 ? (
            <View style={styles.noTablesContainer}>
              <Text style={styles.noTablesEmoji}>🪑</Text>
              <Text style={styles.noTablesText}>No tables available</Text>
              <Text style={styles.noTablesSubtext}>
                {activeTab === "all"
                  ? "There are no tables for this store."
                  : `There are no ${activeTab === "in" ? "indoor" : "outdoor"} tables for this store.`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredTables}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TableItem table={item} onPress={handleTableSelect} selectedTableId={selectedTableId} />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tablesList}
              snapToAlignment="start"
              snapToInterval={SCREEN_WIDTH * 0.85 + 10}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tablesList}
              snapToAlignment="start"
              snapToInterval={SCREEN_WIDTH * 0.85 + 10}
              decelerationRate="fast"
            />
          )}
        </View>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About {store.name}</Text>
          <Text style={styles.aboutText}>
            {store.description ||
              `Welcome to ${store.name}, a charming establishment located in ${store.city || "our city"}. We pride ourselves on providing a welcoming atmosphere and excellent service to all our customers.`}
          </Text>

          {/* Opening Hours */}
          {openingHours && openingHours.length > 0 && (
            <View style={styles.openingHoursContainer}>
              <Text style={styles.openingHoursTitle}>Opening Hours</Text>
              {openingHours.map((day, index) => (
                <View key={index} style={styles.openingHoursRow}>
                  <Text style={styles.dayText}>{day.day}</Text>
                  <Text style={styles.hoursText}>{day.hours}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Menu Section */}
        {store.menu_pdf_url && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Menu</Text>
            <View style={styles.menuPreview}>
              <Icon name="menu" size={32} color="#4F46E5" />
              <Text style={styles.menuText}>This store has a menu available. Click the button below to view it.</Text>
              <TouchableOpacity style={styles.menuButton} onPress={handleOpenMenu}>
                <Text style={styles.menuButtonText}>View Menu</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Location Section */}
        {(store.address || store.city) && (
          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapPlaceholder}>
              <Icon name="map-marker" size={40} color="#4F46E5" />
              <Text style={styles.mapPlaceholderText}>
                {store.address}
                {store.address && store.city ? ", " : ""}
                {store.city}
              </Text>
              <TouchableOpacity
                style={styles.directionsButton}
                onPress={() => {
                  const address = `${store.address}, ${store.city}`
                  const url = Platform.select({
                    ios: `maps:0,0?q=${address}`,
                    android: `geo:0,0?q=${address}`,
                  })
                  if (url) Linking.openURL(url)
                }}
              >
                <Text style={styles.directionsButtonText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.ScrollView>

      {/* Booking Modal */}
      <Modal
        visible={bookingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Book a Table</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setBookingModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={24} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
                {/* Selected Table */}
                {selectedTableId && (
                  <View style={styles.selectedTableContainer}>
                    <Text style={styles.selectedTableLabel}>Selected Table:</Text>
                    <Text style={styles.selectedTableName}>
                      {tables.find((t) => t.id === selectedTableId)?.name || "Unknown Table"}
                    </Text>
                    <TouchableOpacity style={styles.changeTableButton} onPress={() => setBookingModalVisible(false)}>
                      <Text style={styles.changeTableButtonText}>Change Table</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Date & Time Pickers */}
                <View style={styles.dateTimeContainer}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowDatePicker(true)}>
                    <Icon name="calendar" size={18} color="#4F46E5" style={{ marginRight: 8 }} />
                    <Text style={styles.dateTimeButtonText}>
                      {bookingDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={bookingDate}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false)
                        if (selectedDate) {
                          setBookingDate(selectedDate)
                        }
                      }}
                    />
                  )}

                  <Text style={styles.inputLabel}>Time</Text>
                  <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowTimePicker(true)}>
                    <Icon name="clock" size={18} color="#4F46E5" style={{ marginRight: 8 }} />
                    <Text style={styles.dateTimeButtonText}>
                      {bookingTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </Text>
                  </TouchableOpacity>

                  {showTimePicker && (
                    <DateTimePicker
                      value={bookingTime}
                      mode="time"
                      display="default"
                      onChange={(event, selectedTime) => {
                        setShowTimePicker(false)
                        if (selectedTime) {
                          setBookingTime(selectedTime)
                        }
                      }}
                    />
                  )}
                </View>

                {/* Contact Information */}
                <View style={styles.contactInfoContainer}>
                  <Text style={styles.inputLabel}>Your Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your name"
                    value={bookingName}
                    onChangeText={setBookingName}
                  />

                  <Text style={styles.inputLabel}>Party Size *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Number of people"
                    value={partySize}
                    onChangeText={setPartySize}
                    keyboardType="numeric"
                  />

                  <Text style={styles.inputLabel}>Email (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="your@email.com"
                    value={bookingEmail}
                    onChangeText={setBookingEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputLabel}>Phone (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Your phone number"
                    value={bookingPhone}
                    onChangeText={setBookingPhone}
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.inputLabel}>Duration</Text>
                  <View style={styles.durationContainer}>
                    <TouchableOpacity
                      style={[styles.durationButton, bookingDuration === 60 && styles.durationButtonActive]}
                      onPress={() => setBookingDuration(60)}
                    >
                      <Text
                        style={[styles.durationButtonText, bookingDuration === 60 && styles.durationButtonTextActive]}
                      >
                        1 hour
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.durationButton, bookingDuration === 90 && styles.durationButtonActive]}
                      onPress={() => setBookingDuration(90)}
                    >
                      <Text
                        style={[styles.durationButtonText, bookingDuration === 90 && styles.durationButtonTextActive]}
                      >
                        1.5 hours
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.durationButton, bookingDuration === 120 && styles.durationButtonActive]}
                      onPress={() => setBookingDuration(120)}
                    >
                      <Text
                        style={[styles.durationButtonText, bookingDuration === 120 && styles.durationButtonTextActive]}
                      >
                        2 hours
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.durationButton, bookingDuration === 180 && styles.durationButtonActive]}
                      onPress={() => setBookingDuration(180)}
                    >
                      <Text
                        style={[styles.durationButtonText, bookingDuration === 180 && styles.durationButtonTextActive]}
                      >
                        3 hours
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Accept Code (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter special code if you have one"
                    value={acceptCode}
                    onChangeText={setAcceptCode}
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputHint}>
                    Enter a discount code, reservation code, or special offer code if applicable
                  </Text>

                  <Text style={styles.schemaNote}>
                    Note: Your booking will need to be approved by the restaurant. Since bookings are not linked to
                    specific tables in the current system, table selection is for reference only.
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.confirmButton, bookingInProgress && styles.confirmButtonDisabled]}
                  onPress={handleBookingSubmit}
                  disabled={bookingInProgress}
                >
                  {bookingInProgress ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Icon name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* New Booking Notification Modal */}
      {isStoreOwner && (
        <Modal
          visible={newBookingModal}
          transparent
          animationType="fade"
          onRequestClose={() => setNewBookingModal(false)}
        >
          <View style={styles.notificationOverlay}>
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Icon name="calendar" size={32} color="#4F46E5" />
                <Text style={styles.notificationTitle}>New Booking Request!</Text>
              </View>

              {selectedBooking && (
                <>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationLabel}>Customer:</Text>
                    <Text style={styles.notificationValue}>{selectedBooking.customer_name}</Text>
                  </View>

                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationLabel}>Date & Time:</Text>
                    <Text style={styles.notificationValue}>{formatBookingDate(selectedBooking.booked_at)}</Text>
                  </View>

                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationLabel}>Party Size:</Text>
                    <Text style={styles.notificationValue}>{selectedBooking.party_size} people</Text>
                  </View>

                  {selectedBooking.accept_code && (
                    <View style={styles.notificationInfo}>
                      <Text style={styles.notificationLabel}>Accept Code:</Text>
                      <Text style={styles.notificationValue}>{selectedBooking.accept_code}</Text>
                    </View>
                  )}

                  <View style={styles.notificationActions}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptBooking(selectedBooking.id)}
                    >
                      <Icon name="check" size={18} color="#FFFFFF" />
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.declineButton}
                      onPress={() => handleDeclineBooking(selectedBooking.id)}
                    >
                      <Icon name="close" size={18} color="#FFFFFF" />
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => {
                      setNewBookingModal(false)
                      setBookingDetailsModal(true)
                    }}
                  >
                    <Text style={styles.viewDetailsButtonText}>View Full Details</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Booking Details Modal */}
      {isStoreOwner && (
        <Modal
          visible={bookingDetailsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setBookingDetailsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Booking Details</Text>
                  <TouchableOpacity style={styles.modalCloseButton} onPress={() => setBookingDetailsModal(false)}>
                    <Icon name="close" size={24} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                {selectedBooking && (
                  <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Customer Information</Text>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Name:</Text>
                        <Text style={styles.detailValue}>{selectedBooking.customer_name}</Text>
                      </View>

                      {selectedBooking.customer_email && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Email:</Text>
                          <Text style={styles.detailValue}>{selectedBooking.customer_email}</Text>
                        </View>
                      )}

                      {selectedBooking.customer_phone && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Phone:</Text>
                          <Text style={styles.detailValue}>{selectedBooking.customer_phone}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Booking Information</Text>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date & Time:</Text>
                        <Text style={styles.detailValue}>{formatBookingDate(selectedBooking.booked_at)}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Party Size:</Text>
                        <Text style={styles.detailValue}>{selectedBooking.party_size} people</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Duration:</Text>
                        <Text style={styles.detailValue}>
                          {selectedBooking.duration_minutes
                            ? `${selectedBooking.duration_minutes} minutes`
                            : "Not specified"}
                        </Text>
                      </View>

                      {selectedBooking.table_id && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Table:</Text>
                          <Text style={styles.detailValue}>
                            {tables.find((t) => t.id === selectedBooking.table_id)?.name ||
                              `Table #${selectedBooking.table_id}`}
                          </Text>
                        </View>
                      )}

                      {selectedBooking.accept_code && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Accept Code:</Text>
                          <Text style={[styles.detailValue, styles.acceptCodeValue]}>
                            {selectedBooking.accept_code}
                          </Text>
                        </View>
                      )}

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Status:</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            selectedBooking.approved === true
                              ? styles.statusApproved
                              : selectedBooking.approved === false
                                ? styles.statusDeclined
                                : styles.statusPending,
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>
                            {selectedBooking.approved === true
                              ? "Approved"
                              : selectedBooking.approved === false
                                ? "Declined"
                                : "Pending"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {selectedBooking.approved === null && (
                      <View style={styles.modalActions}>
                        <TouchableOpacity
                          style={styles.acceptButtonLarge}
                          onPress={() => handleAcceptBooking(selectedBooking.id)}
                        >
                          <Icon name="check" size={20} color="#FFFFFF" />
                          <Text style={styles.acceptButtonLargeText}>Accept Booking</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.declineButtonLarge}
                          onPress={() => handleDeclineBooking(selectedBooking.id)}
                        >
                          <Icon name="close" size={20} color="#FFFFFF" />
                          <Text style={styles.declineButtonLargeText}>Decline Booking</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                )}
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: "monospace",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: "#9CA3AF",
    fontFamily: "monospace",
    marginBottom: 24,
  },
  errorButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  debugContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  debugTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  debugMessage: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
    fontFamily: "monospace",
  },
  debugScroll: {
    maxHeight: 200,
    width: "100%",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  debugText: {
    fontSize: 14,
    color: "#4B5563",
    fontFamily: "monospace",
  },
  debugButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  retryButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    zIndex: 10,
  },
  imageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  storeImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    fontSize: 48,
  },
  imageGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    height: 60,
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1,
    marginHorizontal: 16,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
    marginTop: 300, // Match header height
  },
  scrollContent: {
    paddingTop: 20,
  },
  storeInfoSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  storeName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  storeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: "#D1FAE5",
  },
  statusInactive: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  mockDataBadge: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  mockDataText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  addressText: {
    fontSize: 16,
    color: "#4B5563",
    flex: 1,
  },
  descriptionText: {
    fontSize: 16,
    color: "#4B5563",
    lineHeight: 24,
    marginBottom: 16,
  },
  contactButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  contactButtonText: {
    color: "#4F46E5",
    fontWeight: "500",
    marginLeft: 6,
  },
  tablesSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  refreshButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshButtonText: {
    color: "#4F46E5",
    fontWeight: "500",
  },
  tableTabs: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 4,
  },
  tableTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderRadius: 6,
  },
  tableTabActive: {
    backgroundColor: "#4F46E5",
  },
  tableTabText: {
    color: "#4B5563",
    fontWeight: "500",
    fontSize: 14,
    marginLeft: 4,
  },
  tableTabTextActive: {
    color: "#FFFFFF",
  },
  tablesLoading: {
    padding: 20,
    alignItems: "center",
  },
  tablesLoadingText: {
    marginTop: 8,
    color: "#6B7280",
  },
  noTablesContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  noTablesEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  noTablesText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  noTablesSubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  tablesList: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  tableCard: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginRight: 10,
    borderLeftWidth: 4,
  },
  tableCardIn: {
    borderLeftColor: "#4F46E5",
  },
  tableCardOut: {
    borderLeftColor: "#10B981",
  },
  tableCardSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
    borderWidth: 2,
    borderLeftWidth: 4,
  },
  tableCardUnavailable: {
    opacity: 0.6,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tableName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  tableCapacity: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tableCapacityText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  tableDetails: {
    marginBottom: 12,
  },
  tableDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  tableDetailText: {
    fontSize: 14,
    color: "#4B5563",
    marginLeft: 8,
  },
  tableStatus: {
    alignItems: "flex-start",
  },
  tableStatusAvailable: {
    backgroundColor: "#D1FAE5",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  tableStatusReserved: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  tableStatusOccupied: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  tableStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  selectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#4F46E5",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  aboutSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  aboutText: {
    fontSize: 16,
    color: "#4B5563",
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  openingHoursContainer: {
    marginTop: 8,
  },
  openingHoursTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  openingHoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  dayText: {
    fontSize: 14,
    color: "#4B5563",
  },
  hoursText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  locationSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginTop: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  mapPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    maxWidth: "80%",
  },
  directionsButton: {
    marginTop: 16,
    backgroundColor: "#4F46E5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  directionsButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 16,
  },
  bookingButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  bookingButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bookingButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  bookingButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollView: {
    maxHeight: "70%",
  },
  modalScrollContent: {
    padding: 20,
  },
  selectedTableContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedTableLabel: {
    fontSize: 14,
    color: "#4B5563",
    marginRight: 8,
  },
  selectedTableName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
    flex: 1,
  },
  changeTableButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeTableButtonText: {
    color: "#4F46E5",
    fontWeight: "500",
    fontSize: 14,
  },
  dateTimeContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
    marginBottom: 8,
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: "#111827",
  },
  contactInfoContainer: {
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textAreaInput: {
    height: 100,
    textAlignVertical: "top",
  },
  durationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginHorizontal: 4,
    alignItems: "center",
  },
  durationButtonActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  durationButtonText: {
    fontSize: 14,
    color: "#4B5563",
  },
  durationButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  confirmButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  menuSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  menuPreview: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 24,
    marginTop: 16,
  },
  menuText: {
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 24,
  },
  menuButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  menuButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  schemaNote: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  inputHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: -12,
    marginBottom: 16,
    fontStyle: "italic",
  },
  notificationOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  notificationContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  notificationHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  notificationTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 12,
  },
  notificationInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  notificationLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  notificationValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },
  notificationActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 6,
  },
  declineButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  declineButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 6,
  },
  viewDetailsButton: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: "center",
  },
  viewDetailsButtonText: {
    color: "#4F46E5",
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  detailSection: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },
  acceptCodeValue: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontFamily: "monospace",
    color: "#4F46E5",
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusApproved: {
    backgroundColor: "#D1FAE5",
  },
  statusDeclined: {
    backgroundColor: "#FEE2E2",
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  modalActions: {
    marginTop: 20,
    gap: 12,
  },
  acceptButtonLarge: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  acceptButtonLargeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  declineButtonLarge: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  declineButtonLargeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
})

"use client"

import { useState, useEffect, useCallback } from "react"
import { __DEV__ } from "react-native"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  FlatList,
  TextInput,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { useNavigation, useRoute } from "@react-navigation/native"
import { isAuthenticated, isAdmin, isDevMode, enableDevModeWithAdminPrivileges } from "../utils/auth"
import { getStore } from "../utils/auth"
import { getStoreBookings, approveBooking, cancelBooking, formatBookingDate } from "../utils/booking-api"

// Simple Icon component
const Icon = ({
  name,
  size = 24,
  color = "#000",
  style = {},
}: {
  name: string
  size?: number
  color?: string
  style?: any
}) => {
  // Map of icon names to text representations
  const iconMap: Record<string, string> = {
    "dots-vertical": "⋮",
    "map-marker": "📍",
    "office-building": "🏢",
    pencil: "✏️",
    delete: "🗑️",
    plus: "+",
    table: "🪑",
    smoking: "🚬",
    "smoking-off": "🚭",
    indoor: "🏠",
    outdoor: "🌳",
    calendar: "📅",
    image: "🖼️",
    save: "💾",
    close: "✕",
    pdf: "📄",
    upload: "⬆️",
    download: "⬇️",
    menu: "📋",
    camera: "📷",
    photo: "🏞️",
    refresh: "↻",
    warning: "⚠️",
    back: "←",
    edit: "✏️",
    check: "✓",
    trash: "🗑️",
    dev: "🛠️",
    clock: "🕒",
    person: "👤",
    phone: "📱",
    email: "📧",
    approve: "✅",
    cancel: "❌",
    filter: "🔍",
    sort: "↕️",
    info: "ℹ️",
    time: "⏱️",
    location: "📌",
    notes: "📝",
    view: "👁️",
  }

  return (
    <Text style={[{ fontSize: size, color, fontWeight: "bold", textAlign: "center" }, style]}>
      {iconMap[name] || "•"}
    </Text>
  )
}

// Types
type Booking = {
  id: string
  user_id: string
  owner_id: string
  booked_at: string
  created_at?: string
  approved: boolean
  status?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  party_size: number
  duration_minutes?: number
  table_id?: number
  special_requests?: string
}

type Store = {
  id: string
  name: string
  city: string | null
  address: string | null
}

export default function BookingListScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { storeId } = (route.params as { storeId: string }) || {}

  const [store, setStore] = useState<Store | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [devMode, setDevMode] = useState(false)
  const [filterApproved, setFilterApproved] = useState<boolean | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Check authentication status and dev mode
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Enable dev mode immediately in development
        if (__DEV__) {
          await enableDevModeWithAdminPrivileges()
          setDevMode(true)
          setUserIsAdmin(true)
          setAuthenticated(true)
          console.log("Dev mode automatically enabled")
          return
        }

        const isAuth = await isAuthenticated()
        const admin = await isAdmin()
        const isDev = isDevMode()

        setAuthenticated(isAuth)
        setUserIsAdmin(admin)
        setDevMode(isDev)

        if (!isAuth && !isDev) {
          Alert.alert("Authentication Required", "Please log in to continue", [
            { text: "OK", onPress: () => navigation.navigate("Login" as never) },
          ])
        }
      } catch (error) {
        console.error("Error checking auth:", error)
      }
    }

    checkAuth()
  }, [navigation])

  // Fetch store data
  useEffect(() => {
    const fetchStoreData = async () => {
      if (!storeId) return

      try {
        const bypassAuth = __DEV__ || devMode
        const storeData = await getStore(storeId, bypassAuth)

        if (storeData) {
          setStore(storeData)
        } else {
          Alert.alert("Error", "Store not found")
          navigation.goBack()
        }
      } catch (error: any) {
        console.error("Error fetching store:", error)
        Alert.alert("Error", error.message || "Failed to load store data")
      }
    }

    fetchStoreData()
  }, [storeId, devMode, navigation])

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!storeId) return

    try {
      setLoading(true)
      const bookingsData = await getStoreBookings(storeId)
      setBookings(bookingsData)
    } catch (error: any) {
      console.error("Error fetching bookings:", error)
      Alert.alert("Error", "Failed to load bookings: " + (error.message || "Unknown error"))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchBookings()
  }, [fetchBookings])

  // Handle approve booking
  const handleApproveBooking = async (bookingId: string) => {
    if (!authenticated && !devMode) {
      Alert.alert("Authentication Required", "Please log in to continue")
      return
    }

    if (!userIsAdmin && !devMode) {
      Alert.alert("Permission Denied", "Only administrators can approve bookings")
      return
    }

    try {
      const success = await approveBooking(bookingId)
      if (success) {
        Alert.alert("Success", "Booking approved successfully")
        fetchBookings()
      } else {
        Alert.alert("Error", "Failed to approve booking")
      }
    } catch (error: any) {
      console.error("Error approving booking:", error)
      Alert.alert("Error", "Failed to approve booking: " + (error.message || "Unknown error"))
    }
  }

  // Handle cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!authenticated && !devMode) {
      Alert.alert("Authentication Required", "Please log in to continue")
      return
    }

    Alert.alert("Cancel Booking", "Are you sure you want to cancel this booking? This action cannot be undone.", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            const success = await cancelBooking(bookingId)
            if (success) {
              Alert.alert("Success", "Booking cancelled successfully")
              fetchBookings()
            } else {
              Alert.alert("Error", "Failed to cancel booking")
            }
          } catch (error: any) {
            console.error("Error cancelling booking:", error)
            Alert.alert("Error", "Failed to cancel booking: " + (error.message || "Unknown error"))
          }
        },
      },
    ])
  }

  // Handle decline booking
  const handleDeclineBooking = async (bookingId: string) => {
    if (!authenticated && !devMode) {
      Alert.alert("Authentication Required", "Please log in to continue")
      return
    }

    if (!userIsAdmin && !devMode) {
      Alert.alert("Permission Denied", "Only administrators can decline bookings")
      return
    }

    Alert.alert("Decline Booking", "Are you sure you want to decline this booking? The customer will be notified.", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Decline",
        style: "destructive",
        onPress: async () => {
          try {
            const success = await cancelBooking(bookingId)
            if (success) {
              Alert.alert("Success", "Booking declined successfully")
              fetchBookings()
            } else {
              Alert.alert("Error", "Failed to decline booking")
            }
          } catch (error: any) {
            console.error("Error declining booking:", error)
            Alert.alert("Error", "Failed to decline booking: " + (error.message || "Unknown error"))
          }
        },
      },
    ])
  }

  // View booking details
  const viewBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking)
    setDetailsModalVisible(true)
  }

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      const matchesName = booking.customer_name.toLowerCase().includes(query)
      const matchesId = booking.id.toLowerCase().includes(query)
      const matchesEmail = booking.customer_email?.toLowerCase().includes(query) || false

      if (!matchesName && !matchesId && !matchesEmail) {
        return false
      }
    }

    // Filter by approval status
    if (filterApproved !== null && booking.approved !== filterApproved) {
      return false
    }

    // Filter by status if specified
    if (filterStatus !== null && booking.status !== filterStatus) {
      return false
    }

    return true
  })

  // Sort bookings
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const dateA = new Date(a.booked_at).getTime()
    const dateB = new Date(b.booked_at).getTime()
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA
  })

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  // Get status counts
  const getStatusCounts = () => {
    const pending = bookings.filter((b) => !b.approved).length
    const approved = bookings.filter((b) => b.approved).length
    const upcoming = bookings.filter((b) => new Date(b.booked_at) > new Date()).length

    return { pending, approved, upcoming, total: bookings.length }
  }

  const counts = getStatusCounts()

  // Render booking item
  const renderBookingItem = ({ item }: { item: Booking }) => {
    const bookingDate = new Date(item.booked_at)
    const isUpcoming = bookingDate > new Date()
    const isPast = !isUpcoming

    // Determine status color
    let statusColor = "#F59E0B" // Default yellow for pending
    let statusBgColor = "#FEF3C7"

    if (item.status === "cancelled" || item.status === "declined") {
      statusColor = "#EF4444" // Red for cancelled/declined
      statusBgColor = "#FEE2E2"
    } else if (item.approved) {
      statusColor = "#10B981" // Green for approved
      statusBgColor = "#D1FAE5"
    }

    if (isPast) {
      statusColor = "#9CA3AF" // Gray for past bookings
      statusBgColor = "#F3F4F6"
    }

    return (
      <TouchableOpacity
        style={[
          styles.bookingCard,
          isPast && styles.pastBookingCard,
          item.status === "cancelled" && styles.cancelledBookingCard,
          item.status === "declined" && styles.cancelledBookingCard,
        ]}
        onPress={() => viewBookingDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingStatus}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isPast
                ? "Past"
                : item.status
                  ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                  : item.approved
                    ? "Approved"
                    : "Pending"}
            </Text>
          </View>
          <Text style={styles.bookingId}>ID: {item.id.substring(0, 8)}...</Text>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailRow}>
            <Icon name="calendar" size={18} color="#6366F1" style={styles.detailIcon} />
            <Text style={styles.detailText}>{formatBookingDate(item.booked_at)}</Text>
          </View>

          <View style={styles.bookingDetailRow}>
            <Icon name="person" size={18} color="#6366F1" style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.customer_name}</Text>
          </View>

          <View style={styles.bookingDetailRow}>
            <Icon name="table" size={18} color="#6366F1" style={styles.detailIcon} />
            <Text style={styles.detailText}>Party of {item.party_size}</Text>
          </View>

          {item.duration_minutes && (
            <View style={styles.bookingDetailRow}>
              <Icon name="clock" size={18} color="#6366F1" style={styles.detailIcon} />
              <Text style={styles.detailText}>{item.duration_minutes} minutes</Text>
            </View>
          )}

          {item.table_id && (
            <View style={styles.bookingDetailRow}>
              <Icon name="table" size={18} color="#6366F1" style={styles.detailIcon} />
              <Text style={styles.detailText}>Table #{item.table_id}</Text>
            </View>
          )}
        </View>

        {isUpcoming && item.status !== "cancelled" && item.status !== "declined" && (userIsAdmin || devMode) && (
          <View style={styles.bookingActions}>
            {!item.approved && (
              <>
                <TouchableOpacity style={styles.acceptButton} onPress={() => handleApproveBooking(item.id)}>
                  <Icon name="check" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Accept</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.declineButton} onPress={() => handleDeclineBooking(item.id)}>
                  <Icon name="close" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Decline</Text>
                </TouchableOpacity>
              </>
            )}

            {item.approved && (
              <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelBooking(item.id)}>
                <Icon name="cancel" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.viewDetailsRow}>
          <Icon name="view" size={14} color="#6366F1" />
          <Text style={styles.viewDetailsText}>Tap to view details</Text>
        </View>
      </TouchableOpacity>
    )
  }

  // Render booking details modal
  const renderBookingDetailsModal = () => {
    if (!selectedBooking) return null

    const bookingDate = new Date(selectedBooking.booked_at)
    const isUpcoming = bookingDate > new Date()
    const isPast = !isUpcoming

    // Format date and time
    const formattedDate = bookingDate.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const formattedTime = bookingDate.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })

    // Calculate end time if duration is available
    let endTime = ""
    if (selectedBooking.duration_minutes) {
      const endDate = new Date(bookingDate.getTime() + selectedBooking.duration_minutes * 60000)
      endTime = endDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    }

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Booking Details</Text>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setDetailsModalVisible(false)}>
              <Icon name="close" size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                selectedBooking.status === "cancelled" || selectedBooking.status === "declined"
                  ? styles.statusBadgeCancelled
                  : selectedBooking.approved
                    ? styles.statusBadgeApproved
                    : styles.statusBadgePending,
                isPast && styles.statusBadgePast,
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {isPast
                  ? "Past Booking"
                  : selectedBooking.status
                    ? selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)
                    : selectedBooking.approved
                      ? "Approved"
                      : "Pending Approval"}
              </Text>
            </View>

            {/* Date and Time */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Date & Time</Text>
              <View style={styles.detailItem}>
                <Icon name="calendar" size={18} color="#6366F1" style={styles.modalDetailIcon} />
                <Text style={styles.detailItemText}>{formattedDate}</Text>
              </View>
              <View style={styles.detailItem}>
                <Icon name="time" size={18} color="#6366F1" style={styles.modalDetailIcon} />
                <Text style={styles.detailItemText}>
                  {formattedTime}
                  {endTime && ` - ${endTime}`}
                  {selectedBooking.duration_minutes && ` (${selectedBooking.duration_minutes} minutes)`}
                </Text>
              </View>
            </View>

            {/* Customer Information */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Customer Information</Text>
              <View style={styles.detailItem}>
                <Icon name="person" size={18} color="#6366F1" style={styles.modalDetailIcon} />
                <Text style={styles.detailItemText}>{selectedBooking.customer_name}</Text>
              </View>
              {selectedBooking.customer_email && (
                <View style={styles.detailItem}>
                  <Icon name="email" size={18} color="#6366F1" style={styles.modalDetailIcon} />
                  <Text style={styles.detailItemText}>{selectedBooking.customer_email}</Text>
                </View>
              )}
              {selectedBooking.customer_phone && (
                <View style={styles.detailItem}>
                  <Icon name="phone" size={18} color="#6366F1" style={styles.modalDetailIcon} />
                  <Text style={styles.detailItemText}>{selectedBooking.customer_phone}</Text>
                </View>
              )}
            </View>

            {/* Booking Details */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Booking Details</Text>
              <View style={styles.detailItem}>
                <Icon name="table" size={18} color="#6366F1" style={styles.modalDetailIcon} />
                <Text style={styles.detailItemText}>Party of {selectedBooking.party_size}</Text>
              </View>
              {selectedBooking.table_id && (
                <View style={styles.detailItem}>
                  <Icon name="location" size={18} color="#6366F1" style={styles.modalDetailIcon} />
                  <Text style={styles.detailItemText}>Table #{selectedBooking.table_id}</Text>
                </View>
              )}
              {selectedBooking.special_requests && (
                <View style={styles.specialRequests}>
                  <View style={styles.detailItem}>
                    <Icon name="notes" size={18} color="#6366F1" style={styles.modalDetailIcon} />
                    <Text style={styles.detailItemText}>Special Requests:</Text>
                  </View>
                  <Text style={styles.specialRequestsText}>{selectedBooking.special_requests}</Text>
                </View>
              )}
            </View>

            {/* Booking ID */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Booking ID</Text>
              <Text style={styles.bookingIdText}>{selectedBooking.id}</Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          {isUpcoming &&
            selectedBooking.status !== "cancelled" &&
            selectedBooking.status !== "declined" &&
            (userIsAdmin || devMode) && (
              <View style={styles.modalActions}>
                {!selectedBooking.approved ? (
                  <>
                    <TouchableOpacity
                      style={styles.modalAcceptButton}
                      onPress={() => {
                        setDetailsModalVisible(false)
                        handleApproveBooking(selectedBooking.id)
                      }}
                    >
                      <Icon name="check" size={16} color="#FFFFFF" />
                      <Text style={styles.modalActionButtonText}>Accept Booking</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalDeclineButton}
                      onPress={() => {
                        setDetailsModalVisible(false)
                        handleDeclineBooking(selectedBooking.id)
                      }}
                    >
                      <Icon name="close" size={16} color="#FFFFFF" />
                      <Text style={styles.modalActionButtonText}>Decline Booking</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setDetailsModalVisible(false)
                      handleCancelBooking(selectedBooking.id)
                    }}
                  >
                    <Icon name="cancel" size={16} color="#FFFFFF" />
                    <Text style={styles.modalActionButtonText}>Cancel Booking</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
        </View>
      </View>
    )
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="back" size={24} color="#4B5563" />
          </TouchableOpacity>

          <Text style={styles.title}>{store ? `Bookings: ${store.name}` : "Bookings"}</Text>

          <View style={{ width: 40 }} />
        </View>

        {/* Dev mode banner */}
        {devMode && (
          <View style={styles.devModeBanner}>
            <Icon name="dev" size={16} color="#FFFFFF" />
            <Text style={styles.devModeText}>Development Mode Active</Text>
          </View>
        )}

        {/* Booking Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{counts.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{counts.upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{counts.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{counts.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
        </View>

        {/* Filter and Sort Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.filterButton, filterApproved === null && styles.filterButtonActive]}
              onPress={() => setFilterApproved(null)}
            >
              <Text style={[styles.filterButtonText, filterApproved === null && styles.filterButtonTextActive]}>
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, filterApproved === true && styles.filterButtonActive]}
              onPress={() => setFilterApproved(true)}
            >
              <Text style={[styles.filterButtonText, filterApproved === true && styles.filterButtonTextActive]}>
                Approved
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, filterApproved === false && styles.filterButtonActive]}
              onPress={() => setFilterApproved(false)}
            >
              <Text style={[styles.filterButtonText, filterApproved === false && styles.filterButtonTextActive]}>
                Pending
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.sortButton} onPress={toggleSortOrder}>
            <Icon name="sort" size={18} color="#6366F1" />
            <Text style={styles.sortButtonText}>{sortOrder === "asc" ? "Earliest First" : "Latest First"}</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="filter" size={18} color="#6B7280" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search bookings by name or ID..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                <Icon name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bookings List */}
        {sortedBookings.length > 0 ? (
          <FlatList
            data={sortedBookings}
            renderItem={renderBookingItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.bookingsList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6366F1"]} />}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6366F1"]} />}
          >
            <Icon name="calendar" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No bookings found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery.trim() !== ""
                ? `No results found for "${searchQuery}"`
                : filterApproved !== null
                  ? `No ${filterApproved ? "approved" : "pending"} bookings found`
                  : "There are no bookings for this store yet"}
            </Text>
          </ScrollView>
        )}

        {/* Booking Details Modal */}
        {detailsModalVisible && renderBookingDetailsModal()}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  devModeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    paddingVertical: 8,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
  },
  devModeText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6366F1",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  controlsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterButtons: {
    flexDirection: "row",
    marginBottom: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#6366F1",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6366F1",
    marginLeft: 4,
  },
  bookingsList: {
    padding: 20,
    paddingTop: 0,
  },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#6366F1",
  },
  pastBookingCard: {
    borderLeftColor: "#9CA3AF",
    opacity: 0.8,
  },
  cancelledBookingCard: {
    borderLeftColor: "#EF4444",
    opacity: 0.8,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  bookingStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  approvedDot: {
    backgroundColor: "#10B981",
  },
  pendingDot: {
    backgroundColor: "#F59E0B",
  },
  pastDot: {
    backgroundColor: "#9CA3AF",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  bookingId: {
    fontSize: 12,
    color: "#6B7280",
  },
  bookingDetails: {
    marginBottom: 16,
  },
  bookingDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
    width: 24,
  },
  detailText: {
    fontSize: 15,
    color: "#111827",
  },
  bookingActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
    marginBottom: 8,
  },
  approveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
  },
  declineButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  viewDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  viewDetailsText: {
    fontSize: 12,
    color: "#6366F1",
    marginLeft: 4,
  },
  // Modal styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "90%",
    maxWidth: 500,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  closeModalButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 16,
    maxHeight: "60%",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusBadgeApproved: {
    backgroundColor: "#D1FAE5",
  },
  statusBadgePending: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeCancelled: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgePast: {
    backgroundColor: "#F3F4F6",
  },
  statusBadgeText: {
    fontWeight: "600",
    fontSize: 14,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 4,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  modalDetailIcon: {
    marginRight: 8,
    width: 24,
  },
  detailItemText: {
    fontSize: 15,
    color: "#111827",
  },
  specialRequests: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  specialRequestsText: {
    fontSize: 14,
    color: "#4B5563",
    paddingLeft: 32,
  },
  bookingIdText: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: "monospace",
  },
  modalActions: {
    flexDirection: "column",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 16,
  },
  modalAcceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalDeclineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalActionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  clearButton: {
    padding: 4,
  },
})

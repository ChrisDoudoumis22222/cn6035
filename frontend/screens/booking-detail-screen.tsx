"use client"

import { useState, useEffect } from "react"
import { __DEV__ } from "react-native"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Linking,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { useNavigation, useRoute } from "@react-navigation/native"
import { isAuthenticated, isAdmin, isDevMode, enableDevModeWithAdminPrivileges } from "../utils/auth"
import {
  getBookingDetails,
  approveBooking,
  cancelBooking,
  formatBookingDate,
  getStore,
  getTable,
  updateTableStatus,
} from "../utils/booking-api"

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
    store: "🏪",
    info: "ℹ️",
    time: "⏱️",
    party: "👥",
    status: "📊",
    call: "📞",
    message: "💬",
  }

  return (
    <Text style={[{ fontSize: size, color, fontWeight: "bold", textAlign: "center" }, style]}>
      {iconMap[name] || "•"}
    </Text>
  )
}

export default function BookingDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { bookingId } = (route.params as { bookingId: string }) || {}

  const [booking, setBooking] = useState<any>(null)
  const [store, setStore] = useState<any>(null)
  const [table, setTable] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [devMode, setDevMode] = useState(false)
  const [processingAction, setProcessingAction] = useState(false)

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

  // Fetch booking data
  useEffect(() => {
    const fetchBookingData = async () => {
      if (!bookingId) return

      try {
        setLoading(true)

        // Get booking details
        const bookingData = await getBookingDetails(bookingId)

        if (!bookingData) {
          Alert.alert("Error", "Booking not found")
          navigation.goBack()
          return
        }

        setBooking(bookingData)

        // Get store details
        if (bookingData.owner_id) {
          const storeData = await getStore(bookingData.owner_id)
          setStore(storeData)
        }

        // Get table details if available
        if (bookingData.table_id) {
          const tableData = await getTable(bookingData.table_id)
          setTable(tableData)
        }
      } catch (error: any) {
        console.error("Error fetching booking:", error)
        Alert.alert("Error", error.message || "Failed to load booking data")
      } finally {
        setLoading(false)
      }
    }

    fetchBookingData()
  }, [bookingId, navigation])

  // Handle approve booking
  const handleApproveBooking = async () => {
    if (!authenticated && !devMode) {
      Alert.alert("Authentication Required", "Please log in to continue")
      return
    }

    if (!userIsAdmin && !devMode) {
      Alert.alert("Permission Denied", "Only administrators can approve bookings")
      return
    }

    try {
      setProcessingAction(true)
      const success = await approveBooking(bookingId)

      if (success) {
        // Update booking status in state
        setBooking({ ...booking, approved: true })

        // Update table status if there's a table assigned
        if (booking.table_id) {
          await updateTableStatus(booking.table_id, "reserved")
        }

        Alert.alert("Success", "Booking approved successfully")
      } else {
        Alert.alert("Error", "Failed to approve booking")
      }
    } catch (error: any) {
      console.error("Error approving booking:", error)
      Alert.alert("Error", "Failed to approve booking: " + (error.message || "Unknown error"))
    } finally {
      setProcessingAction(false)
    }
  }

  // Handle cancel booking
  const handleCancelBooking = async () => {
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
            setProcessingAction(true)
            const success = await cancelBooking(bookingId)

            if (success) {
              Alert.alert("Success", "Booking cancelled successfully", [
                { text: "OK", onPress: () => navigation.goBack() },
              ])
            } else {
              Alert.alert("Error", "Failed to cancel booking")
            }
          } catch (error: any) {
            console.error("Error cancelling booking:", error)
            Alert.alert("Error", "Failed to cancel booking: " + (error.message || "Unknown error"))
          } finally {
            setProcessingAction(false)
          }
        },
      },
    ])
  }

  // Handle decline booking
  const handleDeclineBooking = async () => {
    if (!authenticated && !devMode) {
      Alert.alert("Authentication Required", "Please log in to continue")
      return
    }

    Alert.alert("Decline Booking", "Are you sure you want to decline this booking? The customer will be notified.", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Decline",
        style: "destructive",
        onPress: async () => {
          try {
            setProcessingAction(true)
            const success = await cancelBooking(bookingId)

            if (success) {
              Alert.alert("Success", "Booking declined successfully", [
                { text: "OK", onPress: () => navigation.goBack() },
              ])
            } else {
              Alert.alert("Error", "Failed to decline booking")
            }
          } catch (error: any) {
            console.error("Error declining booking:", error)
            Alert.alert("Error", "Failed to decline booking: " + (error.message || "Unknown error"))
          } finally {
            setProcessingAction(false)
          }
        },
      },
    ])
  }

  // Handle contact customer
  const handleContactCustomer = (type: "phone" | "email") => {
    if (!booking) return

    if (type === "phone" && booking.customer_phone) {
      Linking.openURL(`tel:${booking.customer_phone}`)
    } else if (type === "email" && booking.customer_email) {
      Linking.openURL(`mailto:${booking.customer_email}`)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    )
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="warning" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Booking not found</Text>
        <TouchableOpacity style={styles.backToListButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backToListButtonText}>Back to List</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const bookingDate = new Date(booking.booked_at)
  const isUpcoming = bookingDate > new Date()
  const isPast = !isUpcoming
  const endTime = new Date(bookingDate.getTime() + (booking.duration_minutes || 120) * 60000)

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

          <Text style={styles.title}>Booking Details</Text>

          <View style={{ width: 40 }} />
        </View>

        {/* Dev mode banner */}
        {devMode && (
          <View style={styles.devModeBanner}>
            <Icon name="dev" size={16} color="#FFFFFF" />
            <Text style={styles.devModeText}>Development Mode Active</Text>
          </View>
        )}

        <ScrollView style={styles.scrollView}>
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusBadge}>
                <View
                  style={[
                    styles.statusDot,
                    booking.approved ? styles.approvedDot : styles.pendingDot,
                    isPast && styles.pastDot,
                  ]}
                />
                <Text style={styles.statusText}>{isPast ? "Past" : booking.approved ? "Approved" : "Pending"}</Text>
              </View>
              <Text style={styles.bookingId}>ID: {booking.id}</Text>
            </View>
          </View>

          {/* Booking Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Booking Information</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="calendar" size={20} color="#6366F1" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date & Time</Text>
                <Text style={styles.infoValue}>{formatBookingDate(booking.booked_at)}</Text>
              </View>
            </View>

            {booking.duration_minutes && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Icon name="time" size={20} color="#6366F1" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Duration</Text>
                  <Text style={styles.infoValue}>
                    {booking.duration_minutes} minutes (until{" "}
                    {endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="party" size={20} color="#6366F1" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Party Size</Text>
                <Text style={styles.infoValue}>{booking.party_size} people</Text>
              </View>
            </View>

            {table && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Icon name="table" size={20} color="#6366F1" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Table</Text>
                  <Text style={styles.infoValue}>
                    {table.name} (Capacity: {table.capacity},{table.is_indoor ? " Indoor" : " Outdoor"}
                    {table.smoking_allowed ? ", Smoking" : ", Non-smoking"})
                  </Text>
                </View>
              </View>
            )}

            {store && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Icon name="store" size={20} color="#6366F1" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Restaurant</Text>
                  <Text style={styles.infoValue}>{store.name}</Text>
                  {store.address && <Text style={styles.infoSubvalue}>{store.address}</Text>}
                </View>
              </View>
            )}
          </View>

          {/* Customer Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Customer Information</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="person" size={20} color="#6366F1" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{booking.customer_name}</Text>
              </View>
            </View>

            {booking.customer_phone && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Icon name="phone" size={20} color="#6366F1" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <View style={styles.contactRow}>
                    <Text style={styles.infoValue}>{booking.customer_phone}</Text>
                    <TouchableOpacity style={styles.contactButton} onPress={() => handleContactCustomer("phone")}>
                      <Icon name="call" size={16} color="#6366F1" />
                      <Text style={styles.contactButtonText}>Call</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {booking.customer_email && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Icon name="email" size={20} color="#6366F1" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <View style={styles.contactRow}>
                    <Text style={styles.infoValue}>{booking.customer_email}</Text>
                    <TouchableOpacity style={styles.contactButton} onPress={() => handleContactCustomer("email")}>
                      <Icon name="message" size={16} color="#6366F1" />
                      <Text style={styles.contactButtonText}>Email</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          {isUpcoming && (
            <View style={styles.actionButtons}>
              {!booking.approved && (userIsAdmin || devMode) && (
                <View style={styles.actionButtonRow}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={handleApproveBooking}
                    disabled={processingAction}
                  >
                    {processingAction ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Icon name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.actionButtonText}>Accept Booking</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={handleDeclineBooking}
                    disabled={processingAction}
                  >
                    {processingAction ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Icon name="close" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.actionButtonText}>Decline</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {booking.approved && (
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelBooking} disabled={processingAction}>
                  {processingAction ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Icon name="cancel" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.actionButtonText}>Cancel Booking</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 16,
    marginBottom: 24,
  },
  backToListButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backToListButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
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
  scrollView: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
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
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  infoSubvalue: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 2,
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6366F1",
    marginLeft: 4,
  },
  actionButtons: {
    marginBottom: 40,
  },
  actionButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
  },
  declineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
  },
  approveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
})

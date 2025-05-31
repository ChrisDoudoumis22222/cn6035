"use client"

import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react"
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Dimensions,
  RefreshControl,
  Modal,
  Pressable,
  Image,
} from "react-native"
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as ImagePicker from "expo-image-picker"
import { supabase } from "../utils/supabase"
import { makeSalt, sha256 } from "../utils/hash"
import type { RootStackParamList } from "../App"
import { v4 as uuid } from "uuid"

// Get screen dimensions for responsive sizing
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")

// Define theme colors
const COLORS = {
  primary: "#5A67D8",
  primaryLight: "#7886E2",
  primaryDark: "#4C56B8",
  success: "#48BB78",
  error: "#F56565",
  warning: "#ED8936",
  background: "#F7FAFC",
  card: "#FFFFFF",
  text: {
    primary: "#2D3748",
    secondary: "#4A5568",
    tertiary: "#718096",
    light: "#A0AEC0",
  },
  border: "#CBD5E0",
  shadow: "#000000",
  overlay: "rgba(0, 0, 0, 0.5)",
}

type MainRouteProp = RouteProp<RootStackParamList, "Main">
type Booking = {
  id: number
  booked_at: string
  restaurant_name?: string
  table_id?: number
  party_size?: number
  approved?: boolean
}

const PAGE_SIZE = 5 // Reduced page size for more efficient loading

// map DB columns → friendly labels
const LABEL: Record<string, string> = {
  email: "Email",
  created_at: "Joined",
  full_name: "Full name",
  phone: "Phone",
}

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
    "log-out": "🚪",
    user: "👤",
    settings: "⚙️",
    edit: "✏️",
    calendar: "📅",
    clock: "⏰",
    warning: "⚠️",
    close: "✕",
  }

  return (
    <Text style={[{ fontSize: size, color, fontWeight: "bold", textAlign: "center" }, style]}>
      {iconMap[name] || "•"}
    </Text>
  )
}

// Memoized booking item component
const BookingItem = memo(
  ({
    item,
    onPress,
  }: {
    item: Booking
    onPress?: (item: Booking) => void
  }) => {
    const date = new Date(item.booked_at)
    const formattedDate = date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })

    const formattedTime = date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })

    return (
      <TouchableOpacity style={styles.bookingCard} onPress={() => onPress?.(item)} activeOpacity={onPress ? 0.7 : 1}>
        <View style={styles.bookingHeader}>
          <Text style={styles.restaurantName}>{item.restaurant_name || "Restaurant"}</Text>
          <View style={styles.bookingBadge}>
            <Text style={styles.bookingBadgeText}>Confirmed</Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetail}>
            <Text style={styles.bookingDetailIcon}>📅</Text>
            <Text style={styles.bookingDetailText}>{formattedDate}</Text>
          </View>
          <View style={styles.bookingDetail}>
            <Text style={styles.bookingDetailIcon}>⏰</Text>
            <Text style={styles.bookingDetailText}>{formattedTime}</Text>
          </View>
          {item.table_id && (
            <View style={styles.bookingDetail}>
              <Text style={styles.bookingDetailIcon}>🪑</Text>
              <Text style={styles.bookingDetailText}>Table #{item.table_id}</Text>
            </View>
          )}
          {item.party_size && (
            <View style={styles.bookingDetail}>
              <Text style={styles.bookingDetailIcon}>👥</Text>
              <Text style={styles.bookingDetailText}>{item.party_size} guests</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  },
)

// Loading placeholder for bookings
const BookingPlaceholder = memo(() => (
  <View style={[styles.bookingCard, { opacity: 0.7 }]}>
    <View style={styles.bookingHeader}>
      <View style={[styles.placeholderText, { width: 150, height: 20 }]} />
      <View style={[styles.bookingBadge, { backgroundColor: COLORS.border }]}>
        <View style={[styles.placeholderText, { width: 60, height: 12 }]} />
      </View>
    </View>

    <View style={styles.bookingDetails}>
      <View style={styles.bookingDetail}>
        <Text style={styles.bookingDetailIcon}>📅</Text>
        <View style={[styles.placeholderText, { width: 120, height: 16 }]} />
      </View>
      <View style={styles.bookingDetail}>
        <Text style={styles.bookingDetailIcon}>⏰</Text>
        <View style={[styles.placeholderText, { width: 80, height: 16 }]} />
      </View>
    </View>
  </View>
))

// Password Change Modal Component
const PasswordChangeModal = memo(
  ({
    visible,
    onClose,
    userId,
  }: {
    visible: boolean
    onClose: () => void
    userId: string
  }) => {
    const [oldPwd, setOldPwd] = useState("")
    const [newPwd, setNewPwd] = useState("")
    const [confirmPwd, setConfirmPwd] = useState("")
    const [changingPwd, setChangingPwd] = useState(false)
    const insets = useSafeAreaInsets()

    // Reset form when modal closes
    useEffect(() => {
      if (!visible) {
        setOldPwd("")
        setNewPwd("")
        setConfirmPwd("")
        setChangingPwd(false)
      }
    }, [visible])

    const submitPwd = async () => {
      if (!oldPwd || !newPwd) {
        return Alert.alert("Error", "Please fill all password fields.")
      }
      if (newPwd !== confirmPwd) {
        return Alert.alert("Error", "New passwords do not match.")
      }
      setChangingPwd(true)

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("salt,password_hash")
          .eq("id", userId)
          .maybeSingle()

        if (error || !data) {
          throw new Error("Error verifying password.")
        }

        if ((await sha256(oldPwd + data.salt)) !== data.password_hash) {
          throw new Error("Current password incorrect.")
        }

        const s = await makeSalt(16)
        const h = await sha256(newPwd + s)

        const { error: upErr } = await supabase.from("profiles").update({ salt: s, password_hash: h }).eq("id", userId)

        if (upErr) {
          throw new Error(upErr.message)
        }

        Alert.alert("Success", "Your password has been updated successfully.")
        onClose()
      } catch (error) {
        Alert.alert("Error", error.message)
      } finally {
        setChangingPwd(false)
      }
    }

    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable
            style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Current password"
                secureTextEntry
                value={oldPwd}
                onChangeText={setOldPwd}
                placeholderTextColor={COLORS.text.light}
              />
              <TextInput
                style={styles.input}
                placeholder="New password"
                secureTextEntry
                value={newPwd}
                onChangeText={setNewPwd}
                placeholderTextColor={COLORS.text.light}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                secureTextEntry
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                placeholderTextColor={COLORS.text.light}
              />

              <TouchableOpacity
                style={[styles.submitButton, changingPwd && styles.submitButtonDisabled]}
                onPress={submitPwd}
                disabled={changingPwd}
                activeOpacity={0.7}
              >
                {changingPwd ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    )
  },
)

// Email Change Modal Component
const EmailChangeModal = memo(
  ({
    visible,
    onClose,
    userId,
    onEmailChanged,
  }: {
    visible: boolean
    onClose: () => void
    userId: string
    onEmailChanged: (newEmail: string) => void
  }) => {
    const [emailPwd, setEmailPwd] = useState("")
    const [newEmail, setNewEmail] = useState("")
    const [changingMail, setChangingMail] = useState(false)
    const insets = useSafeAreaInsets()
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // Reset form when modal closes
    useEffect(() => {
      if (!visible) {
        setEmailPwd("")
        setNewEmail("")
        setChangingMail(false)
      }
    }, [visible])

    const submitMail = async () => {
      if (!newEmail || !emailPwd) {
        return Alert.alert("Error", "Please fill all email fields.")
      }
      if (!emailRx.test(newEmail)) {
        return Alert.alert("Error", "Please enter a valid email address.")
      }
      setChangingMail(true)

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("salt,password_hash")
          .eq("id", userId)
          .maybeSingle()

        if (error || !data) {
          throw new Error("Error verifying password.")
        }

        if ((await sha256(emailPwd + data.salt)) !== data.password_hash) {
          throw new Error("Password incorrect.")
        }

        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("email", newEmail.toLowerCase())

        if (count && count > 0) {
          throw new Error("Email already in use by another account.")
        }

        const { error: eErr } = await supabase
          .from("profiles")
          .update({ email: newEmail.toLowerCase() })
          .eq("id", userId)

        if (eErr) {
          throw new Error(eErr.message)
        }

        onEmailChanged(newEmail)
        Alert.alert("Success", "Your email has been updated successfully.")
        onClose()
      } catch (error) {
        Alert.alert("Error", error.message)
      } finally {
        setChangingMail(false)
      }
    }

    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable
            style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Email</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="New email address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholderTextColor={COLORS.text.light}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter password to confirm"
                secureTextEntry
                value={emailPwd}
                onChangeText={setEmailPwd}
                placeholderTextColor={COLORS.text.light}
              />

              <TouchableOpacity
                style={[styles.submitButton, changingMail && styles.submitButtonDisabled]}
                onPress={submitMail}
                disabled={changingMail}
                activeOpacity={0.7}
              >
                {changingMail ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Update Email</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    )
  },
)

// Memoized settings section component
const SettingsSection = memo(
  ({
    onOpenPasswordModal,
    onOpenEmailModal,
  }: {
    onOpenPasswordModal: () => void
    onOpenEmailModal: () => void
  }) => (
    <View style={styles.settingsContainer}>
      <Text style={styles.sectionTitle}>Account Settings</Text>

      {/* Change Password Button */}
      <TouchableOpacity onPress={onOpenPasswordModal} activeOpacity={0.7} style={styles.settingCard}>
        <View style={styles.settingHeader}>
          <View style={styles.settingIconContainer}>
            <Text style={styles.settingIcon}>🔒</Text>
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Change Password</Text>
            <Text style={styles.settingDescription}>Update your account password</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </View>
      </TouchableOpacity>

      {/* Change Email Button */}
      <TouchableOpacity onPress={onOpenEmailModal} activeOpacity={0.7} style={styles.settingCard}>
        <View style={styles.settingHeader}>
          <View style={styles.settingIconContainer}>
            <Text style={styles.settingIcon}>✉️</Text>
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Change Email</Text>
            <Text style={styles.settingDescription}>Update your email address</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </View>
      </TouchableOpacity>
    </View>
  ),
)

export default function ProfileScreen() {
  const route = useRoute<MainRouteProp>()
  const { userId, email } = route.params
  const nav = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const flatListRef = useRef<FlatList>(null)

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  })

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [120, 80],
    extrapolate: "clamp",
  })

  // ── profile state
  const [profile, setProfile] = useState<Record<string, any> | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // ── bookings state (lazy)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [fetchingMore, setFetchingMore] = useState(false)
  const [allLoaded, setAllLoaded] = useState(false)

  // ── modal visibility state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [emailModalVisible, setEmailModalVisible] = useState(false)

  // ───────────────────────────────────────────────────────── fetch profile
  const fetchProfile = useCallback(
    async (showLoading = true) => {
      if (showLoading) setProfileLoading(true)

      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()

        if (error) {
          throw new Error(error.message)
        }

        setProfile(data)
      } catch (error) {
        Alert.alert("Profile error", error.message)
      } finally {
        setProfileLoading(false)
      }
    },
    [userId],
  )

  // ───────────────────────────────────────────────────────── avatar upload
  const changeAvatar = useCallback(async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      })

      if (res.canceled) return

      setUploadingAvatar(true)
      const img = res.assets[0]
      const ext = img.uri.split(".").pop() || "jpg"
      const name = `${uuid()}.${ext}`
      const blob = await fetch(img.uri).then((r) => r.blob())

      const { error: upErr } = await supabase.storage.from("avatars").upload(name, blob, { upsert: true })
      if (upErr) throw new Error(upErr.message)

      const { publicUrl } = supabase.storage.from("avatars").getPublicUrl(name).data
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId)
      if (dbErr) throw new Error(dbErr.message)

      setProfile((p) => (p ? { ...p, avatar_url: publicUrl } : p))
      Alert.alert("Success", "Profile photo updated successfully")
    } catch (error) {
      Alert.alert("Upload Error", error.message)
    } finally {
      setUploadingAvatar(false)
    }
  }, [userId])

  // ───────────────────────────────────────────────────────── bookings paging
  const fetchBookings = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setBookings([])
        setAllLoaded(false)
        setBookingsLoading(true)
      }

      if (fetchingMore || (allLoaded && !refresh)) return
      setFetchingMore(true)

      try {
        // Simplified query - only fetch columns that exist in bookings table
        const { data, error } = await supabase
          .from("bookings")
          .select("id, booked_at, table_id, owner_id, customer_name, party_size, approved")
          .eq("user_id", userId)
          .order("booked_at", { ascending: false })
          .range(refresh ? 0 : bookings.length, refresh ? PAGE_SIZE - 1 : bookings.length + PAGE_SIZE - 1)

        if (error) {
          throw new Error(error.message)
        }

        if (data && data.length > 0) {
          // For now, we'll use customer_name as the restaurant name
          // or a placeholder until we know the exact schema
          const enhancedData = data.map((booking) => ({
            id: booking.id,
            booked_at: booking.booked_at,
            table_id: booking.table_id,
            restaurant_name: booking.customer_name ? `Booking for ${booking.customer_name}` : "Restaurant Booking",
            party_size: booking.party_size,
            approved: booking.approved,
          }))

          setBookings((prev) => (refresh ? enhancedData : [...prev, ...enhancedData]))
          if (data.length < PAGE_SIZE) setAllLoaded(true)
        } else {
          setAllLoaded(true)
        }
      } catch (error) {
        console.error("Bookings fetch error:", error)
        // Don't show alert for database errors to avoid disrupting the user experience
        // Just log to console for debugging
      } finally {
        setFetchingMore(false)
        setBookingsLoading(false)
      }
    },
    [userId, bookings.length, fetchingMore, allLoaded],
  )

  // Initial data loading
  useEffect(() => {
    fetchProfile()
    // Load bookings immediately on mount
    fetchBookings()
  }, [fetchProfile, fetchBookings])

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([fetchProfile(false), fetchBookings(true)])
    setRefreshing(false)
  }, [fetchProfile, fetchBookings])

  // ───────────────────────────────────────────────────────── helpers
  const hideCols = new Set(["id", "salt", "password_hash", "avatar_url"])
  const profileRows = useMemo(() => {
    return profile ? Object.entries(profile).filter(([k]) => !hideCols.has(k)) : []
  }, [profile])

  // Handle logout function
  const handleLogout = useCallback(() => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => nav.replace("Login"), style: "destructive" },
    ])
  }, [nav])

  // Handle email change from modal
  const handleEmailChanged = useCallback((newEmail: string) => {
    setProfile((p) => (p ? { ...p, email: newEmail } : p))
  }, [])

  // Render the profile section
  const renderProfile = useCallback(() => {
    if (profileLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      )
    }

    if (!profile) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load profile</Text>
          <Text style={styles.errorText}>Please try again later</Text>
        </View>
      )
    }

    return (
      <View style={styles.profileCard}>
        {/* Avatar with upload functionality */}
        <TouchableOpacity
          onPress={changeAvatar}
          disabled={uploadingAvatar}
          style={styles.avatarContainer}
          activeOpacity={0.8}
        >
          {uploadingAvatar ? (
            <View style={[styles.avatar, styles.avatarLoading]}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>
                {(profile.full_name || profile.email || "User").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>✏️</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.full_name || "User"}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
        </View>

        <View style={styles.profileDetails}>
          {profileRows.map(
            ([k, v]) =>
              k !== "email" &&
              k !== "full_name" && (
                <View key={k} style={styles.profileRow}>
                  <Text style={styles.profileLabel}>{LABEL[k] || k}</Text>
                  <Text style={styles.profileValue}>
                    {k === "created_at"
                      ? new Date(v).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : String(v)}
                  </Text>
                </View>
              ),
          )}
        </View>

        <Text style={styles.hint}>Tap avatar to change your profile photo</Text>
      </View>
    )
  }, [profile, profileLoading, profileRows, uploadingAvatar, changeAvatar])

  // Render the bookings section
  const renderBookings = useCallback(
    () => (
      <View style={styles.bookingsContainer}>
        <Text style={styles.sectionTitle}>My Bookings</Text>

        {bookingsLoading && bookings.length === 0 ? (
          // Show placeholders while loading initial bookings
          <>
            <BookingPlaceholder />
            <BookingPlaceholder />
            <BookingPlaceholder />
          </>
        ) : bookings.length === 0 && !fetchingMore ? (
          <View style={styles.emptyBookings}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>Your restaurant reservations will appear here</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={bookings}
            renderItem={({ item }) => (
              <BookingItem
                item={item}
                onPress={(booking) => {
                  // Handle booking press with more details
                  Alert.alert(
                    "Booking Details",
                    `${booking.restaurant_name}\nDate: ${new Date(booking.booked_at).toLocaleDateString()}\nTime: ${new Date(booking.booked_at).toLocaleTimeString()}\n${booking.table_id ? `Table: #${booking.table_id}` : ""}${booking.party_size ? `\nParty size: ${booking.party_size} guests` : ""}${booking.approved !== undefined ? `\nStatus: ${booking.approved ? "Approved" : "Pending"}` : ""}`,
                    [{ text: "OK" }],
                  )
                }}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            onEndReached={() => !fetchingMore && !allLoaded && fetchBookings()}
            onEndReachedThreshold={0.5}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews={true}
            ListFooterComponent={
              fetchingMore ? (
                // Show placeholders while loading more
                <>
                  <BookingPlaceholder />
                  <BookingPlaceholder />
                </>
              ) : null
            }
            showsVerticalScrollIndicator={false}
            scrollEnabled={false} // Disable scrolling as parent ScrollView handles it
          />
        )}

        {!allLoaded && bookings.length > 0 && !fetchingMore && (
          <TouchableOpacity style={styles.loadMoreButton} onPress={() => fetchBookings()} activeOpacity={0.7}>
            <Text style={styles.loadMoreText}>Load More Bookings</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [bookings, bookingsLoading, fetchingMore, allLoaded, fetchBookings],
  )

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              height: headerHeight,
              paddingTop: Math.max(insets.top, 10),
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              {/* Empty view for layout balance */}
              <View style={{ width: 40 }} />
            </View>

            <Text style={styles.headerTitle}>My Profile</Text>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="log-out" size={20} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Profile section - always render */}
          {renderProfile()}

          {/* Settings section - always render now */}
          <SettingsSection
            onOpenPasswordModal={() => setPasswordModalVisible(true)}
            onOpenEmailModal={() => setEmailModalVisible(true)}
          />

          {/* Bookings section - always render now */}
          {renderBookings()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      <PasswordChangeModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        userId={userId}
      />

      <EmailChangeModal
        visible={emailModalVisible}
        onClose={() => setEmailModalVisible(false)}
        userId={userId}
        onEmailChanged={handleEmailChanged}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    justifyContent: "flex-end",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  headerContent: {
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text.primary,
    textAlign: "center",
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Profile styles
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: "bold",
    color: COLORS.card,
  },
  avatarLoading: {
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.card,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  editBadgeText: {
    fontSize: 16,
  },
  profileInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  profileDetails: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  profileRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "center",
  },
  profileLabel: {
    width: 100,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text.secondary,
  },
  profileValue: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  hint: {
    textAlign: "center",
    color: COLORS.text.tertiary,
    marginTop: 16,
    fontSize: 14,
  },
  // Settings styles
  settingsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  settingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  settingArrow: {
    fontSize: 18,
    color: COLORS.text.light,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text.primary,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  modalBody: {
    paddingBottom: 20,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.text.light,
  },
  submitButtonText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: "bold",
  },
  // Bookings styles
  bookingsContainer: {
    marginBottom: 24,
  },
  bookingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    padding: 16,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text.primary,
  },
  bookingBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bookingBadgeText: {
    color: COLORS.card,
    fontSize: 12,
    fontWeight: "600",
  },
  bookingDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  bookingDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  bookingDetailIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  bookingDetailText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  emptyBookings: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: "center",
  },
  loadMoreButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  loadMoreText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  // Loading and error states
  loadingContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: "center",
  },
  // Placeholder styles
  placeholderText: {
    backgroundColor: COLORS.border,
    borderRadius: 4,
    opacity: 0.3,
  },
})

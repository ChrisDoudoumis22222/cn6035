"use client"

import { useEffect, useState, useCallback, useRef, memo } from "react"
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  ScrollView,
  Dimensions,
  RefreshControl,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { supabase } from "../utils/supabase"
import type { RootStackParamList } from "../App"
import { v4 as uuid } from "uuid"

// Get screen dimensions for responsive sizing
const { width: SCREEN_WIDTH } = Dimensions.get("window")

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
}

/* ───────── Types ───────── */
type AdminProfileRouteProp = RouteProp<RootStackParamList, "AdminProfile">
type AdminRow = {
  email: string
  full_name: string | null
  created_at: string
  avatar_url: string | null
}

// Memoized row component for admin details
const Row = memo(({ label, value }: { label: string; value: string }) => (
  <View style={styles.profileRow}>
    <Text style={styles.profileLabel}>{label}</Text>
    <Text style={styles.profileValue}>{value}</Text>
  </View>
))

export default function AdminUserProfileScreen() {
  const route = useRoute<AdminProfileRouteProp>()
  const { userId } = route.params
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()

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

  // State
  const [admin, setAdmin] = useState<AdminRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  /* ─ fetch admin data ─ */
  const fetchAdminData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true)

      try {
        const { data, error } = await supabase
          .from<AdminRow>("admins")
          .select("email, full_name, created_at, avatar_url")
          .eq("id", userId)
          .maybeSingle()

        if (error || !data) {
          throw new Error(error?.message ?? "Admin not found")
        }

        setAdmin(data)
      } catch (error) {
        Alert.alert("Error", error.message)
      } finally {
        setLoading(false)
      }
    },
    [userId],
  )

  useEffect(() => {
    fetchAdminData()
  }, [fetchAdminData])

  /* ─ avatar upload logic ─ */
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
      const { error: dbErr } = await supabase.from("admins").update({ avatar_url: publicUrl }).eq("id", userId)
      if (dbErr) throw new Error(dbErr.message)

      setAdmin((a) => (a ? { ...a, avatar_url: publicUrl } : a))
      Alert.alert("Success", "Profile photo updated successfully")
    } catch (error) {
      Alert.alert("Upload Error", error.message)
    } finally {
      setUploadingAvatar(false)
    }
  }, [userId])

  /* ─ improved logout handler ─ */
  const handleLogout = useCallback(async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true)
          try {
            // Sign out from Supabase auth
            const { error } = await supabase.auth.signOut()
            if (error) {
              throw new Error(error.message)
            }

            // Optional: Clear any local storage or async storage
            // await AsyncStorage.clear()

            // Navigate to login screen and reset navigation stack
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            })

            Alert.alert("Success", "You have been logged out successfully")
          } catch (err: any) {
            console.error("Logout error:", err)
            Alert.alert("Logout Error", err.message ?? "An error occurred during logout")
          } finally {
            setLoggingOut(false)
          }
        },
      },
    ])
  }, [navigation])

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchAdminData(false)
    setRefreshing(false)
  }, [fetchAdminData])

  /* ─ render admin profile ─ */
  const renderAdminProfile = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading admin profile...</Text>
        </View>
      )
    }

    if (!admin) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load admin profile</Text>
          <Text style={styles.errorText}>Please try again later</Text>
        </View>
      )
    }

    return (
      <View style={styles.profileCard}>
        {/* Avatar */}
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
          ) : admin.avatar_url ? (
            <Image source={{ uri: admin.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>
                {(admin.full_name || admin.email || "Admin").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>✏️</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{admin.full_name || "Admin"}</Text>
          <Text style={styles.profileEmail}>{admin.email}</Text>
          <Text style={styles.profileRole}>Administrator</Text>
        </View>

        <View style={styles.profileDetails}>
          <Row label="Full name:" value={admin.full_name ?? "—"} />
          <Row label="Email:" value={admin.email} />
          <Row
            label="Joined:"
            value={new Date(admin.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        </View>

        <Text style={styles.hint}>Tap avatar to change your profile photo</Text>
      </View>
    )
  }, [admin, loading, uploadingAvatar, changeAvatar])

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
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
          <Text style={styles.headerTitle}>Admin Profile</Text>
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
        {/* Admin Profile Section */}
        {renderAdminProfile()}

        {/* Logout Button - Now more prominent */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loggingOut} activeOpacity={0.7}>
          {loggingOut ? (
            <ActivityIndicator color={COLORS.card} size="small" />
          ) : (
            <>
              <Text style={styles.logoutEmoji}>🚪</Text>
              <Text style={styles.logoutText}>Log Out</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

/* styles */
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
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text.primary,
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
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    backgroundColor: COLORS.primaryLight + "20", // 20% opacity
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
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
  // Logout button - Updated styling to be more prominent
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 16,
  },
  logoutEmoji: {
    fontSize: 16,
    marginRight: 8,
    color: COLORS.card,
  },
  logoutText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: "600",
  },
})
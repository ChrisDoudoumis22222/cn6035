"use client"

import { useEffect, useState, useCallback } from "react"
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  StatusBar,
  Image,
  Animated,
  FlatList,
} from "react-native"
import { useIsFocused, useNavigation } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { supabase } from "../utils/supabase"
import type { RootStackParamList } from "../App"
import type { StackNavigationProp } from "@react-navigation/stack"

type Nav = StackNavigationProp<RootStackParamList>
type Store = { id: string; name: string; city: string | null; address: string | null }

// Get screen dimensions for responsive sizing
const { width: SCREEN_WIDTH } = Dimensions.get("window")

// Define theme colors - Modern palette
const COLORS = {
  primary: "#6366F1", // Indigo
  primaryDark: "#4F46E5",
  primaryLight: "#EEF2FF",
  secondary: "#EC4899", // Pink
  secondaryLight: "#FCE7F3",
  background: "#F9FAFB",
  surface: "#FFFFFF",
  surfaceVariant: "#F3F4F6",
  text: {
    primary: "#111827",
    secondary: "#4B5563",
    tertiary: "#6B7280",
    quaternary: "#9CA3AF",
  },
  border: "#E5E7EB",
  divider: "#F3F4F6",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
}

// Simple Icon component to replace MaterialCommunityIcons
const Icon = ({
  name,
  size = 24,
  color = "#000",
  style = {},
}: { name: string; size?: number; color?: string; style?: any }) => {
  // Map of icon names to text representations
  const iconMap: Record<string, string> = {
    "dots-vertical": "⋮",
    "map-marker": "📍",
    "office-building": "🏢",
    pencil: "✏️",
    delete: "🗑️",
    plus: "+",
  }

  return (
    <Text style={[{ fontSize: size, color, fontWeight: "bold", textAlign: "center" }, style]}>
      {iconMap[name] || "•"}
    </Text>
  )
}

// Create an animated FlatList component
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

export default function AdminStoresScreen() {
  const nav = useNavigation<Nav>()
  const focused = useIsFocused()
  const insets = useSafeAreaInsets()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Animation values
  const scrollY = new Animated.Value(0)
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  })

  const headerElevation = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 3],
    extrapolate: "clamp",
  })

  // Load stores when screen is focused
  useEffect(() => {
    if (focused) loadStores()
  }, [focused])

  // Load stores function
  const loadStores = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from<Store>("stores").select("*").order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setStores(data ?? [])
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to load stores")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    loadStores()
  }, [loadStores])

  // Delete store function
  const removeStore = useCallback(
    (store: Store) => {
      Alert.alert("Delete Store", `Are you sure you want to remove "${store.name}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from("stores").delete().eq("id", store.id)
              if (error) {
                throw error
              }
              loadStores()
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to delete store")
            }
          },
        },
      ])
    },
    [loadStores],
  )

  // Generate a color based on store name
  const getStoreColor = (name: string) => {
    const colors = [
      "#6366F1", // Indigo
      "#8B5CF6", // Violet
      "#EC4899", // Pink
      "#F43F5E", // Rose
      "#10B981", // Emerald
      "#3B82F6", // Blue
      "#F59E0B", // Amber
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  // Get store initials
  const getStoreInitials = (name: string) => {
    if (!name) return "S"
    const words = name.split(" ")
    if (words.length === 1) return name.substring(0, 2).toUpperCase()
    return (words[0][0] + words[1][0]).toUpperCase()
  }

  // Store card component
  const StoreCard = useCallback(
    ({ item, index }: { item: Store; index: number }) => {
      const storeColor = getStoreColor(item.name)
      const storeInitials = getStoreInitials(item.name)

      return (
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                {
                  scale: scrollY.interpolate({
                    inputRange: [-50, 0, 100 * index, 100 * (index + 1)],
                    outputRange: [1, 1, 1, 0.97],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.cardTouchable}
            activeOpacity={0.7}
            onPress={() => nav.navigate("StoreForm", { id: item.id })}
          >
            <View style={[styles.storeAvatar, { backgroundColor: storeColor }]}>
              <Text style={styles.storeInitials}>{storeInitials}</Text>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.storeName}>{item.name}</Text>
                <TouchableOpacity style={styles.menuButton} onPress={() => removeStore(item)}>
                  <Icon name="dots-vertical" size={22} color={COLORS.text.tertiary} />
                </TouchableOpacity>
              </View>

              <View style={styles.storeDetails}>
                {item.city && (
                  <View style={styles.detailItem}>
                    <Icon name="map-marker" size={18} color={COLORS.primary} style={styles.detailIcon} />
                    <Text style={styles.storeDetail}>{item.city}</Text>
                  </View>
                )}
                {item.address && (
                  <View style={styles.detailItem}>
                    <Icon name="office-building" size={18} color={COLORS.primary} style={styles.detailIcon} />
                    <Text style={styles.storeDetail}>{item.address}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => nav.navigate("StoreForm", { id: item.id })}
                >
                  <Icon name="pencil" size={16} color={COLORS.primary} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => removeStore(item)}>
                  <Icon name="delete" size={16} color={COLORS.secondary} />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )
    },
    [nav, removeStore, scrollY],
  )

  // Empty component
  const EmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyImageContainer}>
          <Image
            source={{ uri: "https://picsum.photos/id/1025/300/300" }}
            style={styles.emptyImage}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.emptyTitle}>No Stores Yet</Text>
        <Text style={styles.emptyText}>Create your first store to get started</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => nav.navigate("StoreForm", {})}>
          <Icon name="plus" size={20} color={COLORS.surface} style={styles.emptyButtonIcon} />
          <Text style={styles.emptyButtonText}>Create Store</Text>
        </TouchableOpacity>
      </View>
    ),
    [nav],
  )

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Animated Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            elevation: headerElevation,
            shadowOpacity: headerElevation.interpolate({
              inputRange: [0, 3],
              outputRange: [0, 0.1],
            }),
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Stores</Text>
            {stores.length > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{stores.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => nav.navigate("StoreForm", {})}>
            <Icon name="plus" size={18} color={COLORS.surface} />
            <Text style={styles.addButtonText}>New</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading stores...</Text>
        </View>
      ) : (
        <AnimatedFlatList
          data={stores}
          renderItem={StoreCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            stores.length === 0 && styles.emptyListContent,
            { paddingBottom: Math.max(insets.bottom + 20, 40) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={EmptyComponent}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
        />
      )}
    </View>
  )
}

/* ── styles ── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: COLORS.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 10,
  },
  headerBadgeText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  addButtonText: {
    color: COLORS.surface,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  cardTouchable: {
    flexDirection: "row",
    padding: 16,
  },
  storeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  storeInitials: {
    color: COLORS.surface,
    fontSize: 20,
    fontWeight: "700",
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  storeName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text.primary,
    flex: 1,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  storeDetails: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailIcon: {
    marginRight: 8,
  },
  storeDetail: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.primary,
    marginLeft: 4,
  },
  deleteButton: {
    backgroundColor: COLORS.secondaryLight,
  },
  deleteButtonText: {
    color: COLORS.secondary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyImageContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: "center",
    marginBottom: 32,
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  emptyButtonIcon: {
    marginRight: 8,
  },
  emptyButtonText: {
    color: COLORS.surface,
    fontWeight: "600",
    fontSize: 16,
  },
})

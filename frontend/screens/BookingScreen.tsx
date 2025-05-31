"use client"

import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Dimensions,
  TextInput,
  Animated,
  Platform,
  RefreshControl,
} from "react-native"
import type { StackScreenProps } from "@react-navigation/stack"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { __DEV__ } from "react-native"
import StoreCard from "../components/StoreCard"

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

type RootStackParamList = {
  Login: undefined
  SignUp: undefined
  Booking: { userId: string; email: string }
  StoreDetail: { storeId: string; userId: string }
  StoreForm: { id?: string }
}

type Props = StackScreenProps<RootStackParamList, "Booking">

type Store = {
  id: string
  name: string
  city: string | null
  address: string | null
  menu_pdf_url?: string | null
  image_url?: string | null
  category?: string | null
  // Added fields for UI display
  cuisine?: string
  rating?: number
  priceRange?: string
}

// Mock data for when API calls fail
const MOCK_STORES: Store[] = [
  {
    id: "store-1",
    name: "Coffee House",
    city: "New York",
    address: "123 Main St",
    rating: 4.7,
    priceRange: "$$",
    image_url: "https://picsum.photos/seed/store1/500/300",
    category: "Cafe",
  },
  {
    id: "store-2",
    name: "Bakery Delight",
    city: "Chicago",
    address: "456 Oak Ave",
    rating: 4.3,
    priceRange: "$",
    image_url: "https://picsum.photos/seed/store2/500/300",
    category: "Bakery",
  },
  {
    id: "store-3",
    name: "Pizza Palace",
    city: "Los Angeles",
    address: "789 Pine Rd",
    rating: 4.5,
    priceRange: "$$",
    image_url: "https://picsum.photos/seed/store3/500/300",
    category: "Restaurant",
  },
  {
    id: "store-4",
    name: "Sushi Express",
    city: "San Francisco",
    address: "101 Elm St",
    rating: 4.8,
    priceRange: "$$$",
    image_url: "https://picsum.photos/seed/store4/500/300",
    category: "Restaurant",
  },
  {
    id: "store-5",
    name: "Burger Joint",
    city: "New York",
    address: "202 Maple Dr",
    rating: 4.2,
    priceRange: "$",
    image_url: "https://picsum.photos/seed/store5/500/300",
    category: "Fast Food",
  },
]

// Direct API fetch without auth
const fetchStoresDirectly = async () => {
  try {
    // Use a direct fetch to the API endpoint without auth headers
    const response = await fetch("http://10.0.2.2:3000/stores-public", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching stores directly:", error)
    throw error
  }
}

// Memoized filter button component
const FilterButton = memo(
  ({
    filter,
    isActive,
    onPress,
  }: {
    filter: string
    isActive: boolean
    onPress: () => void
  }) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive ? styles.filterButtonActive : styles.filterButtonInactive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterText, isActive ? styles.filterTextActive : styles.filterTextInactive]}>{filter}</Text>
    </TouchableOpacity>
  ),
)

// Empty list component
const EmptyListComponent = memo(() => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>🔍</Text>
    <Text style={styles.emptyTitle}>No stores found</Text>
    <Text style={styles.emptyText}>Try adjusting your search or filters to find what you're looking for.</Text>
  </View>
))

export default function BookingScreen({ route, navigation }: Props) {
  const { userId, email } = route.params
  const [stores, setStores] = useState<Store[]>([])
  const [filteredStores, setFilteredStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("All")
  const [refreshing, setRefreshing] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [usingMockData, setUsingMockData] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // For lazy loading
  const [visibleItems, setVisibleItems] = useState<Record<string, boolean>>({})
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

  // Get safe area insets
  const insets = useSafeAreaInsets()

  // In development mode, assume admin
  useEffect(() => {
    if (__DEV__) {
      setIsAdmin(true)
      console.log("DEV MODE: Admin privileges enabled")
    } else {
      // In production, we would check auth status here
      setIsAdmin(false)
    }
  }, [])

  // Try to fetch real store data directly without auth
  const fetchRealStores = useCallback(async () => {
    try {
      // Try to directly import the store data from a local file
      try {
        // First try: Direct API call to a public endpoint
        const storeData = await fetchStoresDirectly()
        console.log("Successfully fetched store data directly:", storeData.length, "stores")

        // Add UI display properties if they don't exist
        const enhancedStores = storeData.map((store: Store) => ({
          ...store,
          // Generate random rating between 3.5 and 5.0 if not provided
          rating: store.rating || 3.5 + Math.random() * 1.5,
          // Generate random price range if not provided
          priceRange: store.priceRange || ["$", "$$", "$$$"][Math.floor(Math.random() * 3)],
        }))

        setStores(enhancedStores)
        setUsingMockData(false)
        setFetchError(null)

        // Initialize visible items for first few stores
        const initialVisibleItems: Record<string, boolean> = {}
        enhancedStores.slice(0, 4).forEach((store) => {
          initialVisibleItems[store.id] = true
        })
        setVisibleItems(initialVisibleItems)

        return true
      } catch (directError) {
        console.error("Error fetching stores directly:", directError)

        // Second try: Try to access the database directly
        try {
          // Try to dynamically import the database module
          const dbModule = await import("../utils/supabase").catch(() => null)

          if (dbModule && dbModule.supabase) {
            const { data, error } = await dbModule.supabase.from("stores").select("*")

            if (error) {
              throw new Error(`Supabase error: ${error.message}`)
            }

            if (data && data.length > 0) {
              console.log("Successfully fetched store data from Supabase:", data.length, "stores")

              // Add UI display properties if they don't exist
              const enhancedStores = data.map((store: Store) => ({
                ...store,
                // Generate random rating between 3.5 and 5.0 if not provided
                rating: store.rating || 3.5 + Math.random() * 1.5,
                // Generate random price range if not provided
                priceRange: store.priceRange || ["$", "$$", "$$$"][Math.floor(Math.random() * 3)],
              }))

              setStores(enhancedStores)
              setUsingMockData(false)
              setFetchError(null)

              // Initialize visible items for first few stores
              const initialVisibleItems: Record<string, boolean> = {}
              enhancedStores.slice(0, 4).forEach((store) => {
                initialVisibleItems[store.id] = true
              })
              setVisibleItems(initialVisibleItems)

              return true
            }
          }

          throw new Error("No data returned from Supabase")
        } catch (dbError) {
          console.error("Error accessing database directly:", dbError)
          throw dbError
        }
      }
    } catch (error) {
      console.error("All attempts to fetch real store data failed:", error)
      setFetchError(error instanceof Error ? error.message : String(error))
      return false
    }
  }, [])

  // Fetch stores data - using useCallback to prevent recreation on each render
  const fetchStores = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setIsLoading(true)
      }

      try {
        // Try to fetch real store data first
        const success = await fetchRealStores()

        if (!success) {
          // If real data fetch fails, fall back to mock data
          console.log("Falling back to mock store data")
          setStores(MOCK_STORES)
          setUsingMockData(true)

          // Initialize visible items for mock stores
          const initialVisibleItems: Record<string, boolean> = {}
          MOCK_STORES.slice(0, 4).forEach((store) => {
            initialVisibleItems[store.id] = true
          })
          setVisibleItems(initialVisibleItems)
        }
      } catch (error) {
        console.error("Error in fetchStores:", error)
        // Fall back to mock data
        setStores(MOCK_STORES)
        setUsingMockData(true)

        // Initialize visible items for mock stores
        const initialVisibleItems: Record<string, boolean> = {}
        MOCK_STORES.slice(0, 4).forEach((store) => {
          initialVisibleItems[store.id] = true
        })
        setVisibleItems(initialVisibleItems)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchRealStores],
  )

  // Helper function to use mock data
  const useMockData = useCallback(() => {
    console.log("Using mock store data")
    setStores(MOCK_STORES)
    setUsingMockData(true)
    setFetchError(null)

    // Initialize visible items for mock stores
    const initialVisibleItems: Record<string, boolean> = {}
    MOCK_STORES.slice(0, 4).forEach((store) => {
      initialVisibleItems[store.id] = true
    })
    setVisibleItems(initialVisibleItems)
  }, [])

  // Initial data loading
  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  // Get unique categories for filter - memoized to prevent recreating on each render
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>(["All"])
    stores.forEach((store) => {
      if (store.category) {
        uniqueCategories.add(store.category)
      } else if (store.city) {
        // Fallback to city if category is not available
        uniqueCategories.add(store.city)
      }
    })
    return Array.from(uniqueCategories)
  }, [stores])

  // Filter stores based on search query and category filter
  useEffect(() => {
    let results = stores

    // Apply search filter
    if (searchQuery) {
      results = results.filter(
        (store) =>
          store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (store.city && store.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (store.address && store.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (store.category && store.category.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Apply category filter
    if (activeFilter !== "All") {
      results = results.filter(
        (store) =>
          store.category === activeFilter ||
          // Fallback to city if category is not available
          (store.city === activeFilter && !store.category),
      )
    }

    setFilteredStores(results)

    // Reset visible items when filters change
    if (results.length > 0) {
      const newVisibleItems: Record<string, boolean> = {}
      results.slice(0, 4).forEach((store) => {
        newVisibleItems[store.id] = true
      })
      setVisibleItems(newVisibleItems)
    }
  }, [searchQuery, activeFilter, stores])

  // Handle store press - navigate to store detail
  const handleStorePress = useCallback(
    (store: Store) => {
      navigation.navigate("StoreDetail", {
        storeId: store.id,
        userId: userId,
      })
    },
    [navigation, userId],
  )

  // Handle logout - memoized with useCallback
  const handleLogout = useCallback(() => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => navigation.replace("Login"), style: "destructive" },
    ])
  }, [navigation])

  // Handle image error - memoized with useCallback
  const handleImageError = useCallback((id: string) => {
    setImageLoadErrors((prev) => ({ ...prev, [id]: true }))
  }, [])

  // Handle filter press - memoized with useCallback
  const handleFilterPress = useCallback((filter: string) => {
    setActiveFilter(filter)
  }, [])

  // Handle refresh - memoized with useCallback
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchStores(false)
    setRefreshing(false)
  }, [fetchStores])

  // Handle visible items change - defined ONCE outside of render
  const handleViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    const newVisibleItems: Record<string, boolean> = {}

    viewableItems.forEach((viewableItem) => {
      if (viewableItem.item && viewableItem.item.id) {
        newVisibleItems[viewableItem.item.id] = true
      }
    })

    // Mark the next few items as visible for smoother scrolling
    setVisibleItems((prev) => ({
      ...prev,
      ...newVisibleItems,
    }))
  }).current

  // Viewability config for FlatList
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 20,
    minimumViewTime: 300,
  }).current

  // Handle add store button press
  const handleAddStore = useCallback(() => {
    // Navigate to store form screen
    navigation.navigate("StoreForm", { id: undefined })
  }, [navigation])

  // Toggle between mock and real data
  const toggleDataSource = useCallback(() => {
    if (usingMockData) {
      // Try to fetch real data
      setIsLoading(true)
      fetchRealStores()
        .then((success) => {
          if (!success) {
            Alert.alert("Error", "Could not fetch real data. Using mock data instead.")
          } else {
            Alert.alert("Success", "Now using real store data")
          }
        })
        .catch((error) => {
          Alert.alert("Error", "Failed to fetch real data: " + error.message)
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      // Switch to mock data
      setUsingMockData(true)
      setStores(MOCK_STORES)
      Alert.alert("Success", "Now using mock store data")
    }
  }, [usingMockData, fetchRealStores])

  // Render filter item - memoized with useCallback
  const renderFilterItem = useCallback(
    (filter: string) => {
      const isActive = activeFilter === filter
      return <FilterButton key={filter} filter={filter} isActive={isActive} onPress={() => handleFilterPress(filter)} />
    },
    [activeFilter, handleFilterPress],
  )

  // Render store item - memoized with useCallback
  const renderStoreItem = useCallback(
    ({ item, index }: { item: Store; index: number }) => {
      return (
        <StoreCard
          item={item}
          index={index}
          onPress={handleStorePress}
          onImageError={handleImageError}
          isVisible={!!visibleItems[item.id]}
          imageLoadErrors={imageLoadErrors}
        />
      )
    },
    [handleStorePress, handleImageError, visibleItems, imageLoadErrors],
  )

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
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <View style={styles.emailContainer}>
            <Text style={styles.emailText} numberOfLines={1} ellipsizeMode="tail">
              {email} {isAdmin ? "(Admin)" : ""}
            </Text>
            {__DEV__ && (
              <TouchableOpacity style={styles.devModeButton} onPress={toggleDataSource}>
                <Text style={styles.devModeButtonText}>{usingMockData ? "🔄 Try Real Data" : "📋 Use Mock Data"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      <View style={styles.container}>
        <View style={styles.subheaderContainer}>
          <Text style={styles.subheaderText}>Find your favorite store</Text>

          {isAdmin && (
            <TouchableOpacity style={styles.addButton} onPress={handleAddStore}>
              <Text style={styles.addButtonText}>+ Add Store</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchContainer}>
          <Text style={styles.searchEmoji}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search stores..."
            placeholderTextColor={COLORS.text.light}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery("")}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {categories.map(renderFilterItem)}
          </ScrollView>
        </View>

        {usingMockData && (
          <View style={styles.mockDataBanner}>
            <Text style={styles.mockDataText}>Using Mock Data</Text>
          </View>
        )}

        {fetchError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>Error: {fetchError}</Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Discovering stores...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredStores}
            renderItem={renderStoreItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.storeList, { paddingBottom: insets.bottom + 100 }]}
            ListEmptyComponent={EmptyListComponent}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            scrollEventThrottle={16}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={7}
            removeClippedSubviews={Platform.OS === "android"}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          />
        )}
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { bottom: insets.bottom + 16 }]}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutEmoji}>🚪</Text>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
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
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: "500",
  },
  emailText: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text.primary,
  },
  subheaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  subheaderText: {
    fontSize: 16,
    color: COLORS.text.tertiary,
    flex: 1,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.card,
    fontWeight: "600",
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchEmoji: {
    fontSize: 16,
    marginRight: 8,
    color: COLORS.text.light,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    padding: 0,
  },
  searchPlaceholder: {
    color: COLORS.text.light,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: COLORS.text.light,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScrollContent: {
    paddingRight: 16,
  },
  filterButton: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonInactive: {
    backgroundColor: "transparent",
    borderColor: COLORS.border,
  },
  filterText: {
    fontWeight: "500",
  },
  filterTextActive: {
    color: COLORS.card,
  },
  filterTextInactive: {
    color: COLORS.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  storeList: {
    paddingTop: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  logoutEmoji: {
    fontSize: 16,
    marginRight: 8,
    color: COLORS.error,
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
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
    lineHeight: 20,
  },
  devModeButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  devModeButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  mockDataBanner: {
    backgroundColor: COLORS.warning,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  mockDataText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  errorBanner: {
    backgroundColor: COLORS.error,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
})

import { memo } from "react"
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, Share } from "react-native"

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

// Star rating component that always shows 5 stars
const StarRating = memo(({ rating }: { rating: number }) => {
  // Ensure rating is between 0 and 5
  const safeRating = Math.min(5, Math.max(0, rating || 0))

  // Create an array of 5 stars
  return (
    <View style={styles.ratingContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text key={star} style={[styles.starIcon, { color: star <= safeRating ? "#F59E0B" : "#E5E7EB" }]}>
          ★
        </Text>
      ))}
      <Text style={styles.ratingText}>{safeRating.toFixed(1)}</Text>
    </View>
  )
})

const StoreCard = memo(
  ({
    item,
    index,
    onPress,
    onImageError,
    isVisible = true,
    imageLoadErrors,
  }: {
    item: any
    index: number
    onPress: (item: any) => void
    onImageError: (id: string) => void
    isVisible?: boolean
    imageLoadErrors: Record<string, boolean>
  }) => {
    // If not visible yet, render a placeholder
    if (!isVisible) {
      return <View style={[styles.card, styles.cardPlaceholder]} />
    }

    const hasImageError = imageLoadErrors[item.id]

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(item)}
        activeOpacity={0.9}
        testID={`store-card-${index}`}
      >
        <View style={styles.imageContainer}>
          {hasImageError ? (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>🏪</Text>
            </View>
          ) : (
            <Image
              source={{ uri: item.image_url || `https://picsum.photos/seed/${item.id}/500/300` }}
              style={styles.image}
              onError={() => onImageError(item.id)}
            />
          )}
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.locationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.location} numberOfLines={1}>
              {item.address || ""} {item.city ? `${item.address ? "," : ""} ${item.city}` : ""}
            </Text>
          </View>

          <View style={styles.detailsRow}>
            <StarRating rating={item.rating || 0} />
            <TouchableOpacity
              style={styles.shareButton}
              onPress={(e) => {
                e.stopPropagation()
                if (item.id) {
                  Share.share({
                    title: item.name,
                    message: `Check out ${item.name}${item.city ? ` in ${item.city}` : ""}!`,
                  })
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.shareIcon}>📤</Text>
            </TouchableOpacity>
            {/* Price range removed */}
          </View>
        </View>
      </TouchableOpacity>
    )
  },
)

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    width: "100%",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPlaceholder: {
    height: 280,
    backgroundColor: "#F3F4F6",
  },
  imageContainer: {
    height: 160,
    width: "100%",
    position: "relative",
  },
  image: {
    height: "100%",
    width: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    height: "100%",
    width: "100%",
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    fontSize: 40,
  },
  categoryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  location: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  starIcon: {
    fontSize: 16,
    marginRight: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  shareButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
  },
  shareIcon: {
    fontSize: 14,
  },
})

export default StoreCard

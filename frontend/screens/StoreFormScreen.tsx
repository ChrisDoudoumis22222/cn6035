"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Image,
  SafeAreaView,
  Linking,
  FlatList,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { useNavigation, useRoute } from "@react-navigation/native"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system"
import * as DocumentPicker from "expo-document-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || "your-supabase-url",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "your-supabase-anon-key",
)

// Import the file validator functions
import {
  validateFile,
  getFileValidationErrorMessage,
  IMAGE_VALIDATION_OPTIONS,
  MENU_FILE_VALIDATION_OPTIONS,
} from "../utils/file-validator"

// Import only the API functions we need, without auth
import {
  getStore,
  updateStore,
  createStore,
  deleteStore,
  getTables,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  uploadMenuFile,
  deleteMenuFile,
  uploadStoreImage,
  deleteStoreImage,
} from "../utils/auth"
import { getBookings, deleteBooking } from "../utils/booking-api"

// Updated Store type to match your schema
type Store = {
  id: string
  name: string
  address: string | null
  city: string | null
  created_at?: string
  category_id?: number | null
  image_urls?: string[] | null
  image_url?: string | null
  menu_pdf_url?: string | null
  owner_id?: string | null
}

type Table = {
  id: string
  store_id: string
  name: string
  location: "in" | "out"
  smoking_allowed: boolean
  capacity: number
  status: "available" | "reserved" | "occupied"
}

type Booking = {
  id: string
  table_id: string
  user_id: string
  store_id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  party_size: number
  booked_at: string
  duration_minutes?: number
  status?: "pending" | "confirmed" | "cancelled" | "completed" | "approved"
  special_requests?: string
  notes?: string
  created_at?: string
  updated_at?: string
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
    clock: "⏰",
    user: "👤",
    phone: "📞",
    email: "✉️",
    time: "⌛",
    info: "ℹ️",
    bookings: "📚",
    accept: "✅",
    decline: "❌",
    notification: "🔔",
    success: "✅",
    error: "❌",
    "approve-all": "🎯",
  }

  return (
    <Text style={[{ fontSize: size, color, fontWeight: "bold", textAlign: "center" }, style]}>
      {iconMap[name] || "•"}
    </Text>
  )
}

export default function StoreFormScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { id } = (route.params as { id?: string }) || {}
  const insets = useSafeAreaInsets() // Get safe area insets

  const [store, setStore] = useState<Store>({
    id: id || "new-store",
    name: "",
    address: "",
    city: "",
    image_url: null,
    menu_pdf_url: null,
  })

  const [loading, setLoading] = useState(!!id)
  const [tables, setTables] = useState<Table[]>([])
  const [tablesLoading, setTablesLoading] = useState(false)
  const [activeTablesTab, setActiveTablesTab] = useState<"all" | "in" | "out">("all")
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(!id) // If no ID, we're creating a new store (editing mode)
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false)

  // Table modal state
  const [tableModalVisible, setTableModalVisible] = useState(false)
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [newTableName, setNewTableName] = useState("")
  const [newTableLocation, setNewTableLocation] = useState<"in" | "out">("in")
  const [newTableSmoking, setNewTableSmoking] = useState(false)
  const [newTableCapacity, setNewTableCapacity] = useState("4")
  const [addingTable, setAddingTable] = useState(false)

  // Menu and image upload state
  const [uploadingMenu, setUploadingMenu] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Bookings state
  const [bookingsModalVisible, setBookingsModalVisible] = useState(false)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [selectedTableName, setSelectedTableName] = useState("")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [processingBooking, setProcessingBooking] = useState<string | null>(null)

  // Pending bookings count for each table
  const [pendingBookingsCounts, setPendingBookingsCounts] = useState<Record<string, number>>({})

  // Enhanced request status tracking
  const [requestStatus, setRequestStatus] = useState<{
    [key: string]: "idle" | "loading" | "success" | "error"
  }>({})

  // Bulk operations state
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Request permissions on component mount
  useEffect(() => {
    ;(async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== "granted") {
          Alert.alert("Permission Required", "Sorry, we need camera roll permissions to upload images!")
        }
      } catch (error) {
        console.error("Error requesting permissions:", error)
      }
    })()
  }, [])

  /* fetch store data when editing */
  useEffect(() => {
    if (!id) return

    const fetchStoreData = async () => {
      try {
        setLoading(true)
        const storeData = await getStore(id)

        setStore({
          id: storeData.id,
          name: storeData.name,
          address: storeData.address || "",
          city: storeData.city || "",
          image_url: storeData.image_url,
          menu_pdf_url: storeData.menu_pdf_url,
          category_id: storeData.category_id,
          owner_id: storeData.owner_id,
        })
      } catch (error: any) {
        console.error("Error fetching store:", error)
        Alert.alert("Error", error.message || "Failed to load store data")
      } finally {
        setLoading(false)
      }
    }

    fetchStoreData()
  }, [id])

  /* fetch tables */
  const fetchTables = useCallback(async () => {
    if (!id) return

    try {
      setTablesLoading(true)
      const tablesData = await getTables(id)
      setTables(tablesData || [])

      // Fetch pending bookings count for each table
      await fetchPendingBookingsCounts(tablesData || [])
    } catch (error: any) {
      console.error("Error fetching tables:", error)
      Alert.alert("Error", "Failed to load tables: " + (error.message || "Unknown error"))
    } finally {
      setTablesLoading(false)
    }
  }, [id])

  /* fetch pending bookings counts for all tables */
  const fetchPendingBookingsCounts = useCallback(async (tablesData: Table[]) => {
    try {
      const allBookings = await getBookings()
      const counts: Record<string, number> = {}

      tablesData.forEach((table) => {
        const pendingCount = allBookings.filter(
          (booking: Booking) => booking.table_id === table.id && (booking.status === "pending" || !booking.status),
        ).length
        counts[table.id] = pendingCount
      })

      setPendingBookingsCounts(counts)
    } catch (error: any) {
      console.error("Error fetching pending bookings counts:", error)
    }
  }, [])

  /* load tables when editing */
  useEffect(() => {
    if (id) {
      fetchTables()
    }
  }, [id, fetchTables])

  /* fetch bookings for a table */
  const fetchBookingsForTable = useCallback(async (tableId: string, tableName: string) => {
    if (!tableId) return

    try {
      setBookingsLoading(true)
      setSelectedTableId(tableId)
      setSelectedTableName(tableName)

      // Fetch all bookings and filter by table_id
      const allBookings = await getBookings()

      // Filter bookings for this specific table
      const tableBookings = allBookings.filter((booking: Booking) => booking.table_id === tableId)

      // Sort by booking date (most recent first)
      const sortedBookings = tableBookings.sort((a: Booking, b: Booking) => {
        return new Date(b.booked_at).getTime() - new Date(a.booked_at).getTime()
      })

      setBookings(sortedBookings)
      setBookingsModalVisible(true)
    } catch (error: any) {
      console.error("Error fetching bookings:", error)
      Alert.alert("Error", "Failed to load bookings: " + (error.message || "Unknown error"))
      setBookings([])
      setBookingsModalVisible(true)
    } finally {
      setBookingsLoading(false)
    }
  }, [])

  // Enhanced acceptBooking function using Supabase update pattern
  const acceptBooking = useCallback(
    async (bookingId: string) => {
      try {
        setProcessingBooking(bookingId)
        setRequestStatus((prev) => ({ ...prev, [bookingId]: "loading" }))

        console.log(`Attempting to approve booking ${bookingId}...`)

        // Use Supabase update pattern to update status to 'approved'
        const { data, error } = await supabase
          .from("bookings")
          .update({
            status: "approved",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId)
          .select()

        if (error) {
          throw new Error(error.message)
        }

        if (data && data.length > 0) {
          console.log("Booking approved successfully:", data[0])

          // Update local state immediately for better UX
          setBookings((prevBookings) =>
            prevBookings.map((booking) => (booking.id === bookingId ? { ...booking, status: "approved" } : booking)),
          )

          // Refresh pending counts for all tables
          if (tables.length > 0) {
            await fetchPendingBookingsCounts(tables)
          }

          setRequestStatus((prev) => ({ ...prev, [bookingId]: "success" }))

          // Show success message
          Alert.alert(
            "Booking Approved",
            `The booking has been successfully approved. Customer: ${data[0].customer_name}`,
            [{ text: "OK", style: "default" }],
          )
        } else {
          throw new Error("No booking found with that ID")
        }

        // Clear success status after a delay
        setTimeout(() => {
          setRequestStatus((prev) => ({ ...prev, [bookingId]: "idle" }))
        }, 2000)
      } catch (error: any) {
        console.error("Error approving booking:", error)
        setRequestStatus((prev) => ({ ...prev, [bookingId]: "error" }))

        // Show detailed error message
        const errorMessage = error.response?.data?.message || error.message || "Unknown error occurred"
        Alert.alert("Failed to Approve Booking", `Could not approve the booking: ${errorMessage}. Please try again.`, [
          { text: "Retry", onPress: () => acceptBooking(bookingId) },
          { text: "Cancel", style: "cancel" },
        ])

        // Clear error status after a delay
        setTimeout(() => {
          setRequestStatus((prev) => ({ ...prev, [bookingId]: "idle" }))
        }, 3000)
      } finally {
        setProcessingBooking(null)
      }
    },
    [tables, fetchPendingBookingsCounts],
  )

  // Bulk approve multiple bookings using Supabase update pattern
  const approveAllPendingBookings = useCallback(
    async (tableId?: string) => {
      Alert.alert(
        "Approve All Pending Bookings",
        tableId
          ? `Are you sure you want to approve all pending bookings for ${selectedTableName}?`
          : "Are you sure you want to approve ALL pending bookings for this store?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve All",
            style: "default",
            onPress: async () => {
              try {
                setBulkProcessing(true)

                let query = supabase
                  .from("bookings")
                  .update({
                    status: "approved",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("status", "pending")

                // If tableId is provided, only approve bookings for that table
                if (tableId) {
                  query = query.eq("table_id", tableId)
                } else if (id) {
                  // Approve all pending bookings for this store
                  query = query.eq("store_id", id)
                }

                const { data, error } = await query.select()

                if (error) {
                  throw new Error(error.message)
                }

                if (data && data.length > 0) {
                  console.log(`Approved ${data.length} bookings:`, data)

                  // Update local state
                  setBookings((prevBookings) =>
                    prevBookings.map((booking) =>
                      data.some((approvedBooking) => approvedBooking.id === booking.id)
                        ? { ...booking, status: "approved" }
                        : booking,
                    ),
                  )

                  // Refresh pending counts
                  if (tables.length > 0) {
                    await fetchPendingBookingsCounts(tables)
                  }

                  Alert.alert("Bulk Approval Complete", `Successfully approved ${data.length} booking(s).`, [
                    { text: "OK", style: "default" },
                  ])
                } else {
                  Alert.alert("No Bookings", "No pending bookings found to approve.")
                }
              } catch (error: any) {
                console.error("Error in bulk approval:", error)
                Alert.alert("Bulk Approval Failed", `Could not approve bookings: ${error.message}`, [
                  { text: "OK", style: "cancel" },
                ])
              } finally {
                setBulkProcessing(false)
              }
            },
          },
        ],
      )
    },
    [tables, fetchPendingBookingsCounts, selectedTableName, id],
  )

  // Enhanced declineBooking function with better confirmation and error handling
  const declineBooking = useCallback(
    async (bookingId: string, customerName: string) => {
      Alert.alert(
        "Decline Booking",
        `Are you sure you want to decline the booking for ${customerName}?\n\nThis action will:\n• Permanently delete the booking\n• Notify the customer of the cancellation\n• Free up the table slot\n\nThis cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Decline Booking",
            style: "destructive",
            onPress: async () => {
              try {
                setProcessingBooking(bookingId)
                setRequestStatus((prev) => ({ ...prev, [bookingId]: "loading" }))

                console.log(`Attempting to decline booking ${bookingId}...`)

                // Make the API call to delete the booking
                await deleteBooking(bookingId)

                // Update local state immediately
                setBookings((prevBookings) => prevBookings.filter((booking) => booking.id !== bookingId))

                // Refresh pending counts for all tables
                if (tables.length > 0) {
                  await fetchPendingBookingsCounts(tables)
                }

                setRequestStatus((prev) => ({ ...prev, [bookingId]: "success" }))

                Alert.alert(
                  "Booking Declined",
                  `The booking for ${customerName} has been declined and removed. The customer will be notified.`,
                  [{ text: "OK", style: "default" }],
                )

                // Clear success status after a delay
                setTimeout(() => {
                  setRequestStatus((prev) => ({ ...prev, [bookingId]: "idle" }))
                }, 2000)
              } catch (error: any) {
                console.error("Error declining booking:", error)
                setRequestStatus((prev) => ({ ...prev, [bookingId]: "error" }))

                const errorMessage = error.response?.data?.message || error.message || "Unknown error occurred"
                Alert.alert(
                  "Failed to Decline Booking",
                  `Could not decline the booking: ${errorMessage}. Please try again.`,
                  [
                    { text: "Retry", onPress: () => declineBooking(bookingId, customerName) },
                    { text: "Cancel", style: "cancel" },
                  ],
                )

                // Clear error status after a delay
                setTimeout(() => {
                  setRequestStatus((prev) => ({ ...prev, [bookingId]: "idle" }))
                }, 3000)
              } finally {
                setProcessingBooking(null)
              }
            },
          },
        ],
      )
    },
    [tables, fetchPendingBookingsCounts],
  )

  /* save store data */
  async function saveStore() {
    if (!store.name.trim()) {
      return Alert.alert("Error", "Store name is required")
    }

    try {
      setIsSaving(true)

      const storeData = {
        name: store.name.trim(),
        address: store.address?.trim() || null,
        city: store.city?.trim() || null,
      }

      if (id) {
        // Update existing store
        await updateStore(id, storeData)
        // If we're editing an existing store, turn off edit mode
        setIsEditing(false)
        Alert.alert("Success", "Store updated successfully")
      } else {
        // Create new store
        const result = await createStore(storeData)
        // If we're creating a new store, go back to the previous screen
        Alert.alert("Success", "Store created successfully", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ])
      }
    } catch (error: any) {
      console.error("Error saving store:", error)
      Alert.alert("Error", "Failed to save store: " + (error.message || "Unknown error"))
    } finally {
      setIsSaving(false)
    }
  }

  /* pick store image with validation */
  const pickStoreImage = async () => {
    if (!isEditing && id) {
      Alert.alert("Edit Mode", "Please enable edit mode to change the store image")
      return
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [16, 9],
      })

      if (result.canceled) return

      const file = result.assets[0]

      // Validate the selected file
      setUploadingImage(true)

      try {
        // Determine MIME type from file extension or use a default
        let mimeType = "image/jpeg" // default
        if (file.uri.toLowerCase().endsWith(".png")) {
          mimeType = "image/png"
        } else if (file.uri.toLowerCase().endsWith(".jpg") || file.uri.toLowerCase().endsWith(".jpeg")) {
          mimeType = "image/jpeg"
        }

        console.log("🔍 Validating image file:", file.uri)
        const validationResult = await validateFile(file.uri, mimeType, IMAGE_VALIDATION_OPTIONS)

        if (!validationResult.isValid) {
          const errorMessage = validationResult.errorMessage || getFileValidationErrorMessage(validationResult.error!)
          Alert.alert("Invalid File", errorMessage)
          return
        }

        console.log("✅ Image file validation passed")

        if (!id) {
          // If no ID yet (new store), just update the local state
          setStore({
            ...store,
            image_url: file.uri,
          })
          Alert.alert("Success", "Store image selected and validated. Save the store to upload the image.")
        } else {
          // Get file info for upload
          const fileInfo = await FileSystem.getInfoAsync(file.uri)
          if (!fileInfo.exists) {
            throw new Error("File does not exist")
          }

          // Create form data for file upload
          const formData = new FormData()

          // Get file name and type
          const fileNameParts = file.uri.split("/")
          const fileName = fileNameParts[fileNameParts.length - 1]
          const fileType = mimeType

          // Append file to form data
          formData.append("imageFile", {
            uri: Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri,
            name: fileName,
            type: fileType,
          } as any)

          // Upload file
          const response = await uploadStoreImage(id, formData)

          // Update local state with the returned URL
          setStore({
            ...store,
            image_url: response.url,
          })

          Alert.alert("Success", "Store image uploaded successfully!")
        }
      } catch (error: any) {
        console.error("Error uploading image:", error)
        Alert.alert("Error", "Failed to upload image: " + (error.message || "Unknown error"))
      } finally {
        setUploadingImage(false)
      }
    } catch (error: any) {
      console.error("Error picking image:", error)
      Alert.alert("Error", "Could not pick image: " + (error.message || "Unknown error"))
      setUploadingImage(false)
    }
  }

  /* delete store image */
  const deleteStoreImageHandler = async () => {
    if (!isEditing && id) {
      Alert.alert("Edit Mode", "Please enable edit mode to delete the store image")
      return
    }

    if (!store.image_url) return

    Alert.alert("Delete Store Image", "Are you sure you want to delete the store image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setUploadingImage(true)
          try {
            if (id) {
              // Delete from server
              await deleteStoreImage(id)
            }

            // Update local state
            setStore({
              ...store,
              image_url: null,
            })

            Alert.alert("Success", "Store image deleted successfully")
          } catch (error: any) {
            console.error("Error deleting image:", error)
            Alert.alert("Error", "Failed to delete image: " + (error.message || "Unknown error"))
          } finally {
            setUploadingImage(false)
          }
        },
      },
    ])
  }

  /* pick menu file with validation */
  const pickMenuFile = async () => {
    if (!isEditing && id) {
      Alert.alert("Edit Mode", "Please enable edit mode to change the menu file")
      return
    }

    if (!id) {
      Alert.alert("Error", "Please save the store first before uploading a menu")
      return
    }

    try {
      // Use DocumentPicker for PDF files
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
        copyToCacheDirectory: true,
      })

      if (result.canceled) return

      const file = result.assets[0]

      // Validate the selected file
      setUploadingMenu(true)

      try {
        console.log("🔍 Validating menu file:", file.uri, "MIME type:", file.mimeType)
        const validationResult = await validateFile(
          file.uri,
          file.mimeType || "application/pdf",
          MENU_FILE_VALIDATION_OPTIONS,
        )

        if (!validationResult.isValid) {
          const errorMessage = validationResult.errorMessage || getFileValidationErrorMessage(validationResult.error!)
          Alert.alert("Invalid File", errorMessage)
          return
        }

        console.log("✅ Menu file validation passed")

        // Create form data for file upload
        const formData = new FormData()

        // Append file to form data
        formData.append("menuFile", {
          uri: Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri,
          name: file.name,
          type: file.mimeType,
        } as any)

        // Upload file
        const response = await uploadMenuFile(id, formData)

        // Update local state with the returned URL
        setStore({
          ...store,
          menu_pdf_url: response.url,
        })

        Alert.alert("Success", "Menu file uploaded successfully!")
      } catch (error: any) {
        console.error("Error uploading menu:", error)
        Alert.alert("Error", "Failed to upload menu: " + (error.message || "Unknown error"))
      } finally {
        setUploadingMenu(false)
      }
    } catch (error: any) {
      console.error("Error picking file:", error)
      Alert.alert("Error", "Could not pick file: " + (error.message || "Unknown error"))
      setUploadingMenu(false)
    }
  }

  /* delete menu file */
  const deleteMenuPdf = async () => {
    if (!isEditing && id) {
      Alert.alert("Edit Mode", "Please enable edit mode to delete the menu file")
      return
    }

    if (!store.menu_pdf_url || !id) return

    Alert.alert("Delete Menu File", "Are you sure you want to delete the menu file?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setUploadingMenu(true)
          try {
            // Delete from server
            await deleteMenuFile(id)

            // Update local state
            setStore({
              ...store,
              menu_pdf_url: null,
            })

            Alert.alert("Success", "Menu file deleted successfully")
          } catch (error: any) {
            console.error("Error deleting menu file:", error)
            Alert.alert("Error", "Failed to delete menu file: " + (error.message || "Unknown error"))
          } finally {
            setUploadingMenu(false)
          }
        },
      },
    ])
  }

  /* open add table modal */
  const openAddTableModal = () => {
    if (!isEditing && id) {
      Alert.alert("Edit Mode", "Please enable edit mode to add tables")
      return
    }

    setEditingTableId(null)
    setNewTableName("")
    setNewTableLocation("in")
    setNewTableSmoking(false)
    setNewTableCapacity("4")
    setTableModalVisible(true)
  }

  /* open edit table modal */
  const openEditTableModal = (table: Table) => {
    if (!isEditing && id) {
      Alert.alert("Edit Mode", "Please enable edit mode to edit tables")
      return
    }

    setEditingTableId(table.id)
    setNewTableName(table.name)
    setNewTableLocation(table.location)
    setNewTableSmoking(table.smoking_allowed)
    setNewTableCapacity(table.capacity.toString())
    setTableModalVisible(true)
  }

  /* save table */
  const saveTable = async () => {
    if (!newTableName.trim()) {
      return Alert.alert("Error", "Table name is required")
    }

    if (isNaN(Number.parseInt(newTableCapacity)) || Number.parseInt(newTableCapacity) <= 0) {
      return Alert.alert("Error", "Please enter a valid capacity")
    }

    if (!id) {
      return Alert.alert("Error", "Please save the store first before adding tables")
    }

    setAddingTable(true)

    try {
      const tableData = {
        name: newTableName.trim(),
        capacity: Number.parseInt(newTableCapacity),
        location: newTableLocation,
        smoking_allowed: newTableSmoking,
      }

      if (editingTableId) {
        // Update existing table
        await updateTable(editingTableId, tableData)

        // Update the table in the local state
        setTables((prevTables) =>
          prevTables.map((table) =>
            table.id === editingTableId
              ? {
                  ...table,
                  ...tableData,
                  id: editingTableId,
                  store_id: id,
                  status: table.status,
                }
              : table,
          ),
        )

        Alert.alert("Success", "Table updated successfully")
      } else {
        // Create new table
        await createTable(id, tableData)

        // Refresh tables to get the newly created table with its ID
        await fetchTables()

        Alert.alert("Success", "Table created successfully")
      }

      // Close the modal
      setTableModalVisible(false)
    } catch (error: any) {
      console.error("Error saving table:", error)
      Alert.alert("Error", "Failed to save table: " + (error.message || "Unknown error"))
    } finally {
      setAddingTable(false)
    }
  }

  /* delete table */
  const deleteTableHandler = async (tableId: string) => {
    if (!isEditing && id) {
      Alert.alert("Edit Mode", "Please enable edit mode to delete tables")
      return
    }

    Alert.alert("Delete Table", "Are you sure you want to delete this table?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setTablesLoading(true)

            // Delete the table from the server
            await deleteTable(tableId)

            // Update the local state to remove the deleted table
            setTables((prevTables) => prevTables.filter((table) => table.id !== tableId))

            Alert.alert("Success", "Table deleted successfully")
          } catch (error: any) {
            console.error("Error deleting table:", error)
            Alert.alert("Error", "Failed to delete table: " + (error.message || "Unknown error"))
          } finally {
            setTablesLoading(false)
          }
        },
      },
    ])
  }

  /* update table status */
  const updateTableStatusHandler = async (tableId: string, status: "available" | "reserved" | "occupied") => {
    try {
      await updateTableStatus(tableId, status)

      // Update the table in the local state
      setTables((prevTables) => prevTables.map((table) => (table.id === tableId ? { ...table, status } : table)))

      Alert.alert("Success", `Table status updated to ${status}`)
    } catch (error: any) {
      console.error("Error updating table status:", error)
      Alert.alert("Error", "Failed to update table status: " + (error.message || "Unknown error"))
    }
  }

  /* delete store */
  const deleteStoreHandler = async () => {
    if (!id) return
    setConfirmDeleteVisible(true)
  }

  /* confirm delete store */
  const confirmDeleteStore = async () => {
    try {
      setLoading(true)

      // Delete the store and all associated data
      await deleteStore(id!)

      setConfirmDeleteVisible(false)

      Alert.alert("Success", "Store and all associated data deleted successfully", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ])
    } catch (error: any) {
      setLoading(false)
      console.error("Error deleting store:", error)
      Alert.alert("Error", "Failed to delete store: " + (error.message || "Unknown error"))
    }
  }

  /* filter tables based on active tab */
  const filteredTables = tables.filter((table) => {
    if (activeTablesTab === "all") return true
    return table.location === activeTablesTab
  })

  /* format date for display */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  /* render booking item with enhanced status indicators */
  const renderBookingItem = ({ item }: { item: Booking }) => {
    const getStatusColor = (status?: string) => {
      switch (status) {
        case "confirmed":
        case "approved":
          return { backgroundColor: "#D1FAE5", color: "#065F46" }
        case "cancelled":
          return { backgroundColor: "#FEE2E2", color: "#991B1B" }
        case "completed":
          return { backgroundColor: "#E0E7FF", color: "#3730A3" }
        default:
          return { backgroundColor: "#FEF3C7", color: "#92400E" }
      }
    }

    const statusColors = getStatusColor(item.status)
    const isPending = item.status === "pending" || !item.status
    const isProcessing = processingBooking === item.id
    const currentStatus = requestStatus[item.id] || "idle"

    return (
      <View style={styles.bookingItem}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingCustomer}>
            <Icon name="user" size={16} color="#4F46E5" style={{ marginRight: 8 }} />
            <Text style={styles.bookingCustomerName}>{item.customer_name}</Text>
          </View>
          <View style={[styles.bookingStatus, { backgroundColor: statusColors.backgroundColor }]}>
            <Text style={[styles.bookingStatusText, { color: statusColors.color }]}>
              {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : "Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetail}>
            <Icon name="calendar" size={14} color="#4B5563" style={{ marginRight: 4 }} />
            <Text style={styles.bookingDetailText}>{formatDate(item.booked_at)}</Text>
          </View>

          {item.duration_minutes && (
            <View style={styles.bookingDetail}>
              <Icon name="time" size={14} color="#4B5563" style={{ marginRight: 4 }} />
              <Text style={styles.bookingDetailText}>{item.duration_minutes} minutes</Text>
            </View>
          )}

          <View style={styles.bookingDetail}>
            <Icon name="user" size={14} color="#4B5563" style={{ marginRight: 4 }} />
            <Text style={styles.bookingDetailText}>Party of {item.party_size}</Text>
          </View>
        </View>

        {(item.customer_email || item.customer_phone) && (
          <View style={styles.bookingContact}>
            {item.customer_email && (
              <View style={styles.bookingContactItem}>
                <Icon name="email" size={14} color="#4B5563" style={{ marginRight: 4 }} />
                <Text style={styles.bookingContactText}>{item.customer_email}</Text>
              </View>
            )}

            {item.customer_phone && (
              <View style={styles.bookingContactItem}>
                <Icon name="phone" size={14} color="#4B5563" style={{ marginRight: 4 }} />
                <Text style={styles.bookingContactText}>{item.customer_phone}</Text>
              </View>
            )}
          </View>
        )}

        {item.special_requests && (
          <View style={styles.bookingSpecialRequests}>
            <Text style={styles.bookingSpecialRequestsLabel}>Special Requests:</Text>
            <Text style={styles.bookingSpecialRequestsText}>{item.special_requests}</Text>
          </View>
        )}

        {/* Enhanced Accept/Decline buttons for pending bookings */}
        {isPending && (
          <View style={styles.bookingActions}>
            <TouchableOpacity
              style={[
                styles.bookingActionButton,
                styles.acceptButton,
                currentStatus === "success" && styles.successButton,
                currentStatus === "error" && styles.errorButton,
              ]}
              onPress={() => acceptBooking(item.id)}
              disabled={isProcessing}
            >
              {isProcessing && currentStatus === "loading" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : currentStatus === "success" ? (
                <>
                  <Icon name="success" size={16} color="#FFFFFF" />
                  <Text style={styles.bookingActionText}>Approved!</Text>
                </>
              ) : currentStatus === "error" ? (
                <>
                  <Icon name="error" size={16} color="#FFFFFF" />
                  <Text style={styles.bookingActionText}>Failed</Text>
                </>
              ) : (
                <>
                  <Icon name="accept" size={16} color="#FFFFFF" />
                  <Text style={styles.bookingActionText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bookingActionButton,
                styles.declineButton,
                currentStatus === "success" && styles.successButton,
                currentStatus === "error" && styles.errorButton,
              ]}
              onPress={() => declineBooking(item.id, item.customer_name)}
              disabled={isProcessing}
            >
              {isProcessing && currentStatus === "loading" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : currentStatus === "success" ? (
                <>
                  <Icon name="success" size={16} color="#FFFFFF" />
                  <Text style={styles.bookingActionText}>Declined!</Text>
                </>
              ) : currentStatus === "error" ? (
                <>
                  <Icon name="error" size={16} color="#FFFFFF" />
                  <Text style={styles.bookingActionText}>Failed</Text>
                </>
              ) : (
                <>
                  <Icon name="decline" size={16} color="#FFFFFF" />
                  <Text style={styles.bookingActionText}>Decline</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  /* render table item */
  const renderTableItem = (table: Table) => {
    const pendingCount = pendingBookingsCounts[table.id] || 0

    return (
      <TouchableOpacity
        key={table.id}
        style={[
          styles.tableCard,
          table.location === "in" ? styles.tableCardIn : styles.tableCardOut,
          table.status === "reserved" && styles.tableCardReserved,
          table.status === "occupied" && styles.tableCardOccupied,
        ]}
        onPress={() => openEditTableModal(table)}
        activeOpacity={0.7}
      >
        <View style={styles.tableHeader}>
          <Text style={styles.tableName}>{table.name}</Text>
          <View style={styles.tableHeaderRight}>
            <View style={styles.tableCapacity}>
              <Text style={styles.tableCapacityText}>{table.capacity} seats</Text>
            </View>
            {/* Notification badge for pending bookings */}
            {pendingCount > 0 && (
              <View style={styles.notificationBadge}>
                <Icon name="notification" size={12} color="#F59E0B" />
                <Text style={styles.notificationText}>{pendingCount}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.tableDetails}>
          <View style={styles.tableDetail}>
            <Icon
              name={table.location === "in" ? "indoor" : "outdoor"}
              size={16}
              color={table.location === "in" ? "#4F46E5" : "#10B981"}
            />
            <Text style={styles.tableDetailText}>{table.location === "in" ? "Indoor" : "Outdoor"}</Text>
          </View>
          <View style={styles.tableDetail}>
            <Icon
              name={table.smoking_allowed ? "smoking" : "smoking-off"}
              size={16}
              color={table.smoking_allowed ? "#F59E0B" : "#6B7280"}
            />
            <Text style={styles.tableDetailText}>{table.smoking_allowed ? "Smoking allowed" : "No smoking"}</Text>
          </View>
        </View>

        {/* Status controls */}
        <View style={styles.tableStatusControls}>
          <Text style={styles.tableStatusLabel}>Status:</Text>
          <View style={styles.tableStatusButtons}>
            <TouchableOpacity
              style={[styles.tableStatusButton, table.status === "available" && styles.tableStatusButtonActive]}
              onPress={() => updateTableStatusHandler(table.id, "available")}
              disabled={table.status === "available"}
            >
              <Text
                style={[
                  styles.tableStatusButtonText,
                  table.status === "available" && styles.tableStatusButtonTextActive,
                ]}
              >
                Available
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tableStatusButton, table.status === "reserved" && styles.tableStatusButtonActive]}
              onPress={() => updateTableStatusHandler(table.id, "reserved")}
              disabled={table.status === "reserved"}
            >
              <Text
                style={[
                  styles.tableStatusButtonText,
                  table.status === "reserved" && styles.tableStatusButtonTextActive,
                ]}
              >
                Reserved
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tableStatusButton, table.status === "occupied" && styles.tableStatusButtonActive]}
              onPress={() => updateTableStatusHandler(table.id, "occupied")}
              disabled={table.status === "occupied"}
            >
              <Text
                style={[
                  styles.tableStatusButtonText,
                  table.status === "occupied" && styles.tableStatusButtonTextActive,
                ]}
              >
                Occupied
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tableActions}>
          {/* View Bookings Button with notification indicator */}
          <TouchableOpacity
            style={[styles.viewBookingsButton, pendingCount > 0 && styles.viewBookingsButtonWithNotification]}
            onPress={() => fetchBookingsForTable(table.id, table.name)}
          >
            <Icon name="bookings" size={14} color="#4F46E5" />
            <Text style={styles.viewBookingsText}>View Bookings {pendingCount > 0 && `(${pendingCount} pending)`}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tableAction}
            onPress={() => openEditTableModal(table)}
            disabled={!isEditing && !!id}
          >
            <Icon name="pencil" size={14} color={!isEditing && id ? "#9CA3AF" : "#4F46E5"} />
            <Text style={[styles.tableActionText, !isEditing && id && { color: "#9CA3AF" }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tableAction, styles.tableActionDelete]}
            onPress={() => deleteTableHandler(table.id)}
            disabled={!isEditing && !!id}
          >
            <Icon name="delete" size={14} color={!isEditing && id ? "#9CA3AF" : "#EC4899"} />
            <Text style={[styles.tableActionDeleteText, !isEditing && id && { color: "#9CA3AF" }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]} edges={["right", "left"]}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: insets.bottom,
        }}
      >
        <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
          {/* header bar with back button, title, and action buttons */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="back" size={24} color="#4B5563" />
            </TouchableOpacity>

            <Text style={styles.title}>{id ? (isEditing ? "Edit Store" : store.name) : "New Store"}</Text>

            <View style={styles.headerActions}>
              {/* Edit mode toggle */}
              {id && (
                <TouchableOpacity
                  style={[styles.headerAction, isEditing && styles.headerActionActive]}
                  onPress={() => setIsEditing(!isEditing)}
                >
                  <Icon name={isEditing ? "check" : "edit"} size={20} color={isEditing ? "#FFFFFF" : "#4F46E5"} />
                </TouchableOpacity>
              )}

              {/* Delete store button */}
              {id && (
                <TouchableOpacity style={[styles.headerAction, styles.headerActionDelete]} onPress={deleteStoreHandler}>
                  <Icon name="trash" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Store Image Section */}
          <View style={styles.storeImageSection}>
            {store.image_url ? (
              <View style={styles.storeImageContainer}>
                <Image source={{ uri: store.image_url }} style={styles.storeImage} resizeMode="cover" />
                {(isEditing || !id) && (
                  <View style={styles.imageActions}>
                    <TouchableOpacity style={styles.imageAction} onPress={pickStoreImage}>
                      <Icon name="camera" size={16} color="#FFFFFF" />
                      <Text style={styles.imageActionText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.imageAction, styles.imageActionDelete]}
                      onPress={deleteStoreImageHandler}
                    >
                      <Icon name="delete" size={16} color="#FFFFFF" />
                      <Text style={styles.imageActionText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadImageButton}
                onPress={pickStoreImage}
                disabled={uploadingImage || (!isEditing && !!id)}
              >
                {uploadingImage ? (
                  <ActivityIndicator color="#6366F1" size="small" />
                ) : (
                  <>
                    <Icon name="photo" size={32} color={!isEditing && id ? "#9CA3AF" : "#6366F1"} />
                    <View style={{ marginTop: 24 }}>
                      <Text style={[styles.uploadImageText, !isEditing && id && { color: "#9CA3AF" }]}>
                        Add Store Image
                      </Text>
                      <Text style={[styles.uploadImageSubtext, !isEditing && id && { color: "#D1D5DB" }]}>
                        Upload a photo of your store (validated for security)
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* form fields */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Store Information</Text>
            <TextInput
              style={[styles.input, !isEditing && id && styles.inputDisabled]}
              placeholder="Name"
              value={store.name}
              onChangeText={(text) => setStore({ ...store, name: text })}
              editable={isEditing || !id}
            />
            <TextInput
              style={[styles.input, !isEditing && id && styles.inputDisabled]}
              placeholder="City"
              value={store.city || ""}
              onChangeText={(text) => setStore({ ...store, city: text })}
              editable={isEditing || !id}
            />
            <TextInput
              style={[styles.input, !isEditing && id && styles.inputDisabled]}
              placeholder="Address"
              value={store.address || ""}
              onChangeText={(text) => setStore({ ...store, address: text })}
              editable={isEditing || !id}
            />

            {(isEditing || !id) && (
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={saveStore}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="save" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>{id ? "Save Changes" : "Create Store"}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Menu Upload Section */}
          <View style={styles.menuPdfSection}>
            <Text style={styles.sectionTitle}>Full Menu File</Text>

            <View style={styles.menuPdfInfo}>
              <Icon name="menu" size={24} color="#6366F1" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.menuPdfTitle}>Upload Complete Menu</Text>
                <Text style={styles.menuPdfDescription}>
                  Upload a PDF or image file of your complete menu. Files are automatically validated for security.
                  Accepted formats: PDF, JPG, PNG (max 10MB).
                </Text>
              </View>
            </View>

            {store.menu_pdf_url ? (
              <View style={styles.menuPdfPreview}>
                <Text style={styles.menuPdfFilename} numberOfLines={1} ellipsizeMode="middle">
                  Menu file uploaded
                </Text>

                <View style={styles.menuPdfActions}>
                  <TouchableOpacity
                    style={styles.menuPdfAction}
                    onPress={() => {
                      // Open the PDF or image in a viewer
                      if (Platform.OS === "web") {
                        window.open(store.menu_pdf_url!, "_blank")
                      } else {
                        // For native, use Linking
                        Linking.openURL(store.menu_pdf_url!).catch((err) => {
                          console.error("Error opening URL:", err)
                          Alert.alert("Error", "Could not open the menu file")
                        })
                      }
                    }}
                  >
                    <Icon name="download" size={16} color="#4F46E5" />
                    <Text style={styles.menuPdfActionText}>View</Text>
                  </TouchableOpacity>

                  {(isEditing || !id) && (
                    <>
                      <TouchableOpacity style={styles.menuPdfAction} onPress={pickMenuFile}>
                        <Icon name="upload" size={16} color="#4F46E5" />
                        <Text style={styles.menuPdfActionText}>Replace</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.menuPdfAction, styles.menuPdfActionDelete]}
                        onPress={deleteMenuPdf}
                      >
                        <Icon name="delete" size={16} color="#EC4899" />
                        <Text style={styles.menuPdfActionDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.uploadMenuButton,
                  uploadingMenu && styles.uploadMenuButtonDisabled,
                  !isEditing && id && styles.uploadMenuButtonDisabled,
                  !id && styles.uploadMenuButtonDisabled,
                ]}
                onPress={pickMenuFile}
                disabled={uploadingMenu || (!isEditing && !!id) || !id}
              >
                {uploadingMenu ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="upload" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.uploadMenuButtonText}>
                      {!id ? "Save store first to upload menu" : "Upload Menu File"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Tables Section - Only show if editing an existing store */}
          {id && (
            <View style={styles.tablesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tables</Text>
                <View style={styles.sectionActions}>
                  <TouchableOpacity style={styles.refreshButton} onPress={fetchTables} disabled={tablesLoading}>
                    <Text style={styles.refreshButtonText}>
                      <Icon name="refresh" size={16} color="#6366F1" /> Refresh
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Table Tabs */}
              <View style={styles.tableTabs}>
                <TouchableOpacity
                  style={[styles.tableTab, activeTablesTab === "all" && styles.tableTabActive]}
                  onPress={() => setActiveTablesTab("all")}
                >
                  <Text style={[styles.tableTabText, activeTablesTab === "all" && styles.tableTabTextActive]}>
                    All Tables
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tableTab, activeTablesTab === "in" && styles.tableTabActive]}
                  onPress={() => setActiveTablesTab("in")}
                >
                  <Icon name="indoor" size={16} color={activeTablesTab === "in" ? "#FFFFFF" : "#4B5563"} />
                  <Text style={[styles.tableTabText, activeTablesTab === "in" && styles.tableTabTextActive]}>
                    Indoor
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tableTab, activeTablesTab === "out" && styles.tableTabActive]}
                  onPress={() => setActiveTablesTab("out")}
                >
                  <Icon name="outdoor" size={16} color={activeTablesTab === "out" ? "#FFFFFF" : "#4B5563"} />
                  <Text style={[styles.tableTabText, activeTablesTab === "out" && styles.tableTabTextActive]}>
                    Outdoor
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bulk Actions */}
              {Object.values(pendingBookingsCounts).some((count) => count > 0) && (
                <View style={styles.bulkActionsSection}>
                  <TouchableOpacity
                    style={[styles.bulkApproveButton, bulkProcessing && styles.bulkApproveButtonDisabled]}
                    onPress={() => approveAllPendingBookings()}
                    disabled={bulkProcessing}
                  >
                    {bulkProcessing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Icon name="approve-all" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.bulkApproveButtonText}>
                          Approve All Pending Bookings (
                          {Object.values(pendingBookingsCounts).reduce((a, b) => a + b, 0)})
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {tablesLoading ? (
                <ActivityIndicator style={styles.tablesLoader} color="#6366F1" />
              ) : filteredTables.length === 0 ? (
                <View style={styles.emptyTables}>
                  <Text style={styles.emptyTablesText}>
                    {activeTablesTab === "all"
                      ? "No tables found"
                      : activeTablesTab === "in"
                        ? "No indoor tables found"
                        : "No outdoor tables found"}
                  </Text>
                  {(isEditing || !id) && (
                    <TouchableOpacity
                      style={styles.addTableButton}
                      onPress={openAddTableModal}
                      disabled={!isEditing && !!id}
                    >
                      <Icon name="plus" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.addTableButtonText}>Add Table</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.tablesList}>{filteredTables.map((table) => renderTableItem(table))}</View>
                  {(isEditing || !id) && (
                    <TouchableOpacity
                      style={styles.addTableButton}
                      onPress={openAddTableModal}
                      disabled={!isEditing && !!id}
                    >
                      <Icon name="plus" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.addTableButtonText}>Add Table</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* Table Modal */}
        <Modal
          visible={tableModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setTableModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { marginTop: insets.top, marginBottom: insets.bottom }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingTableId ? "Edit Table" : "Add New Table"}</Text>
                <TouchableOpacity onPress={() => setTableModalVisible(false)} style={styles.closeButton}>
                  <Icon name="close" size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Table Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Table name (e.g. Table 1, Window Table)"
                  value={newTableName}
                  onChangeText={setNewTableName}
                />

                <Text style={styles.inputLabel}>Capacity *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Number of seats"
                  value={newTableCapacity}
                  onChangeText={setNewTableCapacity}
                  keyboardType="number-pad"
                />

                <Text style={styles.inputLabel}>Location</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      newTableLocation === "in" && styles.segmentButtonActive,
                      { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
                    ]}
                    onPress={() => setNewTableLocation("in")}
                  >
                    <Icon
                      name="indoor"
                      size={16}
                      color={newTableLocation === "in" ? "#FFFFFF" : "#4B5563"}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[styles.segmentButtonText, newTableLocation === "in" && styles.segmentButtonTextActive]}
                    >
                      Indoor
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      newTableLocation === "out" && styles.segmentButtonActive,
                      { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
                    ]}
                    onPress={() => setNewTableLocation("out")}
                  >
                    <Icon
                      name="outdoor"
                      size={16}
                      color={newTableLocation === "out" ? "#FFFFFF" : "#4B5563"}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[styles.segmentButtonText, newTableLocation === "out" && styles.segmentButtonTextActive]}
                    >
                      Outdoor
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.switchContainer}>
                  <View style={styles.switchLabel}>
                    <Icon
                      name={newTableSmoking ? "smoking" : "smoking-off"}
                      size={18}
                      color={newTableSmoking ? "#F59E0B" : "#6B7280"}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.switchLabelText}>Smoking Allowed</Text>
                  </View>
                  <Switch
                    value={newTableSmoking}
                    onValueChange={setNewTableSmoking}
                    trackColor={{ false: "#E5E7EB", true: "#EEF2FF" }}
                    thumbColor={newTableSmoking ? "#6366F1" : "#9CA3AF"}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveTableButton, addingTable && styles.saveTableButtonDisabled]}
                  onPress={saveTable}
                  disabled={addingTable}
                >
                  {addingTable ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveTableButtonText}>{editingTableId ? "Update Table" : "Add Table"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Bookings Modal */}
        <Modal
          visible={bookingsModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setBookingsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { marginTop: insets.top, marginBottom: insets.bottom }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Bookings for {selectedTableName}</Text>
                  {!bookingsLoading && bookings.length > 0 && (
                    <Text style={styles.modalSubtitle}>
                      {bookings.length} booking{bookings.length !== 1 ? "s" : ""} found
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setBookingsModalVisible(false)} style={styles.closeButton}>
                  <Icon name="close" size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {/* Bulk approve button for this table */}
                {selectedTableId && pendingBookingsCounts[selectedTableId] > 0 && (
                  <TouchableOpacity
                    style={[styles.bulkApproveTableButton, bulkProcessing && styles.bulkApproveButtonDisabled]}
                    onPress={() => approveAllPendingBookings(selectedTableId)}
                    disabled={bulkProcessing}
                  >
                    {bulkProcessing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Icon name="approve-all" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.bulkApproveButtonText}>
                          Approve All Pending for {selectedTableName} ({pendingBookingsCounts[selectedTableId]})
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {bookingsLoading ? (
                  <ActivityIndicator style={styles.bookingsLoader} color="#6366F1" />
                ) : bookings.length === 0 ? (
                  <View style={styles.emptyBookings}>
                    <Icon name="info" size={40} color="#9CA3AF" />
                    <Text style={styles.emptyBookingsText}>No bookings found for this table</Text>
                  </View>
                ) : (
                  <FlatList
                    data={bookings}
                    renderItem={renderBookingItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.bookingsList}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Confirm Delete Modal */}
        <Modal
          visible={confirmDeleteVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmDeleteVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.confirmModalContent, { marginTop: insets.top, marginBottom: insets.bottom }]}>
              <View style={styles.confirmModalHeader}>
                <Icon name="warning" size={40} color="#f59e0b" />
                <Text style={styles.confirmModalTitle}>Delete Store</Text>
              </View>

              <Text style={styles.confirmModalMessage}>
                Are you sure you want to delete this store? This will also delete all associated tables, menu files, and
                images. This action cannot be undone.
              </Text>

              <View style={styles.confirmModalActions}>
                <TouchableOpacity style={styles.confirmModalCancel} onPress={() => setConfirmDeleteVisible(false)}>
                  <Text style={styles.confirmModalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmModalDelete} onPress={confirmDeleteStore} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.confirmModalDeleteText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
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
  wrap: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginLeft: 8,
  },
  headerActionActive: {
    backgroundColor: "#4F46E5",
  },
  headerActionDelete: {
    backgroundColor: "#e53e3e",
  },

  /* Store Image Section */
  storeImageSection: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
  },
  storeImageContainer: {
    position: "relative",
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
  },
  storeImage: {
    width: "100%",
    height: "100%",
  },
  imageActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 8,
  },
  imageAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  imageActionText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  imageActionDelete: {
    backgroundColor: "rgba(236, 72, 153, 0.8)",
  },
  uploadImageButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    paddingHorizontal: 20,
  },
  uploadImageText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6366F1",
    textAlign: "center",
  },
  uploadImageSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 20,
  },

  /* Form Section */
  formSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: "#111827",
  },
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#D1D5DB",
    color: "#6B7280",
  },
  saveButton: {
    backgroundColor: "#6366F1",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  /* Menu PDF Section */
  menuPdfSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  menuPdfInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  menuPdfTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  menuPdfDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  uploadMenuButton: {
    backgroundColor: "#6366F1",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadMenuButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  uploadMenuButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  menuPdfPreview: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  menuPdfFilename: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 12,
  },
  menuPdfActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  menuPdfAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  menuPdfActionText: {
    fontSize: 14,
    color: "#4F46E5",
    marginLeft: 4,
  },
  menuPdfActionDelete: {
    marginLeft: 8,
  },
  menuPdfActionDeleteText: {
    color: "#EC4899",
    marginLeft: 4,
  },

  /* Tables Section */
  tablesSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
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
  sectionActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    color: "#6366F1",
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
    backgroundColor: "#6366F1",
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

  /* Bulk Actions Section */
  bulkActionsSection: {
    marginBottom: 16,
  },
  bulkApproveButton: {
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bulkApproveTableButton: {
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  bulkApproveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  bulkApproveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  tablesLoader: {
    marginTop: 20,
  },
  tablesList: {
    paddingTop: 8,
  },
  tableCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  tableCardIn: {
    borderLeftColor: "#4F46E5",
  },
  tableCardOut: {
    borderLeftColor: "#10B981",
  },
  tableCardReserved: {
    backgroundColor: "#FEF3C7",
    borderLeftColor: "#F59E0B",
  },
  tableCardOccupied: {
    backgroundColor: "#FEE2E2",
    borderLeftColor: "#EF4444",
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
  tableHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  tableCapacity: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  tableCapacityText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  notificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  notificationText: {
    fontSize: 10,
    color: "#92400E",
    fontWeight: "600",
    marginLeft: 2,
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
  tableStatusControls: {
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  tableStatusLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
    marginBottom: 8,
  },
  tableStatusButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tableStatusButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    marginHorizontal: 2,
  },
  tableStatusButtonActive: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  tableStatusButtonText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  tableStatusButtonTextActive: {
    color: "#FFFFFF",
  },
  tableActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  tableAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  tableActionText: {
    fontSize: 14,
    color: "#4F46E5",
    marginLeft: 4,
  },
  tableActionDelete: {
    marginLeft: 8,
  },
  tableActionDeleteText: {
    color: "#EC4899",
    marginLeft: 4,
  },
  emptyTables: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginTop: 10,
  },
  emptyTablesText: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
  },
  addTableButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    flexDirection: "row",
  },
  addTableButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },

  /* View Bookings Button */
  viewBookingsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  viewBookingsButtonWithNotification: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  viewBookingsText: {
    fontSize: 14,
    color: "#4F46E5",
    marginLeft: 4,
    fontWeight: "500",
  },

  /* Bookings Modal */
  bookingsLoader: {
    marginVertical: 20,
  },
  bookingsList: {
    paddingVertical: 8,
  },
  bookingItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#6366F1",
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bookingCustomer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookingCustomerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  bookingStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bookingStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  bookingDetails: {
    marginBottom: 8,
  },
  bookingDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  bookingDetailText: {
    fontSize: 14,
    color: "#4B5563",
  },
  bookingContact: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
  },
  bookingContactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  bookingContactText: {
    fontSize: 14,
    color: "#6B7280",
  },
  bookingSpecialRequests: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  bookingSpecialRequestsLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
  },
  bookingSpecialRequestsText: {
    fontSize: 14,
    color: "#4B5563",
    fontStyle: "italic",
  },
  bookingActions: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    justifyContent: "space-between",
  },
  bookingActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  acceptButton: {
    backgroundColor: "#10B981",
  },
  declineButton: {
    backgroundColor: "#EF4444",
  },
  successButton: {
    backgroundColor: "#059669",
  },
  errorButton: {
    backgroundColor: "#DC2626",
  },
  bookingActionText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  emptyBookings: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyBookingsText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
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
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 16,
    maxHeight: "70%",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  segmentedControl: {
    flexDirection: "row",
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  segmentButtonActive: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  segmentButtonText: {
    color: "#4B5563",
    fontWeight: "500",
  },
  segmentButtonTextActive: {
    color: "#FFFFFF",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchLabelText: {
    fontSize: 16,
    color: "#4B5563",
  },
  saveTableButton: {
    backgroundColor: "#6366F1",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveTableButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveTableButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },

  /* Confirm Delete Modal */
  confirmModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "90%",
    maxWidth: 500,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmModalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 12,
  },
  confirmModalMessage: {
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  confirmModalCancel: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: "center",
  },
  confirmModalCancelText: {
    color: "#4B5563",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmModalDelete: {
    flex: 1,
    backgroundColor: "#e53e3e",
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: "center",
  },
  confirmModalDeleteText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

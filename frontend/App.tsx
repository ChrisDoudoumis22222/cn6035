import "react-native-gesture-handler"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"

import LoginScreen from "./screens/LoginScreen"
import SignUpScreen from "./screens/SignUpScreen"
import MainTabs from "./MainTabs"
import AdminUserProfileScreen from "./screens/AdminUserProfileScreen"
import StoreFormScreen from "./screens/StoreFormScreen"
import StoreDetailScreen from "./screens/StoreDetailScreen"
import BookingScreen from "./screens/BookingScreen"

const Stack = createStackNavigator<RootStackParamList>()

export type RootStackParamList = {
  Login: undefined
  SignUp: undefined
  /** Main carries flags for MainTabs */
  Main: {
    userId: string
    email: string
    isAdmin: boolean
    screen?: "Booking" | "Stores" | "Profile"
  }
  /** Direct navigation to Booking screen */
  Booking: {
    userId: string
    email: string
  }
  /** Admin can open a read-only user profile */
  AdminProfile: { userId: string }
  /** Admin create / edit store (id missing = create mode) */
  StoreForm: { id?: string }
  /** Store detail view for customers */
  StoreDetail: {
    storeId: string
    userId: string
  }
  /** Web view for viewing PDFs or external content */
  WebView: { url: string; title: string }
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerTitleAlign: "center" }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Log In" }} />

        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: "Sign Up" }} />

        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />

        {/* Direct booking screen navigation */}
        <Stack.Screen
          name="Booking"
          component={BookingScreen}
          options={{
            title: "Book a Table",
            headerShown: false,
          }}
        />

        {/* Read-only profile visible to admins */}
        <Stack.Screen name="AdminProfile" component={AdminUserProfileScreen} options={{ title: "User Profile" }} />

        {/* Create / edit store */}
        <Stack.Screen
          name="StoreForm"
          component={StoreFormScreen}
          options={({ route }) => ({
            title: route.params?.id ? "Edit Store" : "New Store",
            headerShown: false,
          })}
        />

        {/* Store detail view */}
        <Stack.Screen
          name="StoreDetail"
          component={StoreDetailScreen}
          options={{
            title: "Store Details",
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

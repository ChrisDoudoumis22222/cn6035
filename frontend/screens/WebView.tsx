"use client"

import React from "react"
import { View, ActivityIndicator, StyleSheet } from "react-native"
import { WebView as RNWebView } from "react-native-webview"
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native"
import type { RootStackParamList } from "../App"

type WebViewRouteProp = RouteProp<RootStackParamList, "WebView">

export default function WebView() {
  const route = useRoute<WebViewRouteProp>()
  const navigation = useNavigation()
  const { url, title } = route.params

  // Set the header title
  React.useEffect(() => {
    navigation.setOptions({ title: title || "Web View" })
  }, [navigation, title])

  return (
    <View style={styles.container}>
      <RNWebView
        source={{ uri: url }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
})

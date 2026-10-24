// app.config.js — dynamic Expo config
// This file lets us inject environment variables into the app bundle safely.
// The HF_TOKEN is read from your local .env file (which is gitignored).

export default {
  expo: {
    name: "Silent SOS",
    slug: "silent-sos",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0A0C10",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.silentsos.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Silent SOS uses your location to share it with your trusted contacts during an emergency.",
        NSMicrophoneUsageDescription:
          "Silent SOS can optionally record audio evidence during an emergency.",
        NSContactsUsageDescription:
          "Silent SOS may access your contacts to add trusted emergency contacts.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0A0C10",
      },
      package: "com.silentsos.app",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "RECORD_AUDIO",
        "SEND_SMS",
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: ["expo-location", "expo-av"],
    // Extra values accessible via expo-constants inside the app
    extra: {
      HF_TOKEN: process.env.HF_TOKEN ?? null,
    },
  },
};

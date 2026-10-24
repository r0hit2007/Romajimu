# 🛡️ Silent SOS

A production-ready, discreet safety application for individuals in domestic abuse situations, built with **React Native (Expo)** and powered by **Gemma AI** via HuggingFace.

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- [Expo Go](https://expo.dev/client) installed on your phone, or an iOS/Android simulator
- npm or yarn

### Installation

```bash
cd silent-sos
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the **Camera app** (iOS).

---

## 📱 App Structure

```
silent-sos/
├── App.js                          # Root entry point
├── app.json                        # Expo config + permissions
├── src/
│   ├── context/
│   │   └── AppContext.js           # Global state + AsyncStorage persistence
│   ├── navigation/
│   │   └── RootNavigator.js        # Auth → Onboarding → Main tabs flow
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.js
│   │   │   ├── SignupScreen.js
│   │   │   └── ForgotPasswordScreen.js
│   │   ├── Onboarding/
│   │   │   └── OnboardingScreen.js # 8-step wizard
│   │   └── Main/
│   │       ├── HelpScreen.js       # SOS engine
│   │       ├── ContactsScreen.js   # CRUD contacts
│   │       ├── SupportScreen.js    # Regional resources
│   │       ├── SettingsScreen.js   # All settings
│   │       └── CalculatorScreen.js # Decoy calculator
│   ├── components/
│   │   ├── Button.js
│   │   ├── Input.js
│   │   └── UIElements.js           # SearchInput, Chips, Skeletons, EmptyState
│   ├── hooks/
│   │   ├── useContacts.js          # Full Contacts CRUD & search hook
│   │   ├── useSupportResources.js  # Support resources & multi-tier cache hook
│   │   ├── useAIDraft.js           # AI discreet distress prompt hook
│   │   └── useDebounce.js          # Performance search debounce
│   ├── services/
│   │   ├── aiService.js            # Gemma AI, prompt engineering, retry, offline templates
│   │   └── sosService.js           # SMS, Location, Audio
│   ├── utils/
│   │   ├── contactValidation.js    # E.164 phone sanitization & duplicate checks
│   │   ├── storageService.js       # Safe AsyncStorage with in-memory cache & TTL
│   │   └── retry.js                # Exponential backoff retry with jitter
│   └── constants/
│       ├── theme.js                # Design tokens
│       └── resources.js            # Verified crisis hotlines, SMS lines & portals
```

---

## ✅ Features Implemented

| Feature | Status |
|---|---|
| Auth (Login / Signup / Password Recovery) | ✅ Full demo flow |
| 8-step Onboarding wizard | ✅ Complete |
| SOS Hold-to-activate button | ✅ 800ms hold threshold |
| Countdown with cancel / send-now | ✅ |
| Accidental activation confirmation | ✅ Non-judgmental |
| Practice Mode (no real sends) | ✅ Full simulation |
| SMS sending (expo-sms) | ✅ |
| GPS location in SOS message | ✅ |
| Audio recording (expo-av) | ✅ |
| Real-time SOS action status | ✅ Pending → Sent/Failed |
| Calculator Decoy | ✅ Fully working arithmetic |
| Secret return gesture (long-press ÷) | ✅ |
| Launch-into-decoy mode | ✅ |
| Contacts CRUD + Validation + Search | ✅ Full CRUD, E.164 phone sanitization, duplicate prevention, primary contact |
| Contacts Modal & Categories | ✅ Relationship tags (Family, Friend, Partner, etc.), keyboard avoiding modal |
| Emergency SOS contact toggle | ✅ Toggle per contact with haptic feedback & zero-SOS warning |
| Support resources (multi-country) | ✅ 5 regions with direct calling, SMS crisis lines, website links |
| Immediate Danger emergency dial | ✅ Direct 911 / 999 / 112 / 000 calling bar |
| Quick Disguise escape hatch | ✅ Instant one-tap switch to calculator decoy |
| AI support resources (Gemma) | ✅ Upgrades fallback with persistent multi-tier caching (Memory + Storage) |
| AI SOS message drafting (Gemma) | ✅ Covert prompt engineering, scenario presets, strict 160-char SMS limit |
| Offline Fallback Library | ✅ Pre-crafted discreet emergency message templates & verified local directory |
| Retry & Error Handling | ✅ Exponential backoff with jitter on API / network error |
| Custom Reusable Hooks | ✅ `useContacts`, `useSupportResources`, `useAIDraft`, `useDebounce` |
| AsyncStorage persistence | ✅ |
| Account deletion + data wipe | ✅ |
| Dark theme design system | ✅ |
| Accessibility (large targets, aria labels) | ✅ |
| No-false-promise safety language | ✅ |
| Support accessible without login | ✅ |

---

## ⚠️ Features Requiring Native Backend

| Feature | Why |
|---|---|
| Real email-based auth | Needs server (Firebase, Supabase, etc.) |
| Password reset emails | Needs email service |
| SMS without user confirmation | expo-sms opens the native compose sheet; background SMS needs a server/Twilio |
| Background audio upload | Needs cloud storage |
| Push notifications | Needs APNs/FCM + backend |
| Remote wipe of data | Needs MDM or server |

---

## 🧠 AI Integration

The app uses **Gemma 4 31B** via HuggingFace's OpenAI-compatible router:

- **Draft SOS Messages** — Settings → "Draft with Gemma AI" generates a discreet, sub-160-char message
- **Regional Support Resources** — The Support tab attempts to load AI-curated resources, falling back to verified static data instantly

```js
// src/services/aiService.js
baseURL: "https://router.huggingface.co/v1"
model: "google/gemma-4-31B-it:novita"
```

---

## 🔒 Privacy

- All data stored **locally only** via `@react-native-async-storage/async-storage`
- No telemetry, no analytics, no cloud sync
- Permissions requested only when the feature is enabled and needed
- Notifications designed to be neutral (system-style)
- Audio is never recorded without user's explicit SOS trigger

---

## 🆘 Emergency

> **If you are in immediate danger, please call emergency services directly:**
> - USA/Canada: **911**
> - UK: **999**
> - EU: **112**
> - India: **100**
> - Australia: **000**

This app is a supplementary safety tool and cannot guarantee message delivery.

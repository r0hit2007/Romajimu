# Silent SOS: Contacts, AI & Support Architecture

This document details the major technical enhancements, architecture design, and safety protocols implemented across the **Contacts**, **AI Safety Engine**, and **Support Resources** modules in Silent SOS.

---

## 1. Executive Summary

In covert emergency response applications, technical failures can have life-threatening consequences. This overhaul focuses on:
- **Zero-failure offline resilience**: All critical operations (Contacts CRUD, emergency SOS dispatch, crisis directory lookup, emergency message drafting) function autonomously without cellular data or internet connectivity.
- **Subtle safety engineering**: Prompts, message templates, and UI interactions are designed so an adversary looking over the user's shoulder perceives only mundane everyday tasks (recipes, groceries, homework, calculator).
- **Modern state management**: Extracted reusable hooks (`useContacts`, `useSupportResources`, `useAIDraft`, `useDebounce`) providing clean separation of concerns, memoization, and responsive UI.
- **Multi-tier caching & retry resilience**: Persistent AsyncStorage with TTL, in-memory write-through caching, and exponential backoff retries with jitter.

---

## 2. Contacts Module Architecture

### 2.1 Contacts CRUD & Validation (`src/utils/contactValidation.js`)
- **E.164 Phone Sanitization & Validation**:
  - Strips whitespace, parentheses, dashes, and periods.
  - Enforces 7 to 15 digits according to international E.164 recommendations.
  - Detects and rejects dummy/repetitive numbers (e.g. `0000000`).
  - Prettifies phone numbers dynamically for UI readability.
- **Duplicate Detection**:
  - Automatically checks phone numbers against existing trusted contacts on creation and editing to prevent duplicate alerts or confused dispatch.
- **Field-Level Validation**:
  - Direct visual error messages displayed beneath individual fields (`Name`, `Phone`, `Email`) instead of generic top banners.
- **Relationship Categorization**:
  - Contacts are tagged with roles (`Family`, `Friend`, `Partner`, `Neighbor`, `Work`, `Other`) for fast situational filtering and context.
- **Primary Contact Designation**:
  - Designate a `Primary Contact` (⭐) who receives priority alerts or is placed first in the dispatch sequence.
- **Empty-SOS Warning**:
  - If a user has contacts saved but none are armed for emergency broadcast (`selectedForSOS: false`), a prominent warning banner guides the user to arm at least one contact.

### 2.2 Reusable Hook: `useContacts` (`src/hooks/useContacts.js`)
```javascript
const {
  contacts,
  filteredContacts,
  sosContacts,
  otherContacts,
  stats,
  searchQuery,
  setSearchQuery,
  selectedFilter,
  setSelectedFilter,
  modalVisible,
  editingContact,
  formData,
  setFormData,
  formErrors,
  openModal,
  closeModal,
  saveContact,
  deleteContact,
  toggleSOS,
  setPrimary,
} = useContacts();
```
- Real-time debounced search indexing names, phone digits, email addresses, and relationship tags.
- Optimistic updates to avoid UI stutter during flash storage writes.
- Clean delete confirmations with destructive style guards.

---

## 3. AI Safety Service (`src/services/aiService.js`)

### 3.1 Covert Distress Prompt Engineering
The AI prompts for emergency SOS message drafting adhere to strict life-safety constraints:
1. **SMS Length Ceiling**: Maximum 140 characters to leave buffer for live GPS links.
2. **Adversary Camouflage**: Strictly bans trigger words (`help`, `danger`, `emergency`, `police`, `SOS`, `abuse`, `threat`).
3. **Mundane Surface Cover**: The message appears entirely innocent to an observer (e.g., asking about a grocery item, recipe, or ride).
4. **Actionable Hidden Signal**: Creates an unambiguous, urgent reason for the trusted contact to call or come over immediately.

#### Supported Scenarios:
- `casual_checkin`: Everyday check-in tone requesting an immediate callback.
- `pick_me_up`: Simulating a sudden stomach ache, migraine, or car trouble requiring immediate pickup.
- `grocery_errand`: Pretending to check on a forgotten item before leaving a store.
- `work_excuse`: Inquiring about a work shift or schedule needing an urgent response.
- `codeword`: Seamlessly weaving a user-defined codeword into an innocent sentence.

### 3.2 Output Sanitization (`sanitizeAIDraft`)
- Strips markdown code blocks, backticks, quotation marks, and meta-commentary (`"Here is your draft:"`).
- Removes lingering bracketed placeholders (e.g. `[Name]`).
- Cleanly truncates to 160 characters without word splitting.

### 3.3 Robust Offline Fallback Library (`OFFLINE_SOS_TEMPLATES`)
- When airplane mode is active, cellular data is down, or the AI API token is not yet configured, `draftSOSMessage` automatically loads a curated, tested discreet template tailored to the active scenario.
- Guarantees that the app never fails or leaves the user with an empty message during a crisis.

### 3.4 Automated Retry & Structured Error Classification
- **Exponential Backoff**: Wrapped in `withRetry` with jitter to gracefully handle transient network drops and Hugging Face `503 Service Unavailable (Model loading)` or `429 Rate Limit`.
- **Request Timeout**: Raced with a 9-second timeout via `withTimeout` to prevent hanging on weak cellular connections.
- **Typed Errors (`AIServiceError`)**:
  - `NO_TOKEN`, `NETWORK_OFFLINE`, `RATE_LIMIT`, `MODEL_LOADING`, `TIMEOUT`, `API_ERROR`, `MALFORMED_RESPONSE`.

---

## 4. Crisis Support Module (`src/screens/Main/SupportScreen.js`)

### 4.1 Features
- **Immediate Danger Banner**:
  - Prominent emergency quick-dial bar providing instant one-tap dialing for the user's region:
    - 🇺🇸 US: `911`
    - 🇬🇧 UK: `999`
    - 🇮🇳 India: `112`
    - 🇨🇦 Canada: `911`
    - 🇦🇺 Australia: `000`
    - International standards: `112`, `911`.
- **Quick Disguise Escape Hatch**:
  - A prominent `🎭 Disguise` button at the top header immediately switches the interface to the decoy calculator screen or masks the screen if an unauthorized person approaches.
- **Multi-Action Dispatch**:
  - 📞 **Call Hotline**: Dials phone numbers with automated phone-string sanitization.
  - 📱 **Crisis SMS**: Opens native messaging pre-populated with crisis text keywords (e.g., `Text HOME to 741741`, `Text START to 88788`, `Text SHOUT to 85258`).
  - 🌐 **Web & Live Chat**: Opens verified support portals with safety advisories.
  - 🕒 **24/7 Availability Badges**: Highlights around-the-clock crisis lines.
- **Skeleton Shimmer Loading**:
  - `SkeletonCard` pulsing placeholders provide smooth visual feedback while querying the AI or loading cached resources.
- **Instant Search & Category Filtering**:
  - Search across hotlines, shelters, legal aid, mental health counseling, languages, and cities.

### 4.2 Reusable Hook: `useSupportResources` (`src/hooks/useSupportResources.js`)
- Manages multi-tier caching:
  1. **In-Memory Cache**: Instant response on navigation.
  2. **Persistent Storage**: 48-hour TTL cache saved in AsyncStorage (`@silent_sos_support_cache_<region>`).
  3. **AI Discovery Engine**: Gemma queries for fresh regional resources.
  4. **Offline Database**: Comprehensive verified fallback database in `src/constants/resources.js`.

---

## 5. Storage Layer (`src/utils/storageService.js`)

- **In-Memory Write-Through Caching**: Prevents redundant disk I/O on mobile flash storage.
- **Fault-Tolerant JSON Parsing**: Safely handles corrupted disk writes without crashing the application.
- **TTL Cache Support**: Enables background data expiration (`getCachedWithTTL`, `setCachedWithTTL`).
- **Standardized Key Namespaces**:
  - `SETTINGS`: `@silent_sos_settings`
  - `CONTACTS`: `@silent_sos_contacts`
  - `SUPPORT_CACHE_PREFIX`: `@silent_sos_support_cache_`
  - `AI_DRAFTS_CACHE`: `@silent_sos_ai_drafts`

---

## 6. Verification and Safety Checklist

| Feature | Requirement | Status |
| :--- | :--- | :--- |
| Contacts CRUD | Create, Read, Update, Delete with confirmation | ✅ Verified |
| Contact Validation | E.164 phone regex, name limits, duplicate detection | ✅ Verified |
| Search Performance | Debounced real-time search across contacts and support | ✅ Verified |
| Modal Interface | KeyboardAvoidingView, category selector, SOS switches | ✅ Verified |
| AI Prompt Generation | Covert distress rules, character limit, zero trigger words | ✅ Verified |
| AI Fallback | Instant offline scenario templates library | ✅ Verified |
| Retry Mechanism | Exponential backoff with jitter on API / network error | ✅ Verified |
| Multi-tier Caching | In-memory + AsyncStorage with 48h TTL | ✅ Verified |
| Support Quick Actions | Direct phone calling, SMS text lines, web portals | ✅ Verified |
| Disguise Escape Hatch | Instant one-tap switch to calculator decoy | ✅ Verified |
| Reusable Hooks | `useContacts`, `useSupportResources`, `useAIDraft`, `useDebounce` | ✅ Verified |
| Offline Compatibility | 100% operational without internet connectivity | ✅ Verified |

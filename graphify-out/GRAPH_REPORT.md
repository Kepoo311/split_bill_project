# Graph Report - SplitBillApp  (2026-10-23)

## Corpus Check
- 32 files · ~58,181 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 202 nodes · 388 edges · 8 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- UI Shell & Navigation
- OCR Receipt Parsing
- App Entry & Manifest
- Architecture & Build Decisions
- Expo App Config
- Runtime Dependencies
- Split Calculation & Store
- TypeScript Config

## God Nodes (most connected - your core abstractions)
1. `react` - 14 edges
2. `expo` - 13 edges
3. `useBillStore` - 13 edges
4. `useCyberAlert()` - 12 edges
5. `@react-navigation/native-stack` - 11 edges
6. `react-native` - 11 edges
7. `RootStackParamList` - 11 edges
8. `parseReceiptText()` - 10 edges
9. `react-native-safe-area-context` - 9 edges
10. `CyberModal()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `AppNavigator()`  [EXTRACTED]
  App.js → src/navigation/AppNavigator.tsx
- `Expo Router File-Based Routing` --conceptually_related_to--> `React Navigation`  [AMBIGUOUS]
  AGENTS.md → README.md
- `OcrScreen()` --calls--> `useCyberAlert()`  [EXTRACTED]
  src/screens/OcrScreen.tsx → src/hooks/useCyberAlert.tsx
- `SplitScreen()` --calls--> `useCyberAlert()`  [EXTRACTED]
  src/screens/SplitScreen.tsx → src/hooks/useCyberAlert.tsx
- `OcrScreen()` --calls--> `useBillStore`  [EXTRACTED]
  src/screens/OcrScreen.tsx → src/store/billStore.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Receipt Scan to Share Flow** — expo_image_picker, ocr_pipeline, mlkit_text_recognition, receipt_layout_parsing, ocr_review_and_edit, member_assignment, proportional_split_calculation, bill_history_persistence, share_bill_summary [EXTRACTED 1.00]
- **Local-First Privacy Flow** — local_first_architecture, mlkit_text_recognition, asyncstorage, bill_history_persistence, no_cloud_sync_backup [EXTRACTED 1.00]
- **Expo Build and Toolchain Pipeline** — development_build_requirement, eas_build_production_profile, continuous_native_generation, expo_build_properties, proguard_r8_shrinking, expo_install_sdk_pinning [INFERRED 0.85]

## Communities (8 total, 0 thin omitted)

### Community 0 - "UI Shell & Navigation"
Cohesion: 0.10
Nodes (40): expo-camera, expo-clipboard, expo-file-system, expo-image-picker, react, react-native, react-native-safe-area-context, react-native-share (+32 more)

### Community 1 - "OCR Receipt Parsing"
Cohesion: 0.14
Nodes (27): @react-native-ml-kit/text-recognition, OcrScreen(), Props, styles, amountMatches(), detectReceiptExtras(), extractAmounts(), isAddress() (+19 more)

### Community 2 - "App Entry & Manifest"
Cohesion: 0.08
Nodes (26): App(), devDependencies, @types/react, typescript, main, name, private, scripts (+18 more)

### Community 3 - "Architecture & Build Decisions"
Cohesion: 0.08
Nodes (29): AsyncStorage Local Persistence, Bill History Persistence, Continuous Native Generation, Custom Modal UI, Custom Development Build Requirement, EAS Production Build Profile (APK), Expo 57 / React Native 0.86 Stack, expo-build-properties (+21 more)

### Community 4 - "Expo App Config"
Cohesion: 0.09
Nodes (22): backgroundColor, foregroundImage, adaptiveIcon, package, permissions, projectId, expo, android (+14 more)

### Community 5 - "Runtime Dependencies"
Cohesion: 0.10
Nodes (21): dependencies, expo, expo-build-properties, expo-camera, expo-clipboard, expo-dev-client, expo-file-system, expo-image-picker (+13 more)

### Community 6 - "Split Calculation & Store"
Cohesion: 0.26
Nodes (12): Props, SplitScreen(), styles, BillState, BillHistory, BillItem, LearningData, Member (+4 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.50
Nodes (3): expo/tsconfig.base, compilerOptions, extends

## Ambiguous Edges - Review These
- `React Navigation` → `Expo Router File-Based Routing`  [AMBIGUOUS]
  AGENTS.md · relation: conceptually_related_to

## Knowledge Gaps
- **14 isolated node(s):** `expo-build-properties`, `expo-dev-client`, `expo-sharing`, `react-native-screens`, `@types/react` (+9 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 90 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `App Entry & Manifest`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **What connects `expo-build-properties`, `expo-dev-client`, `expo-sharing` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Shell & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.10040816326530612 - nodes in this community are weakly interconnected._
- **Why does `react` connect `UI Shell & Navigation` to `OCR Receipt Parsing`, `App Entry & Manifest`, `Split Calculation & Store`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `OCR Receipt Parsing` be split into smaller, more focused modules?**
  _Cohesion score 0.14022988505747128 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `UI Shell & Navigation` to `OCR Receipt Parsing`, `App Entry & Manifest`, `Split Calculation & Store`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `React Navigation` and `Expo Router File-Based Routing`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
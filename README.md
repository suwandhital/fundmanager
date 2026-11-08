# Fund — Money Manager (NRS)

A clean, minimal, offline-first personal money manager mobile application built with **React Native & Expo**. Designed to match the exact Swiss minimalist tokens, structured layout, and functional architecture specified.

---

## Architecture & Design Implementation

### 1. Theme Tokens & Dark Mode
- Full token system mirroring CSS variables: `--bg`, `--card`, `--raised`, `--track`, `--field-bg`, `--text`, `--muted`, `--line`, `--accent`, `--income`, `--expense`, `--toast-bg`, `--toast-fg`.
- Smooth **Light / Dark Mode** switching accessible via the 3-dots header menu with automatic `StatusBar` synchronization.

### 2. Structured Dark Balance Card
- Permanent dark gradient balance container (`#0f172a` to `#1e293b` in light mode, `#151b28` to `#202a3c` in dark mode).
- Currency: **`NRS `** with `en-IN` numbering format (e.g. `NRS 85,000.00`).
- Period pill tag indicating the active calculation interval (`Today`, `This week`, `This month`, `This year`).
- Dual structured metric boxes:
  - **Income**: Green square with `↑` arrow and period total.
  - **Expense**: Red square with `↓` arrow and period total.

### 3. SVG Line & Area Chart
- Interactive segmented period switcher: `[ Day | Week | Month | Year ]`.
- **Day view**: Exact 24 hourly buckets matching the transaction timestamp hours (12a, 4a, 8a, 12p, 4p, 8p).
- **Week view**: Monday through Sunday timeline.
- **Month view**: Weekly intervals (W1 through W5).
- **Year view**: January through December 12-month timeline.
- Dual series lines for Income (green) and Expense (red) with area gradient fills (`stopOpacity="0.22"` to `0.0`), subtle gridlines, Y-axis labels (`85k`, `42.5k`, `0`), and a legend row.

### 4. Search & Compact Filters
- Instant search across note, category, formatted amount, and date.
- Type filter chips: `[ All | In | Out ]`.
- Date range filtering (`fromDate` → `toDate`) with a quick clear `✕` button when active.

### 5. Color-Shifting CRUD Bottom Sheet
- Dynamic color adaptation based on transaction type:
  - **Expense**: Red sheet handle, red amount input text, red `NRS` prefix, red tinted amount background (`rgba(239, 68, 68, 0.1)`).
  - **Income**: Green sheet handle, green amount input text, green `NRS` prefix, green tinted amount background (`rgba(34, 197, 94, 0.11)`).
- Fields: Amount, Note (`e.g. Momo & chiya`), Category pills, Date, and Recorded Time Hint (`Recorded at 11:05 AM — this time is kept as-is.`).
- Delete button with confirmation when editing existing records.

### 6. Security & Data Integrity
- **Local Isolation**: All records stored per-user under `fm.tx.<uid>`.
- **Password Hashing**: Salted DJB2 cryptographic hash matching the specification.
- **Input Sanitization**: Numeric validation prevents `NaN`, negative, or infinite values; text strings are sanitized and bounded.
- **Backup Export & Import**: Full JSON backup export and import with transaction schema validation.
- **Sample Data**: Complete Nepali sample dataset with 65 realistic transactions (Salary, Momo & chiya, Pathao ride, Bhatbhateni groceries, WorldLink internet, NTC recharge, House rent, etc.).

---

## File Structure

```
├── App.tsx                                  # App root & providers
├── src/
│   ├── types/index.ts                       # Core interfaces (Transaction, User, Period, etc.)
│   ├── theme/
│   │   ├── colors.ts                        # Light & dark theme palettes
│   │   └── ThemeContext.tsx                 # Theme provider & hook
│   ├── context/
│   │   ├── AuthContext.tsx                  # Local auth & password hashing
│   │   ├── TransactionContext.tsx           # Transactions state, balance, search, sync & backup
│   │   └── ToastContext.tsx                 # Floating toast notification system
│   ├── utils/
│   │   ├── crypto.ts                        # UID generator, password hash & sanitizers
│   │   ├── formatters.ts                    # NRS formatting, en-IN locale, date & time helpers
│   │   └── sampleData.ts                    # Realistic Nepali sample dataset (65 items)
│   ├── components/
│   │   ├── Header.tsx                       # Header with sync spin animation & badge
│   │   ├── MenuPopup.tsx                    # 3-dot dropdown menu
│   │   ├── BalanceCard.tsx                  # Dark gradient card with dual metrics
│   │   ├── LineChart.tsx                    # SVG dual-line & area chart
│   │   ├── FilterBar.tsx                    # Search input, In/Out chips, date range
│   │   ├── TransactionList.tsx              # Scrollable list with unsynced dot & metadata
│   │   ├── TransactionSheet.tsx             # Color-shifting CRUD bottom sheet
│   │   ├── ProfileSheet.tsx                 # Profile details & password update modal
│   │   └── layout/MobileFrame.tsx           # Mobile-first viewport container
│   └── screens/
│       ├── AuthScreen.tsx                   # Brand 'F' logo, login, demo load & signup
│       └── MainScreen.tsx                   # Main screen assembling layout & FAB
```

---

## Running the Application

The app is currently active on the Expo dev server:

- **Web Browser**: [http://localhost:8081](http://localhost:8081)
- **Expo Go (Mobile Phone)**: Scan the QR code displayed in the Expo CLI terminal using your iOS or Android device.

Commands:
```bash
npx expo lint       # Verify linting (0 errors)
npx tsc --noEmit    # Verify TypeScript (0 errors)
```

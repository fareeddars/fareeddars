# Fix Loan & Multi-Script Support (Transliteration)

## Task 1: Database Fix (Loan Entry)

Database mein `ledger_entries` table par jo CHECK constraint hai usay update karna hai taake `'loan'` ka lafz block na ho.

- **Action:** Purana constraint drop karein aur naya add karein:

SQL

```
ALTER TABLE public.ledger_entries DROP CONSTRAINT ledger_entries_entry_type_check;
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_entry_type_check 
CHECK (entry_type = ANY (ARRAY['expense','sale','payment','loan']));

```

---

## Task 2: Multi-Language Support (English, Sindhi, Urdu)

### 1. Language Reset Logic (No Storage)

- **Rule:** App hamesha **English** mein start honi chahiye.
- **Implementation:** `LanguageContext.tsx` mein `localStorage` ka istemal **NAHI** karna. Jab bhi page refresh ho ya app band karke kholi jaye, language automatically reset hokar `'en'` (English) ho jaye. User ko har session mein apni zaban khud select karni hogi.

### 2. Transliteration (No Translation)

- **Rule:** Humein lafzon ka tarjuma (meaning) nahi badalna, sirf unka rasm-ul-khat (script) badalna hai.
- **Example:** Agar English mein "Save" likha hai, to Urdu mein usay "سیو" (Save) aur Sindhi mein "سيو" (Save) likha jaye, na ke "محفوظ".
- **Dictionary Sample:**
  - `en: "Dashboard"` ⮕ `ur: "ڈیش بورڈ"` ⮕ `sd: "ڊيش بورڊ"`
  - `en: "Amount"` ⮕ `ur: "اماؤنٹ"` ⮕ `sd: "امائونٽ"`
  - `en: "Farmer"` ⮕ `ur: "فارمر"` ⮕ `sd: "فارمر"`

### 3. Files to Create/Modify

- `src/contexts/LanguageContext.tsx`: Context banayein jo `language`, `t(key)` function, aur `dir` (ltr/rtl) provide kare. Default state `'en'` rakhein.
- `src/i18n/translations.ts`: Is mein tamam UI labels ki list transliteration ke sath shamil karein (Sidebar, Buttons, Form labels, Reports).
- `src/App.tsx`: `LanguageProvider` se wrap karein.
- `src/components/AppLayout.tsx`: Root container par `dir={dir}` apply karein taake Urdu/Sindhi select karne par layout Right-to-Left (RTL) ho jaye.
- `src/pages/Settings.tsx`: Language select karne ke liye 3 radio buttons add karein (English, Sindhi, Urdu).
- `src/pages/Reports.tsx`:
  - Ek **Print Language** selector lagayein.
  - Bill/Report print karte waqt transliterated English words (Urdu/Sindhi script mein) aur **Jameel Noori Nastaleeq** font ka istemal karein.
- `src/index.css`: RTL layout aur Urdu/Sindhi fonts ke liye CSS tweaks add karein.

---

## Summary Table for Implementation


|                      |                                                     |
| -------------------- | --------------------------------------------------- |
| **Feature**          | **Requirement**                                     |
| **Default Language** | Hamesha English (Refresh par reset ho jaye)         |
| **Storage**          | `localStorage` use nahi karna                       |
| **Language Style**   | **Transliteration** (English words in local script) |
| **Layout**           | English (LTR), Urdu/Sindhi (RTL)                    |
| **Fonts**            | Jameel Noori Nastaleeq for Urdu/Sindhi script       |

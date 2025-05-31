
📂 Κωδικοί και Διαπιστευτήρια (Admins)
Οι παρακάτω χρήστες έχουν προστεθεί ως διαχειριστές στο σύστημα, μαζί με τους αντίστοιχους κωδικούς πρόσβασης. Οι κωδικοί είναι αποθηκευμένοι με salted SHA-256 hash για λόγους ασφάλειας.

✉️ Email	🔑 Κωδικός (πριν την κρυπτογράφηση)
alice.admin@example.com	admin123
bob.boss@example.com	supersecret

⚠️ Συνιστάται να αλλάξετε τα παραπάνω στοιχεία πριν την παραγωγική χρήση της εφαρμογής.





# Εφαρμογή Κράτησης & Διαχείρισης Εστιατορίων

Μια ολοκληρωμένη εφαρμογή για κινητά React Native για κράτηση και διαχείριση εστιατορίων, κατασκευασμένη με TypeScript, Supabase και Expo.


## 🚀 Λειτουργίες

### Για Πελάτες
- **Περιήγηση Εστιατορίων**: Ανακαλύψτε εστιατόρια με λεπτομερείς πληροφορίες, εικόνες και μενού
- **Κράτηση Τραπεζιού**: Επιλέξτε τραπέζια, ημερομηνία/ώρα και κάντε κρατήσεις
- **Ενημερώσεις σε Πραγματικό Χρόνο**: Λάβετε άμεσες ειδοποιήσεις για την κατάσταση της κράτησης
- **Διαχείριση Προφίλ**: Διαχειριστείτε προσωπικές πληροφορίες, δείτε ιστορικό κρατήσεων
- **Προβολή Μενού**: Πρόσβαση σε μενού εστιατορίων σε μορφή PDF

### Για Ιδιοκτήτες/Διαχειριστές Εστιατορίων
- **Διαχείριση Καταστήματος**: Δημιουργία, επεξεργασία και διαχείριση πληροφοριών εστιατορίου
- **Διαχείριση Τραπεζιών**: Διαμόρφωση τραπεζιών με χωρητικότητα, τοποθεσία (εσωτερικό/εξωτερικό), προτιμήσεις καπνίσματος
- **Διαχείριση Κρατήσεων**: Έγκριση/απόρριψη κρατήσεων, προβολή λεπτομερειών κράτησης
- **Μεταφόρτωση Εικόνων & Μενού**: Ανέβασμα εικόνων εστιατορίου και αρχείων μενού με επικύρωση
- **Ειδοποιήσεις σε Πραγματικό Χρόνο**: Άμεσες ειδοποιήσεις για νέα αιτήματα κράτησης
- **Μαζικές Λειτουργίες**: Έγκριση πολλαπλών κρατήσεων ταυτόχρονα

## 🛠 Τεχνολογικό Stack

### Front-End
- **UI Framework**: React Native με TypeScript
- **Διαχείριση Κατάστασης**: React Context API και Hooks
- **Πλοήγηση**: React Navigation (Stack και Tab navigators)
- **Στυλ**: Tailwind-inspired styling με custom components
- **Animations**: React Native Animated API
- **Διαχείριση Εικόνων**: Expo ImagePicker
- **Διαχείριση Αρχείων**: Expo DocumentPicker, FileSystem
- **Ασφάλεια**: Expo Crypto για hashing, custom επικύρωση αρχείων

### Back-End
- **Server**: Express.js με TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Express Sessions
- **File Upload**: Multer
- **Password Hashing**: Crypto (SHA-256)
- **File Storage**: Supabase Storage
- **CORS Protection**: Express CORS middleware

## 📱 Επισκόπηση Οθονών

### Αυθεντικοποίηση
- `LoginScreen` - Αυθεντικοποίηση με email/password
- `SignUpScreen` - Εγγραφή χρήστη

### Οθόνες Πελατών
- `BookingScreen` - Κύρια οθόνη περιήγησης καταστημάτων
- `StoreDetailScreen` - Λεπτομερής προβολή εστιατορίου με δυνατότητα κράτησης
- `ProfileScreen` - Προφίλ χρήστη και ιστορικό κρατήσεων

### Οθόνες Διαχειριστών
- `AdminStoresScreen` - Πίνακας ελέγχου διαχείρισης καταστημάτων
- `AdminUserProfileScreen` - Διαχείριση προφίλ διαχειριστή
- `StoreFormScreen` - Δημιουργία/επεξεργασία λεπτομερειών εστιατορίου
- `BookingListScreen` - Προβολή και διαχείριση κρατήσεων
- `TablesList` - Ολοκληρωμένη διαχείριση τραπεζιών με φιλτράρισμα και ταξινόμηση

## 🏗 Αρχιτεκτονική Συστήματος

### Front-End Architecture

#### Δομή Πλοήγησης
- Stack Navigator για την κύρια ροή της εφαρμογής
- Tab Navigator για διεπαφές βασισμένες σε ρόλους (πελάτης vs διαχειριστής)
- Υποστήριξη deep linking για ειδοποιήσεις
- Παράμετροι συγκεκριμένοι για κάθε οθόνη για context

#### Διαχείριση Κατάστασης
- React Hooks (useState, useEffect, useCallback, useMemo)
- Custom hooks για ανάκτηση δεδομένων και caching
- Optimistic UI updates για καλύτερη εμπειρία χρήστη
- Memoization για βελτιστοποίηση απόδοσης

### Back-End Architecture

#### Λειτουργίες του Συστήματος

**🔐 Αυθεντικοποίηση**
- Εγγραφή χρηστών και διαχειριστών
- Σύνδεση/Αποσύνδεση με sessions
- Αλλαγή κωδικού πρόσβασης
- Development mode με bypass token

**🏪 Διαχείριση Καταστημάτων**
- Δημιουργία, ενημέρωση, διαγραφή καταστημάτων
- Μεταφόρτωση μενού (PDF)
- Μεταφόρτωση εικόνων καταστημάτων
- Δημόσια προβολή καταστημάτων

**🪑 Διαχείριση Τραπεζιών**
- Δημιουργία και διαχείριση τραπεζιών ανά κατάστημα
- Ενημέρωση κατάστασης (διαθέσιμο, κρατημένο, κατειλημμένο)
- Ρυθμίσεις χωρητικότητας και τοποθεσίας

**📅 Σύστημα Κρατήσεων**
- Δημιουργία κρατήσεων από χρήστες
- Προβολή κρατήσεων χρήστη
- Ακύρωση κρατήσεων
- Αυτόματη ενημέρωση κατάστασης τραπεζιών

**👥 Διαχείριση Διαχειριστών**
- Δημιουργία νέων διαχειριστών
- Διαγραφή διαχειριστών
- Προστασία από αυτο-διαγραφή

**📁 Διαχείριση Αρχείων**
- Ασφαλής μεταφόρτωση αρχείων με validation
- Υποστήριξη PDF για μενού
- Υποστήριξη εικόνων (JPG, PNG)
- Αυτόματη διαγραφή παλιών αρχείων

## 📊 Database Schema

### Supabase Database Tables

\`\`\`sql
-- Πίνακας χρηστών
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Πίνακας διαχειριστών
CREATE TABLE admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Πίνακας καταστημάτων
CREATE TABLE stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  menu_pdf_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Πίνακας τραπεζιών
CREATE TABLE tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  location TEXT DEFAULT 'in',
  smoking_allowed BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Πίνακας κρατήσεων
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  booked_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### Supabase Storage Buckets
- `menus` - Για PDF αρχεία μενού
- `images` - Για εικόνες καταστημάτων

## 🔌 API Endpoints

### Δημόσια Endpoints
- `GET /health` - Health check
- `POST /login` - Σύνδεση
- `POST /register` - Εγγραφή
- `GET /stores-public` - Δημόσια λίστα καταστημάτων

### Προστατευμένα Endpoints (απαιτούν authentication)

#### Χρήστες
- `POST /logout` - Αποσύνδεση
- `GET /profile` - Προφίλ χρήστη
- `PUT /profile` - Ενημέρωση προφίλ
- `PUT /change-password` - Αλλαγή κωδικού

#### Καταστήματα
- `GET /stores` - Λίστα καταστημάτων
- `GET /stores/:id` - Συγκεκριμένο κατάστημα
- `POST /stores` - Δημιουργία (admin only)
- `PUT /stores/:id` - Ενημέρωση (admin only)
- `DELETE /stores/:id` - Διαγραφή (admin only)

#### Τραπέζια
- `GET /stores/:sid/tables` - Τραπέζια καταστήματος
- `POST /stores/:sid/tables` - Δημιουργία τραπεζιού (admin only)
- `PUT /tables/:tid` - Ενημέρωση τραπεζιού (admin only)
- `PUT /tables/:tid/status` - Ενημέρωση κατάστασης
- `DELETE /tables/:tid` - Διαγραφή (admin only)

#### Κρατήσεις
- `POST /booking` - Δημιουργία κράτησης
- `GET /bookings` - Κρατήσεις χρήστη
- `DELETE /bookings/:id` - Ακύρωση κράτησης

#### Αρχεία
- `POST /stores/:id/menu-upload` - Μεταφόρτωση μενού (admin only)
- `DELETE /stores/:id/menu` - Διαγραφή μενού (admin only)
- `POST /stores/:id/image-upload` - Μεταφόρτωση εικόνας (admin only)
- `DELETE /stores/:id/image` - Διαγραφή εικόνας (admin only)

#### Διαχειριστές
- `GET /admins` - Λίστα διαχειριστών (admin only)
- `POST /admins` - Δημιουργία διαχειριστή (admin only)
- `DELETE /admins/:id` - Διαγραφή διαχειριστή (admin only)

## 🧩 Βασικά Components

### StoreCard Component
- Επαναχρησιμοποιήσιμο component κάρτας για την εμφάνιση πληροφοριών εστιατορίου
- Χαρακτηριστικά:
  - Φόρτωση εικόνων με διαχείριση σφαλμάτων και fallbacks
  - Σύστημα εμφάνισης αξιολόγησης με αστέρια
  - Ετικέτες κατηγοριών
  - Πληροφορίες τοποθεσίας
  - Λειτουργία κοινής χρήσης
  - Lazy loading για βελτιστοποίηση απόδοσης

### TablesList Component
- Ολοκληρωμένη διεπαφή διαχείρισης τραπεζιών
- Χαρακτηριστικά:
  - Φιλτράρισμα με βάση την κατάσταση και όρους αναζήτησης
  - Επιλογές ταξινόμησης
  - Λεπτομερείς προβολές modal
  - Στατιστικά κρατήσεων
  - Κουμπιά ενεργειών για διαχείριση τραπεζιών
  - Responsive σχεδιασμός για διαφορετικά μεγέθη οθόνης

### MainTabs Component
- Πλοήγηση με καρτέλες βασισμένη σε ρόλους
- Διαφορετικές διεπαφές για πελάτες και διαχειριστές
- Animated εικονίδια και δείκτες ενεργής καρτέλας
- Προσαρμοσμένο στυλ για iOS και Android

## 🎨 Σύστημα Σχεδιασμού

### Χρώματα
\`\`\`typescript
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
\`\`\`

### Τυπογραφία
- Συνεπής κλίμακα τυπογραφίας με κατάλληλη ιεραρχία
- Προσαρμοσμένα στυλ για τίτλους, κείμενο σώματος και ετικέτες
- Υποστήριξη για διαφορετικά βάρη γραμματοσειράς

### Σύστημα Διαστημάτων
- Συνεπή περιθώρια και padding για συνεκτικές διατάξεις
- Responsive διαστάσεις βασισμένες στο μέγεθος της οθόνης
- Χρήση του SafeAreaView για συμβατότητα με σύγχρονες συσκευές

### Επαναχρησιμοποιήσιμα Components
- Κουμπιά με διάφορες παραλλαγές (primary, secondary, outline)
- Πεδία εισαγωγής με επικύρωση και ανατροφοδότηση σφαλμάτων
- Κάρτες και λίστες για εμφάνιση δεδομένων
- Modals και popovers για αλληλεπιδράσεις

## 🔐 Ασφάλεια

### Front-End Security
- File upload validation με content verification
- Environment variable management
- Secure image και document storage
- Role-based access control

### Back-End Security
- Κατακερματισμός κωδικών με SHA-256 και salt
- Validation αρχείων για ασφάλεια
- Session-based authentication
- CORS protection
- File type validation
- Admin-only endpoints protection

## 🚀 Εγκατάσταση & Εκτέλεση

### Front-End Setup

1. Εγκατάσταση εξαρτήσεων:
   \`\`\`bash
   npm install
   \`\`\`

2. Διαμορφώστε μεταβλητές περιβάλλοντος στο αρχείο .env:
   \`\`\`
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   \`\`\`

3. Εκτελέστε την εφαρμογή:
   \`\`\`bash
   npx expo start
   \`\`\`

### Back-End Setup

1. Εγκατάσταση εξαρτήσεων:
   \`\`\`bash
   npm install
   npm install multer express-session @types/multer @types/express-session
   \`\`\`

2. Μεταβλητές περιβάλλοντος (.env):
   \`\`\`
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   SESSION_SECRET=your_random_session_secret
   PORT=3000
   NODE_ENV=development
   DEV_ADMIN_TOKEN=dev-admin-token
   \`\`\`

3. Εκτέλεση server:
   \`\`\`bash
   npm run dev
   \`\`\`

Ο server θα τρέξει στο http://localhost:3000

## 📁 Δομή Project

\`\`\`
restaurant-booking-app/
├── frontend/                  # React Native App
│   ├── components/
│   │   ├── StoreCard.tsx
│   │   └── ...
│   ├── screens/
│   │   ├── AdminStoresScreen.tsx
│   │   ├── BookingScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   └── ...
│   ├── utils/
│   │   ├── auth.ts
│   │   ├── booking-api.tsx
│   │   ├── file-validator.ts
│   │   └── supabase.ts
│   ├── App.tsx
│   ├── MainTabs.tsx
│   └── babel.config.js
│
├── backend/                   # Express.js Server
│   ├── src/
│   │   ├── server.ts         # Κύριο αρχείο server
│   │   ├── utils/
│   │   │   └── hash.ts       # Password hashing
│   │   ├── types/
│   │   │   └── express-session.d.ts
│   │   └── config/
│   │       └── supabaseClient.ts
│   ├── package.json
│   └── tsconfig.json
│
└── database/                  # Supabase Schema
    ├── tables.sql
    └── storage-buckets.sql
\`\`\`

## 📱 Λεπτομέρειες Οθονών

### LoginScreen
- Φόρμα εισόδου με επικύρωση email και κωδικού πρόσβασης
- Χειρισμός σφαλμάτων αυθεντικοποίησης
- Σύνδεσμος προς την οθόνη εγγραφής
- Υποστήριξη για λειτουργία ανάπτυξης

### BookingScreen
- Λίστα εστιατορίων με δυνατότητα αναζήτησης και φιλτραρίσματος
- Χρήση του StoreCard component για εμφάνιση εστιατορίων
- Pull-to-refresh για ανανέωση δεδομένων
- Infinite scroll με pagination

### StoreDetailScreen
- Λεπτομερής προβολή εστιατορίου με εικόνες και πληροφορίες
- Φόρμα κράτησης με επιλογή ημερομηνίας/ώρας και αριθμού ατόμων
- Προβολή διαθέσιμων τραπεζιών
- Προβολή μενού σε μορφή PDF

### TablesList
- Διαχείριση τραπεζιών με φιλτράρισμα και ταξινόμηση
- Στατιστικά κρατήσεων
- Λεπτομερείς προβολές modal για κρατήσεις
- Κουμπιά ενεργειών για έγκριση/απόρριψη κρατήσεων

## 🔄 Development Mode

### Front-End Development Mode
- Αυτόματη ενεργοποίηση dev mode σε development
- Bypass authentication για testing
- Admin privileges για authorized emails

### Back-End Development Mode
Στο development mode μπορείτε να χρησιμοποιήσετε το header:
\`\`\`
x-dev-admin-token: dev-admin-token
\`\`\`
Αυτό σας δίνει πλήρη admin δικαιώματα χωρίς authentication.

## 📈 Βελτιστοποιήσεις Απόδοσης

### Front-End
- Lazy loading με FlatList virtualization
- Caching και βελτιστοποίηση εικόνων
- Memoized components και callbacks με React.memo
- Αποδοτικό re-rendering
- Pagination για μεγάλα σύνολα δεδομένων
- Optimistic UI updates

### Back-End
- Database indexing για βελτιστοποίηση queries
- File upload validation για ασφάλεια
- Session management για authentication
- CORS configuration για security
- Error handling και logging

## 📱 Υποστήριξη Πλατφόρμας

- iOS και Android μέσω React Native
- Expo managed workflow για εύκολη ανάπτυξη
- Safe area handling για σύγχρονες συσκευές
- Platform-specific optimizations

## 🔄 Ροή Ανάπτυξης

- TypeScript για ασφάλεια τύπων
- Component-based architecture
- Custom hooks για επιχειρηματική λογική
- Comprehensive error handling
- Performance optimizations με memoization
- Responsive design patterns

Αυτή η εφαρμογή επιδεικνύει σύγχρονες πρακτικές ανάπτυξης full-stack με έμφαση στην εμπειρία χρήστη, την απόδοση και τη συντηρησιμότητα.


⚠️ Πιθανά Προβλήματα
🛑 Η εφαρμογή δεν λειτουργεί;
Είναι πιθανό να έχει διαγραφεί η βάση δεδομένων στο Supabase λόγω του Free Tier.

Η Supabase διαγράφει αυτόματα βάσεις που μένουν ανενεργές για πάνω από 7 ημέρες.

📧 Τι να κάνετε:
Εάν αντιμετωπίσετε τέτοιο πρόβλημα, παρακαλώ επικοινωνήστε:

✉️ chrisdoom500@gmail.com

🎓 cdoudoumis22b@amcstudent.edu.gr

Θα προχωρήσω άμεσα σε επαναφορά της βάσης (restore).

💡 Εναλλακτική λύση:
Μπορείτε επίσης να χρησιμοποιήσετε το αρχείο schema.sql για να:

🛠️ στήσετε τη βάση τοπικά

🚀 τρέξετε την εφαρμογή offline
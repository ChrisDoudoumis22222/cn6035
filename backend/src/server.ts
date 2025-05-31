import "dotenv/config"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import express, { type NextFunction, type Request, type Response } from "express"
import cors from "cors"
import session from "express-session"
import multer from "multer"
import { createClient } from "@supabase/supabase-js"
import { verifyPassword, hashPassword } from "./utils/hash"
import type { Express } from "express" // Import Express type for Multer file

// Create Supabase client
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)

// Extend session data type
declare module "express-session" {
  interface SessionData {
    userId?: string
    isAdmin?: boolean
  }
}
type SessReq = Request & { session: session.Session & Partial<session.SessionData> }

// Create Express app
const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET ?? crypto.randomBytes(48).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1_800_000, // 30 minutes
    },
  }),
)

// Development mode settings
const DEV_MODE = process.env.NODE_ENV !== "production"
const DEV_ADMIN_TOKEN = process.env.DEV_ADMIN_TOKEN || "dev-admin-token"

// Middleware to check for dev token and bypass auth if valid
const checkDevToken = (req: Request, res: Response, next: NextFunction) => {
  // Only allow in development mode
  if (!DEV_MODE) return next()

  const devToken = req.headers["x-dev-admin-token"]
  if (devToken === DEV_ADMIN_TOKEN) {
    // Set session data for dev admin
    ;(req as SessReq).session.userId = "dev-admin-id"
    ;(req as SessReq).session.isAdmin = true
  }

  next()
}

// Add the dev token middleware
app.use(checkDevToken)

// File storage configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(__dirname, "uploads")
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (_req, file, cb) => {
      const suffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
      cb(null, `menu-${suffix}${path.extname(file.originalname)}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb: multer.FileFilterCallback) => {
    const ok = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    if (ok.includes(file.mimetype)) cb(null, true)
    else cb(new Error("Invalid file type — only PDF, JPG, PNG"))
  },
})

// File security validation
async function validateFileForSecurity(
  filePath: string,
  mimeType: string,
): Promise<{ isValid: boolean; message?: string }> {
  try {
    const buf = Buffer.alloc(8)
    const fd = fs.openSync(filePath, "r")
    fs.readSync(fd, buf, 0, 8, 0)
    fs.closeSync(fd)

    if (mimeType === "application/pdf") {
      if (buf.toString("ascii", 0, 5) !== "%PDF-") return { isValid: false, message: "Bad PDF signature" }
      const txt = fs.readFileSync(filePath, "utf8")
      for (const p of ["/JS ", "eval(", "script"]) {
        if (txt.includes(p)) return { isValid: false, message: `Suspicious content: ${p}` }
      }
    } else if (mimeType.startsWith("image/")) {
      if (/jpe?g/.test(mimeType)) {
        if (buf[0] !== 0xff || buf[1] !== 0xd8) return { isValid: false, message: "Bad JPEG header" }
      }
      if (mimeType === "image/png") {
        if (buf.toString("hex", 0, 8) !== "89504e470d0a1a0a") return { isValid: false, message: "Bad PNG header" }
      }
    }

    return { isValid: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("Validation error", msg)
    return { isValid: false, message: msg }
  }
}

// Auth middleware with dev mode support
const auth = (req: SessReq, res: Response, next: NextFunction) => {
  // Check for dev token in development mode
  if (DEV_MODE && req.headers["x-dev-admin-token"] === DEV_ADMIN_TOKEN) {
    return next()
  }

  // Regular auth check
  return req.session.userId ? next() : res.status(401).json({ error: "auth" })
}

// Admin middleware with dev mode support
const admin = (req: SessReq, res: Response, next: NextFunction) => {
  // Check for dev token in development mode
  if (DEV_MODE && req.headers["x-dev-admin-token"] === DEV_ADMIN_TOKEN) {
    return next()
  }

  // Regular admin check
  return req.session.isAdmin ? next() : res.status(403).json({ error: "admin only" })
}

// Public routes

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    devMode: DEV_MODE,
  })
})

// Login
app.post("/login", async (req: SessReq, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: "missing" })

  const E = email.trim().toLowerCase()

  // admins →
  let { data: row } = await supabase.from("admins").select("id,salt,password_hash").eq("email", E).maybeSingle()
  if (row && (await verifyPassword(password, row.password_hash, row.salt))) {
    req.session.userId = row.id
    req.session.isAdmin = true
    return res.json({ isAdmin: true })
  }
  // users →
  ;({ data: row } = await supabase.from("profiles").select("id,salt,password_hash").eq("email", E).maybeSingle())
  if (!row || !(await verifyPassword(password, row.password_hash, row.salt)))
    return res.status(401).json({ error: "bad creds" })

  req.session.userId = row.id
  req.session.isAdmin = false
  res.json({ isAdmin: false })
})

// Logout
app.post("/logout", auth, (req: SessReq, res) => {
  req.session.destroy(() => res.clearCookie("sid").json({ done: true }))
})

// Register
app.post("/register", async (req: Request, res) => {
  const { email, password, name } = req.body
  if (!email || !password || !name) return res.status(400).json({ error: "missing fields" })

  const E = email.trim().toLowerCase()

  // Check if email already exists
  const { data: existingUser } = await supabase.from("profiles").select("id").eq("email", E).maybeSingle()

  if (existingUser) return res.status(400).json({ error: "email already registered" })

  // Hash password
  const { hash, salt } = await hashPassword(password)

  // Create user
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      email: E,
      name,
      password_hash: hash,
      salt,
    })
    .select("id")
    .single()

  if (error) return res.status(500).json({ error: error.message })

  res.status(201).json({ success: true, userId: data.id })
})

// Public stores endpoint (no auth required)
app.get("/stores-public", async (_req, res) => {
  try {
    const { data, error } = await supabase.from("stores").select("*").order("created_at")

    if (error) {
      console.error("Error fetching public stores:", error)
      return res.status(500).json({ error: error.message })
    }

    res.json(data || [])
  } catch (e) {
    console.error("Unexpected error in /stores-public:", e)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Protected routes

// Get user profile
app.get("/profile", auth, async (req: SessReq, res) => {
  const table = req.session.isAdmin ? "admins" : "profiles"
  const { data, error } = await supabase
    .from(table)
    .select("email,name,created_at")
    .eq("id", req.session.userId)
    .maybeSingle()

  if (error || !data) return res.status(500).json({ error: error?.message || "User not found" })

  res.json({ ...data, isAdmin: req.session.isAdmin })
})

// Update profile
app.put("/profile", auth, async (req: SessReq, res) => {
  const { name, email } = req.body
  const table = req.session.isAdmin ? "admins" : "profiles"

  // Update profile
  const { error } = await supabase.from(table).update({ name, email }).eq("id", req.session.userId)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ success: true })
})

// Change password
app.put("/change-password", auth, async (req: SessReq, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "missing fields" })

  const table = req.session.isAdmin ? "admins" : "profiles"

  // Get current user
  const { data: user } = await supabase
    .from(table)
    .select("salt,password_hash")
    .eq("id", req.session.userId)
    .maybeSingle()

  if (!user) return res.status(404).json({ error: "user not found" })

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.password_hash, user.salt)
  if (!isValid) return res.status(401).json({ error: "incorrect password" })

  // Hash new password
  const { hash, salt } = await hashPassword(newPassword)

  // Update password
  const { error } = await supabase.from(table).update({ password_hash: hash, salt }).eq("id", req.session.userId)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ success: true })
})

// Store Management

// Get all stores
app.get("/stores", auth, async (_req, res) => {
  const { data, error } = await supabase.from("stores").select("*").order("created_at")

  if (error) return res.status(500).json({ error: error.message })

  res.json(data || [])
})

// Get a single store
app.get("/stores/:id", auth, async (req, res) => {
  const { data, error } = await supabase.from("stores").select("*").eq("id", req.params.id).maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: "store not found" })

  res.json(data)
})

// Create a new store
app.post("/stores", auth, admin, async (req, res) => {
  const { name, address, city } = req.body
  if (!name?.trim()) return res.status(400).json({ error: "name required" })

  const { data, error } = await supabase.from("stores").insert({ name, address, city }).select("id").single()

  if (error) return res.status(500).json({ error: error.message })

  res.status(201).json({ id: data.id, ok: true })
})

// Update a store
app.put("/stores/:id", auth, admin, async (req, res) => {
  const { name, address, city } = req.body
  if (!name?.trim()) return res.status(400).json({ error: "name required" })

  const { error } = await supabase.from("stores").update({ name, address, city }).eq("id", req.params.id)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ ok: true })
})

// Delete a store
app.delete("/stores/:id", auth, admin, async (req: SessReq, res) => {
  const id = req.params.id

  // Delete child tables
  await supabase.from("tables").delete().eq("store_id", id)

  // Delete menu file (ignore failure)
  const { data: st } = await supabase.from("stores").select("menu_pdf_url,image_url").eq("id", id).maybeSingle()

  if (st?.menu_pdf_url) {
    const fn = st.menu_pdf_url.split("/").pop()!
    await supabase.storage.from("menus").remove([fn])
  }

  if (st?.image_url) {
    const fn = st.image_url.split("/").pop()!
    await supabase.storage.from("images").remove([fn])
  }

  // Delete store
  const { error } = await supabase.from("stores").delete().eq("id", id)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ ok: true })
})

// Table Management

// Get tables for a store
app.get("/stores/:sid/tables", auth, async (req, res) => {
  const { data, error } = await supabase.from("tables").select("*").eq("store_id", req.params.sid).order("name")

  if (error) return res.status(500).json({ error: error.message })

  res.json(data || [])
})

// Create a new table
app.post("/stores/:sid/tables", auth, admin, async (req, res) => {
  const { name, capacity, location, smoking_allowed } = req.body
  if (!name?.trim()) return res.status(400).json({ error: "name required" })

  const { data, error } = await supabase
    .from("tables")
    .insert({
      store_id: req.params.sid,
      name,
      capacity: Number.parseInt(capacity) || 4,
      location: location || "in",
      smoking_allowed: !!smoking_allowed,
      status: "available",
    })
    .select("id")
    .single()

  if (error) return res.status(500).json({ error: error.message })

  res.status(201).json({ id: data.id, ok: true })
})

// Update a table
app.put("/tables/:tid", auth, admin, async (req, res) => {
  const { name, capacity, location, smoking_allowed } = req.body
  if (!name?.trim()) return res.status(400).json({ error: "name required" })

  const { error } = await supabase
    .from("tables")
    .update({
      name,
      capacity: Number.parseInt(capacity) || 4,
      location: location || "in",
      smoking_allowed: !!smoking_allowed,
    })
    .eq("id", req.params.tid)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ ok: true })
})

// Update table status
app.put("/tables/:tid/status", auth, async (req, res) => {
  const { status } = req.body
  if (!["available", "reserved", "occupied"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" })
  }

  const { error } = await supabase.from("tables").update({ status }).eq("id", req.params.tid)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ ok: true })
})

// Delete a table
app.delete("/tables/:tid", auth, admin, async (req: SessReq, res) => {
  // Check if table has bookings
  const { data: bookings } = await supabase.from("bookings").select("id").eq("table_id", req.params.tid).limit(1)

  if (bookings && bookings.length > 0) {
    // Delete associated bookings first
    await supabase.from("bookings").delete().eq("table_id", req.params.tid)
  }

  const { error } = await supabase.from("tables").delete().eq("id", req.params.tid)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ ok: true })
})

// File Management

// Upload menu file
app.post(
  "/stores/:id/menu-upload",
  auth,
  admin,
  upload.single("menuFile"),
  async (req: SessReq & { file?: Express.Multer.File }, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" })

      const f = req.file
      const storeId = req.params.id
      const v = await validateFileForSecurity(f.path, f.mimetype)
      if (!v.isValid) {
        fs.unlinkSync(f.path)
        return res.status(400).json({ error: v.message })
      }

      const ext = path.extname(f.originalname).toLowerCase()
      const fname = `menu_${storeId}_${Date.now()}${ext}`
      const buf = fs.readFileSync(f.path)
      fs.unlinkSync(f.path)

      const up = await supabase.storage.from("menus").upload(fname, buf, { contentType: f.mimetype })
      if (up.error) return res.status(500).json({ error: up.error.message })

      const { publicUrl } = supabase.storage.from("menus").getPublicUrl(fname).data
      const { error } = await supabase.from("stores").update({ menu_pdf_url: publicUrl }).eq("id", storeId)

      if (error) return res.status(500).json({ error: error.message })

      res.json({ url: publicUrl })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
      res.status(500).json({ error: msg })
    }
  },
)

// Delete menu file
app.delete("/stores/:id/menu", auth, admin, async (req, res) => {
  const { data } = await supabase.from("stores").select("menu_pdf_url").eq("id", req.params.id).maybeSingle()

  if (!data?.menu_pdf_url) return res.status(404).json({ error: "no menu file found" })

  const fn = data.menu_pdf_url.split("/").pop()!
  await supabase.storage.from("menus").remove([fn])

  await supabase.from("stores").update({ menu_pdf_url: null }).eq("id", req.params.id)

  res.json({ ok: true })
})

// Upload store image
app.post(
  "/stores/:id/image-upload",
  auth,
  admin,
  upload.single("imageFile"),
  async (req: SessReq & { file?: Express.Multer.File }, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" })

      const f = req.file
      const storeId = req.params.id

      // Validate file is an image
      if (!f.mimetype.startsWith("image/")) {
        fs.unlinkSync(f.path)
        return res.status(400).json({ error: "File must be an image" })
      }

      const v = await validateFileForSecurity(f.path, f.mimetype)
      if (!v.isValid) {
        fs.unlinkSync(f.path)
        return res.status(400).json({ error: v.message })
      }

      const ext = path.extname(f.originalname).toLowerCase()
      const fname = `store_${storeId}_${Date.now()}${ext}`
      const buf = fs.readFileSync(f.path)
      fs.unlinkSync(f.path)

      const up = await supabase.storage.from("images").upload(fname, buf, { contentType: f.mimetype })
      if (up.error) return res.status(500).json({ error: up.error.message })

      const { publicUrl } = supabase.storage.from("images").getPublicUrl(fname).data

      // Delete old image if exists
      const { data: store } = await supabase.from("stores").select("image_url").eq("id", storeId).maybeSingle()

      if (store?.image_url) {
        const oldFn = store.image_url.split("/").pop()!
        await supabase.storage.from("images").remove([oldFn])
      }

      const { error } = await supabase.from("stores").update({ image_url: publicUrl }).eq("id", storeId)

      if (error) return res.status(500).json({ error: error.message })

      res.json({ url: publicUrl })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
      res.status(500).json({ error: msg })
    }
  },
)

// Delete store image
app.delete("/stores/:id/image", auth, admin, async (req, res) => {
  const { data } = await supabase.from("stores").select("image_url").eq("id", req.params.id).maybeSingle()

  if (!data?.image_url) return res.status(404).json({ error: "no image found" })

  const fn = data.image_url.split("/").pop()!
  await supabase.storage.from("images").remove([fn])

  await supabase.from("stores").update({ image_url: null }).eq("id", req.params.id)

  res.json({ ok: true })
})

// Booking Management

// Create a booking
app.post("/booking", auth, async (req: SessReq, res) => {
  const { table_id, booked_at } = req.body
  if (!table_id || !booked_at) return res.status(400).json({ error: "Missing required fields" })

  // Check if table exists and is available
  const { data: table } = await supabase.from("tables").select("id,status").eq("id", table_id).maybeSingle()

  if (!table) return res.status(404).json({ error: "Table not found" })
  if (table.status !== "available") return res.status(400).json({ error: "Table is not available" })

  // Create booking and update table status
  const { data, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      user_id: req.session.userId,
      table_id,
      booked_at,
    })
    .select("id")
    .single()

  if (bookingError) return res.status(500).json({ error: bookingError.message })

  // Update table status to reserved
  const { error: tableError } = await supabase.from("tables").update({ status: "reserved" }).eq("id", table_id)

  if (tableError) return res.status(500).json({ error: tableError.message })

  res.status(201).json({ id: data.id, ok: true })
})

// Get user bookings
app.get("/bookings", auth, async (req: SessReq, res) => {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, booked_at,
      tables(id, name, location, capacity, smoking_allowed, status),
      stores!tables.store_id(id, name, city, address)
    `)
    .eq("user_id", req.session.userId)
    .order("booked_at", { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  res.json(data || [])
})

// Delete a booking
app.delete("/bookings/:id", auth, async (req: SessReq, res) => {
  const bookingId = req.params.id

  // Get the booking to check ownership and get table_id
  const { data: booking } = await supabase
    .from("bookings")
    .select("id,table_id,user_id")
    .eq("id", bookingId)
    .maybeSingle()

  if (!booking) return res.status(404).json({ error: "Booking not found" })

  // Check if user owns the booking or is admin
  if (booking.user_id !== req.session.userId && !req.session.isAdmin) {
    return res.status(403).json({ error: "Not authorized" })
  }

  // Delete the booking
  const { error: deleteError } = await supabase.from("bookings").delete().eq("id", bookingId)

  if (deleteError) return res.status(500).json({ error: deleteError.message })

  // Update table status back to available
  const { error: tableError } = await supabase.from("tables").update({ status: "available" }).eq("id", booking.table_id)

  if (tableError) return res.status(500).json({ error: tableError.message })

  res.json({ ok: true })
})

// Admin Management

// Get all admins
app.get("/admins", auth, admin, async (_req, res) => {
  const { data, error } = await supabase.from("admins").select("id,email,name,created_at").order("created_at")

  if (error) return res.status(500).json({ error: error.message })

  res.json(data || [])
})

// Create a new admin
app.post("/admins", auth, admin, async (req, res) => {
  const { email, password, name } = req.body
  if (!email || !password || !name) return res.status(400).json({ error: "missing fields" })

  const E = email.trim().toLowerCase()

  // Check if email already exists
  const { data: existingAdmin } = await supabase.from("admins").select("id").eq("email", E).maybeSingle()

  if (existingAdmin) return res.status(400).json({ error: "email already registered" })

  // Hash password
  const { hash, salt } = await hashPassword(password)

  // Create admin
  const { data, error } = await supabase
    .from("admins")
    .insert({
      email: E,
      name,
      password_hash: hash,
      salt,
    })
    .select("id")
    .single()

  if (error) return res.status(500).json({ error: error.message })

  res.status(201).json({ success: true, adminId: data.id })
})

// Delete an admin
app.delete("/admins/:id", auth, admin, async (req: SessReq, res) => {
  // Prevent self-deletion
  if (req.params.id === req.session.userId) {
    return res.status(400).json({ error: "Cannot delete your own admin account" })
  }

  const { error } = await supabase.from("admins").delete().eq("id", req.params.id)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ ok: true })
})

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
  if (DEV_MODE) {
    console.log("⚠️ Development mode enabled - auth bypass available")
  }
})

export default app

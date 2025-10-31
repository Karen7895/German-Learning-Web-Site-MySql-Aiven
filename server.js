require("dotenv").config()

const express = require("express")
const path = require("path")
const session = require("express-session")
const bcrypt = require("bcryptjs")

const db = require("./lib/db")

const app = express()
const PORT = process.env.PORT || 3000
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-session-secret"
const ADMIN_EMAIL = "karen12389033@gmail.com"
const STORY_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

// Application middleware
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
)

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null
  res.locals.isAdmin = isAdmin(req.session.user)
  next()
})

// Helpers
function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

async function findUserByEmail(email) {
  const rows = await db.query(
    "SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1",
    [email]
  )
  return rows[0] || null
}

function normalizeEmail(email = "") {
  return email.trim().toLowerCase()
}

function setLoggedInUser(req, user) {
  req.session.user = {
    id: user.id,
    email: user.email,
  }
}

function isAdmin(user) {
  return Boolean(user && user.email === ADMIN_EMAIL)
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl
    return res.redirect("/login")
  }
  next()
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl
    return res.redirect("/login")
  }
  if (!isAdmin(req.session.user)) {
    return res.status(403).render("errors/403")
  }
  next()
}

async function getAllStories() {
  return db.query(
    "SELECT id, title, level, summary, DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at FROM stories ORDER BY created_at DESC, id DESC"
  )
}

async function getStoryById(id) {
  const rows = await db.query(
    "SELECT id, title, level, summary, body, DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at FROM stories WHERE id = ? LIMIT 1",
    [id]
  )
  return rows[0] || null
}

async function getAdjacentStories(id) {
  const prevRows = await db.query(
    "SELECT id, title FROM stories WHERE id < ? ORDER BY id DESC LIMIT 1",
    [id]
  )
  const nextRows = await db.query(
    "SELECT id, title FROM stories WHERE id > ? ORDER BY id ASC LIMIT 1",
    [id]
  )

  return {
    prevStory: prevRows[0] || null,
    nextStory: nextRows[0] || null,
  }
}

async function createStory({ title, level, summary, body, authorId }) {
  const [result] = await db.pool.execute(
    "INSERT INTO stories (title, level, summary, body, author_id) VALUES (?, ?, ?, ?, ?)",
    [title, level, summary, body, authorId]
  )
  return result.insertId
}

// Routes
app.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const stories = await getAllStories()
    res.render("home", { stories })
  })
)

app.get(
  "/story/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const storyId = Number.parseInt(req.params.id, 10)
    if (Number.isNaN(storyId)) {
      return res.status(404).render("errors/404")
    }

    const story = await getStoryById(storyId)
    if (!story) {
      return res.status(404).render("errors/404")
    }

    const { prevStory, nextStory } = await getAdjacentStories(storyId)
    res.render("story", { story, prevStory, nextStory })
  })
)

app.get("/stories/new", requireAdmin, (req, res) => {
  res.render("stories/new", {
    error: null,
    values: {
      title: "",
      level: "A1",
      summary: "",
      body: "",
    },
  })
})

app.post(
  "/stories",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const {
      title = "",
      level = "",
      summary = "",
      body = "",
    } = req.body

    const values = {
      title: title.trim(),
      level: level.trim().toUpperCase(),
      summary: summary.trim(),
      body: body.trim(),
    }

    if (!values.title || !values.summary || !values.body) {
      return res.status(400).render("stories/new", {
        error: "Please fill in all required fields.",
        values,
      })
    }

    if (!STORY_LEVELS.includes(values.level)) {
      return res.status(400).render("stories/new", {
        error: "Please choose a valid level (A1–C2).",
        values,
      })
    }

    const storyId = await createStory({
      ...values,
      authorId: req.session.user.id,
    })

    res.redirect(`/story/${storyId}`)
  })
)

app.get("/about", (req, res) => {
  res.render("about")
})

app.get("/signup", (req, res) => {
  if (req.session.user) {
    return res.redirect("/")
  }
  res.render("signup", { error: null, values: { email: "" } })
})

app.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { email = "", password = "", confirmPassword = "" } = req.body
    const normalizedEmail = normalizeEmail(email)
    const values = { email }

    if (!normalizedEmail || !password || !confirmPassword) {
      return res.status(400).render("signup", {
        error: "Please fill in all fields.",
        values,
      })
    }

    if (password !== confirmPassword) {
      return res.status(400).render("signup", {
        error: "Passwords do not match.",
        values,
      })
    }

    if (password.length < 8) {
      return res.status(400).render("signup", {
        error: "Password must be at least 8 characters.",
        values,
      })
    }

    const existingUser = await findUserByEmail(normalizedEmail)
    if (existingUser) {
      return res.status(400).render("signup", {
        error: "An account already exists for that email.",
        values,
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const [result] = await db.pool.execute(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      [normalizedEmail, passwordHash]
    )

    setLoggedInUser(req, { id: result.insertId, email: normalizedEmail })
    const redirectTo = req.session.returnTo || "/"
    delete req.session.returnTo
    res.redirect(redirectTo)
  })
)

app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/")
  }
  res.render("login", { error: null, values: { email: "" } })
})

app.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email = "", password = "" } = req.body
    const normalizedEmail = normalizeEmail(email)
    const values = { email }

    if (!normalizedEmail || !password) {
      return res.status(400).render("login", {
        error: "Please enter your email and password.",
        values,
      })
    }

    const user = await findUserByEmail(normalizedEmail)
    if (!user) {
      return res.status(400).render("login", {
        error: "Email or password is incorrect.",
        values,
      })
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash)

    if (!passwordMatch) {
      return res.status(400).render("login", {
        error: "Email or password is incorrect.",
        values,
      })
    }

    setLoggedInUser(req, user)
    const redirectTo = req.session.returnTo || "/"
    delete req.session.returnTo
    res.redirect(redirectTo)
  })
)

app.post("/logout", (req, res) => {
  if (!req.session) {
    return res.redirect("/")
  }

  req.session.destroy(() => {
    res.redirect("/")
  })
})

app.use((err, req, res, next) => {
  console.error(err)
  if (res.headersSent) {
    return next(err)
  }
  res.status(500).render("errors/500")
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

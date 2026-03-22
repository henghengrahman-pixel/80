const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");

[
  DATA_DIR,
  PUBLIC_DIR,
  UPLOAD_DIR,
  path.join(UPLOAD_DIR, "sliders"),
  path.join(UPLOAD_DIR, "providers"),
  path.join(UPLOAD_DIR, "games"),
  path.join(ROOT_DIR, "views"),
  path.join(ROOT_DIR, "views", "admin"),
  path.join(PUBLIC_DIR, "css"),
  path.join(PUBLIC_DIR, "js"),
  path.join(PUBLIC_DIR, "images")
].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

app.set("view engine", "ejs");
app.set("views", path.join(ROOT_DIR, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "itsiregar8008-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60 * 12
    }
  })
);

function ensureFile(fileName, defaultValue) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
  }
}

ensureFile("settings.json", {
  siteName: "Live Promo Center",
  siteDescription: "Halaman promo dan katalog game modern",
  runningText: "Selamat datang di Live Promo Center",
  heroBackground: "",
  logoUrl: "",
  loginButtonLink: "#",
  daftarButtonLink: "#",
  promosiButtonLink: "#",
  contactButtonLink: "#",
  adminUsername: "admin",
  adminPassword: "123456",
  seoTitle: "Live Promo Center",
  seoDescription: "Halaman promo dan katalog game modern",
  seoKeywords: "promo, katalog game, provider game, informasi game"
});

ensureFile("sliders.json", []);
ensureFile("providers.json", []);
ensureFile("games.json", []);

function readJSON(fileName, fallback) {
  try {
    const fullPath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(fullPath)) return fallback;
    const raw = fs.readFileSync(fullPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Gagal baca ${fileName}:`, err.message);
    return fallback;
  }
}

function writeJSON(fileName, data) {
  const fullPath = path.join(DATA_DIR, fileName);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
}

function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeText(value = "") {
  return String(value).trim();
}

function jakartaNowParts() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long"
  }).format(now);

  const datePart = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(now);

  const timePart = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);

  return {
    fullDate: `${weekday}, ${datePart}`,
    fullDateTime: `${weekday}, ${datePart} ${timePart} WIB`,
    timePart
  };
}

function randomInt(min, max) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function makeFutureTimeRange() {
  const now = new Date();
  const jakarta = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );

  const startOffsetMinutes = randomInt(10, 240);
  const durationMinutes = randomInt(45, 360);

  const start = new Date(jakarta.getTime() + startOffsetMinutes * 60000);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  return `${pad2(start.getHours())}:${pad2(start.getMinutes())} - ${pad2(
    end.getHours()
  )}:${pad2(end.getMinutes())}`;
}

function randomScore() {
  return randomInt(51, 97);
}

function scoreClass(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function buildPragmaticPattern() {
  const allowed = [
    ["❌", "☑️", "☑️"],
    ["☑️", "❌", "☑️"],
    ["❌", "❌", "☑️"],
    ["☑️", "❌", "❌"],
    ["❌", "☑️", "❌"],
    ["❌", "❌", "❌"]
  ];

  const steps = ["Manual 5", "Manual 7", "Manual 9"];
  const picked = allowed[randomInt(0, allowed.length - 1)];

  return steps.map((step, index) => ({
    label: step,
    state1: picked[index],
    state2: picked[(index + 1) % 3],
    state3: picked[(index + 2) % 3]
  }));
}

function buildDefaultPattern() {
  const stepPool = [
    "Auto 10",
    "Auto 20",
    "Auto 30",
    "Manual 3",
    "Manual 5",
    "Manual 7",
    "Manual 9"
  ];

  const turboPool = ["Turbo On ☑️", "Turbo Off ❌"];
  return Array.from({ length: 3 }).map(() => ({
    label: stepPool[randomInt(0, stepPool.length - 1)],
    turbo: turboPool[randomInt(0, turboPool.length - 1)]
  }));
}

function withDynamicGameData(game) {
  const providerName = sanitizeText(game.providerName).toLowerCase();
  const score = randomScore();

  return {
    ...game,
    score,
    scoreClass: scoreClass(score),
    timeRange: makeFutureTimeRange(),
    pattern:
      providerName === "pragmatic play"
        ? { type: "pragmatic", rows: buildPragmaticPattern() }
        : { type: "default", rows: buildDefaultPattern() }
  };
}

function authRequired(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect("/itsiregar8008");
  }
  next();
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const target = sanitizeText(req.body.uploadType || req.query.uploadType || "misc");
    let dir = UPLOAD_DIR;

    if (target === "slider") dir = path.join(UPLOAD_DIR, "sliders");
    else if (target === "provider") dir = path.join(UPLOAD_DIR, "providers");
    else if (target === "game") dir = path.join(UPLOAD_DIR, "games");

    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || ".jpg").toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File harus gambar"));
    }
    cb(null, true);
  }
});

app.use((req, res, next) => {
  res.locals.isAdmin = !!(req.session && req.session.isAdmin);
  next();
});

app.get("/", (req, res) => {
  const settings = readJSON("settings.json", {});
  const sliders = readJSON("sliders.json", []);
  const providers = readJSON("providers.json", []);
  const games = readJSON("games.json", []);
  const dateInfo = jakartaNowParts();

  const activeProviders = providers
    .filter((p) => p.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const activeGames = games
    .filter((g) => g.isActive !== false)
    .map((g) => withDynamicGameData(g));

  res.render("home", {
    settings,
    sliders: sliders.filter((s) => s.isActive !== false),
    providers: activeProviders,
    games: activeGames,
    updateLabel: dateInfo.fullDate,
    jakartaNow: dateInfo.fullDateTime,
    currentProvider: null
  });
});

app.get("/provider/:slug", (req, res) => {
  const settings = readJSON("settings.json", {});
  const sliders = readJSON("sliders.json", []);
  const providers = readJSON("providers.json", []);
  const games = readJSON("games.json", []);
  const dateInfo = jakartaNowParts();
  const slug = sanitizeText(req.params.slug);

  const activeProviders = providers
    .filter((p) => p.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const provider = activeProviders.find((p) => p.slug === slug);
  if (!provider) {
    return res.status(404).send("Provider tidak ditemukan");
  }

  const filteredGames = games
    .filter((g) => g.isActive !== false && g.providerSlug === slug)
    .map((g) => withDynamicGameData(g));

  res.render("home", {
    settings,
    sliders: sliders.filter((s) => s.isActive !== false),
    providers: activeProviders,
    games: filteredGames,
    updateLabel: dateInfo.fullDate,
    jakartaNow: dateInfo.fullDateTime,
    currentProvider: provider
  });
});

app.get("/api/jakarta-time", (req, res) => {
  return res.json(jakartaNowParts());
});

app.get("/api/games", (req, res) => {
  const providerSlug = sanitizeText(req.query.provider || "");
  const games = readJSON("games.json", [])
    .filter((g) => g.isActive !== false)
    .filter((g) => (providerSlug ? g.providerSlug === providerSlug : true))
    .map((g) => withDynamicGameData(g));

  return res.json({
    success: true,
    items: games,
    jakarta: jakartaNowParts()
  });
});

app.get("/itsiregar8008", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect("/itsiregar8008/dashboard");
  }
  res.render("admin/login", {
    error: ""
  });
});

app.post("/itsiregar8008", (req, res) => {
  const settings = readJSON("settings.json", {});
  const username = sanitizeText(req.body.username);
  const password = sanitizeText(req.body.password);

  if (
    username === sanitizeText(settings.adminUsername || "admin") &&
    password === sanitizeText(settings.adminPassword || "123456")
  ) {
    req.session.isAdmin = true;
    return res.redirect("/itsiregar8008/dashboard");
  }

  return res.render("admin/login", {
    error: "Username atau password salah"
  });
});

app.get("/itsiregar8008/logout", authRequired, (req, res) => {
  req.session.destroy(() => {
    res.redirect("/itsiregar8008");
  });
});

app.get("/itsiregar8008/dashboard", authRequired, (req, res) => {
  const sliders = readJSON("sliders.json", []);
  const providers = readJSON("providers.json", []);
  const games = readJSON("games.json", []);
  const settings = readJSON("settings.json", {});

  res.render("admin/dashboard", {
    counts: {
      sliders: sliders.length,
      providers: providers.length,
      games: games.length
    },
    settings
  });
});

app.get("/itsiregar8008/settings", authRequired, (req, res) => {
  const settings = readJSON("settings.json", {});
  res.render("admin/settings", { settings });
});

app.post("/itsiregar8008/settings", authRequired, (req, res) => {
  const oldSettings = readJSON("settings.json", {});

  const nextSettings = {
    ...oldSettings,
    siteName: sanitizeText(req.body.siteName),
    siteDescription: sanitizeText(req.body.siteDescription),
    runningText: sanitizeText(req.body.runningText),
    heroBackground: sanitizeText(req.body.heroBackground),
    logoUrl: sanitizeText(req.body.logoUrl),
    loginButtonLink: sanitizeText(req.body.loginButtonLink),
    daftarButtonLink: sanitizeText(req.body.daftarButtonLink),
    promosiButtonLink: sanitizeText(req.body.promosiButtonLink),
    contactButtonLink: sanitizeText(req.body.contactButtonLink),
    seoTitle: sanitizeText(req.body.seoTitle),
    seoDescription: sanitizeText(req.body.seoDescription),
    seoKeywords: sanitizeText(req.body.seoKeywords),
    adminUsername: sanitizeText(req.body.adminUsername || oldSettings.adminUsername || "admin"),
    adminPassword: sanitizeText(req.body.adminPassword || oldSettings.adminPassword || "123456")
  };

  writeJSON("settings.json", nextSettings);
  res.redirect("/itsiregar8008/settings");
});

app.get("/itsiregar8008/sliders", authRequired, (req, res) => {
  const sliders = readJSON("sliders.json", []);
  res.render("admin/sliders", { sliders });
});

app.post(
  "/itsiregar8008/sliders",
  authRequired,
  (req, res, next) => {
    req.body.uploadType = "slider";
    next();
  },
  upload.single("image"),
  (req, res) => {
    const sliders = readJSON("sliders.json", []);

    const imageUrl = req.file
      ? `/uploads/sliders/${req.file.filename}`
      : sanitizeText(req.body.imageUrl);

    sliders.push({
      id: makeId("slider"),
      title: sanitizeText(req.body.title),
      subtitle: sanitizeText(req.body.subtitle),
      imageUrl,
      buttonText: sanitizeText(req.body.buttonText || ""),
      buttonLink: sanitizeText(req.body.buttonLink || ""),
      sortOrder: Number(req.body.sortOrder || 0),
      isActive: req.body.isActive === "on",
      createdAt: new Date().toISOString()
    });

    writeJSON("sliders.json", sliders);
    res.redirect("/itsiregar8008/sliders");
  }
);

app.post("/itsiregar8008/sliders/:id/delete", authRequired, (req, res) => {
  const sliders = readJSON("sliders.json", []);
  const id = sanitizeText(req.params.id);
  const next = sliders.filter((item) => item.id !== id);
  writeJSON("sliders.json", next);
  res.redirect("/itsiregar8008/sliders");
});

app.get("/itsiregar8008/providers", authRequired, (req, res) => {
  const providers = readJSON("providers.json", []);
  res.render("admin/providers", { providers });
});

app.post(
  "/itsiregar8008/providers",
  authRequired,
  (req, res, next) => {
    req.body.uploadType = "provider";
    next();
  },
  upload.single("logo"),
  (req, res) => {
    const providers = readJSON("providers.json", []);
    const name = sanitizeText(req.body.name);
    const slug =
      sanitizeText(req.body.slug) ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    const logoUrl = req.file
      ? `/uploads/providers/${req.file.filename}`
      : sanitizeText(req.body.logoUrl);

    providers.push({
      id: makeId("provider"),
      name,
      slug,
      logoUrl,
      sortOrder: Number(req.body.sortOrder || 0),
      isActive: req.body.isActive === "on",
      createdAt: new Date().toISOString()
    });

    writeJSON("providers.json", providers);
    res.redirect("/itsiregar8008/providers");
  }
);

app.post("/itsiregar8008/providers/:id/delete", authRequired, (req, res) => {
  const providers = readJSON("providers.json", []);
  const games = readJSON("games.json", []);
  const id = sanitizeText(req.params.id);

  const provider = providers.find((p) => p.id === id);
  const nextProviders = providers.filter((p) => p.id !== id);
  writeJSON("providers.json", nextProviders);

  if (provider) {
    const nextGames = games.filter((g) => g.providerSlug !== provider.slug);
    writeJSON("games.json", nextGames);
  }

  res.redirect("/itsiregar8008/providers");
});

app.get("/itsiregar8008/games", authRequired, (req, res) => {
  const games = readJSON("games.json", []);
  const providers = readJSON("providers.json", []);
  res.render("admin/games", { games, providers });
});

app.post(
  "/itsiregar8008/games",
  authRequired,
  (req, res, next) => {
    req.body.uploadType = "game";
    next();
  },
  upload.single("image"),
  (req, res) => {
    const games = readJSON("games.json", []);
    const providers = readJSON("providers.json", []);
    const providerId = sanitizeText(req.body.providerId);
    const provider = providers.find((p) => p.id === providerId);

    if (!provider) {
      return res.status(400).send("Provider tidak ditemukan");
    }

    const imageUrl = req.file
      ? `/uploads/games/${req.file.filename}`
      : sanitizeText(req.body.imageUrl);

    games.push({
      id: makeId("game"),
      title: sanitizeText(req.body.title),
      imageUrl,
      gameLink: sanitizeText(req.body.gameLink || "#"),
      providerId: provider.id,
      providerName: provider.name,
      providerSlug: provider.slug,
      providerLogoUrl: provider.logoUrl,
      labelBadge: sanitizeText(req.body.labelBadge || "HOT"),
      sortOrder: Number(req.body.sortOrder || 0),
      isActive: req.body.isActive === "on",
      createdAt: new Date().toISOString()
    });

    writeJSON("games.json", games);
    res.redirect("/itsiregar8008/games");
  }
);

app.post("/itsiregar8008/games/:id/delete", authRequired, (req, res) => {
  const games = readJSON("games.json", []);
  const id = sanitizeText(req.params.id);
  const next = games.filter((g) => g.id !== id);
  writeJSON("games.json", next);
  res.redirect("/itsiregar8008/games");
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(`Terjadi error: ${err.message}`);
});

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});

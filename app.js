const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const DATA_DIR =
  process.env.DATA_DIR && String(process.env.DATA_DIR).trim()
    ? path.resolve(process.env.DATA_DIR)
    : path.join(ROOT_DIR, "data");

const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const SLIDER_UPLOAD_DIR = path.join(UPLOAD_DIR, "sliders");
const PROVIDER_UPLOAD_DIR = path.join(UPLOAD_DIR, "providers");
const GAME_UPLOAD_DIR = path.join(UPLOAD_DIR, "games");

const ADMIN_PATH = "/itsiregar8008";

const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || "").trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "").trim();
const SESSION_SECRET = String(process.env.SESSION_SECRET || "").trim();
const APP_BASE_URL = String(process.env.APP_BASE_URL || "").replace(/\/+$/, "");

if (!ADMIN_USERNAME) {
  throw new Error("Missing ADMIN_USERNAME in Railway Variables");
}

if (!ADMIN_PASSWORD) {
  throw new Error("Missing ADMIN_PASSWORD in Railway Variables");
}

if (!SESSION_SECRET) {
  throw new Error("Missing SESSION_SECRET in Railway Variables");
}

[
  DATA_DIR,
  UPLOAD_DIR,
  SLIDER_UPLOAD_DIR,
  PROVIDER_UPLOAD_DIR,
  GAME_UPLOAD_DIR,
  PUBLIC_DIR,
  path.join(ROOT_DIR, "views"),
  path.join(ROOT_DIR, "views", "admin"),
  path.join(PUBLIC_DIR, "css"),
  path.join(PUBLIC_DIR, "js"),
  path.join(PUBLIC_DIR, "images")
].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

app.set("view engine", "ejs");
app.set("views", path.join(ROOT_DIR, "views"));
app.set("trust proxy", 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOAD_DIR));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
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

function readJSON(fileName, fallback) {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Gagal baca ${fileName}:`, err.message);
    return fallback;
  }
}

function writeJSON(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
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
  seoTitle: "Live Promo Center",
  seoDescription: "Halaman promo dan katalog game modern",
  seoKeywords: "promo, katalog game, provider game, informasi game"
});

ensureFile("sliders.json", []);
ensureFile("providers.json", []);
ensureFile("games.json", []);

function sanitizeText(value = "") {
  return String(value).trim();
}

function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeSlug(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomInt(min, max) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function shuffleArray(items = []) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

function withDynamicGameData(game, settings = {}) {
  const providerName = sanitizeText(game.providerName).toLowerCase();
  const score = randomScore();
  const gameLink = sanitizeText(settings.loginButtonLink || "#");

  return {
    ...game,
    title: sanitizeText(game.title || game.providerName || "Game"),
    gameLink,
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
    return res.redirect(ADMIN_PATH);
  }
  next();
}

app.use((req, res, next) => {
  res.locals.isAdmin = !!(req.session && req.session.isAdmin);
  res.locals.adminPath = ADMIN_PATH;
  next();
});

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const target = sanitizeText(req.body.uploadType || req.query.uploadType || "misc");
    let dir = UPLOAD_DIR;

    if (target === "slider") dir = SLIDER_UPLOAD_DIR;
    else if (target === "provider") dir = PROVIDER_UPLOAD_DIR;
    else if (target === "game") dir = GAME_UPLOAD_DIR;

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

app.get("/", (req, res) => {
  const settings = readJSON("settings.json", {});
  const sliders = readJSON("sliders.json", []);
  const providers = readJSON("providers.json", []);
  const games = readJSON("games.json", []);
  const dateInfo = jakartaNowParts();

  const activeProviders = providers
    .filter((p) => p.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const activeGames = shuffleArray(
    games
      .filter((g) => g.isActive !== false)
      .map((g) => withDynamicGameData(g, settings))
  );

  res.render("home", {
    settings,
    sliders: sliders.filter((s) => s.isActive !== false),
    providers: activeProviders,
    games: activeGames,
    updateLabel: dateInfo.fullDate,
    jakartaNow: dateInfo.fullDateTime,
    currentProvider: null,
    baseUrl: APP_BASE_URL
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

  const filteredGames = shuffleArray(
    games
      .filter((g) => g.isActive !== false && g.providerSlug === slug)
      .map((g) => withDynamicGameData(g, settings))
  );

  res.render("home", {
    settings,
    sliders: sliders.filter((s) => s.isActive !== false),
    providers: activeProviders,
    games: filteredGames,
    updateLabel: dateInfo.fullDate,
    jakartaNow: dateInfo.fullDateTime,
    currentProvider: provider,
    baseUrl: APP_BASE_URL
  });
});

app.get("/api/jakarta-time", (req, res) => {
  res.json(jakartaNowParts());
});

app.get("/api/games", (req, res) => {
  const settings = readJSON("settings.json", {});
  const providerSlug = sanitizeText(req.query.provider || "");

  const games = shuffleArray(
    readJSON("games.json", [])
      .filter((g) => g.isActive !== false)
      .filter((g) => (providerSlug ? g.providerSlug === providerSlug : true))
      .map((g) => withDynamicGameData(g, settings))
  );

  res.json({
    success: true,
    items: games,
    jakarta: jakartaNowParts()
  });
});

app.get(ADMIN_PATH, (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect(`${ADMIN_PATH}/dashboard`);
  }

  res.render("admin/login", {
    error: ""
  });
});

app.post(ADMIN_PATH, (req, res) => {
  const username = sanitizeText(req.body.username);
  const password = sanitizeText(req.body.password);

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    req.session.adminUsername = ADMIN_USERNAME;
    return res.redirect(`${ADMIN_PATH}/dashboard`);
  }

  return res.status(401).render("admin/login", {
    error: "Username atau password salah"
  });
});

app.get(`${ADMIN_PATH}/logout`, authRequired, (req, res) => {
  req.session.destroy(() => {
    res.redirect(ADMIN_PATH);
  });
});

app.get(`${ADMIN_PATH}/dashboard`, authRequired, (req, res) => {
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

app.get(`${ADMIN_PATH}/settings`, authRequired, (req, res) => {
  const settings = readJSON("settings.json", {});
  res.render("admin/settings", { settings });
});

app.post(`${ADMIN_PATH}/settings`, authRequired, (req, res) => {
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
    seoKeywords: sanitizeText(req.body.seoKeywords)
  };

  writeJSON("settings.json", nextSettings);
  res.redirect(`${ADMIN_PATH}/settings`);
});

app.get(`${ADMIN_PATH}/sliders`, authRequired, (req, res) => {
  const sliders = readJSON("sliders.json", []);
  res.render("admin/sliders", { sliders });
});

app.post(
  `${ADMIN_PATH}/sliders`,
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
    res.redirect(`${ADMIN_PATH}/sliders`);
  }
);

app.post(`${ADMIN_PATH}/sliders/:id/delete`, authRequired, (req, res) => {
  const sliders = readJSON("sliders.json", []);
  const id = sanitizeText(req.params.id);
  const next = sliders.filter((item) => item.id !== id);
  writeJSON("sliders.json", next);
  res.redirect(`${ADMIN_PATH}/sliders`);
});

app.get(`${ADMIN_PATH}/providers`, authRequired, (req, res) => {
  const providers = readJSON("providers.json", []);
  res.render("admin/providers", { providers });
});

app.post(
  `${ADMIN_PATH}/providers`,
  authRequired,
  (req, res, next) => {
    req.body.uploadType = "provider";
    next();
  },
  upload.single("logo"),
  (req, res) => {
    const providers = readJSON("providers.json", []);
    const name = sanitizeText(req.body.name);
    const slug = sanitizeText(req.body.slug) || makeSlug(name);

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
    res.redirect(`${ADMIN_PATH}/providers`);
  }
);

app.post(`${ADMIN_PATH}/providers/:id/delete`, authRequired, (req, res) => {
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

  res.redirect(`${ADMIN_PATH}/providers`);
});

app.get(`${ADMIN_PATH}/games`, authRequired, (req, res) => {
  const games = readJSON("games.json", []);
  const providers = readJSON("providers.json", []);
  res.render("admin/games", { games, providers });
});

app.post(
  `${ADMIN_PATH}/games`,
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
      title: provider.name,
      imageUrl,
      gameLink: "",
      providerId: provider.id,
      providerName: provider.name,
      providerSlug: provider.slug,
      providerLogoUrl: provider.logoUrl,
      labelBadge: "HOT",
      isActive: true,
      createdAt: new Date().toISOString()
    });

    writeJSON("games.json", games);
    res.redirect(`${ADMIN_PATH}/games`);
  }
);

app.post(`${ADMIN_PATH}/games/:id/delete`, authRequired, (req, res) => {
  const games = readJSON("games.json", []);
  const id = sanitizeText(req.params.id);
  const next = games.filter((g) => g.id !== id);
  writeJSON("games.json", next);
  res.redirect(`${ADMIN_PATH}/games`);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(`Terjadi error: ${err.message}`);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server jalan di port ${PORT}`);
  console.log(`DATA_DIR: ${DATA_DIR}`);
  console.log(`UPLOAD_DIR: ${UPLOAD_DIR}`);
  console.log(`ADMIN_PATH: ${ADMIN_PATH}`);
});

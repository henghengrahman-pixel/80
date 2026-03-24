const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const APP_BASE_URL = String(
  process.env.APP_BASE_URL ||
    process.env.BASE_URL ||
    `http://localhost:${PORT}`
).replace(/\/+$/, "");

const ADMIN_PATH = process.env.ADMIN_PATH || "itsiregar8008";
const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || process.env.ADMIN_ID || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "ganti-dengan-session-secret-yang-aman";

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");

const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const FILES = {
  settings: path.join(DATA_DIR, "settings.json"),
  sliders: path.join(DATA_DIR, "sliders.json"),
  providers: path.join(DATA_DIR, "providers.json"),
  games: path.join(DATA_DIR, "games.json"),
};

ensureDir(DATA_DIR);
ensureDir(UPLOAD_DIR);
ensureJsonFile(FILES.settings, getDefaultSettings());
ensureJsonFile(FILES.sliders, []);
ensureJsonFile(FILES.providers, []);
ensureJsonFile(FILES.games, []);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.adminPath = ADMIN_PATH;
  res.locals.isAdmin = !!req.session?.isAdmin;
  next();
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeBase = slugify(
      path.basename(file.originalname || "file", ext),
      "file"
    );
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ok = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".svg",
      ".mp4",
      ".webm",
      ".ogg",
      ".mov",
    ].includes(path.extname(file.originalname || "").toLowerCase());

    if (!ok) {
      return cb(new Error("Format file tidak didukung."));
    }

    cb(null, true);
  },
});

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  return res.redirect(`/${ADMIN_PATH}/login`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureJsonFile(filePath, defaultValue) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
  }
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function getDefaultSettings() {
  return {
    siteName: "Live Promo Center",
    siteDescription: "Halaman promo dan katalog game modern",
    seoTitle: "Live Promo Center",
    seoDescription: "Halaman promo dan katalog game modern",
    seoKeywords: "promo, katalog game, provider game, informasi game",
    logoUrl: "",
    heroBackground:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1600&auto=format&fit=crop",
    runningText: "Selamat datang di Live Promo Center",
    loginButtonLink: "#",
    daftarButtonLink: "#",
    promosiButtonLink: "#",
    contactButtonLink: "#",
  };
}

function slugify(text, fallback = "item") {
  const value = String(text || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return value || fallback;
}

function createId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toBool(value, defaultValue = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.toLowerCase().trim();
    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }
  return defaultValue;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeUpload(reqFile, oldValue = "") {
  if (!reqFile) return oldValue || "";
  return `/uploads/${reqFile.filename}`;
}

function toAbsoluteUrl(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${APP_BASE_URL}${value}`;
  return `${APP_BASE_URL}/${value}`;
}

function buildCanonicalUrl(req) {
  return `${APP_BASE_URL}${req.originalUrl === "/" ? "" : req.originalUrl}`;
}

function uniqueSlug(items, baseSlug, currentId = "") {
  let slug = slugify(baseSlug, "item");
  let counter = 2;

  while (
    items.some(
      (item) =>
        String(item.slug || "") === slug && String(item.id || "") !== currentId
    )
  ) {
    slug = `${slugify(baseSlug, "item")}-${counter}`;
    counter += 1;
  }

  return slug;
}

function removeUploadedFile(fileUrl = "") {
  if (!fileUrl || !fileUrl.startsWith("/uploads/")) return;
  const target = path.join(UPLOAD_DIR, fileUrl.replace("/uploads/", ""));
  if (fs.existsSync(target)) {
    try {
      fs.unlinkSync(target);
    } catch (err) {}
  }
}

function getJakartaParts() {
  const now = new Date();
  const dateOnly = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);

  const timeOnly = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return {
    fullDate: dateOnly,
    time: timeOnly,
    fullDateTime: `${dateOnly} ${timeOnly} WIB`,
    iso: now.toISOString(),
  };
}

function normalizePattern(input, providerName = "") {
  if (!input) return defaultPattern(providerName);

  if (typeof input === "object" && input !== null) {
    if (Array.isArray(input.rows)) return input;
    return defaultPattern(providerName);
  }

  const lines = String(input)
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (!lines.length) return defaultPattern(providerName);

  if (/pragmatic/i.test(providerName)) {
    return {
      type: "pragmatic",
      rows: lines.slice(0, 4).map((line) => ({
        label: line,
        state1: "☑️",
        state2: "☑️",
        state3: "☑️",
      })),
    };
  }

  return {
    type: "standard",
    rows: lines.slice(0, 5).map((line) => ({
      label: line,
      turbo: "",
    })),
  };
}

function defaultPattern(providerName = "") {
  if (/pragmatic/i.test(providerName)) {
    return {
      type: "pragmatic",
      rows: [
        { label: "Manual 10x", state1: "☑️", state2: "☑️", state3: "❌" },
        { label: "Auto 30x", state1: "☑️", state2: "❌", state3: "☑️" },
        { label: "Turbo OFF", state1: "☑️", state2: "☑️", state3: "☑️" },
      ],
    };
  }

  return {
    type: "standard",
    rows: [
      { label: "Auto Spin 20x", turbo: "" },
      { label: "Naikkan bet perlahan", turbo: "" },
      { label: "Main saat pola stabil", turbo: "" },
    ],
  };
}

function scoreClass(score) {
  const n = toNumber(score, 0);
  if (n >= 80) return "high";
  if (n >= 60) return "medium";
  return "low";
}

function getSettings() {
  return readJson(FILES.settings, getDefaultSettings());
}

function getProviders() {
  return readJson(FILES.providers, []);
}

function getGames() {
  return readJson(FILES.games, []);
}

function getSliders() {
  return readJson(FILES.sliders, []);
}

function saveSettings(data) {
  writeJson(FILES.settings, data);
}

function saveProviders(data) {
  writeJson(FILES.providers, data);
}

function saveGames(data) {
  writeJson(FILES.games, data);
}

function saveSliders(data) {
  writeJson(FILES.sliders, data);
}

function normalizeProvider(provider = {}) {
  return {
    id: provider.id || createId("provider"),
    name: normalizeText(provider.name),
    slug: slugify(provider.slug || provider.name, "provider"),
    logoUrl: normalizeText(provider.logoUrl),
    isActive:
      provider.isActive === false ? false : toBool(provider.isActive, true),
    sortOrder: toNumber(provider.sortOrder, 0),
    createdAt: provider.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeSlider(slide = {}) {
  return {
    id: slide.id || createId("slider"),
    title: normalizeText(slide.title),
    subtitle: normalizeText(slide.subtitle),
    imageUrl: normalizeText(slide.imageUrl),
    buttonText: normalizeText(slide.buttonText),
    buttonLink: normalizeText(slide.buttonLink),
    isActive: slide.isActive === false ? false : toBool(slide.isActive, true),
    sortOrder: toNumber(slide.sortOrder, 0),
    createdAt: slide.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeGame(game = {}, providers = []) {
  const providerId = normalizeText(game.providerId);
  const provider = providers.find((p) => String(p.id) === providerId) || null;
  const score = toNumber(game.score || game.winrate, 0);

  return {
    id: game.id || createId("game"),
    title: normalizeText(game.title),
    slug: slugify(game.slug || game.title, "game"),
    providerId: provider ? provider.id : "",
    providerName: provider ? provider.name : normalizeText(game.providerName),
    providerSlug: provider ? provider.slug : normalizeText(game.providerSlug),
    providerLogoUrl: provider
      ? provider.logoUrl
      : normalizeText(game.providerLogoUrl),
    imageUrl: normalizeText(game.imageUrl),
    gameLink: normalizeText(game.gameLink),
    labelBadge: normalizeText(game.labelBadge),
    timeRange: normalizeText(game.timeRange || game.jam),
    jam: normalizeText(game.jam || game.timeRange),
    score,
    winrate: score,
    scoreClass: normalizeText(game.scoreClass) || scoreClass(score),
    pattern: normalizePattern(game.pattern, provider ? provider.name : ""),
    isActive: game.isActive === false ? false : toBool(game.isActive, true),
    sortOrder: toNumber(game.sortOrder, 0),
    createdAt: game.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildHomePayload(req, providerSlug = "") {
  const settings = getSettings();
  const sliders = getSliders()
    .map(normalizeSlider)
    .filter((x) => x.isActive !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const providers = getProviders()
    .map(normalizeProvider)
    .filter((x) => x.isActive !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const currentProvider = providerSlug
    ? providers.find((p) => p.slug === providerSlug) || null
    : null;

  let games = getGames()
    .map((game) => normalizeGame(game, providers))
    .filter((x) => x.isActive !== false);

  if (currentProvider) {
    games = games.filter((x) => x.providerId === currentProvider.id);
  }

  games.sort((a, b) => a.sortOrder - b.sortOrder);

  const jakarta = getJakartaParts();
  const ogImage = toAbsoluteUrl(
    settings.logoUrl || (sliders[0] && sliders[0].imageUrl) || ""
  );

  return {
    settings,
    sliders,
    providers,
    games,
    currentProvider,
    jakartaNow: jakarta.fullDateTime,
    updateLabel: jakarta.fullDate,
    jakarta,
    canonicalUrl: buildCanonicalUrl(req),
    baseUrl: APP_BASE_URL,
    ogImage,
  };
}

/* =========================
   FRONTEND
========================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    app: "promo-catalog-ejs",
    time: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  const payload = buildHomePayload(req);
  return res.render("home", payload);
});

app.get("/provider/:slug", (req, res) => {
  const payload = buildHomePayload(req, req.params.slug);
  if (!payload.currentProvider) {
    return res.status(404).send("Provider tidak ditemukan.");
  }
  return res.render("home", payload);
});

app.get("/api/jakarta-time", (req, res) => {
  return res.json(getJakartaParts());
});

app.get("/api/games", (req, res) => {
  const providerSlug = normalizeText(req.query.provider);
  const providers = getProviders().map(normalizeProvider);
  let games = getGames()
    .map((game) => normalizeGame(game, providers))
    .filter((x) => x.isActive !== false);

  if (providerSlug) {
    const provider = providers.find((p) => p.slug === providerSlug);
    if (provider) {
      games = games.filter((x) => x.providerId === provider.id);
    } else {
      games = [];
    }
  }

  games.sort((a, b) => a.sortOrder - b.sortOrder);

  return res.json({
    success: true,
    items: games,
    jakarta: getJakartaParts(),
  });
});

/* =========================
   AUTH ADMIN
========================= */

app.get(`/${ADMIN_PATH}/login`, (req, res) => {
  if (req.session?.isAdmin) {
    return res.redirect(`/${ADMIN_PATH}`);
  }

  return res.render("admin/login", {
    title: "Login Admin",
    error: "",
  });
});

app.post(`/${ADMIN_PATH}/login`, (req, res) => {
  const username = normalizeText(req.body.username);
  const password = String(req.body.password || "");

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.regenerate((err) => {
      if (err) {
        return res.render("admin/login", {
          title: "Login Admin",
          error: "Gagal membuat session login.",
        });
      }

      req.session.isAdmin = true;
      req.session.adminUsername = username;
      return res.redirect(`/${ADMIN_PATH}`);
    });
    return;
  }

  return res.render("admin/login", {
    title: "Login Admin",
    error: "Username atau password salah.",
  });
});

app.post(`/${ADMIN_PATH}/logout`, requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.redirect(`/${ADMIN_PATH}/login`);
  });
});

app.get(`/${ADMIN_PATH}`, requireAdmin, (req, res) => {
  const providers = getProviders();
  const games = getGames();
  const sliders = getSliders();

  return res.render("admin/dashboard", {
    title: "Dashboard Admin",
    counts: {
      providers: providers.length,
      games: games.length,
      sliders: sliders.length,
    },
    settings: getSettings(),
  });
});

/* =========================
   SETTINGS
========================= */

app.get(`/${ADMIN_PATH}/settings`, requireAdmin, (req, res) => {
  return res.render("admin/settings", {
    title: "Settings",
    settings: getSettings(),
  });
});

app.post(
  `/${ADMIN_PATH}/settings`,
  requireAdmin,
  upload.fields([
    { name: "logoFile", maxCount: 1 },
    { name: "heroFile", maxCount: 1 },
  ]),
  (req, res) => {
    const current = getSettings();

    const logoFile = req.files?.logoFile?.[0];
    const heroFile = req.files?.heroFile?.[0];

    const next = {
      ...current,
      siteName: normalizeText(req.body.siteName) || current.siteName,
      siteDescription:
        normalizeText(req.body.siteDescription) || current.siteDescription,
      seoTitle: normalizeText(req.body.seoTitle) || current.seoTitle,
      seoDescription:
        normalizeText(req.body.seoDescription) || current.seoDescription,
      seoKeywords: normalizeText(req.body.seoKeywords) || current.seoKeywords,
      runningText: normalizeText(req.body.runningText) || current.runningText,
      loginButtonLink: normalizeText(req.body.loginButtonLink),
      daftarButtonLink: normalizeText(req.body.daftarButtonLink),
      promosiButtonLink: normalizeText(req.body.promosiButtonLink),
      contactButtonLink: normalizeText(req.body.contactButtonLink),
      logoUrl:
        normalizeText(req.body.logoUrl) ||
        normalizeUpload(logoFile, current.logoUrl),
      heroBackground:
        normalizeText(req.body.heroBackground) ||
        normalizeUpload(heroFile, current.heroBackground),
    };

    saveSettings(next);
    return res.redirect(`/${ADMIN_PATH}/settings`);
  }
);

/* =========================
   PROVIDERS
========================= */

app.get(`/${ADMIN_PATH}/providers`, requireAdmin, (req, res) => {
  const providers = getProviders()
    .map(normalizeProvider)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return res.render("admin/providers", {
    title: "Providers",
    providers,
  });
});

app.post(
  `/${ADMIN_PATH}/providers/create`,
  requireAdmin,
  upload.single("logoFile"),
  (req, res) => {
    const providers = getProviders().map(normalizeProvider);
    const name = normalizeText(req.body.name);

    if (!name) {
      return res.status(400).send("Nama provider wajib diisi.");
    }

    const provider = normalizeProvider({
      id: createId("provider"),
      name,
      slug: uniqueSlug(providers, req.body.slug || name),
      logoUrl:
        normalizeText(req.body.logoUrl) || normalizeUpload(req.file, ""),
      isActive: toBool(req.body.isActive, true),
      sortOrder: toNumber(req.body.sortOrder, providers.length),
      createdAt: new Date().toISOString(),
    });

    providers.push(provider);
    saveProviders(providers);
    return res.redirect(`/${ADMIN_PATH}/providers`);
  }
);

app.post(
  `/${ADMIN_PATH}/providers/:id/update`,
  requireAdmin,
  upload.single("logoFile"),
  (req, res) => {
    const providers = getProviders().map(normalizeProvider);
    const idx = providers.findIndex((x) => x.id === req.params.id);

    if (idx === -1) {
      return res.status(404).send("Provider tidak ditemukan.");
    }

    const current = providers[idx];
    const name = normalizeText(req.body.name) || current.name;
    const nextLogo =
      normalizeText(req.body.logoUrl) || normalizeUpload(req.file, current.logoUrl);

    if (req.file && current.logoUrl && current.logoUrl !== nextLogo) {
      removeUploadedFile(current.logoUrl);
    }

    providers[idx] = normalizeProvider({
      ...current,
      name,
      slug: uniqueSlug(providers, req.body.slug || name, current.id),
      logoUrl: nextLogo,
      isActive: toBool(req.body.isActive, current.isActive),
      sortOrder: toNumber(req.body.sortOrder, current.sortOrder),
      createdAt: current.createdAt,
    });

    saveProviders(providers);

    const games = getGames().map((game) => normalizeGame(game, providers));
    saveGames(games);

    return res.redirect(`/${ADMIN_PATH}/providers`);
  }
);

app.post(`/${ADMIN_PATH}/providers/:id/delete`, requireAdmin, (req, res) => {
  const providers = getProviders().map(normalizeProvider);
  const target = providers.find((x) => x.id === req.params.id);

  if (!target) {
    return res.status(404).send("Provider tidak ditemukan.");
  }

  if (target.logoUrl) {
    removeUploadedFile(target.logoUrl);
  }

  const nextProviders = providers.filter((x) => x.id !== req.params.id);
  saveProviders(nextProviders);

  const nextGames = getGames()
    .map((game) => normalizeGame(game, nextProviders))
    .filter((game) => game.providerId !== target.id);

  saveGames(nextGames);

  return res.redirect(`/${ADMIN_PATH}/providers`);
});

/* =========================
   GAMES
========================= */

app.get(`/${ADMIN_PATH}/games`, requireAdmin, (req, res) => {
  const providers = getProviders().map(normalizeProvider);
  const games = getGames()
    .map((game) => normalizeGame(game, providers))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return res.render("admin/games", {
    title: "Games",
    games,
    providers,
  });
});

app.post(
  `/${ADMIN_PATH}/games/create`,
  requireAdmin,
  upload.single("imageFile"),
  (req, res) => {
    const providers = getProviders().map(normalizeProvider);
    const games = getGames().map((game) => normalizeGame(game, providers));

    const title = normalizeText(req.body.title);
    const providerId = normalizeText(req.body.providerId);

    if (!title) {
      return res.status(400).send("Judul game wajib diisi.");
    }

    const provider = providers.find((p) => p.id === providerId);
    if (!provider) {
      return res.status(400).send("Provider game wajib dipilih.");
    }

    const game = normalizeGame(
      {
        id: createId("game"),
        title,
        slug: slugify(req.body.slug || title, "game"),
        providerId: provider.id,
        providerName: provider.name,
        providerSlug: provider.slug,
        providerLogoUrl: provider.logoUrl,
        imageUrl:
          normalizeText(req.body.imageUrl) || normalizeUpload(req.file, ""),
        gameLink: normalizeText(req.body.gameLink),
        labelBadge: normalizeText(req.body.labelBadge),
        timeRange: normalizeText(req.body.timeRange),
        jam: normalizeText(req.body.timeRange),
        score: toNumber(req.body.score, 0),
        pattern: normalizeText(req.body.pattern),
        isActive: toBool(req.body.isActive, true),
        sortOrder: toNumber(req.body.sortOrder, games.length),
        createdAt: new Date().toISOString(),
      },
      providers
    );

    games.push(game);
    saveGames(games);
    return res.redirect(`/${ADMIN_PATH}/games`);
  }
);

app.post(
  `/${ADMIN_PATH}/games/:id/update`,
  requireAdmin,
  upload.single("imageFile"),
  (req, res) => {
    const providers = getProviders().map(normalizeProvider);
    const games = getGames().map((game) => normalizeGame(game, providers));
    const idx = games.findIndex((x) => x.id === req.params.id);

    if (idx === -1) {
      return res.status(404).send("Game tidak ditemukan.");
    }

    const current = games[idx];
    const providerId = normalizeText(req.body.providerId) || current.providerId;
    const provider = providers.find((p) => p.id === providerId);

    if (!provider) {
      return res.status(400).send("Provider game tidak valid.");
    }

    const nextImage =
      normalizeText(req.body.imageUrl) ||
      normalizeUpload(req.file, current.imageUrl);

    if (req.file && current.imageUrl && current.imageUrl !== nextImage) {
      removeUploadedFile(current.imageUrl);
    }

    games[idx] = normalizeGame(
      {
        ...current,
        title: normalizeText(req.body.title) || current.title,
        slug: slugify(req.body.slug || req.body.title || current.title, "game"),
        providerId: provider.id,
        providerName: provider.name,
        providerSlug: provider.slug,
        providerLogoUrl: provider.logoUrl,
        imageUrl: nextImage,
        gameLink: normalizeText(req.body.gameLink) || current.gameLink,
        labelBadge: normalizeText(req.body.labelBadge) || current.labelBadge,
        timeRange: normalizeText(req.body.timeRange) || current.timeRange,
        jam: normalizeText(req.body.timeRange) || current.jam,
        score:
          req.body.score !== undefined && req.body.score !== ""
            ? toNumber(req.body.score, current.score)
            : current.score,
        pattern: normalizeText(req.body.pattern) || current.pattern,
        isActive: toBool(req.body.isActive, current.isActive),
        sortOrder: toNumber(req.body.sortOrder, current.sortOrder),
        createdAt: current.createdAt,
      },
      providers
    );

    saveGames(games);
    return res.redirect(`/${ADMIN_PATH}/games`);
  }
);

app.post(`/${ADMIN_PATH}/games/:id/delete`, requireAdmin, (req, res) => {
  const providers = getProviders().map(normalizeProvider);
  const games = getGames().map((game) => normalizeGame(game, providers));
  const target = games.find((x) => x.id === req.params.id);

  if (!target) {
    return res.status(404).send("Game tidak ditemukan.");
  }

  if (target.imageUrl) {
    removeUploadedFile(target.imageUrl);
  }

  saveGames(games.filter((x) => x.id !== req.params.id));
  return res.redirect(`/${ADMIN_PATH}/games`);
});

/* =========================
   SLIDERS
========================= */

app.get(`/${ADMIN_PATH}/sliders`, requireAdmin, (req, res) => {
  const sliders = getSliders()
    .map(normalizeSlider)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return res.render("admin/sliders", {
    title: "Sliders",
    sliders,
  });
});

app.post(
  `/${ADMIN_PATH}/sliders/create`,
  requireAdmin,
  upload.single("imageFile"),
  (req, res) => {
    const sliders = getSliders().map(normalizeSlider);

    const imageUrl =
      normalizeText(req.body.imageUrl) || normalizeUpload(req.file, "");

    if (!imageUrl) {
      return res.status(400).send("Gambar slider wajib diisi.");
    }

    const slider = normalizeSlider({
      id: createId("slider"),
      title: normalizeText(req.body.title),
      subtitle: normalizeText(req.body.subtitle),
      imageUrl,
      buttonText: normalizeText(req.body.buttonText),
      buttonLink: normalizeText(req.body.buttonLink),
      isActive: toBool(req.body.isActive, true),
      sortOrder: toNumber(req.body.sortOrder, sliders.length),
      createdAt: new Date().toISOString(),
    });

    sliders.push(slider);
    saveSliders(sliders);
    return res.redirect(`/${ADMIN_PATH}/sliders`);
  }
);

app.post(
  `/${ADMIN_PATH}/sliders/:id/update`,
  requireAdmin,
  upload.single("imageFile"),
  (req, res) => {
    const sliders = getSliders().map(normalizeSlider);
    const idx = sliders.findIndex((x) => x.id === req.params.id);

    if (idx === -1) {
      return res.status(404).send("Slider tidak ditemukan.");
    }

    const current = sliders[idx];
    const nextImage =
      normalizeText(req.body.imageUrl) ||
      normalizeUpload(req.file, current.imageUrl);

    if (req.file && current.imageUrl && current.imageUrl !== nextImage) {
      removeUploadedFile(current.imageUrl);
    }

    sliders[idx] = normalizeSlider({
      ...current,
      title: normalizeText(req.body.title) || current.title,
      subtitle: normalizeText(req.body.subtitle) || current.subtitle,
      imageUrl: nextImage,
      buttonText: normalizeText(req.body.buttonText) || current.buttonText,
      buttonLink: normalizeText(req.body.buttonLink) || current.buttonLink,
      isActive: toBool(req.body.isActive, current.isActive),
      sortOrder: toNumber(req.body.sortOrder, current.sortOrder),
      createdAt: current.createdAt,
    });

    saveSliders(sliders);
    return res.redirect(`/${ADMIN_PATH}/sliders`);
  }
);

app.post(`/${ADMIN_PATH}/sliders/:id/delete`, requireAdmin, (req, res) => {
  const sliders = getSliders().map(normalizeSlider);
  const target = sliders.find((x) => x.id === req.params.id);

  if (!target) {
    return res.status(404).send("Slider tidak ditemukan.");
  }

  if (target.imageUrl) {
    removeUploadedFile(target.imageUrl);
  }

  saveSliders(sliders.filter((x) => x.id !== req.params.id));
  return res.redirect(`/${ADMIN_PATH}/sliders`);
});

/* =========================
   ERROR HANDLER
========================= */

app.use((req, res) => {
  res.status(404).send("Halaman tidak ditemukan.");
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Terjadi kesalahan pada server.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

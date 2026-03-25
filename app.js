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

const ADMIN_PATH =
  String(process.env.ADMIN_PATH || "itsiregar8008").replace(/^\/+|\/+$/g, "") ||
  "itsiregar8008";

const ADMIN_USERNAME = String(
  process.env.ADMIN_USERNAME || process.env.ADMIN_ID || "admin"
).trim();

const ADMIN_PASSWORD = String(
  process.env.ADMIN_PASSWORD || process.env.ADMIN_PW || "123456"
);

const SESSION_SECRET = String(
  process.env.SESSION_SECRET || "ganti-dengan-session-secret-yang-aman"
);

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

const DYNAMIC_UPDATE_MINUTES = 30;
const DYNAMIC_UPDATE_MS = DYNAMIC_UPDATE_MINUTES * 60 * 1000;
const HOT_WINRATE_MIN = 80;

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
  res.locals.adminUsername = req.session?.adminUsername || ADMIN_USERNAME;
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
  limits: { fileSize: 50 * 1024 * 1024 },
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

function pickRandom(items = []) {
  if (!Array.isArray(items) || !items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items = []) {
  const copy = Array.isArray(items) ? [...items] : [];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function randomInt(min, max) {
  const a = Number(min);
  const b = Number(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function randomJamRangeNearNow() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let offset;

  // 75% dekat
  if (Math.random() < 0.75) {
    offset = randomInt(-20, 25);
  }
  // 20% agak jauh
  else if (Math.random() < 0.95) {
    offset = randomInt(-45, 50);
  }
  // 5% jauh sedikit
  else {
    offset = randomInt(-120, 120);
  }

  let startTotal = nowMinutes + offset;
  if (startTotal < 0) startTotal += 1440;
  if (startTotal > 1440) startTotal -= 1440;

  const duration = randomInt(18, 42);
  let endTotal = startTotal + duration;
  if (endTotal > 1440) endTotal -= 1440;

  const sh = pad2(Math.floor(startTotal / 60));
  const sm = pad2(startTotal % 60);
  const eh = pad2(Math.floor(endTotal / 60));
  const em = pad2(endTotal % 60);

  return `${sh}:${sm} - ${eh}:${em}`;
}

function randomPercent() {
  return randomInt(41, 95);
}

function isPragmaticProvider(providerName = "") {
  return /pragmatic/i.test(String(providerName || ""));
}

function buildPragmaticPattern() {
  const labelsPool = [
    "Manual 3",
    "Manual 5",
    "Manual 7",
    "Manual 9",
    "Manual 10",
    "Auto 10",
    "Auto 20",
  ];

  const allowedStates = [
    ["☑️", "❌", "☑️"],
    ["❌", "❌", "☑️"],
    ["❌", "❌", "❌"],
    ["❌", "☑️", "❌"],
    ["☑️", "❌", "❌"],
  ];

  return {
    type: "pragmatic",
    rows: shuffle(labelsPool)
      .slice(0, 3)
      .map((label) => {
        const states = pickRandom(allowedStates) || ["❌", "❌", "❌"];
        return {
          label,
          state1: states[0],
          state2: states[1],
          state3: states[2],
        };
      }),
  };
}

function buildStandardPattern() {
  const labelsPool = [
    "Auto 10",
    "Auto 20",
    "Auto 30",
    "Auto 50",
    "Auto 70",
    "Auto 100",
    "Manual 3",
    "Manual 5",
    "Manual 7",
    "Manual 9",
    "Manual 10",
  ];

  return {
    type: "standard",
    rows: shuffle(labelsPool)
      .slice(0, 3)
      .map((label) => ({
        label,
        turbo: Math.random() > 0.5 ? "Turbo On" : "Turbo Off",
        result: Math.random() > 0.5 ? "☑️" : "❌",
      })),
  };
}

function normalizePattern(input, providerName = "") {
  if (input && input.type && Array.isArray(input.rows) && input.rows.length) {
    return input;
  }
  return isPragmaticProvider(providerName)
    ? buildPragmaticPattern()
    : buildStandardPattern();
}

function defaultPattern(providerName = "") {
  return normalizePattern(null, providerName);
}

function scoreClass(score) {
  const n = toNumber(score, 0);
  if (n >= 60) return "high";
  return "medium";
}

function getCurrentDynamicWindow() {
  const now = Date.now();
  const startMs = Math.floor(now / DYNAMIC_UPDATE_MS) * DYNAMIC_UPDATE_MS;
  const endMs = startMs + DYNAMIC_UPDATE_MS;
  return {
    bucketKey: String(startMs),
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
    nowIso: new Date(now).toISOString(),
  };
}

function createDynamicGameState(providerName = "") {
  const score = randomPercent();
  const timeRange = randomJamRange();

  return {
    score,
    winrate: score,
    scoreClass: scoreClass(score),
    timeRange,
    jam: timeRange,
    pattern: defaultPattern(providerName),
    labelBadge: score >= HOT_WINRATE_MIN ? "HOT" : "",
  };
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

function normalizeProvider(provider = {}, allProviders = []) {
  return {
    id: provider.id || createId("provider"),
    name: normalizeText(provider.name),
    slug: uniqueSlug(
      allProviders,
      provider.slug || provider.name || "provider",
      provider.id || ""
    ),
    logoUrl: normalizeText(provider.logoUrl),
    isActive: provider.isActive === false ? false : toBool(provider.isActive, true),
    sortOrder: toNumber(provider.sortOrder, 0),
    createdAt: provider.createdAt || new Date().toISOString(),
    updatedAt: provider.updatedAt || new Date().toISOString(),
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
    updatedAt: slide.updatedAt || new Date().toISOString(),
  };
}

function normalizeGame(game = {}, providers = []) {
  const settings = getSettings();
  const providerId = normalizeText(game.providerId);
  const provider = providers.find((p) => String(p.id) === providerId) || null;
  const providerName = provider ? provider.name : normalizeText(game.providerName);
  const dynamic = {
    score: toNumber(game.score, 0),
    winrate: toNumber(game.winrate, toNumber(game.score, 0)),
    scoreClass: normalizeText(game.scoreClass) || scoreClass(toNumber(game.winrate, 0)),
    timeRange: normalizeText(game.timeRange || game.jam),
    jam: normalizeText(game.jam || game.timeRange),
    pattern: normalizePattern(game.pattern, providerName),
    labelBadge: normalizeText(game.labelBadge),
    dynamicBucketKey: normalizeText(game.dynamicBucketKey),
    dynamicUpdatedAt: normalizeText(game.dynamicUpdatedAt),
    nextDynamicUpdateAt: normalizeText(game.nextDynamicUpdateAt),
  };

  return {
    id: game.id || createId("game"),
    title:
      normalizeText(game.title) ||
      `${providerName || "Game"} ${String(game.id || "").slice(-4) || "Slot"}`,
    slug: slugify(game.slug || game.title || providerName || "game", "game"),
    providerId: provider ? provider.id : "",
    providerName,
    providerSlug: provider ? provider.slug : normalizeText(game.providerSlug),
    providerLogoUrl: provider ? provider.logoUrl : normalizeText(game.providerLogoUrl),
    imageUrl: normalizeText(game.imageUrl),
    gameLink: normalizeText(settings.loginButtonLink) || normalizeText(game.gameLink) || "#",
    labelBadge: dynamic.labelBadge,
    timeRange: dynamic.timeRange,
    jam: dynamic.jam,
    score: dynamic.score,
    winrate: dynamic.winrate,
    scoreClass: dynamic.scoreClass,
    pattern: dynamic.pattern,
    dynamicBucketKey: dynamic.dynamicBucketKey,
    dynamicUpdatedAt: dynamic.dynamicUpdatedAt,
    nextDynamicUpdateAt: dynamic.nextDynamicUpdateAt,
    isActive: game.isActive === false ? false : toBool(game.isActive, true),
    sortOrder: toNumber(game.sortOrder, 0),
    createdAt: game.createdAt || new Date().toISOString(),
    updatedAt: game.updatedAt || new Date().toISOString(),
  };
}

function refreshGamesDynamicsIfNeeded(rawGames = [], providers = []) {
  const windowInfo = getCurrentDynamicWindow();
  let changed = false;

  const nextGames = rawGames.map((item) => {
    const base = normalizeGame(item, providers);
    const needRefresh =
      !base.dynamicBucketKey ||
      base.dynamicBucketKey !== windowInfo.bucketKey ||
      !base.winrate ||
      !base.timeRange ||
      !base.pattern ||
      !Array.isArray(base.pattern.rows) ||
      !base.pattern.rows.length;

    if (!needRefresh) {
      return {
        ...base,
        nextDynamicUpdateAt: windowInfo.endIso,
      };
    }

    changed = true;
    const dynamic = createDynamicGameState(base.providerName);

    return {
      ...base,
      ...dynamic,
      dynamicBucketKey: windowInfo.bucketKey,
      dynamicUpdatedAt: windowInfo.nowIso,
      nextDynamicUpdateAt: windowInfo.endIso,
      updatedAt: base.updatedAt || new Date().toISOString(),
    };
  });

  return { changed, games: nextGames, windowInfo };
}

function getPreparedProviders() {
  const rawProviders = getProviders();
  return rawProviders
    .map((provider) => normalizeProvider(provider, rawProviders))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function getPreparedGames() {
  const providers = getPreparedProviders();
  const rawGames = getGames();
  const refreshed = refreshGamesDynamicsIfNeeded(rawGames, providers);

  if (refreshed.changed) {
    saveGames(refreshed.games);
  }

  return {
    providers,
    games: refreshed.games,
    dynamicWindow: refreshed.windowInfo,
  };
}

function sortGamesForFrontend(games = []) {
  return [...games].sort((a, b) => {
    const winA = toNumber(a.winrate, 0);
    const winB = toNumber(b.winrate, 0);
    if (winB !== winA) return winB - winA;

    const sortA = toNumber(a.sortOrder, 0);
    const sortB = toNumber(b.sortOrder, 0);
    if (sortA !== sortB) return sortA - sortB;

    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

function buildHomePayload(req, providerSlug = "") {
  const settings = getSettings();
  const sliders = getSliders()
    .map(normalizeSlider)
    .filter((x) => x.isActive !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const prepared = getPreparedGames();
  const providers = prepared.providers.filter((x) => x.isActive !== false);
  const currentProvider = providerSlug
    ? providers.find((p) => p.slug === providerSlug) || null
    : null;

  let games = prepared.games.filter((x) => x.isActive !== false);
  if (currentProvider) {
    games = games.filter((x) => x.providerId === currentProvider.id);
  }

  games = sortGamesForFrontend(games);

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
    dynamicNextUpdateAt: prepared.dynamicWindow.endIso,
  };
}

function renderDashboard(req, res) {
  const providers = getPreparedProviders();
  const prepared = getPreparedGames();
  const games = prepared.games;
  const sliders = getSliders().map(normalizeSlider);

  return res.render("admin/dashboard", {
    title: "Dashboard Admin",
    counts: {
      providers: providers.length,
      games: games.length,
      sliders: sliders.length,
      activeProviders: providers.filter((x) => x.isActive !== false).length,
      activeGames: games.filter((x) => x.isActive !== false).length,
      activeSliders: sliders.filter((x) => x.isActive !== false).length,
    },
    latestProviders: [...providers]
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, 5),
    latestGames: [...games]
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, 5),
    latestSliders: [...sliders]
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, 5),
    settings: getSettings(),
    dynamicNextUpdateAt: prepared.dynamicWindow.endIso,
  });
}

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    app: "promo-catalog-ejs",
    time: new Date().toISOString(),
    adminPath: ADMIN_PATH,
    dynamicUpdateMinutes: DYNAMIC_UPDATE_MINUTES,
  });
});

app.get("/", (req, res) => res.render("home", buildHomePayload(req)));

app.get("/provider/:slug", (req, res) => {
  const payload = buildHomePayload(req, req.params.slug);
  if (!payload.currentProvider) {
    return res.status(404).send("Provider tidak ditemukan.");
  }
  return res.render("home", payload);
});

app.get("/api/jakarta-time", (req, res) => res.json(getJakartaParts()));

app.get("/api/games", (req, res) => {
  const providerSlug = normalizeText(req.query.provider);
  const prepared = getPreparedGames();
  const providers = prepared.providers;

  let games = prepared.games.filter((x) => x.isActive !== false);

  if (providerSlug) {
    const provider = providers.find((p) => p.slug === providerSlug);
    games = provider ? games.filter((x) => x.providerId === provider.id) : [];
  }

  games = sortGamesForFrontend(games);

  return res.json({
    success: true,
    items: games,
    jakarta: getJakartaParts(),
    nextUpdateAt: prepared.dynamicWindow.endIso,
  });
});

app.get(`/${ADMIN_PATH}/login`, (req, res) => {
  if (req.session?.isAdmin) return res.redirect(`/${ADMIN_PATH}/dashboard`);
  return res.render("admin/login", { title: "Login Admin", error: "" });
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
      return res.redirect(`/${ADMIN_PATH}/dashboard`);
    });
    return;
  }

  return res.render("admin/login", {
    title: "Login Admin",
    error: "Username atau password salah.",
  });
});

function doLogout(req, res) {
  req.session.destroy(() => res.redirect(`/${ADMIN_PATH}/login`));
}

app.post(`/${ADMIN_PATH}/logout`, requireAdmin, doLogout);
app.get(`/${ADMIN_PATH}/logout`, requireAdmin, doLogout);

app.get(`/${ADMIN_PATH}`, requireAdmin, renderDashboard);
app.get(`/${ADMIN_PATH}/dashboard`, requireAdmin, renderDashboard);

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
        normalizeText(req.body.logoUrl) || normalizeUpload(logoFile, current.logoUrl),
      heroBackground:
        normalizeText(req.body.heroBackground) ||
        normalizeUpload(heroFile, current.heroBackground),
    };

    saveSettings(next);
    return res.redirect(`/${ADMIN_PATH}/settings`);
  }
);

app.get(`/${ADMIN_PATH}/providers`, requireAdmin, (req, res) => {
  const providers = getPreparedProviders();
  return res.render("admin/providers", { title: "Providers", providers });
});

app.post(
  `/${ADMIN_PATH}/providers/create`,
  requireAdmin,
  upload.single("logoFile"),
  (req, res) => {
    const rawProviders = getProviders();
    const providers = rawProviders.map((provider) =>
      normalizeProvider(provider, rawProviders)
    );

    const name = normalizeText(req.body.name);
    if (!name) return res.status(400).send("Nama provider wajib diisi.");

    const provider = {
      id: createId("provider"),
      name,
      slug: uniqueSlug(providers, req.body.slug || name),
      logoUrl: normalizeText(req.body.logoUrl) || normalizeUpload(req.file, ""),
      isActive: toBool(req.body.isActive, true),
      sortOrder: toNumber(req.body.sortOrder, providers.length),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

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
    const rawProviders = getProviders();
    const providers = rawProviders.map((provider) =>
      normalizeProvider(provider, rawProviders)
    );
    const idx = providers.findIndex((x) => x.id === req.params.id);

    if (idx === -1) return res.status(404).send("Provider tidak ditemukan.");

    const current = providers[idx];
    const name = normalizeText(req.body.name) || current.name;
    const nextLogo =
      normalizeText(req.body.logoUrl) || normalizeUpload(req.file, current.logoUrl);

    if (req.file && current.logoUrl && current.logoUrl !== nextLogo) {
      removeUploadedFile(current.logoUrl);
    }

    providers[idx] = {
      ...current,
      name,
      slug: uniqueSlug(providers, req.body.slug || name, current.id),
      logoUrl: nextLogo,
      isActive: toBool(req.body.isActive, current.isActive),
      sortOrder: toNumber(req.body.sortOrder, current.sortOrder),
      updatedAt: new Date().toISOString(),
    };

    saveProviders(providers);

    const prepared = getPreparedGames();
    const syncedGames = prepared.games.map((game) => {
      if (game.providerId !== current.id) return game;
      return {
        ...game,
        providerName: providers[idx].name,
        providerSlug: providers[idx].slug,
        providerLogoUrl: providers[idx].logoUrl,
      };
    });

    saveGames(syncedGames);

    return res.redirect(`/${ADMIN_PATH}/providers`);
  }
);

app.post(`/${ADMIN_PATH}/providers/:id/delete`, requireAdmin, (req, res) => {
  const providers = getPreparedProviders();
  const target = providers.find((x) => x.id === req.params.id);

  if (!target) return res.status(404).send("Provider tidak ditemukan.");

  if (target.logoUrl) removeUploadedFile(target.logoUrl);

  const nextProviders = providers.filter((x) => x.id !== req.params.id);
  saveProviders(nextProviders);

  const prepared = getPreparedGames();
  const nextGames = prepared.games.filter((game) => game.providerId !== target.id);
  saveGames(nextGames);

  return res.redirect(`/${ADMIN_PATH}/providers`);
});

app.get(`/${ADMIN_PATH}/games`, requireAdmin, (req, res) => {
  const prepared = getPreparedGames();
  const providers = prepared.providers;
  const games = sortGamesForFrontend(prepared.games);

  return res.render("admin/games", {
    title: "Games",
    games,
    providers,
    settings: getSettings(),
    dynamicNextUpdateAt: prepared.dynamicWindow.endIso,
  });
});

const createGameHandler = (req, res) => {
  const prepared = getPreparedGames();
  const providers = prepared.providers;
  const games = prepared.games;

  const providerId = normalizeText(req.body.providerId);
  const provider = providers.find((p) => p.id === providerId);
  if (!provider) return res.status(400).send("Provider game wajib dipilih.");

  const imageUrl = normalizeText(req.body.imageUrl);
  if (!imageUrl) return res.status(400).send("URL gambar game wajib diisi.");

  const game = {
    id: createId("game"),
    title: `${provider.name} ${games.length + 1}`,
    slug: slugify(`${provider.name}-${games.length + 1}`, "game"),
    providerId: provider.id,
    providerName: provider.name,
    providerSlug: provider.slug,
    providerLogoUrl: provider.logoUrl,
    imageUrl,
    gameLink: getSettings().loginButtonLink,
    labelBadge: "",
    timeRange: "",
    jam: "",
    score: 0,
    winrate: 0,
    scoreClass: "medium",
    pattern: null,
    dynamicBucketKey: "",
    dynamicUpdatedAt: "",
    nextDynamicUpdateAt: "",
    isActive: toBool(req.body.isActive, true),
    sortOrder: games.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mergedGames = [...games, game];
  saveGames(mergedGames);

  refreshGamesDynamicsIfNeeded(mergedGames, providers);
  return res.redirect(`/${ADMIN_PATH}/games`);
};

app.post(`/${ADMIN_PATH}/games`, requireAdmin, createGameHandler);
app.post(`/${ADMIN_PATH}/games/create`, requireAdmin, createGameHandler);

app.post(`/${ADMIN_PATH}/games/:id/update`, requireAdmin, (req, res) => {
  const prepared = getPreparedGames();
  const providers = prepared.providers;
  const games = prepared.games;
  const idx = games.findIndex((x) => x.id === req.params.id);

  if (idx === -1) return res.status(404).send("Game tidak ditemukan.");

  const current = games[idx];
  const providerId = normalizeText(req.body.providerId) || current.providerId;
  const provider = providers.find((p) => p.id === providerId);

  if (!provider) return res.status(400).send("Provider game tidak valid.");

  const imageUrl = normalizeText(req.body.imageUrl) || current.imageUrl;
  if (!imageUrl) return res.status(400).send("URL gambar game wajib diisi.");

  games[idx] = {
    ...current,
    title: current.title || `${provider.name} ${idx + 1}`,
    slug: current.slug || slugify(`${provider.name}-${idx + 1}`, "game"),
    providerId: provider.id,
    providerName: provider.name,
    providerSlug: provider.slug,
    providerLogoUrl: provider.logoUrl,
    imageUrl,
    gameLink: getSettings().loginButtonLink,
    isActive: toBool(req.body.isActive, current.isActive),
    updatedAt: new Date().toISOString(),
  };

  saveGames(games);
  return res.redirect(`/${ADMIN_PATH}/games`);
});

app.post(`/${ADMIN_PATH}/games/:id/delete`, requireAdmin, (req, res) => {
  const prepared = getPreparedGames();
  const games = prepared.games;
  const target = games.find((x) => x.id === req.params.id);

  if (!target) return res.status(404).send("Game tidak ditemukan.");

  if (target.imageUrl) removeUploadedFile(target.imageUrl);
  saveGames(games.filter((x) => x.id !== req.params.id));

  return res.redirect(`/${ADMIN_PATH}/games`);
});

app.get(`/${ADMIN_PATH}/sliders`, requireAdmin, (req, res) => {
  const sliders = getSliders()
    .map(normalizeSlider)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return res.render("admin/sliders", { title: "Sliders", sliders });
});

const createSliderHandler = (req, res) => {
  const sliders = getSliders().map(normalizeSlider);
  const imageUrl = normalizeText(req.body.imageUrl) || normalizeUpload(req.file, "");
  if (!imageUrl) return res.status(400).send("Gambar slider wajib diisi.");

  const slider = {
    id: createId("slider"),
    title: normalizeText(req.body.title),
    subtitle: normalizeText(req.body.subtitle),
    imageUrl,
    buttonText: normalizeText(req.body.buttonText),
    buttonLink: normalizeText(req.body.buttonLink),
    isActive: toBool(req.body.isActive, true),
    sortOrder: toNumber(req.body.sortOrder, sliders.length),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  sliders.push(slider);
  saveSliders(sliders);
  return res.redirect(`/${ADMIN_PATH}/sliders`);
};

app.post(
  `/${ADMIN_PATH}/sliders`,
  requireAdmin,
  upload.single("imageFile"),
  createSliderHandler
);

app.post(
  `/${ADMIN_PATH}/sliders/create`,
  requireAdmin,
  upload.single("imageFile"),
  createSliderHandler
);

app.post(
  `/${ADMIN_PATH}/sliders/:id/update`,
  requireAdmin,
  upload.single("imageFile"),
  (req, res) => {
    const sliders = getSliders().map(normalizeSlider);
    const idx = sliders.findIndex((x) => x.id === req.params.id);
    if (idx === -1) return res.status(404).send("Slider tidak ditemukan.");

    const current = sliders[idx];
    const nextImage =
      normalizeText(req.body.imageUrl) || normalizeUpload(req.file, current.imageUrl);

    if (req.file && current.imageUrl && current.imageUrl !== nextImage) {
      removeUploadedFile(current.imageUrl);
    }

    sliders[idx] = {
      ...current,
      title: normalizeText(req.body.title) || current.title,
      subtitle: normalizeText(req.body.subtitle) || current.subtitle,
      imageUrl: nextImage,
      buttonText: normalizeText(req.body.buttonText) || current.buttonText,
      buttonLink: normalizeText(req.body.buttonLink) || current.buttonLink,
      isActive: toBool(req.body.isActive, current.isActive),
      sortOrder: toNumber(req.body.sortOrder, current.sortOrder),
      updatedAt: new Date().toISOString(),
    };

    saveSliders(sliders);
    return res.redirect(`/${ADMIN_PATH}/sliders`);
  }
);

app.post(`/${ADMIN_PATH}/sliders/:id/delete`, requireAdmin, (req, res) => {
  const sliders = getSliders().map(normalizeSlider);
  const target = sliders.find((x) => x.id === req.params.id);

  if (!target) return res.status(404).send("Slider tidak ditemukan.");

  if (target.imageUrl) removeUploadedFile(target.imageUrl);
  saveSliders(sliders.filter((x) => x.id !== req.params.id));

  return res.redirect(`/${ADMIN_PATH}/sliders`);
});

app.use((req, res) => {
  res.status(404).send("Halaman tidak ditemukan.");
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Terjadi kesalahan pada server.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin login path: /${ADMIN_PATH}/login`);
  console.log(`Dynamic game update interval: ${DYNAMIC_UPDATE_MINUTES} menit`);
});

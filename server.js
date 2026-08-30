import express from "express";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_DB = {
  settings: {
    brandName: "Creator Autopilot",
    niche: "AI & Technology",
    timezone: "Asia/Kolkata",
    autoPilot: false,
    dailyPosts: 1
  },

  posts: [],

  connections: {
    youtube: false,
    instagram: false,
    facebook: false
  }
};

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(DEFAULT_DB, null, 2)
      );
    }

    return JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );
  } catch (error) {
    console.error("Database read error:", error);
    return structuredClone(DEFAULT_DB);
  }
}

function writeDB(data) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(data, null, 2)
  );
}

app.use(express.json({ limit: "5mb" }));

app.use(
  express.static(__dirname)
);

/* ---------------- HEALTH ---------------- */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Creator Autopilot",
    version: "2.0.0"
  });
});

/* ---------------- DASHBOARD ---------------- */

app.get("/api/dashboard", (req, res) => {
  const db = readDB();
  const posts = db.posts || [];

  res.json({
    stats: {
      posts: posts.length,

      published: posts.filter(
        post => post.status === "Published"
      ).length,

      scheduled: posts.filter(
        post => post.status === "Scheduled"
      ).length,

      views: posts.reduce(
        (total, post) =>
          total + Number(post.views || 0),
        0
      )
    },

    posts,
    settings: db.settings,
    connections: db.connections
  });
});

/* ---------------- POSTS ---------------- */

app.get("/api/posts", (req, res) => {
  res.json(readDB().posts);
});

app.post("/api/posts", (req, res) => {
  const db = readDB();
  const body = req.body || {};

  if (
    typeof body.title !== "string" ||
    !body.title.trim()
  ) {
    return res.status(400).json({
      error: "Title required"
    });
  }

  const post = {
    id: Date.now(),
    title: body.title.trim(),
    platform: body.platform || "YouTube",
    status: body.status || "Draft",
    date: body.date || "",
    script: body.script || "",
    caption: body.caption || "",
    views: 0,
    createdAt: new Date().toISOString()
  };

  db.posts.unshift(post);
  writeDB(db);

  res.status(201).json(post);
});

app.patch("/api/posts/:id", (req, res) => {
  const db = readDB();

  const post = db.posts.find(
    item => String(item.id) === req.params.id
  );

  if (!post) {
    return res.status(404).json({
      error: "Post not found"
    });
  }

  Object.assign(post, req.body || {});

  writeDB(db);

  res.json(post);
});

app.delete("/api/posts/:id", (req, res) => {
  const db = readDB();

  db.posts = db.posts.filter(
    item => String(item.id) !== req.params.id
  );

  writeDB(db);

  res.json({ ok: true });
});

/* ---------------- AI IDEAS ---------------- */

function createIdeas(niche) {
  return [
    `3 ${niche} secrets nobody tells beginners`,
    `5 ${niche} tools worth trying this week`,
    `I tested the latest ${niche} workflow`,
    `7 mistakes creators make with ${niche}`,
    `The fastest way to learn ${niche}`
  ];
}

app.post("/api/ai/ideas", (req, res) => {
  const db = readDB();

  const niche =
    req.body?.niche?.trim() ||
    db.settings.niche ||
    "AI & Technology";

  res.json({
    provider: process.env.OPENAI_API_KEY
      ? "openai-ready"
      : "demo",

    ideas: createIdeas(niche)
  });
});

/* ---------------- SCRIPT ---------------- */

app.post("/api/ai/script", (req, res) => {
  const title =
    req.body?.title?.trim() ||
    "Your next video";

  const hook =
    `Stop scrolling: here is what you need to know about ${title}.`;

  const script = `HOOK

${title}

BODY

1. Start with the main problem.
2. Explain three useful points.
3. Show a practical example.
4. Give one clear takeaway.

CTA

Follow for more, save this post,
and share it with another creator.`;

  res.json({
    provider: process.env.OPENAI_API_KEY
      ? "openai-ready"
      : "demo",

    title,
    hook,
    script
  });
});

/* ---------------- CAPTION ---------------- */

app.post("/api/ai/caption", (req, res) => {
  const title =
    req.body?.title?.trim() ||
    "New post";

  const caption = `${title} 🚀

Here are the key ideas you need to know.

Save this for later and follow for more.

#AI #Technology #Creators #ContentCreation`;

  res.json({
    provider: process.env.OPENAI_API_KEY
      ? "openai-ready"
      : "demo",

    caption
  });
});

/* ---------------- CONTENT PLAN ---------------- */

app.post("/api/ai/plan", (req, res) => {
  const db = readDB();

  const niche =
    req.body?.niche ||
    db.settings.niche ||
    "AI & Technology";

  const requestedDays =
    Number(req.body?.days) || 7;

  const days = Math.max(
    1,
    Math.min(7, requestedDays)
  );

  const platforms = [
    "YouTube",
    "Instagram",
    "Facebook"
  ];

  const plan = createIdeas(niche)
    .slice(0, days)
    .map((title, index) => ({
      title,

      platform:
        platforms[index % platforms.length],

      date: new Date(
        Date.now() +
        index * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .slice(0, 10)
    }));

  res.json({ plan });
});

/* ---------------- SETTINGS ---------------- */

app.post("/api/settings", (req, res) => {
  const db = readDB();

  db.settings = {
    ...db.settings,
    ...(req.body || {})
  };

  writeDB(db);

  res.json(db.settings);
});

/* ---------------- SOCIAL CONNECTION STATE ---------------- */

app.post(
  "/api/connections/:platform",
  (req, res) => {
    const db = readDB();
    const platform = req.params.platform;

    if (!(platform in db.connections)) {
      return res.status(400).json({
        error: "Unsupported platform"
      });
    }

    db.connections[platform] =
      Boolean(req.body?.connected);

    writeDB(db);

    res.json({
      platform,
      connected: db.connections[platform]
    });
  }
);

/* ---------------- REAL PUBLISHING PLACEHOLDER ---------------- */

app.post(
  "/api/publish/:platform",
  (req, res) => {
    const platform = req.params.platform;

    const allowed = [
      "youtube",
      "instagram",
      "facebook"
    ];

    if (!allowed.includes(platform)) {
      return res.status(400).json({
        error: "Unsupported platform"
      });
    }

    /*
      IMPORTANT:

      Real publishing requires OAuth/API
      credentials from the platform.

      Do NOT pretend the post was published.
    */

    return res.status(501).json({
      published: false,

      error:
        "Social OAuth/API integration is required.",

      platform
    });
  }
);

/* ---------------- FRONTEND ---------------- */

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

/* ---------------- START ---------------- */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Creator Autopilot running on port ${PORT}`
    );
  }
);

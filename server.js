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

/* =========================
   DATABASE
========================= */

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

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(DEFAULT_DB, null, 2)
      );
    }

    const data = JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );

    return {
      ...DEFAULT_DB,
      ...data,
      settings: {
        ...DEFAULT_DB.settings,
        ...(data.settings || {})
      },
      connections: {
        ...DEFAULT_DB.connections,
        ...(data.connections || {})
      },
      posts: Array.isArray(data.posts)
        ? data.posts
        : []
    };
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

/* =========================
   MIDDLEWARE
========================= */

app.use(
  express.json({
    limit: "5mb"
  })
);

app.use(
  express.static(__dirname)
);

/* =========================
   HEALTH
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Creator Autopilot",
    version: "2.1.0"
  });
});

/* =========================
   DASHBOARD
========================= */

app.get("/api/dashboard", (req, res) => {
  const db = readDB();
  const posts = db.posts;

  const published = posts.filter(
    post => post.status === "Published"
  );

  const scheduled = posts.filter(
    post => post.status === "Scheduled"
  );

  const views = posts.reduce(
    (total, post) =>
      total + Number(post.views || 0),
    0
  );

  res.json({
    stats: {
      posts: posts.length,
      published: published.length,
      scheduled: scheduled.length,
      views
    },

    posts,

    settings: db.settings,

    connections: db.connections
  });
});

/* =========================
   POSTS
========================= */

app.get("/api/posts", (req, res) => {
  const db = readDB();

  res.json(db.posts);
});

app.post("/api/posts", (req, res) => {
  const db = readDB();
  const body = req.body || {};

  const title =
    typeof body.title === "string"
      ? body.title.trim()
      : "";

  if (!title) {
    return res.status(400).json({
      error: "Title required"
    });
  }

  const post = {
    id: Date.now(),
    title,
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
    item =>
      String(item.id) ===
      String(req.params.id)
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
    item =>
      String(item.id) !==
      String(req.params.id)
  );

  writeDB(db);

  res.json({
    ok: true
  });
});

/* =========================
   AI IDEAS
========================= */

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
    typeof req.body?.niche === "string" &&
    req.body.niche.trim()
      ? req.body.niche.trim()
      : db.settings.niche;

  res.json({
    provider: process.env.OPENAI_API_KEY
      ? "openai-ready"
      : "demo",

    ideas: createIdeas(niche)
  });
});

/* =========================
   AI SCRIPT
========================= */

app.post("/api/ai/script", (req, res) => {
  const title =
    typeof req.body?.title === "string" &&
    req.body.title.trim()
      ? req.body.title.trim()
      : "Your next video";

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

/* =========================
   AI CAPTION
========================= */

app.post("/api/ai/caption", (req, res) => {
  const title =
    typeof req.body?.title === "string" &&
    req.body.title.trim()
      ? req.body.title.trim()
      : "New post";

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

/* =========================
   AI CONTENT PLAN
========================= */

app.post("/api/ai/plan", (req, res) => {
  const db = readDB();

  const niche =
    typeof req.body?.niche === "string" &&
    req.body.niche.trim()
      ? req.body.niche.trim()
      : db.settings.niche;

  let days = Number(req.body?.days);

  if (!Number.isFinite(days)) {
    days = 7;
  }

  days = Math.max(
    1,
    Math.min(7, Math.floor(days))
  );

  const platforms = [
    "YouTube",
    "Instagram",
    "Facebook"
  ];

  const plan = createIdeas(niche)
    .slice(0, days)
    .map((title, index) => {
      const date = new Date(
        Date.now() +
        index * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .slice(0, 10);

      return {
        title,
        platform:
          platforms[index % platforms.length],
        date
      };
    });

  res.json({
    plan
  });
});

/* =========================
   SETTINGS
========================= */

app.post("/api/settings", (req, res) => {
  const db = readDB();

  db.settings = {
    ...db.settings,
    ...(req.body || {})
  };

  writeDB(db);

  res.json(db.settings);
});

/* =========================
   SOCIAL CONNECTIONS
========================= */

app.post(
  "/api/connections/:platform",
  (req, res) => {
    const db = readDB();
    const platform = req.params.platform;

    if (
      !Object.prototype.hasOwnProperty.call(
        db.connections,
        platform
      )
    ) {
      return res.status(400).json({
        error: "Unsupported platform"
      });
    }

    db.connections[platform] =
      Boolean(req.body?.connected);

    writeDB(db);

    res.json({
      platform,
      connected:
        db.connections[platform]
    });
  }
);

/* =========================
   PUBLISH
========================= */

app.post(
  "/api/publish/:platform",
  (req, res) => {
    const db = readDB();
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

    if (!db.connections[platform]) {
      return res.status(400).json({
        published: false,
        error:
          `${platform} is not connected`
      });
    }

    /*
      IMPORTANT:
      Real publishing requires official
      OAuth/API credentials and upload
      implementation for each platform.
    */

    return res.status(501).json({
      published: false,
      platform,
      error:
        "Real social publishing is not configured yet."
    });
  }
);

/* =========================
   FRONTEND
========================= */

app.get(/.*/, (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
});

/* =========================
   START SERVER
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Creator Autopilot running on port ${PORT}`
    );
  }
);

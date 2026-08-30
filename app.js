const API_URL = "https://creator-autopilot-7.onrender.com";

let D = {
  stats: { posts: 0, published: 0, scheduled: 0, views: 0 },
  posts: [],
  settings: {
    brandName: "Creator Autopilot",
    niche: "AI & Technology",
    timezone: "Asia/Kolkata",
    autoPilot: false,
    dailyPosts: 1
  },
  connections: {
    youtube: false,
    instagram: false,
    facebook: false
  }
};

const app = document.querySelector("#app");
const title = document.querySelector("#title");

async function api(url, options = {}) {
  const response = await fetch(API_URL + url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Server returned an invalid response");
  }

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

async function load() {
  D = await api("/api/dashboard");

  const autoState = document.querySelector("#autoState");
  if (autoState) {
    autoState.textContent = D.settings.autoPilot ? "ON" : "OFF";
  }

  nav("home");
}

function nav(page) {
  document.querySelectorAll(".nav").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  const titles = {
    home: "Overview",
    studio: "AI Studio",
    planner: "Auto Planner",
    calendar: "Calendar",
    social: "Social Accounts",
    settings: "Settings"
  };

  title.textContent = titles[page] || "Overview";

  if (page === "home") home();
  if (page === "studio") studio();
  if (page === "planner") planner();
  if (page === "calendar") calendar();
  if (page === "social") social();
  if (page === "settings") settings();
}

function home() {
  app.innerHTML = `
    <div class="grid">

      <div class="card">
        <span class="muted">CONTENT</span>
        <div class="metric">${D.stats.posts}</div>
      </div>

      <div class="card">
        <span class="muted">PUBLISHED</span>
        <div class="metric">${D.stats.published}</div>
      </div>

      <div class="card">
        <span class="muted">SCHEDULED</span>
        <div class="metric">${D.stats.scheduled}</div>
      </div>

      <div class="card">
        <span class="muted">VIEWS</span>
        <div class="metric">${Number(D.stats.views).toLocaleString()}</div>
      </div>

    </div>

    <div class="two">

      <div class="card">
        <h2>Content pipeline</h2>

        <div class="list">
          ${
            D.posts.length
              ? D.posts.slice(0, 8).map(row).join("")
              : `<p class="muted">
                   No content yet. Open AI Studio to start.
                 </p>`
          }
        </div>
      </div>

      <div class="card">
        <h2>Autopilot brain</h2>

        <p class="muted">
          Generate ideas → scripts → captions → schedule.
        </p>

        <button class="primary" onclick="nav('studio')">
          Open AI Studio
        </button>

        <button class="primary" onclick="nav('planner')">
          Build 7-day plan
        </button>
      </div>

    </div>
  `;
}

function studio() {
  app.innerHTML = `
    <div class="two">

      <div class="card">

        <h2>AI Studio</h2>

        <p class="muted">
          Generate AI content ideas.
        </p>

        <div class="form">

          <input
            id="niche"
            value="${esc(D.settings.niche)}"
            placeholder="Enter your niche"
          >

          <button class="primary" onclick="ideas()">
            Generate Ideas
          </button>

          <div id="ideas" class="list"></div>

        </div>

      </div>

      <div class="card">

        <h2>Script + Caption</h2>

        <div class="form">

          <input
            id="st"
            placeholder="Select or type a title"
          >

          <button class="primary" onclick="genScript()">
            Generate Script
          </button>

          <button class="primary" onclick="genCaption()">
            Generate Caption
          </button>

          <pre id="out"></pre>

        </div>

      </div>

    </div>
  `;
}

async function ideas() {
  try {
    const value = document.querySelector("#niche").value.trim();

    const data = await api("/api/ai/ideas", {
      method: "POST",
      body: JSON.stringify({
        niche: value || "AI Tools"
      })
    });

    document.querySelector("#ideas").innerHTML =
      data.ideas.map(item => `
        <div class="row">
          <span>${esc(item)}</span>
          <button onclick='useTitle(${JSON.stringify(item)})'>
            Use
          </button>
        </div>
      `).join("");

  } catch (error) {
    alert(error.message);
  }
}

function useTitle(value) {
  document.querySelector("#st").value = value;
}

async function genScript() {
  try {
    const value = document.querySelector("#st").value.trim();

    if (!value) {
      alert("Please enter a title first.");
      return;
    }

    const data = await api("/api/ai/script", {
      method: "POST",
      body: JSON.stringify({ title: value })
    });

    document.querySelector("#out").textContent =
      data.hook + "\n\n" + data.script;

  } catch (error) {
    alert(error.message);
  }
}

async function genCaption() {
  try {
    const value = document.querySelector("#st").value.trim();

    if (!value) {
      alert("Please enter a title first.");
      return;
    }

    const data = await api("/api/ai/caption", {
      method: "POST",
      body: JSON.stringify({ title: value })
    });

    document.querySelector("#out").textContent = data.caption;

  } catch (error) {
    alert(error.message);
  }
}

function planner() {
  app.innerHTML = `
    <div class="card">

      <h2>Automatic Content Planner</h2>

      <p class="muted">
        Create a multi-day content plan.
      </p>

      <div class="form">

        <input
          id="days"
          type="number"
          min="1"
          max="7"
          value="7"
        >

        <button class="primary" onclick="makePlan()">
          Generate Plan
        </button>

        <div id="plan" class="list"></div>

      </div>

    </div>
  `;
}

async function makePlan() {
  try {
    const count = Number(document.querySelector("#days").value) || 7;

    const data = await api("/api/ai/plan", {
      method: "POST",
      body: JSON.stringify({
        niche: D.settings.niche,
        days: count
      })
    });

    document.querySelector("#plan").innerHTML =
      data.plan.map(item => `
        <div class="row">

          <div>
            <b>${esc(item.title)}</b>
            <div class="muted">
              ${item.date} · ${item.platform}
            </div>
          </div>

          <button onclick='addPlanned(${JSON.stringify(item)})'>
            Add
          </button>

        </div>
      `).join("");

  } catch (error) {
    alert(error.message);
  }
}

async function addPlanned(post) {
  try {
    await api("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        ...post,
        status: "Scheduled"
      })
    });

    await load();
    nav("planner");

  } catch (error) {
    alert(error.message);
  }
}

function calendar() {
  const posts = [...D.posts].sort((a, b) =>
    (a.date || "9999").localeCompare(b.date || "9999")
  );

  app.innerHTML = `
    <div class="card">

      <h2>Calendar</h2>

      <div class="list">

        ${
          posts.length
            ? posts.map(row).join("")
            : `<p class="muted">Calendar is empty.</p>`
        }

      </div>

    </div>
  `;
}

function social() {
  app.innerHTML = `
    <div class="grid">

      ${["youtube", "instagram", "facebook"].map(platform => `
        <div class="card">

          <h2>${cap(platform)}</h2>

          <p class="muted">
            ${D.connections[platform] ? "Connected" : "Not connected"}
          </p>

          <button
            class="primary"
            onclick="connect('${platform}', ${!D.connections[platform]})"
          >
            ${D.connections[platform] ? "Disconnect" : "Connect"}
          </button>

        </div>
      `).join("")}

    </div>
  `;
}

async function connect(platform, connected) {
  try {
    await api("/api/connections/" + platform, {
      method: "POST",
      body: JSON.stringify({ connected })
    });

    await load();
    nav("social");

  } catch (error) {
    alert(error.message);
  }
}

function settings() {
  app.innerHTML = `
    <div class="card">

      <h2>Workspace</h2>

      <div class="form">

        <input id="bn" value="${esc(D.settings.brandName)}">

        <input id="nn" value="${esc(D.settings.niche)}">

        <input id="tz" value="${esc(D.settings.timezone)}">

        <input
          id="dp"
          type="number"
          min="1"
          max="10"
          value="${D.settings.dailyPosts}"
        >

        <button class="primary" onclick="save()">
          Save
        </button>

      </div>

    </div>
  `;
}

async function save() {
  try {
    await api("/api/settings", {
      method: "POST",
      body: JSON.stringify({
        brandName: document.querySelector("#bn").value,
        niche: document.querySelector("#nn").value,
        timezone: document.querySelector("#tz").value,
        dailyPosts: Number(document.querySelector("#dp").value)
      })
    });

    await load();
    nav("settings");

  } catch (error) {
    alert(error.message);
  }
}

async function toggleAuto() {
  try {
    await api("/api/settings", {
      method: "POST",
      body: JSON.stringify({
        autoPilot: !D.settings.autoPilot
      })
    });

    await load();

  } catch (error) {
    alert(error.message);
  }
}

function row(post) {
  return `
    <div class="row">

      <div>
        <b>${esc(post.title)}</b>

        <div class="muted">
          ${esc(post.platform || "")}
          ${post.date ? " · " + esc(post.date) : ""}
        </div>
      </div>

      <span class="pill">
        ${esc(post.status || "Draft")}
      </span>

    </div>
  `;
}

function quick() {
  document.querySelector("#modal").classList.remove("hidden");
}

function closeModal() {
  document.querySelector("#modal").classList.add("hidden");
}

async function newPost() {
  try {
    const titleValue = document.querySelector("#qt").value.trim();
    const platformValue = document.querySelector("#qp").value;
    const dateValue = document.querySelector("#qd").value;

    if (!titleValue) {
      alert("Please enter a content title");
      return;
    }

    await api("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        title: titleValue,
        platform: platformValue,
        date: dateValue,
        status: "Scheduled"
      })
    });

    closeModal();

    await load();

    nav("home");

  } catch (error) {
    alert("Could not add to workflow: " + error.message);
  }
}

function cap(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

document.querySelectorAll(".nav").forEach(button => {
  button.addEventListener("click", () => {
    nav(button.dataset.page);
  });
});

load().catch(error => {
  app.innerHTML = `
    <div class="card">
      <h2>Connection Error</h2>
      <p>${esc(error.message)}</p>
    </div>
  `;
});

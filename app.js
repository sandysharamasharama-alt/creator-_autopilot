const API_URL = "";
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
const modal = document.querySelector("#modal");

async function api(path, options = {}) {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

async function load() {
  D = await api("/api/dashboard");

  if (!D.stats) {
    D.stats = { posts: 0, published: 0, scheduled: 0, views: 0 };
  }

  if (!D.posts) D.posts = [];
  if (!D.connections) D.connections = {};

  if (!D.settings) {
    D.settings = {
      brandName: "Creator Autopilot",
      niche: "AI & Technology",
      timezone: "Asia/Kolkata",
      autoPilot: false,
      dailyPosts: 1
    };
  }

  const autoState = document.querySelector("#autoState");
  if (autoState) {
    autoState.textContent = D.settings.autoPilot ? "ON" : "OFF";
  }

  return D;
}

function nav(page) {
  document.querySelectorAll(".nav").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  const names = {
    home: "Overview",
    studio: "AI Studio",
    planner: "Auto Planner",
    calendar: "Calendar",
    social: "Social Accounts",
    settings: "Settings"
  };

  title.textContent = names[page] || "Overview";

  const pages = {
    home,
    studio,
    planner,
    calendar,
    social,
    settings
  };

  if (pages[page]) pages[page]();
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
      <span class="pill">${esc(post.status || "Draft")}</span>
    </div>
  `;
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
        <div class="metric">${Number(D.stats.views || 0).toLocaleString()}</div>
      </div>
    </div>

    <div class="two">
      <div class="card">
        <h2>Content pipeline</h2>
        <div class="list">
          ${
            D.posts.length
              ? D.posts.slice(0, 8).map(row).join("")
              : `<p class="muted">No content yet. Open AI Studio to start.</p>`
          }
        </div>
      </div>

      <div class="card">
        <h2>Autopilot brain</h2>
        <p class="muted">
          Generate ideas → scripts → captions → schedule.
        </p>

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
        <h2>Idea generator</h2>

        <div class="form">
          <input
            id="niche"
            value="${esc(D.settings.niche)}"
            placeholder="Your niche"
          >

          <button class="primary" onclick="ideas()">
            Generate ideas
          </button>

          <div id="ideas" class="list"></div>
        </div>
      </div>

      <div class="card">
        <h2>Script + caption</h2>

        <div class="form">
          <input
            id="st"
            placeholder="Select or type a title"
          >

          <button class="primary" onclick="genScript()">
            Generate script
          </button>

          <button class="primary" onclick="genCaption()">
            Generate caption
          </button>

          <pre id="out"></pre>
        </div>
      </div>

    </div>
  `;
}

async function ideas() {
  try {
    const nicheInput = document.querySelector("#niche").value.trim();

    const data = await api("/api/ai/ideas", {
      method: "POST",
      body: JSON.stringify({
        niche: nicheInput
      })
    });

    document.querySelector("#ideas").innerHTML =
      (data.ideas || [])
        .map(
          idea => `
            <div class="row">
              <span>${esc(idea)}</span>
              <button onclick='useTitle(${JSON.stringify(idea)})'>
                Use
              </button>
            </div>
          `
        )
        .join("");

  } catch (error) {
    alert("Could not generate ideas: " + error.message);
  }
}

function useTitle(text) {
  const input = document.querySelector("#st");
  if (input) input.value = text;
}

async function genScript() {
  try {
    const input = document.querySelector("#st");
    const output = document.querySelector("#out");

    if (!input.value.trim()) {
      alert("Please enter a title first.");
      return;
    }

    const data = await api("/api/ai/script", {
      method: "POST",
      body: JSON.stringify({
        title: input.value.trim()
      })
    });

    output.textContent =
      (data.hook || "") +
      "\n\n" +
      (data.script || "");

  } catch (error) {
    alert("Could not generate script: " + error.message);
  }
}

async function genCaption() {
  try {
    const input = document.querySelector("#st");
    const output = document.querySelector("#out");

    if (!input.value.trim()) {
      alert("Please enter a title first.");
      return;
    }

    const data = await api("/api/ai/caption", {
      method: "POST",
      body: JSON.stringify({
        title: input.value.trim()
      })
    });

    output.textContent = data.caption || "";

  } catch (error) {
    alert("Could not generate caption: " + error.message);
  }
}

function planner() {
  app.innerHTML = `
    <div class="card">
      <h2>Automatic content planner</h2>

      <p class="muted">
        Create a multi-day plan from your niche.
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
          Generate plan
        </button>

        <div id="plan" class="list"></div>
      </div>
    </div>
  `;
}

async function makePlan() {
  try {
    const daysInput = document.querySelector("#days");

    const data = await api("/api/ai/plan", {
      method: "POST",
      body: JSON.stringify({
        niche: D.settings.niche,
        days: Number(daysInput.value)
      })
    });

    document.querySelector("#plan").innerHTML =
      (data.plan || [])
        .map(
          post => `
            <div class="row">
              <div>
                <b>${esc(post.title)}</b>
                <div class="muted">
                  ${esc(post.date)} · ${esc(post.platform)}
                </div>
              </div>

              <button onclick='addPlanned(${JSON.stringify(post)})'>
                Add
              </button>
            </div>
          `
        )
        .join("");

  } catch (error) {
    alert("Could not create plan: " + error.message);
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

    alert("Added to workflow successfully.");

  } catch (error) {
    alert("Could not add to workflow: " + error.message);
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
  const platforms = ["youtube", "instagram", "facebook"];

  app.innerHTML = `
    <div class="grid">
      ${platforms
        .map(platform => {
          const connected = !!D.connections[platform];

          return `
            <div class="card">
              <h2>${cap(platform)}</h2>

              <p class="muted">
                ${connected ? "Connected" : "Not connected"}
              </p>

              <button
                class="primary"
                onclick="connect('${platform}', ${!connected})"
              >
                ${connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

async function connect(platform, connected) {
  try {
    await api("/api/connections/" + platform, {
      method: "POST",
      body: JSON.stringify({
        connected
      })
    });

    await load();
    nav("social");

  } catch (error) {
    alert("Connection error: " + error.message);
  }
}

function settings() {
  app.innerHTML = `
    <div class="card">
      <h2>Workspace</h2>

      <div class="form">

        <input
          id="bn"
          value="${esc(D.settings.brandName)}"
          placeholder="Brand name"
        >

        <input
          id="nn"
          value="${esc(D.settings.niche)}"
          placeholder="Niche"
        >

        <input
          id="tz"
          value="${esc(D.settings.timezone)}"
          placeholder="Timezone"
        >

        <input
          id="dp"
          type="number"
          min="1"
          max="10"
          value="${D.settings.dailyPosts}"
        >

        <button class="primary" onclick="save()">
          Save settings
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

    alert("Settings saved.");

  } catch (error) {
    alert("Could not save settings: " + error.message);
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
    alert("Could not change autopilot: " + error.message);
  }
}

function quick() {
  modal.classList.remove("hidden");

  const dateInput = document.querySelector("#qd");

  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
}

function closeModal() {
  modal.classList.add("hidden");
}

async function newPost() {
  try {
    const titleInput = document.querySelector("#qt");
    const platformInput = document.querySelector("#qp");
    const dateInput = document.querySelector("#qd");

    const contentTitle = titleInput.value.trim();

    if (!contentTitle) {
      alert("Please enter what you want to create.");
      titleInput.focus();
      return;
    }

    await api("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        title: contentTitle,
        platform: platformInput.value,
        date: dateInput.value,
        status: "Scheduled"
      })
    });

    closeModal();

    titleInput.value = "";

    await load();
    nav("planner");

    alert("Content added to workflow successfully.");

  } catch (error) {
    alert("Could not add to workflow: " + error.message);
  }
}

function render(page) {
  nav(page);
}

function cap(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    char =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
  );
}

document.querySelectorAll(".nav").forEach(button => {
  button.addEventListener("click", () => {
    nav(button.dataset.page);
  });
});

load()
  .then(() => nav("home"))
  .catch(error => {
    app.innerHTML = `
      <div class="card">
        <h2>Connection error</h2>
        <p class="muted">${esc(error.message)}</p>
        <button class="primary" onclick="location.reload()">
          Try again
        </button>
      </div>
    `;
  });

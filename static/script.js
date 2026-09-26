// DOM Elements
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

const gameSearchInput = document.getElementById("game-search-input");
const gamesDatalist = document.getElementById("games-datalist");
const sliderTopN = document.getElementById("slider-top-n");
const valTopN = document.getElementById("val-top-n");
const sliderMinSim = document.getElementById("slider-min-sim");
const valMinSim = document.getElementById("val-min-sim");
const btnRecommend = document.getElementById("btn-recommend");

const recLoader = document.getElementById("rec-loader");
const recError = document.getElementById("rec-error");
const recResultsContainer = document.getElementById("rec-results-container");
const targetGameName = document.getElementById("target-game-name");
const recommendationsGrid = document.getElementById("recommendations-grid");

// Catalog Filter Elements
const exploreSearch = document.getElementById("explore-search");
const filterGenre = document.getElementById("filter-genre");
const filterPlatform = document.getElementById("filter-platform");
const filterSort = document.getElementById("filter-sort");
const filterMinMeta = document.getElementById("filter-min-meta");
const valMinMeta = document.getElementById("val-min-meta");
const exploreCount = document.getElementById("explore-count");
const exploreGrid = document.getElementById("explore-grid");

let genreChartInstance = null;
let correlationChartInstance = null;

// Initialize Page Metadata
document.addEventListener("DOMContentLoaded", () => {
  fetchMeta();
  setupEventListeners();
});

// Setup Listeners
function setupEventListeners() {
  // Tabs
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.add("hidden"));

      btn.classList.add("active");
      const target = btn.getAttribute("data-tab");
      document.getElementById(target).classList.remove("hidden");

      if (target === "tab-analytics") {
        renderAnalyticsCharts();
      }
    });
  });

  // Range Sliders UI sync
  sliderTopN.addEventListener("input", (e) => valTopN.textContent = e.target.value);
  sliderMinSim.addEventListener("input", (e) => valMinSim.textContent = `${e.target.value}%`);
  filterMinMeta.addEventListener("input", (e) => {
    valMinMeta.textContent = e.target.value;
    triggerExploreFilter();
  });

  // Presets
  document.querySelectorAll(".preset-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const gName = chip.getAttribute("data-game");
      gameSearchInput.value = gName;
      tabBtns[0].click();
      fetchRecommendations();
    });
  });

  // Recommend Button
  btnRecommend.addEventListener("click", fetchRecommendations);

  // Explore filters
  exploreSearch.addEventListener("input", debounce(triggerExploreFilter, 300));
  filterGenre.addEventListener("change", triggerExploreFilter);
  filterPlatform.addEventListener("change", triggerExploreFilter);
  if (filterSort) filterSort.addEventListener("change", triggerExploreFilter);
}

// Fetch Initial Metadata
async function fetchMeta() {
  try {
    const res = await fetch("/api/meta");
    const data = await res.json();

    document.getElementById("stat-total-games").textContent = data.total_games.toLocaleString();
    document.getElementById("stat-total-genres").textContent = data.total_genres;
    document.getElementById("stat-avg-meta").textContent = `${data.avg_metacritic} / 100`;

    // Populate Datalist
    gamesDatalist.innerHTML = data.game_names.map(g => `<option value="${escapeHtml(g)}">`).join("");

    // Populate Genre Filter
    filterGenre.innerHTML = `<option value="All Genres">All Genres</option>` +
      data.genres.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");

    // Populate Platform Filter
    filterPlatform.innerHTML = `<option value="All Platforms">All Platforms</option>` +
      data.platforms.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");

    // Initial Explore Load
    triggerExploreFilter();
  } catch (err) {
    console.error("Meta fetch error:", err);
  }
}

// Fetch Recommendations
async function fetchRecommendations() {
  const gameName = gameSearchInput.value.trim();
  if (!gameName) {
    showRecError("Please select or enter a video game title first.");
    return;
  }

  hideRecError();
  recResultsContainer.classList.add("hidden");
  recLoader.classList.remove("hidden");

  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game_name: gameName,
        top_n: parseInt(sliderTopN.value),
        min_sim: parseFloat(sliderMinSim.value)
      })
    });

    const data = await res.json();
    if (!res.ok) {
      showRecError(data.error || "Could not generate recommendations.");
      return;
    }

    renderRecommendations(data.selected_game, data.recommendations);
  } catch (err) {
    showRecError("Network error. Please make sure the Flask app is running.");
  } finally {
    recLoader.classList.add("hidden");
  }
}

function showRecError(msg) {
  recError.textContent = msg;
  recError.classList.remove("hidden");
}

function hideRecError() {
  recError.classList.add("hidden");
}

function renderRecommendations(gameName, recs) {
  targetGameName.textContent = gameName;
  recResultsContainer.classList.remove("hidden");

  if (!recs || recs.length === 0) {
    recommendationsGrid.innerHTML = `<p class="muted" style="padding:1rem;">No games matched the similarity threshold. Try reducing the similarity filter percentage.</p>`;
    return;
  }

  recommendationsGrid.innerHTML = recs.map(item => {
    const ratingBadge = item.rating > 0 ? `<span class="badge-rating">⭐ ${item.rating}/5</span>` : "";
    const metaBadge = item.metacritic > 0 ? `<span class="badge-meta">🏆 Metacritic: ${item.metacritic}</span>` : "";
    const genresFmt = item.genres ? escapeHtml(item.genres.split(" ").slice(0, 3).join(" • ")) : "General";
    const devsFmt = item.developers ? escapeHtml(item.developers) : "Unknown Studio";
    const platformsFmt = item.platforms ? escapeHtml(item.platforms.split(" ").slice(0, 4).join(" • ")) : "PC / Console";
    const googleLink = `https://www.google.com/search?q=${encodeURIComponent(item.name)}+video+game`;

    return `
      <div class="item-card">
        <div class="item-title">${escapeHtml(item.name)}</div>
        <div class="badge-row">
          <span class="badge-genre">${genresFmt}</span>
          ${ratingBadge}
          ${metaBadge}
        </div>
        <div class="meta-text"><b>Developer:</b> ${devsFmt}</div>
        <div class="meta-text"><b>Platforms:</b> ${platformsFmt}</div>
        <div class="meta-text" style="margin-top:8px;">
          <b>Similarity Match:</b> <span style="color:var(--green); font-weight:700;">${item.similarity}%</span>
        </div>
        <div class="match-bar-track">
          <div class="match-bar-fill" style="width:${item.similarity}%;"></div>
        </div>
        <a class="link-btn" href="${googleLink}" target="_blank">🔗 Learn More on Google ↗</a>
      </div>
    `;
  }).join("");
}

// Live Catalog Filtering
async function triggerExploreFilter() {
  const searchKw = exploreSearch.value.trim();
  const genre = filterGenre.value;
  const platform = filterPlatform.value;
  const minMeta = filterMinMeta.value;

  const sortBy = filterSort ? filterSort.value : "rating";
  const url = `/api/explore?search=${encodeURIComponent(searchKw)}&genre=${encodeURIComponent(genre)}&platform=${encodeURIComponent(platform)}&min_meta=${minMeta}&sort=${encodeURIComponent(sortBy)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    exploreCount.textContent = data.total_matches.toLocaleString();

    if (!data.games || data.games.length === 0) {
      exploreGrid.innerHTML = `<p class="muted" style="padding:1rem;">No matching games found.</p>`;
      return;
    }

    exploreGrid.innerHTML = data.games.map(item => {
      const ratingBadge = item.rating > 0 ? `<span class="badge-rating">⭐ ${item.rating}/5</span>` : "";
      const metaBadge = item.metacritic > 0 ? `<span class="badge-meta">🏆 Metacritic: ${item.metacritic}</span>` : "";
      const genresFmt = item.genres ? escapeHtml(item.genres.split(" ").slice(0, 3).join(" • ")) : "General";
      const googleLink = `https://www.google.com/search?q=${encodeURIComponent(item.name)}+video+game`;

      return `
        <div class="item-card">
          <div class="item-title">${escapeHtml(item.name)}</div>
          <div class="badge-row">
            <span class="badge-genre">${genresFmt}</span>
            ${ratingBadge}
            ${metaBadge}
          </div>
          <div class="meta-text"><b>Developer:</b> ${escapeHtml(item.developers || "N/A")}</div>
          <div class="meta-text"><b>Platforms:</b> ${escapeHtml(item.platforms || "N/A")}</div>
          <a class="link-btn" href="${googleLink}" target="_blank">🔗 Learn More ↗</a>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error("Explore filter error:", err);
  }
}

// Render Analytics Charts using Chart.js
async function renderAnalyticsCharts() {
  try {
    const res = await fetch("/api/analytics");
    const data = await res.json();

    // Genre Bar Chart
    const ctxGenre = document.getElementById("chart-genres");
    if (ctxGenre) {
      if (genreChartInstance) genreChartInstance.destroy();

      genreChartInstance = new Chart(ctxGenre, {
        type: "bar",
        data: {
          labels: data.genre_labels,
          datasets: [{
            label: "Game Count",
            data: data.genre_counts,
            backgroundColor: "#6366f1",
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          indexAxis: "y",
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#9ca3af" }, grid: { color: "#1f2937" } },
            y: { ticks: { color: "#9ca3af" }, grid: { color: "#1f2937" } }
          }
        }
      });
    }

    // Rating Correlation Scatter Chart
    const ctxCorr = document.getElementById("chart-correlation");
    if (ctxCorr) {
      if (correlationChartInstance) correlationChartInstance.destroy();

      const points = data.user_ratings.map((r, i) => ({ x: data.metacritic_scaled[i], y: r }));

      correlationChartInstance = new Chart(ctxCorr, {
        type: "scatter",
        data: {
          datasets: [{
            label: "Metacritic vs User Rating",
            data: points,
            backgroundColor: "#a855f7"
          }]
        },
        options: {
          responsive: true,
          scales: {
            x: { title: { display: true, text: "Scaled Metacritic (0-5)", color: "#9ca3af" }, ticks: { color: "#9ca3af" }, grid: { color: "#1f2937" } },
            y: { title: { display: true, text: "User Rating (0-5)", color: "#9ca3af" }, ticks: { color: "#9ca3af" }, grid: { color: "#1f2937" } }
          }
        }
      });
    }
  } catch (err) {
    console.error("Analytics fetch error:", err);
  }
}

// Helpers
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

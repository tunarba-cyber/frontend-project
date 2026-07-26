(() => {
  "use strict";

  const API_BASE = "https://api.tvmaze.com/shows";

  const grid          = document.getElementById("showGrid");
  const rosterSection = document.getElementById("roster");
  const searchHint    = document.getElementById("searchHint");
  const statusMsg     = document.getElementById("statusMsg");
  const searchInput   = document.getElementById("searchInput");
  const genreFilter    = document.getElementById("genreFilter");
  const sortSelect     = document.getElementById("sortSelect");
  const loadMoreBtn    = document.getElementById("loadMoreBtn");
  const modalBody      = document.getElementById("modalBody");
  const modalTitle     = document.getElementById("detailsModalLabel");
  const detailsModalEl = document.getElementById("detailsModal");
  const seeMoreLink    = document.getElementById("seeMoreLink");

  // Guard against the Bootstrap bundle failing to load (slow/blocked CDN) —
  // fall back to a plain show/hide so Details never leaves the page stuck.
  let detailsModal = null;
  if (window.bootstrap && typeof bootstrap.Modal === "function") {
    try {
      detailsModal = new bootstrap.Modal(detailsModalEl);
    } catch (err) {
      console.error("Bootstrap Modal failed to initialize:", err);
    }
  }

  function openModal() {
    if (detailsModal) {
      detailsModal.show();
      return;
    }
    // Fallback path: no Bootstrap JS available.
    detailsModalEl.classList.add("show", "d-block");
    detailsModalEl.removeAttribute("aria-hidden");
    detailsModalEl.setAttribute("aria-modal", "true");
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    if (!document.getElementById("fallbackBackdrop")) {
      const backdrop = document.createElement("div");
      backdrop.id = "fallbackBackdrop";
      backdrop.className = "modal-backdrop fade show";
      backdrop.addEventListener("click", closeModal);
      document.body.appendChild(backdrop);
    }
  }

  function closeModal() {
    if (detailsModal) {
      detailsModal.hide();
      return;
    }
    detailsModalEl.classList.remove("show", "d-block");
    detailsModalEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";
    const backdrop = document.getElementById("fallbackBackdrop");
    if (backdrop) backdrop.remove();
  }

  // Manual close wiring works whether or not Bootstrap JS is present.
  detailsModalEl.querySelectorAll("[data-bs-dismiss='modal']").forEach(btn => {
    btn.addEventListener("click", closeModal);
  });

  const genreCarousels = document.getElementById("genreCarousels");
  const searchSection  = document.getElementById("search");
  const searchSpacer   = document.getElementById("searchSpacer");
  const topnav         = document.querySelector(".topnav");

  const MAX_GENRE_ROWS  = 8;
  const MAX_ROW_ITEMS   = 18;
  const INITIAL_AUTO_PAGES = 3; // fetch a few pages up front so search has a wide pool to match against

  function hasActiveQuery() {
    return searchInput.value.trim() !== "" || genreFilter.value !== "";
  }

  let allShows   = [];   // every show fetched so far
  let nextPage   = 0;    // next page to request from the API
  let noMorePages = false;

  // ---------- Fetching ----------

  async function fetchPage(page) {
    const res = await fetch(`${API_BASE}?page=${page}`);
    if (res.status === 404) return [];      // TVmaze returns 404 past the last page
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    return res.json();
  }

  async function loadNextPage() {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Loading…";
    setStatus("");

    try {
      const shows = await fetchPage(nextPage);

      if (!shows.length) {
        noMorePages = true;
        loadMoreBtn.textContent = "That's the whole roster";
        return;
      }

      allShows = allShows.concat(shows);
      nextPage += 1;

      populateGenreFilter();
      renderShows();
      renderGenreCarousels();

      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = "Load next reel →";
    } catch (err) {
      console.error(err);
      setStatus("Couldn't reach the TVmaze API. Check your connection and try again.", true);
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = "Try again";
    }
  }

  function setStatus(msg, isError = false) {
    statusMsg.textContent = msg;
    statusMsg.classList.toggle("error", isError);
  }

  // ---------- Genre filter ----------

  function populateGenreFilter() {
    const genres = new Set();
    allShows.forEach(s => (s.genres || []).forEach(g => genres.add(g)));

    const current = genreFilter.value;
    genreFilter.innerHTML = '<option value="">All genres</option>';
    [...genres].sort().forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      genreFilter.appendChild(opt);
    });
    genreFilter.value = current;
  }

  // ---------- Rendering ----------

  function getFilteredSortedShows() {
    const term = searchInput.value.trim().toLowerCase();
    const genre = genreFilter.value;
    const sortBy = sortSelect.value;

    let list = allShows.filter(s => {
      const matchesTerm = !term || s.name.toLowerCase().includes(term);
      const matchesGenre = !genre || (s.genres || []).includes(genre);
      return matchesTerm && matchesGenre;
    });

    list = list.slice().sort((a, b) => {
      if (sortBy === "rating") {
        return (b.rating?.average ?? -1) - (a.rating?.average ?? -1);
      }
      if (sortBy === "premiered") {
        return (b.premiered ?? "").localeCompare(a.premiered ?? "");
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }

  function renderShows() {
    const active = hasActiveQuery();
    rosterSection.classList.toggle("is-active", active);
    searchHint.style.display = active ? "none" : "block";

    if (!active) {
      grid.innerHTML = "";
      setStatus("");
      return;
    }

    const list = getFilteredSortedShows();
    grid.innerHTML = "";

    if (!list.length) {
      setStatus(allShows.length ? "No shows match that search." : "");
      return;
    }
    setStatus(`Showing ${list.length} of ${allShows.length} loaded shows.`);

    const frag = document.createDocumentFragment();
    list.forEach(show => frag.appendChild(buildCard(show)));
    grid.appendChild(frag);
  }

  function buildCard(show) {
    const col = document.createElement("div");
    col.className = "show-card";

    const rating = show.rating?.average;
    const genres = (show.genres || []).slice(0, 2)
      .map(g => `<span class="genre-pill">${escapeHtml(g)}</span>`).join("");

    col.innerHTML = `
      <div class="poster-wrap">
        ${show.image?.medium
          ? `<img src="${show.image.medium}" alt="${escapeHtml(show.name)} poster" loading="lazy">`
          : `<div class="no-img">No image available</div>`}
        ${rating ? `<span class="rating-badge">★ ${rating}</span>` : ""}
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(show.name)}</h3>
        <div class="card-meta">
          <span>${show.premiered ? show.premiered.slice(0, 4) : "Unknown year"}</span>
          <span>&middot;</span>
          <span>${escapeHtml(show.status || "Unknown status")}</span>
        </div>
        <div class="card-meta">${genres}</div>
        <button type="button" class="btn btn-details" data-show-id="${show.id}">
          Details
        </button>
      </div>
    `;

    col.querySelector(".btn-details").addEventListener("click", () => openDetails(show));
    return col;
  }

  // ---------- Genre carousels ----------

  function renderGenreCarousels() {
    const byGenre = new Map();
    allShows.forEach(show => {
      (show.genres || []).forEach(g => {
        if (!byGenre.has(g)) byGenre.set(g, []);
        byGenre.get(g).push(show);
      });
    });

    const topGenres = [...byGenre.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, MAX_GENRE_ROWS);

    if (!topGenres.length) {
      genreCarousels.innerHTML = `<p class="carousel-empty">Genres will appear here once shows have loaded.</p>`;
      return;
    }

    genreCarousels.innerHTML = topGenres.map(([genre, shows]) => {
      const rowShows = shows
        .slice()
        .sort((a, b) => (b.rating?.average ?? -1) - (a.rating?.average ?? -1))
        .slice(0, MAX_ROW_ITEMS);

      const cards = rowShows.map(show => `
        <div class="carousel-card" data-show-id="${show.id}" tabindex="0" role="button" aria-label="View details for ${escapeHtml(show.name)}">
          <div class="poster-wrap">
            ${show.image?.medium
              ? `<img src="${show.image.medium}" alt="${escapeHtml(show.name)} poster" loading="lazy">`
              : `<div class="no-img">No image</div>`}
            ${show.rating?.average ? `<span class="rating-badge">★ ${show.rating.average}</span>` : ""}
          </div>
          <div class="card-body">
            <h4 class="card-title">${escapeHtml(show.name)}</h4>
            <div class="card-meta"><span>${show.premiered ? show.premiered.slice(0, 4) : "—"}</span></div>
          </div>
        </div>
      `).join("");

      return `
        <div class="genre-row" data-genre="${escapeHtml(genre)}">
          <div class="genre-row-header">
            <h3>${escapeHtml(genre)}</h3>
            <span>${shows.length} title${shows.length === 1 ? "" : "s"}</span>
          </div>
          <div class="carousel-wrap">
            <button type="button" class="car-btn car-prev" aria-label="Scroll ${escapeHtml(genre)} left">&lsaquo;</button>
            <div class="carousel-track">${cards}</div>
            <button type="button" class="car-btn car-next" aria-label="Scroll ${escapeHtml(genre)} right">&rsaquo;</button>
          </div>
        </div>
      `;
    }).join("");
  }

  // Delegated events for carousel arrows and cards (rows are rebuilt often)
  genreCarousels.addEventListener("click", (e) => {
    const prevBtn = e.target.closest(".car-prev");
    const nextBtn = e.target.closest(".car-next");
    const card    = e.target.closest(".carousel-card");

    if (prevBtn || nextBtn) {
      const track = e.target.closest(".carousel-wrap").querySelector(".carousel-track");
      const amount = track.clientWidth * 0.85;
      track.scrollBy({ left: prevBtn ? -amount : amount, behavior: "smooth" });
      return;
    }

    if (card) {
      const show = allShows.find(s => String(s.id) === card.dataset.showId);
      if (show) openDetails(show);
    }
  });

  genreCarousels.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("carousel-card")) {
      e.preventDefault();
      const show = allShows.find(s => String(s.id) === e.target.dataset.showId);
      if (show) openDetails(show);
    }
  });

  // ---------- Details modal ----------

  function openDetails(show) {
    window.RecentlyViewed?.add(show);

    modalTitle.textContent = show.name;
    seeMoreLink.href = `detail.html?id=${encodeURIComponent(show.id)}`;

    const rating   = show.rating?.average ? `★ ${show.rating.average}` : "Not yet rated";
    const genres   = (show.genres || []).map(g => `<span class="badge-pill">${escapeHtml(g)}</span>`).join("") || "—";
    const network  = show.network?.name || show.webChannel?.name || "—";
    const country  = show.network?.country?.name || show.webChannel?.country?.name || "";
    const schedule = show.schedule?.days?.length
      ? `${show.schedule.days.join(", ")} at ${show.schedule.time || "TBA"}`
      : "—";
    const runtime  = show.averageRuntime ? `${show.averageRuntime} min` : (show.runtime ? `${show.runtime} min` : "—");
    const summary  = show.summary ? show.summary : "<p>No summary available for this show.</p>";

    modalBody.innerHTML = `
      <div class="detail-layout">
        <div class="detail-poster">
          ${show.image?.original
            ? `<img src="${show.image.original}" alt="${escapeHtml(show.name)} poster">`
            : `<div class="no-img" style="height:100%;display:flex;align-items:center;justify-content:center;">No image</div>`}
        </div>
        <div class="detail-info">
          <div class="detail-badges">
            <span class="badge-pill">${rating}</span>
            <span class="badge-pill">${escapeHtml(show.status || "Unknown")}</span>
            <span class="badge-pill">${escapeHtml(show.type || "TV")}</span>
          </div>
          <div class="detail-badges">${genres}</div>
          <table class="detail-table">
            <tbody>
              <tr><td>Network</td><td>${escapeHtml(network)}${country ? " · " + escapeHtml(country) : ""}</td></tr>
              <tr><td>Schedule</td><td>${escapeHtml(schedule)}</td></tr>
              <tr><td>Runtime</td><td>${escapeHtml(runtime)}</td></tr>
              <tr><td>Premiered</td><td>${escapeHtml(show.premiered || "—")}</td></tr>
              <tr><td>Language</td><td>${escapeHtml(show.language || "—")}</td></tr>
            </tbody>
          </table>
          <div class="detail-summary">${summary}</div>
          ${show.officialSite ? `<a class="official-link" href="${show.officialSite}" target="_blank" rel="noopener">Visit official site &rarr;</a>` : ""}
        </div>
      </div>
    `;

    openModal();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  // ---------- Floating search bar ----------

  let searchThreshold = 0;

  function measureSearchThreshold() {
    if (!searchSection.classList.contains("is-pinned")) {
      searchThreshold = searchSection.getBoundingClientRect().top + window.scrollY - topnav.offsetHeight;
    }
  }

  function updateSearchPin() {
    const shouldPin = window.scrollY > searchThreshold;
    const isPinned  = searchSection.classList.contains("is-pinned");

    if (shouldPin && !isPinned) {
      searchSpacer.style.height = `${searchSection.offsetHeight}px`;
      searchSection.style.top = `${topnav.offsetHeight}px`;
      searchSection.classList.add("is-pinned");
    } else if (!shouldPin && isPinned) {
      searchSection.classList.remove("is-pinned");
      searchSection.style.top = "";
      searchSpacer.style.height = "0px";
    }
  }

  let scrollTicking = false;
  window.addEventListener("scroll", () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        updateSearchPin();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });

  window.addEventListener("resize", () => {
    measureSearchThreshold();
    updateSearchPin();
  });

  measureSearchThreshold();
  updateSearchPin();

  // ---------- Events ----------

  let searchDebounce;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(renderShows, 200);
  });
  genreFilter.addEventListener("change", renderShows);
  sortSelect.addEventListener("change", renderShows);
  loadMoreBtn.addEventListener("click", () => {
    if (!noMorePages) loadNextPage();
  });

  // ---------- Init ----------

  function showSkeletons(count = 10) {
    grid.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const s = document.createElement("div");
      s.className = "skeleton-card";
      s.innerHTML = `<div class="skeleton-poster"></div><div class="skeleton-line"></div><div class="skeleton-line" style="width:60%"></div>`;
      grid.appendChild(s);
    }
  }

  async function autoLoadInitialPages() {
    for (let i = 0; i < INITIAL_AUTO_PAGES; i++) {
      if (noMorePages) break;
      await loadNextPage();
    }
  }

  showSkeletons();
  autoLoadInitialPages();
})();
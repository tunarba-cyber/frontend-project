(() => {
  "use strict";

  const statusEl  = document.getElementById("detailStatus");
  const contentEl = document.getElementById("detailContent");
  const cardEl    = document.getElementById("detailCard");

  const similarSection   = document.getElementById("similarSection");
  const similarCarousel  = document.getElementById("similarCarousel");
  const recentSection    = document.getElementById("recentSection");
  const recentCarousel   = document.getElementById("recentCarousel");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("error", isError);
  }

  function renderShow(show) {
    document.title = `${show.name} — Reel Roster`;

    const rating   = show.rating?.average ? `★ ${show.rating.average}` : "Not yet rated";
    const genres   = (show.genres || []).map(g => `<span class="badge-pill">${escapeHtml(g)}</span>`).join("") || "—";
    const network  = show.network?.name || show.webChannel?.name || "—";
    const country  = show.network?.country?.name || show.webChannel?.country?.name || "";
    const schedule = show.schedule?.days?.length
      ? `${show.schedule.days.join(", ")} at ${show.schedule.time || "TBA"}`
      : "—";
    const runtime  = show.averageRuntime ? `${show.averageRuntime} min` : (show.runtime ? `${show.runtime} min` : "—");
    const summary  = show.summary ? show.summary : "<p>No summary available for this show.</p>";

    contentEl.innerHTML = `
      <div class="detail-page-header">
        <h1 class="detail-page-title">${escapeHtml(show.name)}</h1>
        ${show.premiered ? `<span class="detail-page-year">${show.premiered.slice(0, 4)}</span>` : ""}
      </div>

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
  }

  function showSkeleton() {
    contentEl.innerHTML = `
      <div class="detail-layout">
        <div class="detail-poster skeleton-poster"></div>
        <div class="detail-info">
          <div class="skeleton-line" style="width:60%"></div>
          <div class="skeleton-line" style="width:40%"></div>
          <div class="skeleton-line" style="width:90%"></div>
          <div class="skeleton-line" style="width:85%"></div>
          <div class="skeleton-line" style="width:70%"></div>
        </div>
      </div>
    `;
  }

  // ---------- Shared carousel row rendering ----------

  function buildCarouselCardHtml(show) {
    const year   = show.premiered ? String(show.premiered).slice(0, 4) : "—";
    const rating = show.rating?.average;
    const image  = show.image?.medium;

    return `
      <div class="carousel-card" data-show-id="${show.id}" tabindex="0" role="button" aria-label="View details for ${escapeHtml(show.name)}">
        <div class="poster-wrap">
          ${image
            ? `<img src="${image}" alt="${escapeHtml(show.name)} poster" loading="lazy">`
            : `<div class="no-img">No image</div>`}
          ${rating ? `<span class="rating-badge">★ ${rating}</span>` : ""}
        </div>
        <div class="card-body">
          <h4 class="card-title">${escapeHtml(show.name)}</h4>
          <div class="card-meta"><span>${year}</span></div>
        </div>
      </div>
    `;
  }

  function renderCarouselRow(sectionEl, containerEl, shows) {
    if (!shows.length) {
      sectionEl.classList.add("is-hidden");
      containerEl.innerHTML = "";
      return;
    }

    sectionEl.classList.remove("is-hidden");
    containerEl.innerHTML = `
      <div class="carousel-wrap">
        <button type="button" class="car-btn car-prev" aria-label="Scroll left">&lsaquo;</button>
        <div class="carousel-track">${shows.map(buildCarouselCardHtml).join("")}</div>
        <button type="button" class="car-btn car-next" aria-label="Scroll right">&rsaquo;</button>
      </div>
    `;
  }

  function wireCarouselNavigation(containerEl) {
    containerEl.addEventListener("click", (e) => {
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
        window.location.href = `detail.html?id=${encodeURIComponent(card.dataset.showId)}`;
      }
    });

    containerEl.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("carousel-card")) {
        e.preventDefault();
        window.location.href = `detail.html?id=${encodeURIComponent(e.target.dataset.showId)}`;
      }
    });
  }

  wireCarouselNavigation(similarCarousel);
  wireCarouselNavigation(recentCarousel);

  // ---------- Similar shows ----------

  async function fetchSimilarShows(show) {
    const genres = show.genres || [];
    if (!genres.length) return [];

    try {
      const [page0, page1] = await Promise.all([
        fetch("https://api.tvmaze.com/shows?page=0").then(r => (r.ok ? r.json() : [])),
        fetch("https://api.tvmaze.com/shows?page=1").then(r => (r.ok ? r.json() : [])),
      ]);

      const pool = [...page0, ...page1];

      return pool
        .filter(s => s.id !== show.id && (s.genres || []).some(g => genres.includes(g)))
        .sort((a, b) => (b.rating?.average ?? -1) - (a.rating?.average ?? -1))
        .slice(0, 16);
    } catch (err) {
      console.error("Couldn't load similar shows:", err);
      return [];
    }
  }

  // ---------- Recently viewed ----------

  function renderRecentlyViewed(currentId) {
    if (!window.RecentlyViewed) {
      recentSection.classList.add("is-hidden");
      return;
    }
    const recent = window.RecentlyViewed.getAll().filter(item => String(item.id) !== String(currentId));
    renderCarouselRow(recentSection, recentCarousel, recent);
  }

  async function loadShow() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    similarSection.classList.add("is-hidden");
    recentSection.classList.add("is-hidden");

    if (!id) {
      cardEl.style.display = "none";
      setStatus("No show was specified. Head back to the roster and pick a title.", true);
      return;
    }

    showSkeleton();
    setStatus("");

    try {
      const res = await fetch(`https://api.tvmaze.com/shows/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        cardEl.style.display = "none";
        setStatus("That show couldn't be found. It may have been removed from TVmaze.", true);
        return;
      }
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

      const show = await res.json();
      renderShow(show);

      window.RecentlyViewed?.add(show);
      renderRecentlyViewed(show.id);

      fetchSimilarShows(show).then(similar => {
        renderCarouselRow(similarSection, similarCarousel, similar);
      });
    } catch (err) {
      console.error(err);
      cardEl.style.display = "none";
      setStatus("Couldn't reach the TVmaze API. Check your connection and try again.", true);
    }
  }

  loadShow();
})();
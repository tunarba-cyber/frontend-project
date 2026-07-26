(() => {
  "use strict";

  const STORAGE_KEY = "reelRoster:recentlyViewed";
  const MAX_ITEMS = 12;

  function safeParse(json, fallback) {
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function getAll() {
    if (typeof localStorage === "undefined") return [];
    return safeParse(localStorage.getItem(STORAGE_KEY), []);
  }

  function add(show) {
    if (!show || show.id == null || typeof localStorage === "undefined") return;

    const entry = {
      id: show.id,
      name: show.name,
      image: show.image?.medium || null,
      premiered: show.premiered || null,
      rating: show.rating?.average ?? null,
    };

    let list = getAll().filter(item => item.id !== entry.id);
    list.unshift(entry);
    list = list.slice(0, MAX_ITEMS);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error("Couldn't save recently viewed:", err);
    }
  }

  window.RecentlyViewed = { getAll, add };
})();
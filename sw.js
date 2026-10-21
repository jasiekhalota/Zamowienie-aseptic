// Service worker - Kącik Czystości ASEPTIK
// Po większej zmianie plików zwiększ numer wersji poniżej.
const CACHE_VERSION = "v2";
const CACHE_NAME = "kacik-czystosci-" + CACHE_VERSION;

// Pliki podstawowe. Dodawane pojedynczo, więc brak któregoś pliku
// (np. tlo.jpeg) nie blokuje instalacji aplikacji.
const CORE_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./tlo.jpeg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        CORE_FILES.map((url) =>
          cache.add(url).catch(() => { /* pomiń brakujący plik */ })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("kacik-czystosci-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // tylko własne pliki

  // Strona główna: najpierw sieć (świeża wersja), w razie braku internetu - pamięć podręczna
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match("./index.html"))
        )
    );
    return;
  }

  // Pozostałe pliki (zdjęcia, tło, ikony): z pamięci, a w tle odświeżenie
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

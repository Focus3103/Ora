// ORA Service Worker
// แคชไฟล์ทั้งหมดไว้ในเครื่อง เพื่อให้เปิดแอปได้แม้ไม่มีเน็ต (offline-first)

const CACHE_NAME = "ora-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

// ติดตั้ง: แคชไฟล์หลักทั้งหมดทันที
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// เปิดใช้งาน: ลบแคชเวอร์ชันเก่าทิ้ง
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ดักทุก request: ถ้ามีในแคชใช้แคชก่อน (เร็ว+ออฟไลน์ได้) ไม่มีค่อยไปโหลดจากเน็ต
self.addEventListener("fetch", (event) => {
  // ปล่อยให้ request ไปยัง Anthropic API (แชท AI) วิ่งผ่านปกติ ไม่แคช
  if (event.request.url.includes("api.anthropic.com")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          // เก็บไฟล์ใหม่ที่โหลดสำเร็จไว้ในแคชด้วย (เผื่อโหลดเพิ่มทีหลัง)
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            event.request.method === "GET"
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // ถ้าออฟไลน์และไม่มีในแคช ให้ fallback กลับไปหน้าแรก
          return caches.match("./index.html");
        });
    })
  );
});

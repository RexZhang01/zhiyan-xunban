const CACHE_NAME = 'zhiyan-xunban-v2';
const OFFLINE_URL = 'offline.html';
const urlsToCache = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  OFFLINE_URL
];

// 安装Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('缓存核心文件');
        return cache.addAll(urlsToCache);
      })
  );
});

// 激活Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 拦截请求 - 修复404错误
self.addEventListener('fetch', event => {
  // 处理离线回退
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // 处理其他资源请求
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }

      // 对于API请求不缓存
      if (event.request.url.includes('api.deepseek.com')) {
        return fetch(event.request);
      }

      // 对于其他资源，获取并缓存
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // 对于静态资源，尝试返回缓存版本
        return caches.match(event.request);
      });
    })
  );
});
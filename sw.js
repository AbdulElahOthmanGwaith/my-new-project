/**
 * Service Worker for Arabic Amharic Translator PWA
 * خدمة مترجم عربي - أمهري
 */

const CACHE_NAME = 'translator-v2';
const STATIC_ASSETS = [
    '/my-new-project/',
    '/my-new-project/index.html',
    '/my-new-project/styles.css',
    '/my-new-project/app.js',
    '/my-new-project/manifest.json',
    '/my-new-project/icon.svg',
    'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@300;400;500;600;700&family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap'
];

const API_CACHE_NAME = 'translator-api-v2';
const API_CACHE_DURATION = 60 * 60 * 24; // 24 hours

// تثبيت Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Skip waiting');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Install failed:', error);
            })
    );
});

// تنشيط Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            return cacheName !== CACHE_NAME &&
                                   cacheName !== API_CACHE_NAME;
                        })
                        .map((cacheName) => {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Claiming clients');
                return self.clients.claim();
            })
    );
});

// اعتراض الطلبات
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // التحقق من طلبات الترجمة
    if (url.hostname.includes('translate.googleapis.com') ||
        url.hostname.includes('libretranslate.com')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // التعامل مع الموارد الثابتة
    event.respondWith(handleStaticRequest(request));
});

// معالجة طلبات API
async function handleApiRequest(request) {
    // التحقق من الاتصال بالإنترنت أولاً
    if (!navigator.onLine) {
        return new Response(
            JSON.stringify({
                error: 'لا يوجد اتصال بالإنترنت',
                offline: true
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    try {
        // محاولة الطلب الأصلي
        const response = await fetch(request);

        // تخزين الاستجابة في الكاش
        if (response.ok) {
            const cache = await caches.open(API_CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.error('[SW] API request failed:', error);

        // محاولة الحصول على الاستجابة المخبأة
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // إرجاع رسالة خطأ
        return new Response(
            JSON.stringify({
                error: 'حدث خطأ في الاتصال',
                message: 'يرجى التحقق من اتصال الإنترنت'
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// معالجة الطلبات الثابتة
async function handleStaticRequest(request) {
    // أولاً: التحقق من الكاش
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    // ثانياً: محاولة الشبكة
    try {
        const response = await fetch(request);

        // تخزين الموارد في الكاش للطلبات الناجحة
        if (response.ok && request.method === 'GET') {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);

        // إرجاع صفحة الخطأ إذا كانت HTML
        if (request.headers.get('Accept').includes('text/html')) {
            const cache = await caches.match('/my-new-project/index.html');
            if (cache) {
                return cache;
            }
        }

        return new Response('حدث خطأ في الاتصال', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// معالجة رسائل Push
self.addEventListener('push', (event) => {
    console.log('[SW] Push received');
    const data = event.data?.json() || {};

    const options = {
        body: data.body || 'لديك إشعار جديد',
        icon: '/my-new-project/icon.svg',
        badge: '/my-new-project/icon.svg',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'فتح' },
            { action: 'close', title: 'إغلاق' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(
            data.title || 'مترجم عربي - أمهري',
            options
        )
    );
});

// معالجة النقر على الإشعارات
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // البحث عن نافذة مفتوحة
                for (const client of clientList) {
                    if (client.url.includes(self.registration.scope) && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }

                // فتح نافذة جديدة
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// معالجة مزامنة الخلفية
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
});

// معالجة الرسائل من التطبيق
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then((cache) => {
                    return cache.addAll(event.data.urls);
                })
        );
    }
});

// تحديث Service Worker
self.addEventListener('updatefound', () => {
    console.log('[SW] New version found');

    const newWorker = self.installing;
    newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && self.clients) {
            // إشعار المستخدم بتحديث جديد
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'UPDATE_AVAILABLE',
                        version: CACHE_NAME
                    });
                });
            });
        }
    });
});

console.log('[SW] Service Worker loaded');

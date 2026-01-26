// PWA Installation and Registration
class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.init();
  }

  init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      this.registerServiceWorker();
    }

    // Handle install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    // Handle app installed
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      this.hideInstallButton();
      this.deferredPrompt = null;
    });

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ Running as PWA');
    }
  }

  // Register service worker
  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker registered:', registration.scope);

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });

      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }

  // Show install button
  showInstallButton() {
    const installButton = document.getElementById('install-pwa-btn');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => this.installPWA());
    }
  }

  // Hide install button
  hideInstallButton() {
    const installButton = document.getElementById('install-pwa-btn');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  // Install PWA
  async installPWA() {
    if (!this.deferredPrompt) {
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    
    console.log(`User response: ${outcome}`);
    this.deferredPrompt = null;
    this.hideInstallButton();
  }

  // Show update notification
  showUpdateNotification() {
    if (confirm('A new version is available! Reload to update?')) {
      window.location.reload();
    }
  }

  // Request persistent storage
  async requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
      const persistent = await navigator.storage.persist();
      console.log(`Persistent storage: ${persistent}`);
      return persistent;
    }
    return false;
  }

  // Check storage quota
  async checkStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const percentUsed = (estimate.usage / estimate.quota * 100).toFixed(2);
      console.log(`Storage used: ${percentUsed}%`);
      return estimate;
    }
    return null;
  }
}

// Initialize PWA Manager
const pwaManager = new PWAManager();

// Export for global use
window.PWAManager = PWAManager;
window.pwaManager = pwaManager;

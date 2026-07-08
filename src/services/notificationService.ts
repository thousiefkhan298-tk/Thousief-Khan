export const notificationService = {
  async registerServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered with scope:', registration.scope);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  },

  async requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
      console.log('This browser does not support desktop notification');
      return false;
    }

    if (window.Notification.permission === 'granted') {
      return true;
    }

    if (window.Notification.permission !== 'denied') {
      const permission = await window.Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  async sendLocalNotification(title: string, options?: NotificationOptions) {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification && window.Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          registration.showNotification(title, {
            icon: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' rx=\'20\' fill=\'black\'/%3E%3Cpath d=\'M30 40H65L62 48H50L43 80H33L40 48H30V40Z\' fill=\'%23dc2626\'/%3E%3Cpath d=\'M47 57L70 40H80L58 60L80 80H70L47 63V57Z\' fill=\'white\'/%3E%3C/svg%3E',
            badge: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Cpath d=\'M30 40H65L62 48H50L43 80H33L40 48H30V40Z\' fill=\'%23dc2626\'/%3E%3C/svg%3E',
            ...options
          });
        }
      } catch (e) {
        console.warn('Could not dispatch local notification via Service Worker:', e);
      }
    }
  },

  async scheduleReminder(title: string, body: string, delayMs: number) {
    setTimeout(() => {
      this.sendLocalNotification(title, { body });
    }, delayMs);
  }
};

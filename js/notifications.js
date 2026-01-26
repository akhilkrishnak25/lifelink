// Socket.IO Real-Time Notifications Client
class NotificationService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.notifications = [];
  }

  // Initialize socket connection
  init(userId) {
    const API_URL = localStorage.getItem('API_URL') || 'http://localhost:5000';
    
    this.socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.connected = true;
      this.socket.emit('join', userId);
      
      // Join location room if donor
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role === 'donor' && user.city) {
        this.socket.emit('join-location', { city: user.city });
      }
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      this.connected = false;
    });

    // Listen for notifications
    this.socket.on('notification', (notification) => {
      this.handleNotification(notification);
    });

    // Listen for new messages
    this.socket.on('new-message', (data) => {
      this.handleNewMessage(data);
    });
  }

  // Handle incoming notification
  handleNotification(notification) {
    console.log('📢 New notification:', notification);
    
    // Store notification
    this.notifications.unshift(notification);
    
    // Update badge count
    this.updateBadgeCount();
    
    // Show browser notification
    this.showBrowserNotification(notification);
    
    // Play sound
    this.playNotificationSound();
    
    // Display in UI
    this.displayNotification(notification);
    
    // Trigger custom event
    window.dispatchEvent(new CustomEvent('new-notification', { 
      detail: notification 
    }));
  }

  // Show browser notification
  showBrowserNotification(notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const options = {
        body: notification.message,
        icon: '/images/icon-192.png',
        badge: '/images/badge-72.png',
        tag: notification.type,
        requireInteraction: notification.priority === 'critical',
        vibrate: [200, 100, 200]
      };

      const notif = new Notification(notification.title, options);
      
      notif.onclick = () => {
        window.focus();
        if (notification.data && notification.data.requestId) {
          window.location.href = `/receiver-dashboard.html?request=${notification.data.requestId}`;
        }
        notif.close();
      };
    }
  }

  // Play notification sound
  playNotificationSound() {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Sound play failed:', e));
    } catch (error) {
      console.log('Audio not available');
    }
  }

  // Display notification in UI
  displayNotification(notification) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notifElement = document.createElement('div');
    notifElement.className = `alert alert-${this.getAlertClass(notification.type)} alert-dismissible fade show notification-toast`;
    notifElement.innerHTML = `
      <strong>${notification.title}</strong>
      <p class="mb-0">${notification.message}</p>
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    container.appendChild(notifElement);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notifElement.remove();
    }, 5000);
  }

  // Get alert class based on notification type
  getAlertClass(type) {
    const classes = {
      'request': 'info',
      'response': 'success',
      'match': 'warning',
      'reminder': 'info',
      'alert': 'danger',
      'achievement': 'success',
      'message': 'primary'
    };
    return classes[type] || 'info';
  }

  // Update badge count
  updateBadgeCount() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
      const unreadCount = this.notifications.filter(n => !n.read).length;
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
  }

  // Handle new message
  handleNewMessage(data) {
    console.log('💬 New message:', data);
    
    // Trigger custom event
    window.dispatchEvent(new CustomEvent('new-message', { 
      detail: data 
    }));
    
    // Show notification
    this.handleNotification({
      type: 'message',
      title: 'New Message',
      message: `${data.sender.name}: ${data.message.message.substring(0, 50)}...`,
      data: data
    });
  }

  // Request notification permission
  static async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }
}

// Export for global use
window.NotificationService = NotificationService;

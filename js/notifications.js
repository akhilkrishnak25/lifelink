// Socket.IO Real-Time Notifications Client
class NotificationService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.notifications = [];
  }

  // Initialize socket connection
  init(userId) {
    const API_URL = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000'
      : 'https://lifelink-dmvb.onrender.com';
    
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

    const titleEl = document.createElement('strong');
    titleEl.textContent = notification.title || 'Notification';

    const messageEl = document.createElement('p');
    messageEl.className = 'mb-0';
    messageEl.textContent = notification.message || '';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close';
    closeBtn.setAttribute('data-bs-dismiss', 'alert');

    notifElement.appendChild(titleEl);
    notifElement.appendChild(messageEl);
    notifElement.appendChild(closeBtn);

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
      message: `${data.sender?.name || 'User'}: ${String(data.message?.message || '').substring(0, 50)}...`,
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

  // Connect method (alias for init with auto-user detection)
  connect(userId = null) {
    if (!userId) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      userId = user._id || user.id;
    }
    
    if (userId) {
      this.init(userId);
    } else {
      console.warn('Cannot connect notification service: User ID not found');
    }
  }

  // Listener for new notifications
  onNotificationReceived(callback) {
    window.addEventListener('new-notification', (e) => {
      callback(e.detail);
    });
  }

  // Listener for new messages
  onMessageReceived(callback) {
    window.addEventListener('new-message', (e) => {
      callback(e.detail);
    });
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

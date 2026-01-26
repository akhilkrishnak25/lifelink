// Chat Client
class ChatClient {
  constructor() {
    this.apiUrl = localStorage.getItem('API_URL') || 'http://localhost:5000';
    this.token = localStorage.getItem('token');
    this.currentConversation = null;
    this.socket = null;
  }

  // Initialize with socket
  initSocket(socket) {
    this.socket = socket;
    
    // Listen for new messages
    window.addEventListener('new-message', (event) => {
      this.handleNewMessage(event.detail);
    });
  }

  // Send message
  async sendMessage(receiverId, message, requestId = null) {
    try {
      const response = await fetch(`${this.apiUrl}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ receiverId, message, requestId })
      });
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  // Get conversations
  async getConversations() {
    try {
      const response = await fetch(`${this.apiUrl}/api/chat/conversations`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return null;
    }
  }

  // Get messages
  async getMessages(conversationId, page = 1) {
    try {
      const response = await fetch(`${this.apiUrl}/api/chat/messages/${conversationId}?page=${page}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      return null;
    }
  }

  // Display conversations
  displayConversations(conversations) {
    const container = document.getElementById('conversations-list');
    if (!container) return;

    if (conversations.length === 0) {
      container.innerHTML = '<p class="text-muted">No conversations yet</p>';
      return;
    }

    container.innerHTML = conversations.map(conv => {
      const lastMessage = conv.lastMessage;
      const otherUser = lastMessage.senderId === this.getUserId() 
        ? lastMessage.receiverId 
        : lastMessage.senderId;
      
      return `
        <div class="list-group-item conversation-item" data-conversation-id="${conv._id}">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <h6 class="mb-1">${otherUser.name || 'User'}</h6>
              <p class="mb-0 small text-muted">${lastMessage.message.substring(0, 50)}...</p>
            </div>
            <div class="text-end">
              <small class="text-muted">${this.formatTime(lastMessage.createdAt)}</small>
              ${conv.unreadCount > 0 ? `<span class="badge bg-danger">${conv.unreadCount}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        this.openConversation(item.dataset.conversationId);
      });
    });
  }

  // Display messages
  displayMessages(messages) {
    const container = document.getElementById('messages-container');
    if (!container) return;

    const userId = this.getUserId();

    container.innerHTML = messages.map(msg => {
      const isSent = msg.senderId._id === userId;
      return `
        <div class="chat-message ${isSent ? 'sent' : 'received'}">
          <p class="mb-1">${msg.message}</p>
          <small class="text-muted">${this.formatTime(msg.createdAt)}</small>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  // Handle new message
  handleNewMessage(data) {
    if (this.currentConversation && data.message.conversationId === this.currentConversation) {
      this.appendMessage(data.message);
    }
    
    // Update conversation list
    this.refreshConversations();
  }

  // Append message to chat
  appendMessage(message) {
    const container = document.getElementById('messages-container');
    if (!container) return;

    const userId = this.getUserId();
    const isSent = message.senderId === userId;

    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${isSent ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
      <p class="mb-1">${message.message}</p>
      <small class="text-muted">${this.formatTime(message.createdAt)}</small>
    `;

    container.appendChild(messageElement);
    container.scrollTop = container.scrollHeight;
  }

  // Format time
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  // Get user ID
  getUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user._id || user.id;
  }

  // Open conversation
  async openConversation(conversationId) {
    this.currentConversation = conversationId;
    const result = await this.getMessages(conversationId);
    if (result && result.success) {
      this.displayMessages(result.data);
    }
  }

  // Refresh conversations
  async refreshConversations() {
    const result = await this.getConversations();
    if (result && result.success) {
      this.displayConversations(result.data);
    }
  }
}

// Export for global use
window.ChatClient = ChatClient;

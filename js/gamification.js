// Gamification Client
class GamificationClient {
  constructor() {
    this.apiUrl = localStorage.getItem('API_URL') || 'http://localhost:5000';
    this.token = localStorage.getItem('token');
  }

  // Get user profile
  async getProfile() {
    try {
      const response = await fetch(`${this.apiUrl}/api/gamification/profile`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching gamification profile:', error);
      return null;
    }
  }

  // Get leaderboard
  async getLeaderboard(limit = 100) {
    try {
      const response = await fetch(`${this.apiUrl}/api/gamification/leaderboard?limit=${limit}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return null;
    }
  }

  // Get achievements
  async getAchievements() {
    try {
      const response = await fetch(`${this.apiUrl}/api/gamification/achievements`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return null;
    }
  }

  // Display profile
  displayProfile(profile) {
    const container = document.getElementById('gamification-profile');
    if (!container) return;

    container.innerHTML = `
      <div class="card">
        <div class="card-body text-center">
          <h3>Level ${profile.level}</h3>
          <div class="progress mb-3">
            <div class="progress-bar bg-danger" style="width: ${(profile.points % 100)}%"></div>
          </div>
          <p><strong>${profile.points}</strong> Points</p>
          <p><strong>${profile.totalDonations}</strong> Donations</p>
          <p><strong>${profile.streakCount}</strong> Streak</p>
          <div class="mt-3">
            <span class="badge bg-success">Reliability: ${profile.reliabilityScore}%</span>
          </div>
        </div>
      </div>
    `;
  }

  // Display achievements
  displayAchievements(achievements) {
    const container = document.getElementById('achievements-container');
    if (!container) return;

    if (achievements.length === 0) {
      container.innerHTML = '<p class="text-muted">No achievements yet. Start donating to unlock!</p>';
      return;
    }

    container.innerHTML = achievements.map(achievement => `
      <div class="achievement-badge">
        <span style="font-size: 2rem;">${achievement.icon}</span>
        <div>
          <strong>${achievement.name}</strong>
          <p class="mb-0 small">${achievement.description}</p>
          <small>+${achievement.points} points</small>
        </div>
      </div>
    `).join('');
  }

  // Display leaderboard
  displayLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    container.innerHTML = leaderboard.map((entry, index) => `
      <div class="leaderboard-item">
        <div class="leaderboard-rank rank-${Math.min(entry.rank, 3)}">
          ${entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
        </div>
        <div class="flex-grow-1">
          <strong>${entry.userId?.name || 'Anonymous'}</strong>
          <p class="mb-0 small text-muted">${entry.userId?.city || ''}</p>
        </div>
        <div class="text-end">
          <strong>${entry.points}</strong> pts
          <p class="mb-0 small text-muted">Level ${entry.level}</p>
        </div>
      </div>
    `).join('');
  }

  // Show achievement unlock animation
  showAchievementUnlock(achievement) {
    const overlay = document.createElement('div');
    overlay.className = 'achievement-overlay';
    overlay.innerHTML = `
      <div class="achievement-unlock">
        <div class="achievement-icon">${achievement.icon}</div>
        <h2>Achievement Unlocked!</h2>
        <h3>${achievement.name}</h3>
        <p>${achievement.description}</p>
        <p class="points">+${achievement.points} points</p>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    setTimeout(() => {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 1000);
    }, 3000);
  }
}

// Export for global use
window.GamificationClient = GamificationClient;

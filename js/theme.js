// Dark Mode and Theme Manager
class ThemeManager {
  constructor() {
    this.theme = localStorage.getItem('theme') || 'light';
    this.init();
  }

  init() {
    this.applyTheme(this.theme);
    this.createToggleButton();
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.theme = theme;
    localStorage.setItem('theme', theme);
    this.updateToggleButton();
  }

  toggleTheme() {
    const newTheme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
  }

  createToggleButton() {
    if (document.getElementById('theme-toggle')) return;

    const button = document.createElement('button');
    button.id = 'theme-toggle';
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', 'Toggle dark mode');
    button.innerHTML = this.theme === 'dark' ? '☀️' : '🌙';
    button.onclick = () => this.toggleTheme();

    document.body.appendChild(button);
  }

  updateToggleButton() {
    const button = document.getElementById('theme-toggle');
    if (button) {
      button.innerHTML = this.theme === 'dark' ? '☀️' : '🌙';
    }
  }

  // Detect system preference
  detectSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  // Auto theme based on system
  useSystemTheme() {
    const systemTheme = this.detectSystemPreference();
    this.applyTheme(systemTheme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      this.applyTheme(newTheme);
    });
  }
}

// Initialize Theme Manager
const themeManager = new ThemeManager();

// Export for global use
window.ThemeManager = ThemeManager;
window.themeManager = themeManager;

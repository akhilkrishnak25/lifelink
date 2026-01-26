// Analytics Dashboard using Chart.js
class AnalyticsDashboard {
  constructor() {
    this.apiUrl = localStorage.getItem('API_URL') || 'http://localhost:5000';
    this.token = localStorage.getItem('token');
    this.charts = {};
  }

  // Initialize dashboard
  async init() {
    await this.loadChartJS();
    await this.loadData();
    this.createCharts();
  }

  // Load Chart.js
  async loadChartJS() {
    if (typeof Chart !== 'undefined') return;

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  // Load analytics data
  async loadData() {
    try {
      const response = await fetch(`${this.apiUrl}/api/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      const result = await response.json();
      this.data = result.data || this.getMockData();
    } catch (error) {
      console.error('Error loading analytics:', error);
      this.data = this.getMockData();
    }
  }

  // Get mock data for demonstration
  getMockData() {
    return {
      donations: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [45, 59, 80, 81, 96, 115]
      },
      bloodGroups: {
        labels: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
        data: [35, 15, 25, 10, 20, 8, 12, 5]
      },
      urgency: {
        labels: ['Critical', 'Urgent', 'Normal'],
        data: [25, 45, 30]
      },
      regions: {
        labels: ['North', 'South', 'East', 'West', 'Central'],
        data: [120, 95, 85, 110, 90]
      }
    };
  }

  // Create charts
  createCharts() {
    this.createDonationTrendChart();
    this.createBloodGroupChart();
    this.createUrgencyChart();
    this.createRegionalChart();
  }

  // Donation trend chart
  createDonationTrendChart() {
    const ctx = document.getElementById('donationTrendChart');
    if (!ctx) return;

    this.charts.donations = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.data.donations.labels,
        datasets: [{
          label: 'Donations',
          data: this.data.donations.data,
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Donation Trend (Last 6 Months)'
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  // Blood group distribution
  createBloodGroupChart() {
    const ctx = document.getElementById('bloodGroupChart');
    if (!ctx) return;

    this.charts.bloodGroups = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.data.bloodGroups.labels,
        datasets: [{
          label: 'Donors',
          data: this.data.bloodGroups.data,
          backgroundColor: [
            '#dc3545', '#c82333', '#a71d2a', '#8b1924',
            '#dc3545', '#c82333', '#a71d2a', '#8b1924'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Blood Group Distribution'
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  // Urgency pie chart
  createUrgencyChart() {
    const ctx = document.getElementById('urgencyChart');
    if (!ctx) return;

    this.charts.urgency = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.data.urgency.labels,
        datasets: [{
          data: this.data.urgency.data,
          backgroundColor: ['#dc3545', '#ffc107', '#28a745']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Request Urgency Distribution'
          }
        }
      }
    });
  }

  // Regional chart
  createRegionalChart() {
    const ctx = document.getElementById('regionalChart');
    if (!ctx) return;

    this.charts.regions = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: this.data.regions.labels,
        datasets: [{
          label: 'Requests',
          data: this.data.regions.data,
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.2)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Regional Distribution'
          }
        }
      }
    });
  }

  // Update charts with new data
  updateCharts(newData) {
    this.data = newData;
    
    Object.keys(this.charts).forEach(key => {
      if (this.charts[key]) {
        this.charts[key].destroy();
      }
    });
    
    this.createCharts();
  }

  // Export chart as image
  exportChart(chartName) {
    const chart = this.charts[chartName];
    if (!chart) return;

    const url = chart.toBase64Image();
    const link = document.createElement('a');
    link.download = `${chartName}-chart.png`;
    link.href = url;
    link.click();
  }
}

// Export for global use
window.AnalyticsDashboard = AnalyticsDashboard;

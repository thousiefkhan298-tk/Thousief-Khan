const API_URL = '/api';

export const api = {
  async signup(data: any) {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    localStorage.setItem('token', result.token);
    return result.user;
  },

  async login(data: any) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    localStorage.setItem('token', result.token);
    return result.user;
  },

  async getMe() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const res = await fetch(`${API_URL}/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      localStorage.removeItem('token');
      return null;
    }
    return res.json();
  },

  async getUsers() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async getWorkoutLogs(clientId?: string) {
    const token = localStorage.getItem('token');
    const url = clientId ? `${API_URL}/workout-logs?clientId=${clientId}` : `${API_URL}/workout-logs`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch logs');
    return res.json();
  },

  async saveWorkoutLog(data: any) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/workout-logs`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save log');
    return res.json();
  },

  async deleteWorkoutLog(id: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/workout-logs/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete log');
    return res.json();
  },

  async getFavorites() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/favorites`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch favorites');
    return res.json();
  },

  async toggleFavorite(data: any) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/favorites`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to toggle favorite');
    return res.json();
  },

  async getMessages(otherId: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/messages?otherId=${otherId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async getUnreadMessages() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/messages/unread`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch unread messages');
    return res.json();
  },

  async sendMessage(data: any) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  async getUserById(id: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/users/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },

  async submitOnboarding(data: any) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/onboarding`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to submit onboarding');
    return res.json();
  },

  async getWorkoutPlans(clientId: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/workout-plans/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch workout plans');
    return res.json();
  },

  async saveWorkoutPlan(data: any) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/workout-plans`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save workout plan');
    return res.json();
  },

  async deleteWorkoutPlan(id: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/workout-plans/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete workout plan');
    return res.json();
  },

  async getTrainerNotes(clientId: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/trainer-notes/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch trainer notes');
    return res.json();
  },

  async saveTrainerNote(data: any) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/trainer-notes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save trainer note');
    return res.json();
  },

  async deleteTrainerNote(id: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/trainer-notes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete trainer note');
    return res.json();
  },

  async getProgressPhotos(clientId: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/progress-photos/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch progress photos');
    return res.json();
  },

  async saveProgressPhoto(data: any) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/progress-photos`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save progress photo');
    return res.json();
  },

  async deleteProgressPhoto(id: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/progress-photos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete progress photo');
    return res.json();
  },

  async markAttendance(data: any) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/attendance`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to mark attendance');
    return res.json();
  },

  async getAttendance(clientId: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/attendance/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch attendance');
    return res.json();
  },

  logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};

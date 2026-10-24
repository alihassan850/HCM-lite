// Lightweight reactive Auth Store using custom event listener
let user = null;
let token = localStorage.getItem('hcm_token') || null;

try {
  const savedUser = localStorage.getItem('hcm_user');
  if (savedUser) user = JSON.parse(savedUser);
} catch (e) {
  user = null;
}

const listeners = new Set();

function notify() {
  listeners.forEach(fn => fn({ user, token, isAuthenticated: !!token }));
}

export const authStore = {
  getState() {
    return {
      user,
      token,
      isAuthenticated: !!token,
      role: user?.role || null
    };
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setAuth(newUser, newToken) {
    user = newUser;
    token = newToken;
    if (token) localStorage.setItem('hcm_token', token);
    else localStorage.removeItem('hcm_token');

    if (user) localStorage.setItem('hcm_user', JSON.stringify(user));
    else localStorage.removeItem('hcm_user');

    notify();
  },

  updateUser(partial) {
    if (user) {
      user = { ...user, ...partial };
      localStorage.setItem('hcm_user', JSON.stringify(user));
      notify();
    }
  },

  logout() {
    user = null;
    token = null;
    localStorage.removeItem('hcm_token');
    localStorage.removeItem('hcm_user');
    notify();
  }
};

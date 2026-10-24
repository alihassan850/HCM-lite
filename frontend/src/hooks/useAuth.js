import { useState, useEffect } from 'react';
import { authStore } from '../store/authStore';

export function useAuth() {
  const [state, setState] = useState(authStore.getState());

  useEffect(() => {
    return authStore.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  return {
    ...state,
    isAdmin: state.user?.role === 'admin',
    isHr: state.user?.role === 'hr',
    isEmployee: state.user?.role === 'employee',
    setAuth: authStore.setAuth,
    updateUser: authStore.updateUser,
    logout: authStore.logout
  };
}

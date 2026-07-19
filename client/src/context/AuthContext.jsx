import { createContext, useState } from 'react';

export const AuthContext = createContext();

const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

// A token whose exp has passed is no better than no token: every request it
// signs comes back 401. Treat it as logged out at the boundary instead of
// letting the app render as authenticated and fail one call at a time.
const isExpired = (payload) =>
  !payload || (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now());

// Read synchronously so the very first render already knows whether we are
// signed in. Restoring in an effect leaves isAuthenticated false for one
// render, and PrivateRoute redirects to /login before the effect ever runs —
// which bounced anyone who refreshed on a private route.
const readStoredToken = () => {
  try {
    const stored = localStorage.getItem('token');
    if (!stored) return null;
    if (isExpired(decodeToken(stored))) {
      localStorage.removeItem('token');
      return null;
    }
    return stored;
  } catch {
    return null; // localStorage can throw in private-mode browsers.
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(() => {
    const stored = readStoredToken();
    return stored ? decodeToken(stored) : null;
  });

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(decodeToken(newToken));
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

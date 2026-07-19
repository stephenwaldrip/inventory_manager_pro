import { render, screen, act } from '@testing-library/react';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './AuthContext';

// Renders the auth state on the FIRST commit. Restoring the session in an
// effect instead of synchronously used to leave isAuthenticated false for one
// render, which was long enough for PrivateRoute to redirect to /login — so
// anyone refreshing a private route got bounced.
//
// Note this must be observed DURING render: RTL's render() flushes effects
// inside act(), so asserting after it returns would see the post-effect state
// and pass against the broken version too. renderLog captures each pass.
const renderLog = [];

function Probe() {
  const { isAuthenticated, user, login, logout } = useContext(AuthContext);
  renderLog.push(isAuthenticated);
  return (
    <div>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email || 'none'}</span>
      <button onClick={() => login(makeToken({ email: 'new@example.com' }))}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

// Builds an unsigned JWT-shaped string; AuthContext only reads the payload.
function makeToken({ email = 'ada@example.com', expOffsetSeconds = 3600 } = {}) {
  const payload = { userId: 'u1', role: 'user', email, exp: Math.floor(Date.now() / 1000) + expOffsetSeconds };
  const body = btoa(JSON.stringify(payload)).replace(/=+$/, '');
  return `eyJhbGciOiJIUzI1NiJ9.${body}.sig`;
}

// What the app saw on the initial commit — the value PrivateRoute acts on.
const firstRenderAuth = () => String(renderLog[0]);

beforeEach(() => {
  localStorage.clear();
  renderLog.length = 0;
});

describe('AuthContext session restore', () => {
  test('a stored token is authenticated on the very first render', () => {
    localStorage.setItem('token', makeToken());
    render(<AuthProvider><Probe /></AuthProvider>);

    expect(firstRenderAuth()).toBe('true');
    expect(screen.getByTestId('email')).toHaveTextContent('ada@example.com');
  });

  test('no stored token renders unauthenticated', () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(firstRenderAuth()).toBe('false');
  });

  test('an expired token is treated as logged out and cleared', () => {
    localStorage.setItem('token', makeToken({ expOffsetSeconds: -60 }));
    render(<AuthProvider><Probe /></AuthProvider>);

    expect(firstRenderAuth()).toBe('false');
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('a malformed token does not throw and is treated as logged out', () => {
    localStorage.setItem('token', 'not-a-jwt');
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(firstRenderAuth()).toBe('false');
  });

  test('login stores the token and logout clears it', () => {
    render(<AuthProvider><Probe /></AuthProvider>);

    act(() => screen.getByText('login').click());
    expect(screen.getByTestId('auth')).toHaveTextContent('true');
    expect(screen.getByTestId('email')).toHaveTextContent('new@example.com');
    expect(localStorage.getItem('token')).not.toBeNull();

    act(() => screen.getByText('logout').click());
    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(localStorage.getItem('token')).toBeNull();
  });
});

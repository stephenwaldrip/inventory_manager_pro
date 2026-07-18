import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LoginPage from './LoginPage';
import axios from '../utils/axiosInstance';

// The axios instance is the module's default export; mock its .post.
jest.mock('../utils/axiosInstance', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

// Keep MemoryRouter/Link real, but capture navigation.
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockToastError = jest.fn();
jest.mock('../context/ToastContext', () => ({
  useToast: () => ({
    toast: { error: mockToastError, success: jest.fn(), info: jest.fn() },
  }),
}));

const mockLogin = jest.fn();

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ login: mockLogin }}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

function fillAndSubmit({ email, password }) {
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /login/i }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginPage', () => {
  test('renders the login form', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });

  test('typing updates the input fields', () => {
    renderLogin();
    const email = screen.getByPlaceholderText('Email');
    const password = screen.getByPlaceholderText('Password');
    fireEvent.change(email, { target: { value: 'ada@example.com' } });
    fireEvent.change(password, { target: { value: 'supersecret' } });
    expect(email).toHaveValue('ada@example.com');
    expect(password).toHaveValue('supersecret');
  });

  test('successful login stores the token and navigates home', async () => {
    axios.post.mockResolvedValueOnce({ data: { token: 'jwt-token-123' } });
    renderLogin();

    fillAndSubmit({ email: 'ada@example.com', password: 'supersecret' });

    // Wait on the final effect so the whole async chain has completed.
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
    expect(axios.post).toHaveBeenCalledWith('/auth/login', {
      email: 'ada@example.com',
      password: 'supersecret',
    });
    expect(mockLogin).toHaveBeenCalledWith('jwt-token-123');
    expect(mockToastError).not.toHaveBeenCalled();
  });

  test('shows the server error message on failed login', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { message: 'Account is suspended.' } },
    });
    renderLogin();

    fillAndSubmit({ email: 'ada@example.com', password: 'wrong' });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Account is suspended.');
    });
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('falls back to a generic message when the error has no response body', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network Error'));
    renderLogin();

    fillAndSubmit({ email: 'ada@example.com', password: 'supersecret' });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Invalid email or password.');
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

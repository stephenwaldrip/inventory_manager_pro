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

  test('fields are labelled and wired for password managers', () => {
    renderLogin();
    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Password');
    expect(email).toHaveAttribute('autocomplete', 'username');
    expect(email).toHaveAttribute('name', 'email');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(password).toHaveAttribute('name', 'password');
  });

  test('submitting with Enter from a field logs in', async () => {
    axios.post.mockResolvedValueOnce({ data: { token: 'jwt-token-123' } });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'supersecret' } });
    // Enter in a text field submits the owning form.
    fireEvent.submit(screen.getByLabelText('Password').closest('form'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
    expect(axios.post).toHaveBeenCalledWith('/auth/login', {
      email: 'ada@example.com',
      password: 'supersecret',
    });
  });

  test('empty fields are rejected without hitting the network', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(axios.post).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith('Please enter your email and password.');
  });

  test('whitespace-only email is rejected without hitting the network', () => {
    renderLogin();
    fillAndSubmit({ email: '   ', password: 'supersecret' });

    expect(axios.post).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith('Please enter your email and password.');
  });

  test('button disables while the request is in flight to block double submits', async () => {
    let resolvePost;
    axios.post.mockReturnValueOnce(new Promise((r) => { resolvePost = r; }));
    renderLogin();

    fillAndSubmit({ email: 'ada@example.com', password: 'supersecret' });

    const button = screen.getByRole('button', { name: /signing in/i });
    await waitFor(() => expect(button).toBeDisabled());

    // Extra clicks during the in-flight request must not fire more requests.
    fireEvent.click(button);
    fireEvent.click(button);
    expect(axios.post).toHaveBeenCalledTimes(1);

    resolvePost({ data: { token: 'jwt-token-123' } });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  test('button re-enables after a failed login so the user can retry', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network Error'));
    renderLogin();

    fillAndSubmit({ email: 'ada@example.com', password: 'wrong' });

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /login/i })).toBeEnabled();
  });
});

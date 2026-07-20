import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsersPage from './UsersPage';
import { AuthContext } from '../context/AuthContext';
import axios from '../utils/axiosInstance';

jest.mock('../utils/axiosInstance', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// The `mock` prefix is what lets this be referenced inside the hoisted factory.
const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock('../context/ToastContext', () => ({
  useToast: () => ({ toast: mockToast }),
}));
const toast = mockToast;

const SUPER = { _id: 's1', name: 'Sam', email: 'sam@acme.test', role: 'superadmin', emailVerified: true };
const ADMIN = { _id: 'a1', name: 'Avery', email: 'avery@acme.test', role: 'admin', emailVerified: true };
const MEMBER = { _id: 'u1', name: 'Uma', email: 'uma@acme.test', role: 'user', emailVerified: true };
const PENDING = { _id: 'p1', name: 'Pat', email: 'pat@acme.test', role: 'user', invitedAt: '2026-07-01T00:00:00Z', emailVerified: false };

// The page reads the signed-in identity from context and the roster from the
// API. They are separate inputs and the tests need to vary them independently.
const renderPage = (currentUser, roster = []) => {
  axios.get.mockResolvedValue({ data: roster });
  return render(
    <AuthContext.Provider value={{ user: currentUser }}>
      <UsersPage />
    </AuthContext.Provider>
  );
};

beforeEach(() => jest.clearAllMocks());

describe('UsersPage access control', () => {
  test('a plain user is refused and the roster is never requested', async () => {
    renderPage(MEMBER, [MEMBER]);

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    // Refusing in the UI but still fetching would leak the roster to anyone
    // watching the network tab.
    await waitFor(() => expect(axios.get).not.toHaveBeenCalled());
  });

  test('an admin sees the roster', async () => {
    renderPage(ADMIN, [ADMIN, MEMBER]);

    expect(await screen.findByText('uma@acme.test')).toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  test('only a superadmin can hand out the admin role', async () => {
    const { unmount } = renderPage(ADMIN, [ADMIN]);
    await screen.findByText('avery@acme.test');
    expect(screen.queryByRole('option', { name: 'Admin' })).not.toBeInTheDocument();
    unmount();

    renderPage(SUPER, [SUPER]);
    await screen.findByText('sam@acme.test');
    expect(screen.getAllByRole('option', { name: 'Admin' }).length).toBeGreaterThan(0);
  });

  test('an admin gets no edit, reset or suspend controls', async () => {
    // One row only: an admin's own row also carries a Delete, which would make
    // the query below ambiguous rather than wrong.
    renderPage(ADMIN, [MEMBER]);
    await screen.findByText('uma@acme.test');

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send reset link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suspend/i })).not.toBeInTheDocument();
    // Delete is the one destructive action an admin does keep.
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  // Mirrors the server rule that stops an org being orphaned: a superadmin row
  // offers no actions at all, not even to another superadmin.
  test('a superadmin row exposes no actions', async () => {
    renderPage(SUPER, [SUPER]);
    await screen.findByText('sam@acme.test');

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suspend/i })).not.toBeInTheDocument();
  });
});

describe('UsersPage invite state', () => {
  test('an unaccepted invite reads as pending and can be re-sent', async () => {
    renderPage(SUPER, [PENDING]);
    await screen.findByText('pat@acme.test');

    expect(screen.getByText(/invite pending/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend invite/i })).toBeInTheDocument();
    // A reset link is meaningless before the invite is accepted — there is no
    // password to reset yet.
    expect(screen.queryByRole('button', { name: /send reset link/i })).not.toBeInTheDocument();
  });

  test('an accepted user offers a reset link instead of an invite', async () => {
    renderPage(SUPER, [MEMBER]);
    await screen.findByText('uma@acme.test');

    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resend invite/i })).not.toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('a suspended account reads as inactive and offers reactivation', async () => {
    renderPage(SUPER, [{ ...MEMBER, active: false }]);
    await screen.findByText('uma@acme.test');

    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument();
  });
});

describe('UsersPage email verification', () => {
  // Shown from the roster on load rather than waiting for a 403, so the invite
  // form is not offered as usable to someone who cannot use it.
  test('an unverified admin is warned on load', async () => {
    renderPage(ADMIN, [{ ...ADMIN, emailVerified: false }]);

    expect(await screen.findByText(/confirm your email address/i)).toBeInTheDocument();
  });

  test('a verified admin is not nagged', async () => {
    renderPage(ADMIN, [ADMIN]);
    await screen.findByText('avery@acme.test');

    expect(screen.queryByText(/confirm your email address/i)).not.toBeInTheDocument();
  });

  test('a server 403 flags verification even if the roster looked fine', async () => {
    renderPage(SUPER, [SUPER]);
    await screen.findByText('sam@acme.test');
    axios.post.mockRejectedValueOnce({
      response: { data: { emailVerificationRequired: true, message: 'Verify your email first' } },
    });

    await userEvent.type(screen.getByPlaceholderText(/full name/i), 'New Person');
    await userEvent.type(screen.getByPlaceholderText(/^email$/i), 'new@acme.test');
    await userEvent.click(screen.getByRole('button', { name: /add user/i }));

    expect(await screen.findByText(/confirm your email address/i)).toBeInTheDocument();
  });
});

describe('UsersPage actions', () => {
  test('adding a user posts the form and clears it', async () => {
    renderPage(SUPER, [SUPER]);
    await screen.findByText('sam@acme.test');
    axios.post.mockResolvedValueOnce({ data: { inviteSent: true } });

    const name = screen.getByPlaceholderText(/full name/i);
    await userEvent.type(name, 'New Person');
    await userEvent.type(screen.getByPlaceholderText(/^email$/i), 'new@acme.test');
    await userEvent.click(screen.getByRole('button', { name: /add user/i }));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith('/users', {
        name: 'New Person', email: 'new@acme.test', role: 'user',
      })
    );
    await waitFor(() => expect(name).toHaveValue(''));
  });

  // The account is created either way; only the email failed. Saying "failed"
  // outright would send the admin hunting for a user that already exists.
  test('a bounced invite is reported without claiming the user was not added', async () => {
    renderPage(SUPER, [SUPER]);
    await screen.findByText('sam@acme.test');
    axios.post.mockResolvedValueOnce({ data: { inviteSent: false } });

    await userEvent.type(screen.getByPlaceholderText(/full name/i), 'New Person');
    await userEvent.type(screen.getByPlaceholderText(/^email$/i), 'new@acme.test');
    await userEvent.click(screen.getByRole('button', { name: /add user/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/invite email failed/i))
    );
  });

  test('deleting asks first, and a cancelled prompt deletes nothing', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage(SUPER, [MEMBER]);
    await screen.findByText('uma@acme.test');

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(axios.delete).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test('a confirmed delete hits the API and refreshes', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage(SUPER, [MEMBER]);
    await screen.findByText('uma@acme.test');
    axios.delete.mockResolvedValueOnce({});

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(axios.delete).toHaveBeenCalledWith('/users/u1'));
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    confirmSpy.mockRestore();
  });

  test('a failed role change surfaces the server message', async () => {
    renderPage(SUPER, [MEMBER]);
    await screen.findByText('uma@acme.test');
    axios.put.mockRejectedValueOnce({ response: { data: { message: 'Cannot demote the last owner' } } });

    // Two selects on the page: the add-user form's, then the row's. The row's
    // is the one that triggers a role change.
    const rowRoleSelect = screen.getAllByRole('combobox')[1];
    await userEvent.selectOptions(rowRoleSelect, 'admin');

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cannot demote the last owner'));
  });
});

describe('UsersPage fetching', () => {
  // Pins the useCallback on fetchUsers. If its identity changes every render
  // while the effect depends on it, this fetches forever.
  test('loading the page fetches the roster exactly once', async () => {
    renderPage(SUPER, [SUPER, MEMBER]);
    await screen.findByText('uma@acme.test');

    await new Promise((r) => setTimeout(r, 50));
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  test('a failed roster load leaves the page standing', async () => {
    axios.get.mockRejectedValueOnce(new Error('network'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AuthContext.Provider value={{ user: SUPER }}>
        <UsersPage />
      </AuthContext.Provider>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    console.error.mockRestore();
  });
});

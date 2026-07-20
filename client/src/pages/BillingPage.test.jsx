import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BillingPage from './BillingPage';
import { AuthContext } from '../context/AuthContext';
import axios from '../utils/axiosInstance';

jest.mock('../utils/axiosInstance', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock('../context/ToastContext', () => ({
  useToast: () => ({ toast: mockToast }),
}));
const toast = mockToast;

const OWNER = { _id: 's1', name: 'Sam', email: 'sam@acme.test', role: 'superadmin' };
const ADMIN = { _id: 'a1', name: 'Avery', email: 'avery@acme.test', role: 'admin' };

const PLANS = [
  { key: 'starter', name: 'Starter', blurb: 'For a small team.', amounts: { month: 1900, year: 19000 }, limits: { users: 3, materials: 500 } },
  { key: 'pro', name: 'Pro', blurb: 'For growing teams.', amounts: { month: 4900, year: 49000 }, limits: { users: 15, materials: null } },
];

// The page loads the catalog and the current subscription in parallel, so both
// mocks have to be queued in that order.
const renderPage = (currentUser, subscription, { path = '/billing' } = {}) => {
  axios.get
    .mockResolvedValueOnce({ data: PLANS })
    .mockResolvedValueOnce({ data: subscription });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={{ user: currentUser }}>
        <BillingPage />
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

const NONE = { status: null, plan: null, canWrite: true };
const inDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

let assign;
beforeEach(() => {
  jest.clearAllMocks();
  // jsdom refuses a real navigation; the page uses assign because Checkout is
  // hosted off-site, so the assertion is that it was told to go there.
  assign = jest.fn();
  delete window.location;
  window.location = { assign, href: 'http://localhost/billing' };
});

describe('BillingPage ownership', () => {
  test('a non-owner is told they cannot change the plan, and every button is dead', async () => {
    renderPage(ADMIN, NONE);
    await screen.findByText('Starter');

    expect(screen.getByText(/only the organization owner/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose starter/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /choose pro/i })).toBeDisabled();
  });

  test('an owner gets live buttons and no warning', async () => {
    renderPage(OWNER, NONE);
    await screen.findByText('Starter');

    expect(screen.queryByText(/only the organization owner/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose starter/i })).toBeEnabled();
  });

  test('Manage billing appears only for an owner who already has a plan', async () => {
    const { unmount } = renderPage(OWNER, { status: 'active', plan: 'pro', canWrite: true });
    expect(await screen.findByRole('button', { name: /manage billing/i })).toBeInTheDocument();
    unmount();

    // Same subscription, non-owner: the portal would let them change the bill.
    renderPage(ADMIN, { status: 'active', plan: 'pro', canWrite: true });
    await screen.findByText('Starter');
    expect(screen.queryByRole('button', { name: /manage billing/i })).not.toBeInTheDocument();
  });

  test('an owner with no plan yet has nothing to manage', async () => {
    renderPage(OWNER, NONE);
    await screen.findByText('Starter');

    expect(screen.queryByRole('button', { name: /manage billing/i })).not.toBeInTheDocument();
  });
});

describe('BillingPage status copy', () => {
  // The bug this pins: an expired trial still reports status 'trialing'.
  // Keying the copy on status alone told a locked-out org it was still trialing.
  test('an expired trial says the trial ended, not the subscription', async () => {
    renderPage(OWNER, { status: 'trialing', plan: null, canWrite: false });

    expect(await screen.findByText(/free trial has ended/i)).toBeInTheDocument();
    expect(screen.queryByText(/subscription has ended/i)).not.toBeInTheDocument();
  });

  test('a cancelled subscription says the subscription ended', async () => {
    renderPage(OWNER, { status: 'canceled', plan: 'pro', canWrite: false });

    expect(await screen.findByText(/subscription has ended/i)).toBeInTheDocument();
    expect(screen.queryByText(/free trial/i)).not.toBeInTheDocument();
  });

  test('a live trial is not reported as ended', async () => {
    renderPage(OWNER, { status: 'trialing', plan: null, canWrite: true, currentPeriodEnd: inDays(10) });

    expect(await screen.findByText(/on a free trial/i)).toBeInTheDocument();
  });

  test('a failing payment asks for a new card without locking the account', async () => {
    renderPage(OWNER, { status: 'past_due', plan: 'pro', canWrite: true, currentPeriodEnd: inDays(5) });

    expect(await screen.findByText(/couldn't take the last payment/i)).toBeInTheDocument();
  });

  // A raw Stripe status string in front of a customer is worse than silence.
  test('an unmapped status shows nothing rather than the raw string', async () => {
    renderPage(OWNER, { status: 'incomplete_expired', plan: null, canWrite: true });
    await screen.findByText('Starter');

    expect(screen.queryByText(/incomplete_expired/)).not.toBeInTheDocument();
  });

  test('a cancelling subscription says access ends, not renews', async () => {
    renderPage(OWNER, {
      status: 'active', plan: 'pro', canWrite: true,
      currentPeriodEnd: inDays(12), cancelAtPeriodEnd: true,
    });

    expect(await screen.findByText(/access ends on/i)).toBeInTheDocument();
    expect(screen.queryByText(/renews on/i)).not.toBeInTheDocument();
  });

  test('a healthy subscription says when it renews', async () => {
    renderPage(OWNER, {
      status: 'active', plan: 'pro', canWrite: true,
      currentPeriodEnd: inDays(12), cancelAtPeriodEnd: false,
    });

    expect(await screen.findByText(/renews on/i)).toBeInTheDocument();
  });
});

describe('BillingPage plan catalog', () => {
  test('the current plan is marked and cannot be bought again', async () => {
    renderPage(OWNER, { status: 'active', plan: 'pro', canWrite: true });
    await screen.findByText('Starter');

    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /current plan/i })).toBeDisabled();
    // The other tier stays buyable, so upgrades are still possible.
    expect(screen.getByRole('button', { name: /choose starter/i })).toBeEnabled();
  });

  test('switching to annual reprices every card', async () => {
    renderPage(OWNER, NONE);
    await screen.findByText('Starter');

    expect(screen.getByText('$19')).toBeInTheDocument();
    expect(screen.getByText('$49')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /annual/i }));

    expect(await screen.findByText('$190')).toBeInTheDocument();
    expect(screen.getByText('$490')).toBeInTheDocument();
    expect(screen.queryByText('$19')).not.toBeInTheDocument();
  });

  test('a null limit reads as unlimited, not as "Up to null"', async () => {
    renderPage(OWNER, NONE);
    const proCard = (await screen.findByText('Pro')).closest('div').parentElement;

    expect(within(proCard).getByText(/unlimited materials/i)).toBeInTheDocument();
    expect(screen.queryByText(/up to null/i)).not.toBeInTheDocument();
  });
});

describe('BillingPage checkout', () => {
  test('choosing a plan sends the tier and interval, then hands off to Stripe', async () => {
    renderPage(OWNER, NONE);
    await screen.findByText('Starter');
    axios.post.mockResolvedValueOnce({ data: { url: 'https://checkout.stripe.test/session' } });

    await userEvent.click(screen.getByRole('button', { name: /annual/i }));
    await userEvent.click(screen.getByRole('button', { name: /choose pro/i }));

    await waitFor(() =>
      // The client must send the tier name, never a price ID — otherwise the
      // cheaper price could be posted to buy the dearer plan.
      expect(axios.post).toHaveBeenCalledWith('/billing/checkout', { plan: 'pro', interval: 'year' })
    );
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.stripe.test/session'));
  });

  test('a refused checkout surfaces the server reason and frees the buttons', async () => {
    renderPage(OWNER, NONE);
    await screen.findByText('Starter');
    axios.post.mockRejectedValueOnce({
      response: { data: { message: 'Billing is not configured on this server' } },
    });

    await userEvent.click(screen.getByRole('button', { name: /choose starter/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Billing is not configured on this server')
    );
    // Leaving them disabled would strand the owner on a dead page.
    await waitFor(() => expect(screen.getByRole('button', { name: /choose starter/i })).toBeEnabled());
    expect(assign).not.toHaveBeenCalled();
  });

  test('the portal hands off to Stripe too', async () => {
    renderPage(OWNER, { status: 'active', plan: 'pro', canWrite: true });
    await screen.findByRole('button', { name: /manage billing/i });
    axios.post.mockResolvedValueOnce({ data: { url: 'https://portal.stripe.test/session' } });

    await userEvent.click(screen.getByRole('button', { name: /manage billing/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/billing/portal'));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://portal.stripe.test/session'));
  });

  test('a failed portal open is reported and the button comes back', async () => {
    renderPage(OWNER, { status: 'active', plan: 'pro', canWrite: true });
    await screen.findByRole('button', { name: /manage billing/i });
    axios.post.mockRejectedValueOnce({ response: { data: { message: 'No billing account yet' } } });

    await userEvent.click(screen.getByRole('button', { name: /manage billing/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No billing account yet'));
    await waitFor(() => expect(screen.getByRole('button', { name: /manage billing/i })).toBeEnabled());
  });
});

describe('BillingPage return from checkout', () => {
  // Entitlement arrives by webhook and can land after the redirect, so the
  // copy must not promise the plan is already switched.
  test('a successful return promises the plan shortly, not immediately', async () => {
    renderPage(OWNER, NONE, { path: '/billing?checkout=success' });
    await screen.findByText('Starter');

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/momentarily/i))
    );
  });

  test('a cancelled return is noted without alarming anyone', async () => {
    renderPage(OWNER, NONE, { path: '/billing?checkout=cancelled' });
    await screen.findByText('Starter');

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/cancelled/i)));
    expect(toast.error).not.toHaveBeenCalled();
  });

  test('an ordinary visit reports nothing', async () => {
    renderPage(OWNER, NONE);
    await screen.findByText('Starter');

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});

describe('BillingPage loading failure', () => {
  test('a failed load is reported and the page still renders', async () => {
    axios.get.mockRejectedValue(new Error('network'));

    render(
      <MemoryRouter initialEntries={['/billing']}>
        <AuthContext.Provider value={{ user: OWNER }}>
          <BillingPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not load billing information.'));
    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument();
  });
});

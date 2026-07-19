import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SubscriptionBanner from './SubscriptionBanner';
import axios from '../utils/axiosInstance';

jest.mock('../utils/axiosInstance', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const renderBanner = (subscription, path = '/materials') => {
  axios.get.mockResolvedValueOnce({ data: subscription });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SubscriptionBanner />
    </MemoryRouter>
  );
};

const inDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

beforeEach(() => jest.clearAllMocks());

describe('SubscriptionBanner', () => {
  test('warns that changes are disabled when the server says canWrite is false', async () => {
    renderBanner({ status: 'canceled', plan: 'pro', canWrite: false });

    expect(await screen.findByText(/subscription has ended/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /resubscribe/i })).toHaveAttribute('href', '/billing');
  });

  // The bug this pins: an expired trial still reports status 'trialing', so a
  // banner keyed on status alone told a locked-out org its trial was ending.
  test('an expired trial shows the lockout, not a trial notice', async () => {
    renderBanner({ status: 'trialing', plan: null, canWrite: false, currentPeriodEnd: inDays(-1) });

    expect(await screen.findByText(/subscription has ended/i)).toBeInTheDocument();
    expect(screen.queryByText(/free trial ends/i)).not.toBeInTheDocument();
  });

  test('says nothing at all for a healthy subscription', async () => {
    const { container } = renderBanner({
      status: 'active', plan: 'pro', canWrite: true, currentPeriodEnd: inDays(20),
    });

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test('does not nag on day one of a trial', async () => {
    const { container } = renderBanner({
      status: 'trialing', plan: null, canWrite: true, currentPeriodEnd: inDays(14),
    });

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test('warns when a trial is nearly over', async () => {
    renderBanner({ status: 'trialing', plan: null, canWrite: true, currentPeriodEnd: inDays(2) });

    expect(await screen.findByText(/free trial ends in 2 days/i)).toBeInTheDocument();
  });

  test('asks for a new card while a payment is failing', async () => {
    renderBanner({ status: 'past_due', plan: 'pro', canWrite: true, currentPeriodEnd: inDays(5) });

    expect(await screen.findByText(/couldn't take your last payment/i)).toBeInTheDocument();
  });

  test('stays quiet on the billing page, which explains this itself', async () => {
    const { container } = renderBanner({ status: 'canceled', plan: 'pro', canWrite: false }, '/billing');

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test('a failed lookup must not take the page down with it', async () => {
    axios.get.mockRejectedValueOnce(new Error('network'));

    const { container } = render(
      <MemoryRouter initialEntries={['/materials']}>
        <SubscriptionBanner />
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

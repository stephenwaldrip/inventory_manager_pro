import { Link } from 'react-router-dom';

const features = [
  { title: 'Track every material', body: 'Organize materials by location and category with real-time quantity tracking.' },
  { title: 'Low-inventory alerts', body: 'Get email alerts automatically when stock drops below your threshold.' },
  { title: 'Printable reports', body: 'Generate and print inventory reports for audits and reordering in one click.' },
  { title: 'Team access control', body: 'Superadmin, admin, and user roles keep the right people on the right data.' },
];

const LandingPage = () => {
  return (
    <div style={styles.page}>
      <header style={styles.nav}>
        <span style={styles.brand}>Inventory Manager Pro</span>
        <div style={styles.navLinks}>
          <Link to="/login" style={styles.navLink}>Log in</Link>
          <Link to="/register" style={styles.navCta}>Get started</Link>
        </div>
      </header>

      <section style={styles.hero}>
        <h1 style={styles.h1}>Inventory management built for shops that move.</h1>
        <p style={styles.sub}>
          Track materials, locations, and categories in one place. Get low-stock alerts,
          printable reports, and role-based team access — no spreadsheets required.
        </p>
        <div style={styles.heroCtas}>
          <Link to="/register" style={styles.primaryBtn} onClick={trackSignupClick}>
            Start free
          </Link>
          <Link to="/login" style={styles.secondaryBtn}>Log in</Link>
        </div>
        <p style={styles.microcopy}>Starter plan from $19/mo · Cancel anytime</p>
      </section>

      <section style={styles.features}>
        {features.map((f) => (
          <div key={f.title} style={styles.card}>
            <h3 style={styles.cardTitle}>{f.title}</h3>
            <p style={styles.cardBody}>{f.body}</p>
          </div>
        ))}
      </section>

      <section style={styles.bottomCta}>
        <h2 style={styles.h2}>Ready to get your inventory under control?</h2>
        <Link to="/register" style={styles.primaryBtn} onClick={trackSignupClick}>
          Create your account
        </Link>
      </section>

      <footer style={styles.footer}>
        <span>© {new Date().getFullYear()} RhyamTech</span>
        <a href="https://www.rhyamtechco.com" style={styles.footerLink}>rhyamtechco.com</a>
      </footer>
    </div>
  );
};

// GA4 conversion event on signup CTA click
const trackSignupClick = () => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'sign_up_click', { location: 'landing_page' });
  }
};

const styles = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1a1a1a', maxWidth: 1100, margin: '0 auto', padding: '0 20px' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0' },
  brand: { fontWeight: 700, fontSize: 20 },
  navLinks: { display: 'flex', gap: 16, alignItems: 'center' },
  navLink: { color: '#1a1a1a', textDecoration: 'none', fontWeight: 500 },
  navCta: { background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 },
  hero: { textAlign: 'center', padding: '64px 0 48px' },
  h1: { fontSize: 44, lineHeight: 1.1, margin: '0 0 20px', fontWeight: 800 },
  sub: { fontSize: 19, color: '#4b5563', maxWidth: 640, margin: '0 auto 32px', lineHeight: 1.5 },
  heroCtas: { display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 },
  primaryBtn: { background: '#2563eb', color: '#fff', padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 16 },
  secondaryBtn: { background: '#f3f4f6', color: '#1a1a1a', padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 16 },
  microcopy: { color: '#6b7280', fontSize: 14 },
  features: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, padding: '32px 0' },
  card: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 },
  cardTitle: { margin: '0 0 8px', fontSize: 18 },
  cardBody: { margin: 0, color: '#4b5563', lineHeight: 1.5 },
  bottomCta: { textAlign: 'center', padding: '64px 0' },
  h2: { fontSize: 30, margin: '0 0 24px', fontWeight: 700 },
  footer: { display: 'flex', justifyContent: 'space-between', padding: '32px 0', borderTop: '1px solid #e5e7eb', color: '#6b7280', fontSize: 14 },
  footerLink: { color: '#6b7280' },
};

export default LandingPage;
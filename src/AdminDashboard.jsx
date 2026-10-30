import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import {
  LayoutDashboard, ShoppingBag, Coffee, ChartNoAxesCombined, Package,
  Wallet, CreditCard, Users, Settings, Bell, Search, Menu, X,
  ArrowUpRight, Clock3, CheckCircle2, CircleDollarSign, TrendingUp,
  Plus, ChevronDown, CalendarDays, MoreHorizontal, Leaf
} from 'lucide-react';
import mainLogo from './assets/beas-kiosk-main-logo.png';
import './admin-dashboard.css';
import MenuManagement from './MenuManagement';

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Live orders', icon: ShoppingBag, count: '—' },
  { label: 'Menu management', icon: Coffee },
  { label: 'Sales reports', icon: ChartNoAxesCombined },
  { label: 'Inventory', icon: Package },
  { label: 'Expenses & profit', icon: Wallet },
  { label: 'Payment verification', icon: CreditCard, count: '—' },
  { label: 'Staff accounts', icon: Users },
];

const sampleOrders = [
  { id: 'BK-0001', customer: 'Example customer', items: '2 items', total: '—', status: 'Awaiting order connection', tone: 'pending' },
  { id: 'BK-0002', customer: 'Example customer', items: '3 items', total: '—', status: 'Awaiting order connection', tone: 'pending' },
  { id: 'BK-0003', customer: 'Example customer', items: '1 item', total: '—', status: 'Awaiting order connection', tone: 'pending' },
];


function LiveOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let active = true;
    const loadOrders = async () => {
      const { data, error: loadError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (loadError) setError('Could not load orders. Please refresh and try again.');
      else setOrders(data || []);
      setLoading(false);
    };
    loadOrders();
    const channel = supabase
      .channel('owner-live-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (!active) return;
        if (payload.eventType === 'INSERT') {
          setOrders(current => [payload.new, ...current.filter(order => order.id !== payload.new.id)]);
        } else if (payload.eventType === 'UPDATE') {
          setOrders(current => current.map(order => order.id === payload.new.id ? payload.new : order));
        } else if (payload.eventType === 'DELETE') {
          setOrders(current => current.filter(order => order.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    setError('');
    const { data, error: updateError } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();
    if (updateError) setError('Status could not be updated. Check your owner access and try again.');
    else setOrders(current => current.map(order => order.id === orderId ? data : order));
    setUpdatingId(null);
  };

  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
  const dateLabel = value => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <section className="admin-panel" style={{ padding: 24 }}>
      <div className="admin-panel-heading">
        <div><h2>Incoming orders</h2><p>New orders appear here automatically while this page is open.</p></div>
        <button className="admin-secondary-button" onClick={() => window.location.reload()}>Refresh</button>
      </div>
      {error && <p role="alert" style={{ color: '#a33', margin: '12px 0' }}>{error}</p>}
      {loading ? <p>Loading orders…</p> : orders.length === 0 ? (
        <div className="admin-popular-empty"><span className="admin-coffee-tile"><ShoppingBag size={22}/></span><strong>No orders yet</strong><p>Customer orders will appear here once secure checkout submission is connected.</p></div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {orders.map(order => (
            <article key={order.id} style={{ border: '1px solid #e7dfd2', borderRadius: 14, padding: 18, background: '#fffdf8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div><strong style={{ fontSize: 17 }}>{order.order_number}</strong><div style={{ color: '#76695e', fontSize: 13 }}>{dateLabel(order.created_at)}</div></div>
                <strong>{money(order.subtotal)}</strong>
              </div>
              <div style={{ margin: '14px 0', display: 'grid', gap: 5 }}>
                <div><strong>Customer:</strong> {order.customer_name}</div>
                <div><strong>Phone:</strong> {order.customer_phone}</div>
                <div><strong>Fulfilment:</strong> {order.fulfilment}</div>
                <div><strong>Payment:</strong> {order.payment_method}</div>
              </div>
              <div style={{ borderTop: '1px solid #eee5d8', paddingTop: 10 }}>
                <strong>Items</strong>
                {Array.isArray(order.items) && order.items.length ? order.items.map((item, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0' }}>
                    <span>{item.quantity || item.qty || 1} × {item.name || item.title || 'Menu item'}</span>
                    <span>{money((item.price || 0) * (item.quantity || item.qty || 1))}</span>
                  </div>
                )) : <p style={{ color: '#76695e' }}>No item details recorded.</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                <strong>Status:</strong>
                <select aria-label={`Status for ${order.order_number}`} value={order.status} disabled={updatingId === order.id} onChange={event => updateStatus(order.id, event.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #d8cbbb', background: 'white' }}>
                  {['New', 'Preparing', 'Ready', 'Completed', 'Cancelled'].map(status => <option key={status}>{status}</option>)}
                </select>
                {updatingId === order.id && <span>Saving…</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardShell({ onSignOut, ownerEmail }) {
  const [active, setActive] = useState('Overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [range, setRange] = useState('Last 7 days');

  return (
    <div className="admin-app">
      {mobileNavOpen && <button className="admin-nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`admin-sidebar ${mobileNavOpen ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <a href="/" aria-label="Return to customer ordering page" className="admin-logo-link">
            <img src={mainLogo} alt="BEA'S KIOSK main logo" />
          </a>
          <button className="admin-icon-button admin-mobile-close" aria-label="Close menu" onClick={() => setMobileNavOpen(false)}><X size={20}/></button>
        </div>
        <div className="admin-workspace"><span className="admin-workspace-dot" /><span>OWNER WORKSPACE</span><ChevronDown size={14}/></div>
        <p className="admin-nav-label">BUSINESS</p>
        <nav className="admin-navigation" aria-label="Owner dashboard navigation">
          {navigation.map(({ label, icon: Icon, count }) => (
            <button key={label} className={`admin-nav-item ${active === label ? 'active' : ''}`} onClick={() => { setActive(label); setMobileNavOpen(false); }}>
              <Icon size={18} strokeWidth={1.8}/><span>{label}</span>{count && <small>{count}</small>}
            </button>
          ))}
        </nav>
        <p className="admin-nav-label admin-settings-label">PREFERENCES</p>
        <button className={`admin-nav-item ${active === 'Settings' ? 'active' : ''}`} onClick={() => { setActive('Settings'); setMobileNavOpen(false); }}><Settings size={18} strokeWidth={1.8}/><span>Settings</span></button>
        <div className="admin-sidebar-bottom">
          <div className="admin-help-card"><span className="admin-help-icon"><Leaf size={17}/></span><strong>Made with care.</strong><p>Your little coffee business, all in one place.</p></div>
          <a className="admin-store-link" href="/">← View customer store</a>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button className="admin-icon-button admin-mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={21}/></button>
          <div className="admin-breadcrumb">BEA'S KIOSK <span>/</span> <strong>{active}</strong></div>
          <div className="admin-top-actions">
            <label className="admin-search"><Search size={16}/><input placeholder="Search dashboard" aria-label="Search dashboard"/></label>
            <button className="admin-icon-button admin-notification" aria-label="Notifications"><Bell size={19}/><i /></button>
            <div className="admin-owner-controls"><span className="admin-owner-email">{ownerEmail}</span><button className="admin-signout-button" onClick={onSignOut}>Sign out</button><div className="admin-avatar" aria-label="Owner account">BK</div></div>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-welcome-row">
            <div><div className="admin-eyebrow"><span /> YOUR BUSINESS AT A GLANCE</div><h1>{active === 'Overview' ? 'Good things are brewing.' : active}</h1><p>{active === 'Overview' ? 'Here is your kiosk overview. Live figures will appear when the dashboard is connected to orders and sales.' : `Your ${active.toLowerCase()} workspace. This section will be connected in the next build stage.`}</p></div>
            <button className="admin-date-button"><CalendarDays size={16}/> Today <ChevronDown size={15}/></button>
          </div>

          {active === 'Menu management' ? <MenuManagement /> : active === 'Live orders' ? <LiveOrders /> : active !== 'Overview' ? (
            <section className="admin-coming-panel"><div className="admin-coming-icon"><Coffee size={26}/></div><h2>{active} is coming next</h2><p>This navigation and page shell are in place. We'll connect this section to the database after the dashboard layout is approved.</p><button className="admin-primary-button" onClick={() => setActive('Overview')}>Back to overview</button></section>
          ) : <>
            <div className="admin-notice"><span className="admin-notice-mark">i</span><p><strong>Dashboard design preview</strong> — no live orders or sales are connected yet. The dashes below are intentional placeholders, not business figures.</p></div>

            <section className="admin-stat-grid" aria-label="Business summary">
              <article className="admin-stat-card"><div className="admin-stat-top"><span>Today's orders</span><span className="admin-stat-icon"><ShoppingBag size={18}/></span></div><div className="admin-stat-value">—</div><div className="admin-stat-foot"><span className="admin-muted">Waiting for order connection</span></div></article>
              <article className="admin-stat-card"><div className="admin-stat-top"><span>Today's sales</span><span className="admin-stat-icon"><CircleDollarSign size={18}/></span></div><div className="admin-stat-value">—</div><div className="admin-stat-foot"><span className="admin-muted">Waiting for sales connection</span></div></article>
              <article className="admin-stat-card"><div className="admin-stat-top"><span>Orders in progress</span><span className="admin-stat-icon"><Clock3 size={18}/></span></div><div className="admin-stat-value">—</div><div className="admin-stat-foot"><span className="admin-muted">Live order status</span></div></article>
              <article className="admin-stat-card"><div className="admin-stat-top"><span>Payments to verify</span><span className="admin-stat-icon"><CreditCard size={18}/></span></div><div className="admin-stat-value">—</div><div className="admin-stat-foot"><span className="admin-muted">Secure payment review</span></div></article>
            </section>

            <section className="admin-primary-grid">
              <article className="admin-panel admin-sales-panel">
                <div className="admin-panel-heading"><div><h2>Sales overview</h2><p>Track your kiosk's sales performance</p></div><button className="admin-select-button" onClick={() => setRange(range === 'Last 7 days' ? 'Last 30 days' : 'Last 7 days')}>{range}<ChevronDown size={14}/></button></div>
                <div className="admin-chart-placeholder"><div className="admin-chart-y"><span>—</span><span>—</span><span>—</span><span>—</span></div><div className="admin-chart-area"><div className="admin-chart-lines"><i/><i/><i/><i/></div><div className="admin-chart-empty"><ChartNoAxesCombined size={25}/><strong>Sales chart will appear here</strong><span>Once real orders are recorded</span></div><div className="admin-chart-x"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></div>
                <div className="admin-chart-foot"><span><i className="admin-legend-dot"/> Sales data not connected</span><span><TrendingUp size={14}/> Ready for reports</span></div>
              </article>

              <article className="admin-panel admin-popular-panel">
                <div className="admin-panel-heading"><div><h2>Popular products</h2><p>Your best sellers</p></div><button className="admin-icon-button" aria-label="More product options"><MoreHorizontal size={20}/></button></div>
                <div className="admin-popular-empty"><span className="admin-coffee-tile"><Coffee size={22}/></span><strong>Best sellers will show here</strong><p>Product rankings will be calculated from real completed orders.</p></div>
                <button className="admin-secondary-button" onClick={() => setActive('Menu management')}>Manage menu <ArrowUpRight size={15}/></button>
              </article>
            </section>

            <section className="admin-panel admin-orders-panel">
              <div className="admin-panel-heading"><div><h2>Recent orders</h2><p>Keep an eye on what's coming in</p></div><button className="admin-text-button" onClick={() => setActive('Live orders')}>View all orders <ArrowUpRight size={15}/></button></div>
              <div className="admin-table-wrap"><table className="admin-orders-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>STATUS</th><th></th></tr></thead><tbody>{sampleOrders.map(order => <tr key={order.id}><td className="admin-order-id">{order.id}</td><td>{order.customer}</td><td>{order.items}</td><td>{order.total}</td><td><span className={`admin-status ${order.tone}`}>{order.status}</span></td><td><MoreHorizontal size={18}/></td></tr>)}</tbody></table></div>
              <div className="admin-table-mobile">{sampleOrders.map(order => <div className="admin-mobile-order" key={order.id}><div><strong>{order.id}</strong><span>{order.customer}</span></div><span className="admin-status pending">{order.status}</span></div>)}</div>
              <div className="admin-panel-foot"><span><CheckCircle2 size={15}/> Order area ready for integration</span><button onClick={() => setActive('Live orders')}>Open order management <ArrowUpRight size={15}/></button></div>
            </section>
            <div className="admin-bottom-grid"><div className="admin-tip-card"><span className="admin-tip-icon"><Leaf size={19}/></span><div><strong>A little note</strong><p>This dashboard is designed to grow with your kiosk. We'll add real orders, inventory, payments and reports step by step.</p></div></div><button className="admin-add-menu" onClick={() => setActive('Menu management')}><span><Plus size={19}/></span><div><strong>Menu management</strong><p>Next up: edit products, prices and photos</p></div><ArrowUpRight size={18}/></button></div>
          </>}
          <footer className="admin-footer"><span>© {new Date().getFullYear()} BEA'S KIOSK</span><span>Made with care <span>♥</span></span></footer>
        </div>
      </main>
    </div>
  );
}


const OWNER_EMAIL = 'edlanders1514@gmail.com';

export default function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    // Supabase may return a recovery link with a PKCE code or recovery tokens.
    return query.get('reset-password') === 'true' || query.has('code') || hash.get('type') === 'recovery';
  });
  const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setErrorMessage('Could not check your sign-in session. Please refresh and try again.');
      setSession(data?.session || null);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        setErrorMessage('');
      }
      setSession(nextSession);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const signedInEmail = (session.user?.email || '').toLowerCase();
    if (signedInEmail !== OWNER_EMAIL) {
      supabase.auth.signOut();
      setSession(null);
      setErrorMessage('This account is not authorized to access the BEA’S KIOSK owner dashboard.');
    }
  }, [session]);

  const handleRecoveryRequest = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrorMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/dashboard?reset-password=true`,
    });
    setBusy(false);
    if (error) {
      setErrorMessage(error.message.includes('rate limit') || error.status === 429
        ? 'Supabase is temporarily limiting recovery emails. Please wait before requesting another email.'
        : 'We could not send the recovery email. Please try again later.');
      return;
    }
    setRecoveryEmailSent(true);
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    if (newPassword.length < 8) {
      setErrorMessage('Choose a password with at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('The passwords do not match.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) {
      setErrorMessage('We could not update the password. Please reopen the latest recovery email and try again.');
      return;
    }
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryMode(false);
    window.history.replaceState({}, document.title, '/dashboard');
    setErrorMessage('Password updated successfully. You can now use your new password to sign in.');
    await supabase.auth.signOut();
    setSession(null);
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrorMessage('');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      setErrorMessage('Sign-in failed. Check the owner email and password, then try again.');
      return;
    }
    if ((data.user?.email || '').toLowerCase() !== OWNER_EMAIL) {
      await supabase.auth.signOut();
      setSession(null);
      setErrorMessage('This account is not authorized to access the owner dashboard.');
      return;
    }
    setPassword('');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPassword('');
  };

  if (checkingSession) {
    return <div className="admin-auth-page"><div className="admin-auth-card"><img src={mainLogo} alt="BEA'S KIOSK" /><p>Checking your secure owner session…</p></div></div>;
  }

  if (!session || (session.user?.email || '').toLowerCase() !== OWNER_EMAIL) {
    if (recoveryMode) {
      return (
        <div className="admin-auth-page">
          <form className="admin-auth-card" onSubmit={handlePasswordUpdate}>
            <img src={mainLogo} alt="BEA'S KIOSK" />
            <span className="admin-auth-eyebrow">SECURE ACCOUNT RECOVERY</span>
            <h1>Choose a new password.</h1>
            <p>Set a new password for your BEA’S KIOSK owner account.</p>
            <label htmlFor="new-owner-password">New password</label>
            <input id="new-owner-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
            <label htmlFor="confirm-owner-password">Confirm new password</label>
            <input id="confirm-owner-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
            {errorMessage && <p className="admin-auth-error" role="alert">{errorMessage}</p>}
            <button className="admin-auth-submit" type="submit" disabled={busy}>{busy ? 'Updating password…' : 'Save new password'}</button>
            <button type="button" className="admin-auth-link-button" onClick={() => { setRecoveryMode(false); setErrorMessage(''); window.history.replaceState({}, document.title, '/dashboard'); }}>Back to sign in</button>
          </form>
        </div>
      );
    }
    if (new URLSearchParams(window.location.search).get('forgot-password') === 'true') {
      return (
        <div className="admin-auth-page">
          <form className="admin-auth-card" onSubmit={handleRecoveryRequest}>
            <img src={mainLogo} alt="BEA'S KIOSK" />
            <span className="admin-auth-eyebrow">OWNER ACCOUNT HELP</span>
            <h1>Reset your password.</h1>
            {recoveryEmailSent ? <p>Check your inbox for a recovery email. If it does not arrive, wait before requesting another one.</p> : <p>We’ll send a secure password-reset link to your owner email.</p>}
            <label htmlFor="recovery-email">Owner email</label>
            <input id="recovery-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {errorMessage && <p className="admin-auth-error" role="alert">{errorMessage}</p>}
            {!recoveryEmailSent && <button className="admin-auth-submit" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send recovery email'}</button>}
            <a href="/dashboard">← Back to sign in</a>
          </form>
        </div>
      );
    }
    return (
      <div className="admin-auth-page">
        <form className="admin-auth-card" onSubmit={handleSignIn}>
          <img src={mainLogo} alt="BEA'S KIOSK" />
          <span className="admin-auth-eyebrow">PRIVATE OWNER AREA</span>
          <h1>Welcome back.</h1>
          <p>Sign in with your BEA’S KIOSK owner account to continue.</p>
          <label htmlFor="owner-email">Owner email</label>
          <input id="owner-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="owner-password">Password</label>
          <input id="owner-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {errorMessage && <p className="admin-auth-error" role="alert">{errorMessage}</p>}
          <button className="admin-auth-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
          <a href="/dashboard?forgot-password=true">Forgot your password?</a>
          <a href="/">← Back to customer store</a>
        </form>
      </div>
    );
  }

  return <DashboardShell onSignOut={handleSignOut} ownerEmail={session.user.email} />;
}

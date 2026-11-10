import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Store, Clock3, Power, ShoppingBag, UserRound, Save, LockKeyhole, CheckCircle2, AlertCircle } from 'lucide-react';

const defaultHours = [
  { day: 'Monday', enabled: true, open: '08:00', close: '17:00' },
  { day: 'Tuesday', enabled: true, open: '08:00', close: '17:00' },
  { day: 'Wednesday', enabled: true, open: '08:00', close: '17:00' },
  { day: 'Thursday', enabled: true, open: '08:00', close: '17:00' },
  { day: 'Friday', enabled: true, open: '08:00', close: '17:00' },
  { day: 'Saturday', enabled: true, open: '08:00', close: '17:00' },
  { day: 'Sunday', enabled: false, open: '08:00', close: '17:00' },
];
const initialSettings = {
  business_name: "BEA'S KIOSK", contact_phone: '', contact_email: '', business_address: '',
  store_open: true, accepting_orders: true, pickup_available: true, delivery_available: true,
  closed_message: 'We are currently closed and will be happy to serve you when we reopen.',
  delivery_unavailable_message: 'Delivery is temporarily unavailable. Pickup is available for all orders.',
  opening_hours: defaultHours,
};
export default function BusinessSettings() {
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.from('business_settings').select('*').eq('id', 1).single().then(({ data, error }) => {
      if (!active) return;
      if (error) setNotice({ type: 'error', text: 'Could not load settings. Please run business_settings_setup.sql in Supabase, then refresh this page.' });
      else if (data) setSettings({ ...initialSettings, ...data, opening_hours: Array.isArray(data.opening_hours) ? data.opening_hours : defaultHours });
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const update = (key, value) => setSettings(current => ({ ...current, [key]: value }));
  const updateHour = (index, key, value) => update('opening_hours', settings.opening_hours.map((hour, i) => i === index ? { ...hour, [key]: value } : hour));

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice({ type: '', text: '' });
    const payload = { ...settings, updated_at: new Date().toISOString() };
    delete payload.id;
    const { error } = await supabase.from('business_settings').update(payload).eq('id', 1);
    setSaving(false);
    setNotice(error
      ? { type: 'error', text: error.message || 'Settings could not be saved. Please try again.' }
      : { type: 'success', text: 'Your business settings have been saved.' });
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (password.length < 8) {
      setNotice({ type: 'error', text: 'Please use a password with at least 8 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      setNotice({ type: 'error', text: 'The new passwords do not match.' });
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordSaving(false);
    if (error) setNotice({ type: 'error', text: error.message || 'Password could not be updated.' });
    else {
      setPassword('');
      setConfirmPassword('');
      setNotice({ type: 'success', text: 'Your owner password has been updated.' });
    }
  };

  if (loading) return <div className="business-settings-loading">Loading your business settings…</div>;

  return <div className="business-settings">
    <div className="business-settings-intro"><div><span className="admin-eyebrow"><span/> OWNER CONTROLS</span><h2>Settings & preferences</h2><p>Keep your kiosk information, opening hours and ordering options up to date.</p></div><span className="business-settings-private"><LockKeyhole size={13}/> Private owner settings</span></div>
    {notice.text && <div className={`business-settings-notice ${notice.type}`} role="status">{notice.type === 'success' ? <CheckCircle2 size={17}/> : <AlertCircle size={17}/>}<span>{notice.text}</span></div>}
    <form onSubmit={saveSettings}>
      <section className="business-settings-card">
        <div className="business-settings-card-title"><span><Store size={18}/></span><div><h3>Business profile</h3><p>Information customers can use to recognize and contact your kiosk.</p></div></div>
        <div className="business-settings-fields">
          <label>Business name<input value={settings.business_name} onChange={e=>update('business_name',e.target.value)} required maxLength={100}/></label>
          <label>Contact phone<input type="tel" value={settings.contact_phone} onChange={e=>update('contact_phone',e.target.value)} placeholder="Business phone number"/></label>
          <label>Contact email<input type="email" value={settings.contact_email} onChange={e=>update('contact_email',e.target.value)} placeholder="Business email address"/></label>
          <label>Business address / pickup details<input value={settings.business_address} onChange={e=>update('business_address',e.target.value)} placeholder="Address or pickup instructions"/></label>
        </div>
      </section>

      <section className="business-settings-card">
        <div className="business-settings-card-title"><span><Clock3 size={18}/></span><div><h3>Store hours</h3><p>Set the hours customers should see on your storefront. These hours are informational; use Store availability to close orders.</p></div></div>
        <div className="business-hours-list">{settings.opening_hours.map((hour,index)=><div className="business-hours-row" key={hour.day}>
          <label className="business-hours-day"><input type="checkbox" checked={!!hour.enabled} onChange={e=>updateHour(index,'enabled',e.target.checked)}/><strong>{hour.day}</strong></label>
          {hour.enabled ? <><label>Opens<input type="time" value={hour.open} onChange={e=>updateHour(index,'open',e.target.value)}/></label><label>Closes<input type="time" value={hour.close} onChange={e=>updateHour(index,'close',e.target.value)}/></label></> : <span className="business-hours-closed">Closed</span>}
        </div>)}</div>
      </section>

      <section className="business-settings-card">
        <div className="business-settings-card-title"><span><Power size={18}/></span><div><h3>Store availability</h3><p>Manually control whether customers can place orders.</p></div></div>
        <div className="business-settings-toggle-row"><div><strong>Store is open</strong><small>When switched off, the storefront displays your closed message and new orders are blocked.</small></div><button type="button" className={`business-toggle ${settings.store_open ? 'on' : ''}`} aria-pressed={settings.store_open} onClick={()=>update('store_open',!settings.store_open)}><i/></button></div>
        <label className="business-settings-full-field">Message shown while closed<textarea rows="2" value={settings.closed_message} onChange={e=>update('closed_message',e.target.value)} maxLength={300}/></label>
      </section>

      <section className="business-settings-card">
        <div className="business-settings-card-title"><span><ShoppingBag size={18}/></span><div><h3>Order preferences</h3><p>Choose which order types customers can select.</p></div></div>
        <div className="business-settings-toggle-list">
          <label><span><strong>Accept new orders</strong><small>Pause all new orders without changing your store profile.</small></span><input type="checkbox" checked={settings.accepting_orders} onChange={e=>update('accepting_orders',e.target.checked)}/></label>
          <label><span><strong>Pickup orders</strong><small>Allow customers to choose pickup.</small></span><input type="checkbox" checked={settings.pickup_available} onChange={e=>update('pickup_available',e.target.checked)}/></label>
          <label><span><strong>Delivery orders</strong><small>Allow customers to choose delivery.</small></span><input type="checkbox" checked={settings.delivery_available} onChange={e=>update('delivery_available',e.target.checked)}/></label>
        </div>
        <label className="business-settings-full-field">Message shown when delivery is unavailable<textarea rows="2" value={settings.delivery_unavailable_message} onChange={e=>update('delivery_unavailable_message',e.target.value)} maxLength={300}/></label>
        {!settings.pickup_available && !settings.delivery_available && <p className="business-settings-warning">At least one order type must be enabled before customers can place orders.</p>}
      </section>
      <div className="business-settings-save"><span>Changes apply to the customer storefront after saving.</span><button className="admin-primary-button" type="submit" disabled={saving || (!settings.pickup_available && !settings.delivery_available)}><Save size={15}/>{saving ? 'Saving…' : 'Save settings'}</button></div>
    </form>

    <form className="business-settings-card business-security-card" onSubmit={changePassword}>
      <div className="business-settings-card-title"><span><UserRound size={18}/></span><div><h3>Account & security</h3><p>Change the password for your owner account. Your owner-only access remains unchanged.</p></div></div>
      <div className="business-settings-fields">
        <label>New password<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" required/></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Enter it again" required/></label>
      </div>
      <div className="business-settings-save"><span>Use a unique password you do not use elsewhere.</span><button className="admin-secondary-button" type="submit" disabled={passwordSaving || !password || !confirmPassword}><LockKeyhole size={15}/>{passwordSaving ? 'Updating…' : 'Update password'}</button></div>
    </form>
  </div>;
}

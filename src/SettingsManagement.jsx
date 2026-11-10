import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Save, Store, Clock3, ShoppingBag, UserRound, LockKeyhole, AlertCircle, CheckCircle2 } from 'lucide-react';

const defaultHours = [
  { day: 'Monday', enabled: true, open: '08:00', close: '17:00' },
  { day: 'Tuesday', enabled: true, open: '08:00', close: '17:00' },
  { day: 'Wednesday', enabled: true, open: '08:00', close: '17:00' },
  { day: 'Thursday', enabled: true, open: '08:00', close: '17:00' },
  { day: 'Friday', enabled: true, open: '08:00', close: '17:00' },
  { day: 'Saturday', enabled: true, open: '08:00', close: '17:00' },
  { day: 'Sunday', enabled: false, open: '08:00', close: '17:00' },
];

const defaults = {
  business_name: "BEA'S KIOSK",
  contact_phone: '',
  contact_email: '',
  business_address: '',
  store_open: true,
  accepting_orders: true,
  pickup_available: true,
  delivery_available: true,
  closed_message: 'We are currently closed and will be happy to serve you when we reopen.',
  delivery_unavailable_message: 'Delivery is temporarily unavailable. Pickup is available for all orders.',
  opening_hours: defaultHours,
};

function ToggleRow({ title, description, checked, onChange }) {
  return <label className="settings-toggle-row">
    <span><strong>{title}</strong><small>{description}</small></span>
    <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
    <i aria-hidden="true" />
  </label>;
}

export default function SettingsManagement({ ownerEmail }) {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      const { data, error } = await supabase.from('business_settings').select('*').eq('id', 1).single();
      if (!active) return;
      if (error) {
        setMessage('Business settings are not connected yet. Run supabase/business_settings_setup.sql in the Supabase SQL Editor, then refresh this page.');
        setMessageType('error');
      } else if (data) {
        setSettings({
          ...defaults,
          ...data,
          opening_hours: Array.isArray(data.opening_hours) && data.opening_hours.length
            ? data.opening_hours.map(day => ({ ...day }))
            : defaultHours,
        });
      }
      setLoading(false);
    }
    loadSettings();
    return () => { active = false; };
  }, []);

  const updateField = (field, value) => setSettings(current => ({ ...current, [field]: value }));
  const updateDay = (index, field, value) => setSettings(current => ({
    ...current,
    opening_hours: current.opening_hours.map((day, i) => i === index ? { ...day, [field]: value } : day),
  }));

  const saveSettings = async (event) => {
    event.preventDefault();
    if (settings.opening_hours.some(day => day.enabled && (!day.open || !day.close || day.open >= day.close))) {
      setMessage('Please check the opening and closing times. Closing time must be later than opening time.');
      setMessageType('error');
      return;
    }
    setSaving(true);
    setMessage('');
    const payload = {
      business_name: settings.business_name.trim() || "BEA'S KIOSK",
      contact_phone: settings.contact_phone.trim(),
      contact_email: settings.contact_email.trim(),
      business_address: settings.business_address.trim(),
      store_open: settings.store_open,
      accepting_orders: settings.accepting_orders,
      pickup_available: settings.pickup_available,
      delivery_available: settings.delivery_available,
      closed_message: settings.closed_message.trim(),
      delivery_unavailable_message: settings.delivery_unavailable_message.trim(),
      opening_hours: settings.opening_hours,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('business_settings').update(payload).eq('id', 1).select().single();
    if (error) {
      setMessage('Settings could not be saved. ' + error.message);
      setMessageType('error');
    } else {
      setSettings(current => ({ ...current, ...data }));
      setMessage('Your business settings have been saved.');
      setMessageType('success');
    }
    setSaving(false);
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setMessage('Choose a password with at least 8 characters.');
      setMessageType('error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('The new passwords do not match.');
      setMessageType('error');
      return;
    }
    setPasswordBusy(true);
    setMessage('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage('Password could not be updated. ' + error.message);
      setMessageType('error');
    } else {
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Your owner password has been updated.');
      setMessageType('success');
    }
    setPasswordBusy(false);
  };

  if (loading) return <section className="settings-page"><div className="settings-loading">Loading business settings…</div></section>;

  return <section className="settings-page">
    <div className="settings-intro">
      <div><span className="admin-eyebrow"><span /> OWNER PREFERENCES</span><h2>Make the kiosk yours.</h2><p>Update the information customers see and control when your store accepts orders.</p></div>
      <span className="settings-owner-chip"><UserRound size={15}/> Owner only</span>
    </div>

    {message && <div className={`settings-feedback ${messageType}`} role="status">
      {messageType === 'error' ? <AlertCircle size={17}/> : <CheckCircle2 size={17}/>}<span>{message}</span>
    </div>}

    <form onSubmit={saveSettings} className="settings-form">
      <article className="admin-panel settings-card">
        <div className="settings-card-heading"><span className="settings-icon"><Store size={19}/></span><div><h3>Business profile</h3><p>Basic information shown to customers.</p></div></div>
        <div className="settings-fields">
          <label>Business name<input value={settings.business_name} onChange={e => updateField('business_name', e.target.value)} maxLength={100} required /></label>
          <label>Contact phone<input value={settings.contact_phone} onChange={e => updateField('contact_phone', e.target.value)} placeholder="Business phone number" maxLength={40} /></label>
          <label>Contact email<input type="email" value={settings.contact_email} onChange={e => updateField('contact_email', e.target.value)} placeholder="Business email" maxLength={160} /></label>
          <label>Business address<input value={settings.business_address} onChange={e => updateField('business_address', e.target.value)} placeholder="Business location or address" maxLength={240} /></label>
        </div>
      </article>

      <article className="admin-panel settings-card">
        <div className="settings-card-heading"><span className="settings-icon"><Clock3 size={19}/></span><div><h3>Store hours</h3><p>Set the days and times your kiosk normally operates.</p></div></div>
        <div className="settings-hours-list">
          {settings.opening_hours.map((day, index) => <div className={`settings-hour-row ${day.enabled ? '' : 'is-disabled'}`} key={day.day}>
            <label className="settings-day-toggle"><input type="checkbox" checked={!!day.enabled} onChange={e => updateDay(index, 'enabled', e.target.checked)}/><strong>{day.day}</strong></label>
            {day.enabled ? <div className="settings-time-fields"><label>Opens<input type="time" value={day.open || '08:00'} onChange={e => updateDay(index, 'open', e.target.value)}/></label><span>to</span><label>Closes<input type="time" value={day.close || '17:00'} onChange={e => updateDay(index, 'close', e.target.value)}/></label></div> : <span className="settings-day-closed">Closed</span>}
          </div>)}
        </div>
        <p className="settings-footnote">These hours are displayed as your regular schedule. Use Store availability below to temporarily close ordering outside your normal schedule.</p>
      </article>

      <article className="admin-panel settings-card">
        <div className="settings-card-heading"><span className="settings-icon"><Store size={19}/></span><div><h3>Store availability</h3><p>Pause the customer store when you need to close temporarily.</p></div></div>
        <ToggleRow title="Store is open" description="Turn this off to show your closed message and pause new orders." checked={settings.store_open} onChange={value => updateField('store_open', value)}/>
        <label className="settings-message-field">Closed-store message<textarea rows="2" value={settings.closed_message} onChange={e => updateField('closed_message', e.target.value)} maxLength={500}/></label>
        <ToggleRow title="Accepting new orders" description="Turn this off when you want customers to browse but not submit orders." checked={settings.accepting_orders} onChange={value => updateField('accepting_orders', value)}/>
      </article>

      <article className="admin-panel settings-card">
        <div className="settings-card-heading"><span className="settings-icon"><ShoppingBag size={19}/></span><div><h3>Order preferences</h3><p>Choose which fulfilment options customers can select.</p></div></div>
        <ToggleRow title="Pickup orders" description="Allow customers to place orders for pickup." checked={settings.pickup_available} onChange={value => updateField('pickup_available', value)}/>
        <ToggleRow title="Delivery orders" description="Allow customers to choose delivery at checkout." checked={settings.delivery_available} onChange={value => updateField('delivery_available', value)}/>
        <label className="settings-message-field">Delivery-unavailable message<textarea rows="2" value={settings.delivery_unavailable_message} onChange={e => updateField('delivery_unavailable_message', e.target.value)} maxLength={500}/></label>
        {!settings.pickup_available && !settings.delivery_available && <p className="settings-inline-warning">At least one fulfilment option should be enabled before accepting orders.</p>}
      </article>

      <div className="settings-save-row"><span>Changes apply to the customer storefront after saving.</span><button className="admin-primary-button" type="submit" disabled={saving || (!settings.pickup_available && !settings.delivery_available && settings.accepting_orders)}><Save size={16}/>{saving ? 'Saving settings…' : 'Save business settings'}</button></div>
    </form>

    <article className="admin-panel settings-card settings-security-card">
      <div className="settings-card-heading"><span className="settings-icon"><LockKeyhole size={19}/></span><div><h3>Account &amp; security</h3><p>Manage your owner sign-in details. Staff accounts are not enabled.</p></div></div>
      <div className="settings-account-row"><span>Signed-in owner account</span><strong>{ownerEmail}</strong></div>
      <form onSubmit={changePassword} className="settings-password-form">
        <label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Enter the new password again" minLength={8} required /></label>
        <div><button className="admin-secondary-button" type="submit" disabled={passwordBusy || !newPassword || !confirmPassword}>{passwordBusy ? 'Updating password…' : 'Update owner password'}</button><small>Your current password is never displayed. You can still use the password-reset option on the sign-in screen if needed.</small></div>
      </form>
    </article>
  </section>;
}

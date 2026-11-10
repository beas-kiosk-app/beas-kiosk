import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { CreditCard, RefreshCw, CheckCircle2, XCircle, Clock3, ExternalLink, Save, Settings2, Receipt } from 'lucide-react';

const emptySettings = { bank_name: '', account_name: '', account_number: '', account_address: '', transfer_note: 'If paying to Atlantic Bank, your transfer must be immediate.' };
const dateLabel = value => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function PaymentVerification() {
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('pending');
  const [reasonById, setReasonById] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    const [p, s] = await Promise.all([
      supabase.from('payment_submissions').select('*').order('submitted_at', { ascending: false }),
      supabase.from('payment_settings').select('*').eq('id', 1).maybeSingle()
    ]);
    if (p.error || s.error) setError((p.error || s.error).message);
    else { setPayments(p.data || []); setSettings({ ...emptySettings, ...(s.data || {}) }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async e => {
    e.preventDefault(); setSaving(true); setError(''); setNotice('');
    const { error: saveError } = await supabase.from('payment_settings').update({
      bank_name: settings.bank_name.trim() || null,
      account_name: settings.account_name.trim() || null,
      account_number: settings.account_number.trim() || null,
      account_address: settings.account_address.trim() || null,
      transfer_note: settings.transfer_note.trim() || null,
      updated_at: new Date().toISOString()
    }).eq('id', 1);
    setSaving(false);
    if (saveError) setError(saveError.message);
    else setNotice('Payment instructions saved. They will appear in checkout when customers choose electronic payment.');
  };

  const review = async (payment, status) => {
    if (status === 'rejected' && !String(reasonById[payment.id] || '').trim()) {
      setError('Please enter a short reason before rejecting this payment.'); return;
    }
    setBusyId(payment.id); setError(''); setNotice('');
    const { error: updateError } = await supabase.from('payment_submissions').update({
      status,
      rejection_reason: status === 'rejected' ? reasonById[payment.id].trim() : null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', payment.id);
    setBusyId(null);
    if (updateError) setError(updateError.message);
    else { setNotice(status === 'verified' ? 'Payment marked as verified.' : 'Payment marked as rejected.'); await load(); }
  };

  const openReceipt = async path => {
    const { data, error: signedError } = await supabase.storage.from('payment-receipts').createSignedUrl(path, 60);
    if (signedError) { setError(signedError.message); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const visible = payments.filter(p => filter === 'all' || p.status === filter);
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  return <section className="payment-verification">
    <div className="payment-verification-toolbar">
      <div><span className="sales-report-eyebrow"><CreditCard size={14}/> SECURE CHECKOUT</span><h2>Payment verification</h2><p>Review customer receipts privately and manage the payment instructions shown during checkout.</p></div>
      <button className="admin-secondary-button" onClick={load} disabled={loading}><RefreshCw size={14}/>{loading ? 'Refreshing…' : 'Refresh'}</button>
    </div>
    {error && <p className="inventory-error" role="alert">{error}</p>}
    {notice && <p className="inventory-success" role="status">{notice}</p>}
    <div className="payment-summary">
      <article><Clock3 size={20}/><span>Awaiting review</span><strong>{pendingCount}</strong></article>
      <article><CheckCircle2 size={20}/><span>Verified</span><strong>{payments.filter(p => p.status === 'verified').length}</strong></article>
      <article><XCircle size={20}/><span>Rejected</span><strong>{payments.filter(p => p.status === 'rejected').length}</strong></article>
    </div>
    <form className="admin-panel payment-settings-panel" onSubmit={saveSettings}>
      <div className="admin-panel-heading"><div><h2><Settings2 size={17}/> Checkout payment instructions</h2><p>Only displayed to customers who select mobile banking / digital wallet.</p></div></div>
      <div className="payment-settings-fields">
        <label>Bank / wallet name<input value={settings.bank_name} onChange={e=>setSettings({...settings,bank_name:e.target.value})} placeholder="e.g. Atlantic Bank or wallet name"/></label>
        <label>Account name<input value={settings.account_name} onChange={e=>setSettings({...settings,account_name:e.target.value})} placeholder="Name on the account"/></label>
        <label>Account number<input value={settings.account_number} onChange={e=>setSettings({...settings,account_number:e.target.value})} placeholder="Account or wallet number"/></label>
        <label>Account address (if applicable)<input value={settings.account_address} onChange={e=>setSettings({...settings,account_address:e.target.value})} placeholder="Required for Atlantic Bank, if applicable"/></label>
        <label className="payment-note-field">Checkout note<input value={settings.transfer_note} onChange={e=>setSettings({...settings,transfer_note:e.target.value})} placeholder="Important transfer instructions"/></label>
      </div>
      <div className="payment-settings-actions"><span>Keep these details accurate before accepting electronic payments.</span><button className="admin-primary-button" type="submit" disabled={saving}><Save size={15}/>{saving ? 'Saving…' : 'Save instructions'}</button></div>
    </form>
    <div className="payment-list-heading"><div><h3>Submitted payment receipts</h3><p>{visible.length} {filter === 'all' ? 'total' : filter} submission{visible.length === 1 ? '' : 's'}</p></div><div className="payment-filter">{['pending','verified','rejected','all'].map(x=><button type="button" key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x==='all'?'All':x[0].toUpperCase()+x.slice(1)}</button>)}</div></div>
    {loading ? <div className="sales-report-loading">Loading payment submissions…</div> : visible.length === 0 ? <div className="inventory-empty compact"><Receipt size={23}/><strong>No {filter === 'all' ? '' : filter + ' '}payment receipts yet.</strong><span>Customer submissions will appear here after checkout.</span></div> : <div className="payment-submission-list">
      {visible.map(p=><article key={p.id} className="payment-submission-card">
        <div className="payment-submission-main"><div><strong>{p.order_number}</strong><span>{p.customer_phone}</span><small>Submitted {dateLabel(p.submitted_at)}</small></div><span className={'payment-status-pill '+p.status}>{p.status}</span></div>
        <div className="payment-submission-actions"><button className="admin-secondary-button" type="button" onClick={()=>openReceipt(p.receipt_path)}><ExternalLink size={14}/>View receipt</button>
          {p.status !== 'verified' && <button className="admin-primary-button" type="button" disabled={busyId===p.id} onClick={()=>review(p,'verified')}><CheckCircle2 size={14}/>Verify payment</button>}
        </div>
        {p.status !== 'rejected' && <div className="payment-reject-row"><input aria-label={'Reason for rejecting '+p.order_number} value={reasonById[p.id] || ''} onChange={e=>setReasonById({...reasonById,[p.id]:e.target.value})} placeholder="Reason if rejecting (required)"/><button type="button" className="payment-reject-button" disabled={busyId===p.id} onClick={()=>review(p,'rejected')}><XCircle size={14}/>Reject</button></div>}
        {p.status === 'rejected' && <p className="payment-rejection-reason">Reason: {p.rejection_reason || 'No reason supplied'}</p>}
      </article>)}
    </div>}
    <p className="inventory-footnote">Receipt files are stored in a private bucket. Only the verified kiosk owner can open them. Verifying a payment does not automatically mark the order as completed.</p>
  </section>;
}

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import {
  Wallet, Plus, RefreshCw, CalendarDays, CircleDollarSign, TrendingUp,
  Receipt, Pencil, Trash2, X, Save, ArrowDownRight, ChartNoAxesCombined
} from 'lucide-react';

const ranges = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];
const categories = [
  'Ingredients & stock', 'Packaging', 'Rent', 'Utilities', 'Transport & delivery',
  'Equipment & maintenance', 'Marketing', 'Staff', 'Fees & subscriptions', 'Other'
];
const blankExpense = { description: '', category: 'Ingredients & stock', amount: '', expense_date: new Date().toLocaleDateString('en-CA'), vendor: '', notes: '' };
const amount = value => Number(value || 0);
const money = value => '$' + amount(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayKey = value => {
  if (!value) return '';
  const d = new Date(value + (String(value).length === 10 ? 'T12:00:00' : ''));
  return Number.isNaN(d.getTime()) ? '' : [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
};
const rangeStart = (range, now) => {
  const d = new Date(now); d.setHours(0,0,0,0);
  if (range === 'today') return d;
  if (range === '7days') { d.setDate(d.getDate()-6); return d; }
  if (range === '30days') { d.setDate(d.getDate()-29); return d; }
  if (range === 'month') { d.setDate(1); return d; }
  return null;
};

export default function ExpensesProfit() {
  const [expenses, setExpenses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [range, setRange] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankExpense);

  const loadData = async () => {
    setLoading(true); setError('');
    const [expenseResult, orderResult] = await Promise.all([
      supabase.from('business_expenses').select('*').order('expense_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('orders').select('id, created_at, status, subtotal').order('created_at', { ascending: false })
    ]);
    if (expenseResult.error || orderResult.error) {
      const issue = expenseResult.error || orderResult.error;
      setError(`Financial data could not be loaded: ${issue.message}. Check that the Expenses & Profit setup SQL has been run in Supabase.`);
    } else {
      setExpenses(expenseResult.data || []);
      setOrders(orderResult.data || []);
    }
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  const report = useMemo(() => {
    const now = new Date();
    const start = rangeStart(range, now);
    const inPeriod = (dateValue) => {
      const d = new Date(String(dateValue).length === 10 ? dateValue + 'T12:00:00' : dateValue);
      return !Number.isNaN(d.getTime()) && (!start || d >= start);
    };
    const periodExpenses = expenses.filter(e => inPeriod(e.expense_date));
    const periodSales = orders.filter(o => String(o.status || '').toLowerCase() === 'completed' && inPeriod(o.created_at));
    const revenue = periodSales.reduce((sum, o) => sum + amount(o.subtotal), 0);
    const costs = periodExpenses.reduce((sum, e) => sum + amount(e.amount), 0);
    const grouped = {};
    periodExpenses.forEach(e => { grouped[e.category || 'Other'] = (grouped[e.category || 'Other'] || 0) + amount(e.amount); });
    const breakdown = Object.entries(grouped).map(([category, total]) => ({ category, total })).sort((a,b) => b.total-a.total);
    return { revenue, costs, profit: revenue-costs, margin: revenue > 0 ? ((revenue-costs)/revenue)*100 : null, count: periodExpenses.length, breakdown, completedCount: periodSales.length };
  }, [expenses, orders, range]);

  const closeForm = () => { setEditing(null); setForm({ ...blankExpense, expense_date: new Date().toLocaleDateString('en-CA') }); };
  const startNew = () => { setEditing('new'); setForm({ ...blankExpense, expense_date: new Date().toLocaleDateString('en-CA') }); setError(''); setNotice(''); };
  const startEdit = expense => {
    setEditing(expense.id);
    setForm({ description: expense.description || '', category: expense.category || 'Other', amount: String(expense.amount ?? ''), expense_date: expense.expense_date || new Date().toLocaleDateString('en-CA'), vendor: expense.vendor || '', notes: expense.notes || '' });
    setError(''); setNotice('');
  };
  const saveExpense = async event => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const value = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(value) || value <= 0 || !form.expense_date) {
      setSaving(false); setError('Enter a description, a valid amount greater than zero, and an expense date.'); return;
    }
    const payload = {
      description: form.description.trim(), category: form.category, amount: value,
      expense_date: form.expense_date, vendor: form.vendor.trim() || null,
      notes: form.notes.trim() || null, updated_at: new Date().toISOString()
    };
    const result = editing === 'new'
      ? await supabase.from('business_expenses').insert(payload)
      : await supabase.from('business_expenses').update(payload).eq('id', editing);
    if (result.error) { setSaving(false); setError(result.error.message); return; }
    setSaving(false); closeForm(); setNotice(editing === 'new' ? 'Expense recorded.' : 'Expense updated.');
    await loadData();
  };
  const deleteExpense = async expense => {
    if (!window.confirm(`Delete the expense “${expense.description}”?`)) return;
    const { error: deleteError } = await supabase.from('business_expenses').delete().eq('id', expense.id);
    if (deleteError) setError(deleteError.message);
    else { setNotice('Expense deleted.'); await loadData(); }
  };
  const startLabel = ranges.find(x => x.value === range)?.label || 'Selected period';

  return <section className="expenses-profit">
    <div className="expenses-toolbar">
      <div><span className="sales-report-eyebrow"><Wallet size={14}/> BUSINESS FINANCES</span><h2>Expenses & profit</h2><p>Record business spending and compare it with completed sales to estimate your operating profit.</p></div>
      <div className="sales-report-actions">
        <label className="sales-range-control"><CalendarDays size={15}/><select value={range} onChange={e => setRange(e.target.value)} aria-label="Financial report date range">{ranges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
        <button className="admin-secondary-button" onClick={loadData} disabled={loading}><RefreshCw size={14}/> {loading ? 'Refreshing…' : 'Refresh'}</button>
        <button className="admin-primary-button" onClick={startNew}><Plus size={15}/> Add expense</button>
      </div>
    </div>
    {notice && <p className="inventory-success" role="status">{notice}</p>}
    {error && <p className="inventory-error" role="alert">{error}</p>}
    {editing !== null && <form className="inventory-form" onSubmit={saveExpense}>
      <div className="inventory-form-heading"><div><strong>{editing === 'new' ? 'Record a business expense' : 'Edit expense'}</strong><p>Only save costs that belong to BEA'S KIOSK.</p></div><button type="button" className="admin-icon-button" onClick={closeForm} aria-label="Close"><X size={17}/></button></div>
      <div className="inventory-fields">
        <label>Expense description<input required maxLength={120} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="e.g. Milk and coffee beans"/></label>
        <label>Category<select value={form.category} onChange={e => setForm({...form,category:e.target.value})}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Amount<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({...form,amount:e.target.value})} placeholder="0.00"/></label>
        <label>Expense date<input required type="date" value={form.expense_date} onChange={e => setForm({...form,expense_date:e.target.value})}/></label>
        <label>Supplier / paid to (optional)<input maxLength={100} value={form.vendor} onChange={e => setForm({...form,vendor:e.target.value})} placeholder="e.g. Local grocery store"/></label>
        <label>Notes (optional)<input maxLength={250} value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Receipt reference or details"/></label>
      </div>
      <div className="inventory-form-actions"><button type="button" className="admin-secondary-button" onClick={closeForm}>Cancel</button><button type="submit" className="admin-primary-button" disabled={saving}><Save size={15}/>{saving ? 'Saving…' : 'Save expense'}</button></div>
    </form>}
    {loading ? <div className="sales-report-loading">Loading expenses and completed sales…</div> : <>
      <div className="expenses-stats">
        <article><span className="expenses-stat-icon"><TrendingUp size={19}/></span><small>Completed sales</small><strong>{money(report.revenue)}</strong><em>{report.completedCount} completed orders</em></article>
        <article><span className="expenses-stat-icon"><Receipt size={19}/></span><small>Recorded expenses</small><strong>{money(report.costs)}</strong><em>{report.count} expense entries</em></article>
        <article className={report.profit >= 0 ? 'profit-positive' : 'profit-negative'}><span className="expenses-stat-icon"><CircleDollarSign size={19}/></span><small>Estimated profit</small><strong>{money(report.profit)}</strong><em>{report.revenue > 0 ? `${report.margin.toFixed(1)}% profit margin` : 'No completed sales in this period'}</em></article>
      </div>
      <div className="expenses-lower-grid">
        <article className="admin-panel expenses-breakdown"><div className="admin-panel-heading"><div><h2>Where the money went</h2><p>{startLabel} · expenses by category</p></div><ChartNoAxesCombined size={19}/></div>
          {report.breakdown.length ? <div className="expenses-category-list">{report.breakdown.map(row => <div key={row.category}><div><strong>{row.category}</strong><b>{money(row.total)}</b></div><div className="expenses-category-track"><i style={{width:`${report.costs ? row.total/report.costs*100 : 0}%`}}/></div></div>)}</div> : <div className="sales-report-empty-best"><Receipt size={24}/><strong>No expenses recorded for this period</strong><span>Add an expense to start tracking spending.</span></div>}
        </article>
        <article className="admin-panel expenses-guidance"><div className="admin-panel-heading"><div><h2>Profit calculation</h2><p>How this estimate is worked out</p></div><CircleDollarSign size={19}/></div><div className="expenses-equation"><span>Completed sales</span><strong>{money(report.revenue)}</strong><span>Less recorded expenses</span><strong>− {money(report.costs)}</strong><div><span>Estimated profit</span><strong>{money(report.profit)}</strong></div></div><p>Only orders marked Completed count as sales. Expenses are counted by the expense date you enter. Add all relevant business costs to keep this estimate useful.</p></article>
      </div>
      <div className="inventory-section-head"><div><h3>Expense history</h3><p>{expenses.filter(e => { const d = new Date(String(e.expense_date || '').length === 10 ? e.expense_date+'T12:00:00' : e.expense_date); const s=rangeStart(range,new Date()); return !Number.isNaN(d.getTime()) && (!s || d>=s); }).length} entries in {startLabel.toLowerCase()}</p></div></div>
      {expenses.filter(e => { const d = new Date(String(e.expense_date || '').length === 10 ? e.expense_date+'T12:00:00' : e.expense_date); const s=rangeStart(range,new Date()); return !Number.isNaN(d.getTime()) && (!s || d>=s); }).length ? <div className="expenses-history">{expenses.filter(e => { const d = new Date(String(e.expense_date || '').length === 10 ? e.expense_date+'T12:00:00' : e.expense_date); const s=rangeStart(range,new Date()); return !Number.isNaN(d.getTime()) && (!s || d>=s); }).map(e => <article key={e.id}><div className="expenses-entry-copy"><strong>{e.description}</strong><span>{e.category} · {new Date(e.expense_date+'T12:00:00').toLocaleDateString([], {dateStyle:'medium'})}{e.vendor ? ` · ${e.vendor}` : ''}</span>{e.notes && <small>{e.notes}</small>}</div><strong className="expenses-entry-amount">{money(e.amount)}</strong><div className="expenses-entry-actions"><button title="Edit expense" onClick={() => startEdit(e)}><Pencil size={15}/></button><button title="Delete expense" onClick={() => deleteExpense(e)}><Trash2 size={15}/></button></div></article>)}</div> : <div className="inventory-empty compact">Your recorded expenses will appear here.</div>}
      <p className="inventory-footnote">This is a simple management estimate, not a tax or accounting statement. It does not automatically calculate taxes, unpaid bills, depreciation or inventory usage. Record each expense once to avoid double-counting.</p>
    </>}
  </section>;
}

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import {
  Package, Plus, RefreshCw, Pencil, Trash2, X, Save,
  ArrowDownToLine, ArrowUpFromLine, ClipboardList, AlertTriangle
} from 'lucide-react';

const blankItem = { name: '', category: 'Ingredients', quantity: '0', unit: 'units', low_stock_threshold: '0', notes: '' };
const categories = ['Ingredients', 'Coffee & Tea', 'Dairy & Alternatives', 'Syrups & Sauces', 'Cups & Packaging', 'Baking Supplies', 'Cleaning Supplies', 'Other'];
const safeText = value => typeof value === 'string' ? value : '';
const numberValue = value => Number(value || 0);
const moneyLikeQty = value => numberValue(value).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function InventoryManagement() {
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankItem);
  const [stockItem, setStockItem] = useState(null);
  const [movementType, setMovementType] = useState('restock');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementNote, setMovementNote] = useState('');

  const loadInventory = async () => {
    setLoading(true); setError('');
    const [itemResult, movementResult] = await Promise.all([
      supabase.from('inventory_items').select('*').order('name', { ascending: true }),
      supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(12)
    ]);
    if (itemResult.error || movementResult.error) {
      const issue = itemResult.error || movementResult.error;
      setError(`Inventory could not be loaded: ${issue.message}. Make sure the inventory setup SQL has been run in Supabase.`);
    } else {
      setItems(itemResult.data || []);
      setMovements(movementResult.data || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadInventory(); }, []);

  const lowItems = useMemo(() => items.filter(item => numberValue(item.quantity) <= numberValue(item.low_stock_threshold)), [items]);
  const totalItems = items.length;
  const closeItemForm = () => { setEditing(null); setForm(blankItem); };

  const startNew = () => {
    setEditing('new'); setForm(blankItem); setError(''); setNotice('');
  };
  const startEdit = item => {
    setEditing(item.id);
    setForm({ name: safeText(item.name), category: item.category || 'Other', quantity: String(item.quantity ?? 0), unit: item.unit || 'units', low_stock_threshold: String(item.low_stock_threshold ?? 0), notes: safeText(item.notes) });
    setError(''); setNotice('');
  };

  const saveItem = async event => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const payload = {
      name: form.name.trim(), category: form.category,
      quantity: Math.max(0, numberValue(form.quantity)), unit: form.unit.trim() || 'units',
      low_stock_threshold: Math.max(0, numberValue(form.low_stock_threshold)),
      notes: form.notes.trim() || null, updated_at: new Date().toISOString()
    };
    if (!payload.name) { setSaving(false); setError('Please enter an item name.'); return; }
    let saveNotice = 'Inventory item saved.';
    if (editing === 'new') {
      const { data, error: insertError } = await supabase.from('inventory_items').insert(payload).select().single();
      if (insertError) { setSaving(false); setError(insertError.message); return; }
      if (payload.quantity > 0) {
        const { error: movementError } = await supabase.from('inventory_movements').insert({
          inventory_item_id: data.id, item_name: data.name, movement_type: 'opening',
          quantity_change: payload.quantity, quantity_after: payload.quantity, note: 'Opening stock'
        });
        if (movementError) saveNotice = 'Item saved, but opening stock history could not be recorded.';
      }
    } else {
      const previous = items.find(item => item.id === editing);
      const { error: updateError } = await supabase.from('inventory_items').update(payload).eq('id', editing);
      if (updateError) { setSaving(false); setError(updateError.message); return; }
      if (previous && numberValue(previous.quantity) !== payload.quantity) {
        const { error: movementError } = await supabase.from('inventory_movements').insert({
          inventory_item_id: editing, item_name: payload.name, movement_type: 'adjustment',
          quantity_change: payload.quantity - numberValue(previous.quantity),
          quantity_after: payload.quantity, note: 'Quantity changed while editing item'
        });
        if (movementError) saveNotice = 'Item updated, but quantity-change history could not be recorded.';
      }
    }
    setSaving(false); closeItemForm();
    setNotice(saveNotice);
    await loadInventory();
  };

  const openStockForm = (item, type) => {
    setStockItem(item); setMovementType(type); setMovementAmount(''); setMovementNote(''); setError(''); setNotice('');
  };

  const saveMovement = async event => {
    event.preventDefault();
    if (!stockItem) return;
    const amount = numberValue(movementAmount);
    if (!Number.isFinite(amount) || amount < 0 || (movementType !== 'adjustment' && amount === 0)) { setError(movementType === 'adjustment' ? 'Enter a valid stock count.' : 'Enter a quantity greater than zero.'); return; }
    const current = numberValue(stockItem.quantity);
    const next = movementType === 'restock' ? current + amount : movementType === 'usage' ? current - amount : amount;
    if (next < 0) { setError('That amount is more than the current stock.'); return; }
    setSaving(true); setError(''); setNotice('');
    const { error: updateError } = await supabase.from('inventory_items').update({ quantity: next, updated_at: new Date().toISOString() }).eq('id', stockItem.id);
    if (updateError) { setSaving(false); setError(updateError.message); return; }
    const delta = movementType === 'restock' ? amount : movementType === 'usage' ? -amount : amount - current;
    const { error: historyError } = await supabase.from('inventory_movements').insert({
      inventory_item_id: stockItem.id, item_name: stockItem.name, movement_type: movementType,
      quantity_change: delta, quantity_after: next, note: movementNote.trim() || null
    });
    setSaving(false); setStockItem(null);
    setNotice(historyError ? 'Stock updated, but the activity record could not be saved.' : 'Stock quantity updated.');
    await loadInventory();
  };

  const deleteItem = async item => {
    if (!window.confirm(`Delete ${item.name} from inventory? Its past activity will remain in the history.`)) return;
    const { error: deleteError } = await supabase.from('inventory_items').delete().eq('id', item.id);
    if (deleteError) setError(deleteError.message);
    else { setNotice(`${item.name} deleted from inventory.`); await loadInventory(); }
  };

  const movementLabel = type => ({ opening: 'Opening stock', restock: 'Restock', usage: 'Used', adjustment: 'Adjustment' }[type] || type);
  const dateLabel = value => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  return <section className="inventory-manager">
    <div className="inventory-heading">
      <div><span className="admin-eyebrow"><span/> STOCK & SUPPLIES</span><h2>Inventory management</h2><p>Keep track of ingredients, packaging and supplies used at your kiosk.</p></div>
      <button className="admin-primary-button" onClick={startNew}><Plus size={16}/> Add stock item</button>
    </div>

    {notice && <p className="inventory-success" role="status">{notice}</p>}
    {error && <p className="inventory-error" role="alert">{error}</p>}

    <div className="inventory-summary">
      <article><span className="inventory-summary-icon"><Package size={19}/></span><div><small>Stock items</small><strong>{totalItems}</strong></div></article>
      <article><span className="inventory-summary-icon"><AlertTriangle size={19}/></span><div><small>Low-stock alerts</small><strong>{lowItems.length}</strong></div></article>
      <article><span className="inventory-summary-icon"><ClipboardList size={19}/></span><div><small>Recent stock activities</small><strong>{movements.length}</strong></div></article>
    </div>

    {editing !== null && <form className="inventory-form" onSubmit={saveItem}>
      <div className="inventory-form-heading"><div><strong>{editing === 'new' ? 'Add inventory item' : 'Edit inventory item'}</strong><p>Enter the quantity you currently have on hand.</p></div><button type="button" className="admin-icon-button" onClick={closeItemForm} aria-label="Close"><X size={17}/></button></div>
      <div className="inventory-fields">
        <label>Item name<input required maxLength={90} value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Whole milk"/></label>
        <label>Category<select value={form.category} onChange={e => setForm({...form,category:e.target.value})}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
        <label>Current quantity<input required type="number" min="0" step="0.01" value={form.quantity} onChange={e => setForm({...form,quantity:e.target.value})}/></label>
        <label>Unit<input required maxLength={24} value={form.unit} onChange={e => setForm({...form,unit:e.target.value})} placeholder="e.g. litres, bags, bottles"/></label>
        <label>Low-stock alert at<input required type="number" min="0" step="0.01" value={form.low_stock_threshold} onChange={e => setForm({...form,low_stock_threshold:e.target.value})}/></label>
        <label className="wide">Notes (optional)<textarea rows="2" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Brand, size, supplier or storage location"/></label>
      </div>
      <div className="inventory-form-actions"><button type="button" className="admin-secondary-button" onClick={closeItemForm}>Cancel</button><button type="submit" className="admin-primary-button" disabled={saving}><Save size={15}/>{saving ? 'Saving…' : 'Save item'}</button></div>
    </form>}

    {stockItem && <form className="inventory-form" onSubmit={saveMovement}>
      <div className="inventory-form-heading"><div><strong>Update {stockItem.name}</strong><p>Current stock: {moneyLikeQty(stockItem.quantity)} {stockItem.unit}</p></div><button type="button" className="admin-icon-button" onClick={() => setStockItem(null)} aria-label="Close"><X size={17}/></button></div>
      <div className="inventory-fields">
        <label>Stock action<select value={movementType} onChange={e => setMovementType(e.target.value)}><option value="restock">Add stock (purchase)</option><option value="usage">Record quantity used</option><option value="adjustment">Set exact stock count</option></select></label>
        <label>{movementType === 'adjustment' ? 'New total quantity' : 'Quantity'}<input required type="number" min={movementType === "adjustment" ? 0 : 0.01} step="0.01" value={movementAmount} onChange={e => setMovementAmount(e.target.value)} placeholder="Enter amount"/></label>
        <label className="wide">Note (optional)<input value={movementNote} onChange={e => setMovementNote(e.target.value)} placeholder="e.g. Weekly supplier purchase"/></label>
      </div>
      <div className="inventory-form-actions"><button type="button" className="admin-secondary-button" onClick={() => setStockItem(null)}>Cancel</button><button type="submit" className="admin-primary-button" disabled={saving}><Save size={15}/>{saving ? 'Saving…' : 'Save stock update'}</button></div>
    </form>}

    <div className="inventory-section-head"><div><h3>Current stock</h3><p>{items.length} tracked items · low-stock items are highlighted</p></div><button className="admin-secondary-button" onClick={loadInventory} disabled={loading}><RefreshCw size={14}/> Refresh</button></div>
    {loading ? <div className="inventory-empty">Loading inventory…</div> : items.length === 0 ? <div className="inventory-empty"><Package size={27}/><strong>Your inventory is ready to set up.</strong><span>Add coffee, milk, cups and other supplies to start tracking stock.</span><button className="admin-primary-button" onClick={startNew}><Plus size={15}/> Add first stock item</button></div> : (
      <div className="inventory-list">{items.map(item => {
        const low = numberValue(item.quantity) <= numberValue(item.low_stock_threshold);
        return <article className={`inventory-item ${low ? 'is-low' : ''}`} key={item.id}>
          <div className="inventory-item-icon"><Package size={20}/></div>
          <div className="inventory-item-copy"><strong>{item.name}</strong><span>{item.category} · Alert at {moneyLikeQty(item.low_stock_threshold)} {item.unit}</span>{item.notes && <small>{item.notes}</small>}</div>
          <div className="inventory-quantity"><strong>{moneyLikeQty(item.quantity)}</strong><span>{item.unit}</span>{low && <em><AlertTriangle size={12}/> Low stock</em>}</div>
          <div className="inventory-actions"><button title="Add stock" onClick={() => openStockForm(item,'restock')}><ArrowDownToLine size={15}/><span>Add</span></button><button title="Record usage" onClick={() => openStockForm(item,'usage')}><ArrowUpFromLine size={15}/><span>Use</span></button><button title="Edit item" onClick={() => startEdit(item)}><Pencil size={15}/></button><button title="Delete item" onClick={() => deleteItem(item)}><Trash2 size={15}/></button></div>
        </article>;
      })}</div>
    )}

    <div className="inventory-section-head inventory-history-head"><div><h3>Recent stock activity</h3><p>Latest additions, usage and adjustments</p></div></div>
    {movements.length ? <div className="inventory-history">{movements.map(move => <article key={move.id}><div><strong>{move.item_name}</strong><span>{movementLabel(move.movement_type)} · {dateLabel(move.created_at)}</span>{move.note && <small>{move.note}</small>}</div><strong className={numberValue(move.quantity_change) >= 0 ? 'positive' : 'negative'}>{numberValue(move.quantity_change) > 0 ? '+' : ''}{moneyLikeQty(move.quantity_change)} {move.quantity_after == null ? '' : `· now ${moneyLikeQty(move.quantity_after)}`}</strong></article>)}</div> : <div className="inventory-empty compact">Stock activity will appear here when you add or update quantities.</div>}
    <p className="inventory-footnote">Stock updates are manual in this first version. Orders will not automatically reduce ingredients until we define the recipe quantities for each menu product, so your stock figures remain transparent and controllable.</p>
  </section>;
}

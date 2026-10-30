import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Plus, Pencil, Trash2, Eye, EyeOff, ImagePlus, X, Save, Coffee, RefreshCw } from 'lucide-react';

const categories = ['Hot Coffee', 'Iced Coffee', 'Specialty Drinks', 'Desserts'];
const blankItem = { name: '', category: 'Hot Coffee', price: '', description: '', image_url: '', tag: '', unit: '', menu_type: 'regular', is_available: true, sort_order: 0 };

export default function MenuManagement() {
  const [items, setItems] = useState([]);
  const [menuType, setMenuType] = useState('regular');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankItem);
  const [photo, setPhoto] = useState(null);

  const loadItems = async () => {
    setLoading(true); setError('');
    const { data, error } = await supabase.from('menu_items')
      .select('id, name, category, price, description, image_url, tag, unit, menu_type, is_available, sort_order')
      .order('sort_order', { ascending: true });
    if (error) setError('Could not load menu items. Check that the menu_items table and its owner permissions are configured in Supabase.');
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  const startNew = () => { setEditing('new'); setForm({ ...blankItem, menu_type: menuType, sort_order: items.length }); setPhoto(null); setError(''); setNotice(''); };
  const startEdit = (item) => { setEditing(item.id); setForm({ ...blankItem, ...item, price: String(item.price), menu_type: item.menu_type || 'regular' }); setPhoto(null); setError(''); setNotice(''); };
  const closeForm = () => { setEditing(null); setPhoto(null); setForm(blankItem); };

  const saveItem = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    let imageUrl = form.image_url?.trim() || null;
    if (photo) {
      const safeName = photo.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
      const path = `${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('menu-images').upload(path, photo, { upsert: true });
      if (uploadError) {
        setSaving(false);
        setError('Photo upload needs a public Supabase Storage bucket named menu-images with upload permissions. You can still save the item using an image URL.');
        return;
      }
      imageUrl = supabase.storage.from('menu-images').getPublicUrl(path).data.publicUrl;
    }
    const payload = {
      name: form.name.trim(), category: form.category, price: Number(form.price),
      description: form.description.trim(), image_url: imageUrl,
      tag: form.tag.trim() || null, unit: form.unit.trim() || null,
      menu_type: form.menu_type, is_available: Boolean(form.is_available),
      sort_order: Number(form.sort_order) || 0
    };
    const result = editing === 'new'
      ? await supabase.from('menu_items').insert(payload)
      : await supabase.from('menu_items').update(payload).eq('id', editing);
    setSaving(false);
    if (result.error) { setError('Could not save this item. Please check your Supabase table permissions and required columns.'); return; }
    closeForm(); setNotice('Menu item saved successfully.'); await loadItems();
  };

  const toggleAvailability = async (item) => {
    setError(''); setNotice('');
    const { error } = await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
    if (error) setError('Could not update availability. Check Supabase permissions.');
    else { setNotice(`${item.name} is now ${item.is_available ? 'unavailable' : 'available'}.`); await loadItems(); }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete “${item.name}” from the menu? This cannot be undone.`)) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
    if (error) setError('Could not delete this item. Check Supabase permissions.');
    else { setNotice(`${item.name} was deleted.`); await loadItems(); }
  };

  const visibleItems = items.filter(item => (item.menu_type || 'regular') === menuType);

  return <section className="admin-menu-manager">
    <div className="admin-menu-heading">
      <div><span className="admin-eyebrow"><span/> KEEP YOUR MENU FRESH</span><h2>Menu management</h2><p>Add products, update prices and control what customers can order.</p></div>
      <button className="admin-primary-button" onClick={startNew}><Plus size={16}/> Add product</button>
    </div>
    <div className="admin-menu-tabs">
      <button className={menuType === 'regular' ? 'active' : ''} onClick={() => setMenuType('regular')}>Regular menu</button>
      <button className={menuType === 'daily' ? 'active' : ''} onClick={() => setMenuType('daily')}>Daily menu</button>
    </div>
    {notice && <p className="admin-menu-success" role="status">{notice}</p>}
    {error && <p className="admin-menu-error" role="alert">{error}</p>}
    {editing !== null && <form className="admin-menu-form" onSubmit={saveItem}>
      <div className="admin-menu-form-head"><div><strong>{editing === 'new' ? 'Add a menu item' : 'Edit menu item'}</strong><p>Changes are saved to your customer menu database.</p></div><button type="button" className="admin-icon-button" onClick={closeForm} aria-label="Close form"><X size={17}/></button></div>
      <div className="admin-menu-fields">
        <label>Product name<input required maxLength={90} value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Vanilla Cinnamon Latte"/></label>
        <label>Category<select value={form.category} onChange={e => setForm({...form,category:e.target.value})}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Price<input required type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({...form,price:e.target.value})} placeholder="0.00"/></label>
        <label>Menu<select value={form.menu_type} onChange={e => setForm({...form,menu_type:e.target.value})}><option value="regular">Regular menu</option><option value="daily">Daily menu</option></select></label>
        <label className="wide">Description<textarea rows="2" value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Describe this coffee or treat"/></label>
        <label>Small label (optional)<input value={form.tag || ''} onChange={e => setForm({...form,tag:e.target.value})} placeholder="e.g. Customer favorite"/></label>
        <label>Unit (optional)<input value={form.unit || ''} onChange={e => setForm({...form,unit:e.target.value})} placeholder="e.g. each"/></label>
        <label className="wide">Photo URL<input type="url" value={form.image_url || ''} onChange={e => setForm({...form,image_url:e.target.value})} placeholder="https://..."/></label>
        <label className="wide admin-photo-upload"><span><ImagePlus size={17}/> Or upload a photo</span><input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)}/>{photo && <small>{photo.name}</small>}</label>
        <label>Display order<input type="number" step="1" value={form.sort_order} onChange={e => setForm({...form,sort_order:e.target.value})}/></label>
        <label className="admin-availability-check"><input type="checkbox" checked={Boolean(form.is_available)} onChange={e => setForm({...form,is_available:e.target.checked})}/> Available to customers</label>
      </div>
      {error && <p className="admin-menu-error">{error}</p>}
      <div className="admin-menu-form-actions"><button type="button" className="admin-secondary-button" onClick={closeForm}>Cancel</button><button className="admin-primary-button" type="submit" disabled={saving}><Save size={15}/>{saving ? 'Saving…' : 'Save product'}</button></div>
    </form>}
    <div className="admin-menu-list-head"><div><h3>{menuType === 'regular' ? 'Regular menu items' : 'Daily menu items'}</h3><p>{visibleItems.length} products</p></div><button className="admin-secondary-button" onClick={loadItems}><RefreshCw size={14}/> Refresh</button></div>
    {loading ? <div className="admin-menu-empty">Loading menu items…</div> : visibleItems.length === 0 ? <div className="admin-menu-empty"><Coffee size={26}/><strong>No products in this menu yet.</strong><span>Add your first item to get started.</span><button className="admin-primary-button" onClick={startNew}><Plus size={15}/> Add product</button></div> :
      <div className="admin-menu-items">{visibleItems.map(item => <article className="admin-menu-item" key={item.id}>
        <div className="admin-menu-thumb">{item.image_url ? <img src={item.image_url} alt={item.name}/> : <Coffee size={22}/>}</div>
        <div className="admin-menu-item-copy"><strong>{item.name}</strong><span>{item.category} · ${Number(item.price).toFixed(2)}{item.unit ? ` / ${item.unit}` : ''}</span><small>{item.description || 'No description added'}</small></div>
        <span className={item.is_available ? 'admin-menu-state available' : 'admin-menu-state unavailable'}>{item.is_available ? 'Available' : 'Unavailable'}</span>
        <div className="admin-menu-item-actions"><button title={item.is_available ? 'Mark unavailable' : 'Mark available'} onClick={() => toggleAvailability(item)}>{item.is_available ? <Eye size={16}/> : <EyeOff size={16}/>}</button><button title="Edit product" onClick={() => startEdit(item)}><Pencil size={16}/></button><button title="Delete product" onClick={() => deleteItem(item)}><Trash2 size={16}/></button></div>
      </article>)}</div>}
    <p className="admin-menu-footnote">Menu edits are saved to Supabase. Customers currently see available items from the Regular menu; Daily Menu display will be connected in the customer page update.</p>
  </section>;
}

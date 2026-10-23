import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ShoppingBag, Search, Plus, Minus, Coffee, CakeSlice, Clock3, MapPin, X, ArrowRight, Leaf } from 'lucide-react';
import mainLogo from './assets/beas-kiosk-main-logo.png';
import coffeeCupImage from './assests/beas-kiosk-cup.png.png';
import watermarkLogo from './assets/beas-kiosk-watermark.png';
import './styles.css';

const products = [
  { id: 1, name: 'Café au Lait', category: 'Hot Coffee', price: 6, description: 'Equal parts strong brewed coffee and hot steamed milk.', tag: 'Classic' },
  { id: 2, name: 'White Coffee', category: 'Hot Coffee', price: 6, description: 'Brewed coffee finished with milk, cream, or a dairy alternative.' },
  { id: 3, name: 'Flat White', category: 'Hot Coffee', price: 6, description: 'Rich coffee flavor with a smooth, velvety microfoam.' },
  { id: 4, name: 'Iced Flat White', category: 'Iced Coffee', price: 6, description: 'A smooth iced coffee with a stronger coffee-to-milk ratio.' },
  { id: 5, name: 'Iced Latte', category: 'Iced Coffee', price: 7, description: 'Coffee and cold milk served over ice.' },
  { id: 6, name: 'Banana Bread Latte', category: 'Specialty Drinks', price: 8, description: 'A cozy specialty latte inspired by freshly baked banana bread.', tag: 'Customer favorite' },
  { id: 7, name: 'Brown Sugar Shaken Espresso', category: 'Specialty Drinks', price: 8, description: 'Bold espresso shaken with a touch of brown sugar.' },
  { id: 8, name: 'Pumpkin Spice Latte', category: 'Specialty Drinks', price: 8, description: 'A seasonal blend of coffee and warming pumpkin spice.' },
  { id: 9, name: 'Vanilla Cinnamon Latte', category: 'Specialty Drinks', price: 8, description: 'Vanilla sweetness with a gentle cinnamon finish.' },
  { id: 10, name: 'Caramel and Cinnamon Latte', category: 'Specialty Drinks', price: 8, description: 'Caramel and cinnamon in a comforting latte.' },
  { id: 11, name: 'Cinnamon Roll Bites', category: 'Desserts', price: 1, unit: 'each', description: 'Little cinnamon-swirled bites, perfect alongside coffee.' },
  { id: 12, name: 'Pumpkin Sweet', category: 'Desserts', price: 2, unit: 'each', description: 'A sweet pumpkin treat to pair with your favorite drink.' },
];
const categories = ['All Items', 'Hot Coffee', 'Iced Coffee', 'Specialty Drinks', 'Desserts'];
const money = (value) => `$${value.toFixed(2)}`; // Currency symbol is provisional until the business currency is confirmed.
function App() {
  const [category, setCategory] = useState('All Items');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [customer, setCustomer] = useState({ name: '', phone: '', fulfilment: 'Pickup', payment: 'Mobile banking / digital wallet' });
  const visibleProducts = useMemo(() => products.filter(p => (category === 'All Items' || p.category === category) && `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase())), [category, search]);
  const cartItems = products.filter(p => cart[p.id] > 0);
  const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const subtotal = cartItems.reduce((sum, p) => sum + p.price * cart[p.id], 0);
  const changeQty = (id, delta) => setCart(old => ({ ...old, [id]: Math.max(0, (old[id] || 0) + delta) }));
  const placeDemoOrder = (e) => { e.preventDefault(); setCheckoutOpen(false); setCartOpen(false); setCart({}); setNotice('Thanks! This is a preview only. Online order submission will be activated after we connect the secure database.'); };
  return <div className="app-shell">
    <div className="announcement">A little comfort in every cup <span>✦</span> Freshly made with love</div>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="BEA'S KIOSK home"><img src={mainLogo} alt="BEA'S KIOSK main logo" /></a>
      <nav className="desktop-nav"><a href="#menu">Menu</a><a href="#about">Our little kiosk</a><a href="#order-info">How to order</a></nav>
      <div className="header-actions"><label className="search-box"><Search size={17}/><input aria-label="Search menu" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find your favorite..." /></label><button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`Open cart, ${count} items`}><ShoppingBag size={19}/><span>Cart</span><b>{count}</b></button></div>
    </header>
    <main id="top">
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow"><Leaf size={15}/> YOUR COZY COFFEE CORNER</span><h1>Good coffee.<br/><em>Good moments.</em></h1><p>Slow down, sip something lovely, and find your new favorite at BEA’S KIOSK.</p><a className="primary-button" href="#menu">Explore the menu <ArrowRight size={17}/></a><div className="hero-note"><Coffee size={18}/><span>Made fresh, just for you.</span></div></div>
        <div className="hero-art"><div className="sun-disc">
  <img
    className="sun-disc-logo"
    src={watermarkLogo}
    alt=""
    aria-hidden="true"
  />
</div><div className="hero-caption"><span>YOUR DAILY</span><strong>little pick-me-up</strong></div>
<img
  className="coffee-cup-image"
  src={coffeeCupImage}
  alt="BEA'S KIOSK iced coffee"
/>
<span className="spark spark-one">✳</span>
<span className="spark spark-two">✦</span>
</div>
</section>
      <section className="category-strip" aria-label="Menu categories">{categories.slice(1).map((c,i)=><button key={c} onClick={()=>{setCategory(c);document.getElementById('menu').scrollIntoView({behavior:'smooth'});}} className="category-tile"><span className="category-icon">{i===3?<CakeSlice size={22}/>:<Coffee size={22}/>}</span><span>{c}</span><ArrowRight size={15}/></button>)}</section>
      <section className="menu-section" id="menu"><div className="section-heading"><div><span className="eyebrow">MADE TO BRIGHTEN YOUR DAY</span><h2>Find your <em>favorite.</em></h2><p>From comforting classics to little sweet treats.</p></div><div className="menu-count">{visibleProducts.length} menu items</div></div>
        <div className="filter-row">{categories.map(c=><button key={c} className={category===c?'filter active':'filter'} onClick={()=>setCategory(c)}>{c}</button>)}</div>
        <div className="product-grid">{visibleProducts.map((p,i)=><article className="product-card" key={p.id}><div className={`product-art art-${p.category.toLowerCase().replaceAll(' ','-')}`}><span className="product-number">{String(i+1).padStart(2,'0')}</span><div className="mini-cup"><div className="mini-lid"></div><div className="mini-body"><span>{p.category==='Desserts'?'SWEET':'BEA’S'}</span></div></div>{p.tag&&<span className="product-tag">{p.tag}</span>}</div><div className="product-info"><div className="product-title-line"><h3>{p.name}</h3><strong>{money(p.price)}{p.unit&&<small> / {p.unit}</small>}</strong></div><p>{p.description}</p><button className="add-button" onClick={()=>{changeQty(p.id,1);setNotice(`${p.name} added to your cart.`);}}><Plus size={16}/> Add to cart</button></div></article>)}</div>
        {visibleProducts.length===0&&<div className="empty-state">No menu items match that search. Try another name.</div>}
      </section>
      <section className="order-info" id="order-info"><div className="info-icon"><Clock3 size={25}/></div><div><span className="eyebrow">EASY AS ONE, TWO, SIP</span><h2>Order your way.</h2><p>Choose pickup or delivery at checkout. Electronic payment instructions and receipt upload will be available after secure payment setup is complete.</p></div><a className="text-link" href="#menu">Browse the menu <ArrowRight size={16}/></a></section>
      <section className="about-section" id="about"><img src={mainLogo} alt="BEA'S KIOSK"/><div><span className="eyebrow">A WARM WELCOME, ALWAYS</span><h2>A little kiosk, <em>a lot of heart.</em></h2><p>Thanks for stopping by. We’re happy to be part of your everyday coffee moments.</p></div></section>
    </main>
    <footer><span>© {new Date().getFullYear()} BEA’S KIOSK</span><span>Made with warmth <span className="heart">♥</span></span><span>Fresh coffee, happy moments.</span></footer>
    {notice&&<div className="toast" role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}
    {cartOpen&&<div className="overlay" onClick={()=>setCartOpen(false)}><aside className="drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">YOUR LITTLE ORDER</span><h2>Your cart ({count})</h2></div><button className="icon-button" onClick={()=>setCartOpen(false)} aria-label="Close cart"><X/></button></div>{cartItems.length===0?<div className="empty-cart"><ShoppingBag size={35}/><h3>Your cart is waiting.</h3><p>Add a coffee or treat to get started.</p><button className="primary-button" onClick={()=>setCartOpen(false)}>Explore menu</button></div>:<><div className="cart-list">{cartItems.map(p=><div className="cart-line" key={p.id}><div className="cart-dot"><Coffee size={18}/></div><div className="cart-product"><strong>{p.name}</strong><span>{money(p.price)}{p.unit?` / ${p.unit}`:''}</span><div className="qty-control"><button onClick={()=>changeQty(p.id,-1)} aria-label={`Remove one ${p.name}`}><Minus size={13}/></button><span>{cart[p.id]}</span><button onClick={()=>changeQty(p.id,1)} aria-label={`Add one ${p.name}`}><Plus size={13}/></button></div></div><strong>{money(p.price*cart[p.id])}</strong></div>)}</div><div className="cart-bottom"><div className="subtotal"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p>Delivery fees, if applicable, will be confirmed before order submission.</p><button className="primary-button full" onClick={()=>{setCartOpen(false);setCheckoutOpen(true);}}>Continue to checkout <ArrowRight size={17}/></button></div></>}</aside></div>}
    {checkoutOpen&&<div className="overlay" onClick={()=>setCheckoutOpen(false)}><section className="checkout-modal" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">ALMOST THERE</span><h2>Checkout</h2></div><button className="icon-button" onClick={()=>setCheckoutOpen(false)} aria-label="Close checkout"><X/></button></div><form onSubmit={placeDemoOrder}><label>Your name<input required value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} placeholder="Name for your order"/></label><label>Phone number<input required value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})} placeholder="Best number to reach you"/></label><label>How would you like your order?<select value={customer.fulfilment} onChange={e=>setCustomer({...customer,fulfilment:e.target.value})}><option>Pickup</option><option>Delivery</option></select></label><label>Payment method<select value={customer.payment} onChange={e=>setCustomer({...customer,payment:e.target.value})}><option>Mobile banking / digital wallet</option><option>Cash on pickup / delivery</option></select></label>{customer.payment==='Mobile banking / digital wallet'&&<div className="payment-note"><strong>Payment instructions coming soon</strong><p>Secure banking details and receipt upload will be activated after we connect the private database and owner dashboard. Do not send payment using this preview.</p></div>}<div className="subtotal"><span>Order subtotal</span><strong>{money(subtotal)}</strong></div><button className="primary-button full" type="submit">Preview checkout <ArrowRight size={17}/></button><p className="form-footnote">Preview only — orders are not submitted or saved yet.</p></form></section></div>}
    <div className="watermark" style={{backgroundImage:`url(${watermarkLogo})`}} aria-hidden="true"></div>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);

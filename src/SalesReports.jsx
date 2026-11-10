import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import {
  ChartNoAxesCombined, CircleDollarSign, ShoppingBag, Coffee,
  RefreshCw, CalendarDays, TrendingUp, Award
} from 'lucide-react';

const ranges = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

const money = value => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD'
}).format(Number(value || 0));

const localDayKey = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRangeStart = (range, now) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === 'today') return start;
  if (range === '7days') { start.setDate(start.getDate() - 6); return start; }
  if (range === '30days') { start.setDate(start.getDate() - 29); return start; }
  if (range === 'month') { start.setDate(1); return start; }
  return null;
};

function getItemDetails(item) {
  const quantity = Math.max(0, Number(item?.quantity ?? item?.qty ?? 1) || 0);
  const name = String(item?.name || item?.title || 'Menu item');
  return { name, quantity };
}

export default function SalesReports() {
  const [orders, setOrders] = useState([]);
  const [range, setRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('orders')
      .select('id, order_number, created_at, status, subtotal, items')
      .order('created_at', { ascending: false });
    if (queryError) {
      setError(`Sales data could not be loaded: ${queryError.message}`);
      setOrders([]);
    } else {
      setOrders(data || []);
      setLastUpdated(new Date());
    }
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, []);

  const report = useMemo(() => {
    const now = new Date();
    const start = getRangeStart(range, now);
    const inRange = orders.filter(order => {
      const created = new Date(order.created_at);
      return !Number.isNaN(created.getTime()) && (!start || created >= start);
    });
    const completed = inRange.filter(order => String(order.status || '').toLowerCase() === 'completed');
    const cancelled = inRange.filter(order => String(order.status || '').toLowerCase() === 'cancelled');
    const activeOrders = inRange.filter(order => !['cancelled'].includes(String(order.status || '').toLowerCase()));
    const revenue = completed.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
    const average = completed.length ? revenue / completed.length : 0;

    const products = new Map();
    completed.forEach(order => {
      (Array.isArray(order.items) ? order.items : []).forEach(item => {
        const { name, quantity } = getItemDetails(item);
        products.set(name, (products.get(name) || 0) + quantity);
      });
    });
    const bestSellers = [...products.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const buckets = new Map();
    if (range === 'all') {
      const months = [...new Set(completed.map(order => {
        const d = new Date(order.created_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }))].sort();
      months.forEach(key => buckets.set(key, { key, label: new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1, 1).toLocaleDateString([], { month: 'short', year: '2-digit' }), total: 0 }));
    } else {
      const bucketStart = start || getRangeStart('7days', now);
      const cursor = new Date(bucketStart);
      while (cursor <= now) {
        const key = localDayKey(cursor);
        buckets.set(key, { key, label: cursor.toLocaleDateString([], { month: 'short', day: 'numeric' }), total: 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    completed.forEach(order => {
      const date = new Date(order.created_at);
      const key = range === 'all'
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : localDayKey(date);
      if (buckets.has(key)) buckets.get(key).total += Number(order.subtotal || 0);
    });
    const chart = [...buckets.values()];
    const peak = Math.max(1, ...chart.map(bucket => bucket.total));

    return {
      completedCount: completed.length,
      orderCount: activeOrders.length,
      cancelledCount: cancelled.length,
      revenue,
      average,
      bestSellers,
      chart,
      peak,
    };
  }, [orders, range]);

  const rangeLabel = ranges.find(option => option.value === range)?.label || 'Last 7 days';

  return (
    <section className="sales-report">
      <div className="sales-report-toolbar">
        <div>
          <span className="sales-report-eyebrow"><ChartNoAxesCombined size={14}/> BUSINESS PERFORMANCE</span>
          <h2>Sales overview</h2>
          <p>Revenue is calculated from completed orders only. Cancelled and unfinished orders are not counted as sales.</p>
        </div>
        <div className="sales-report-actions">
          <label className="sales-range-control"><CalendarDays size={15}/><select value={range} onChange={event => setRange(event.target.value)} aria-label="Sales report date range">{ranges.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <button className="admin-secondary-button" onClick={loadOrders} disabled={loading}><RefreshCw size={14}/> {loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </div>

      {error && <p className="sales-report-error" role="alert">{error}</p>}

      {loading ? <div className="sales-report-loading">Loading sales data from Supabase…</div> : (
        <>
          <div className="sales-report-stats">
            <article className="sales-report-stat">
              <span className="sales-report-stat-icon"><CircleDollarSign size={19}/></span>
              <span className="sales-report-stat-label">Completed sales</span>
              <strong>{money(report.revenue)}</strong>
              <small>{rangeLabel}</small>
            </article>
            <article className="sales-report-stat">
              <span className="sales-report-stat-icon"><ShoppingBag size={19}/></span>
              <span className="sales-report-stat-label">Completed orders</span>
              <strong>{report.completedCount}</strong>
              <small>Orders marked completed</small>
            </article>
            <article className="sales-report-stat">
              <span className="sales-report-stat-icon"><TrendingUp size={19}/></span>
              <span className="sales-report-stat-label">Average order value</span>
              <strong>{money(report.average)}</strong>
              <small>Per completed order</small>
            </article>
            <article className="sales-report-stat">
              <span className="sales-report-stat-icon"><ShoppingBag size={19}/></span>
              <span className="sales-report-stat-label">Orders received</span>
              <strong>{report.orderCount}</strong>
              <small>{report.cancelledCount} cancelled excluded</small>
            </article>
          </div>

          <div className="sales-report-grid">
            <article className="admin-panel sales-report-chart-panel">
              <div className="admin-panel-heading"><div><h2>Sales trend</h2><p>{rangeLabel} · completed order revenue</p></div><span className="sales-report-total">{money(report.revenue)}</span></div>
              {report.chart.some(bucket => bucket.total > 0) ? (
                <div className={`sales-bar-chart ${range === 'all' ? 'monthly' : ''}`} role="img" aria-label={`Sales chart for ${rangeLabel}`}>
                  {report.chart.map(bucket => (
                    <div className="sales-bar-column" key={bucket.key} title={`${bucket.label}: ${money(bucket.total)}`}>
                      <div className="sales-bar-track"><div className="sales-bar-fill" style={{ height: `${Math.max(bucket.total > 0 ? 5 : 0, bucket.total / report.peak * 100)}%` }}/></div>
                      <span>{bucket.label}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="sales-report-empty-chart"><ChartNoAxesCombined size={28}/><strong>No completed sales in this period yet</strong><span>Completed orders will appear here automatically.</span></div>}
              <div className="sales-report-chart-foot"><span><i/> Sales by {range === 'all' ? 'month' : 'day'}</span><span>Only completed orders</span></div>
            </article>

            <article className="admin-panel sales-best-sellers">
              <div className="admin-panel-heading"><div><h2>Best sellers</h2><p>Ranked by quantity sold</p></div><Award size={19}/></div>
              {report.bestSellers.length ? <ol>{report.bestSellers.map((product, index) => (
                <li key={product.name}><span className="sales-best-rank">{index + 1}</span><span className="sales-best-name">{product.name}</span><strong>{product.quantity} sold</strong></li>
              ))}</ol> : <div className="sales-report-empty-best"><Coffee size={24}/><strong>No product sales yet</strong><span>Product rankings appear after orders are completed.</span></div>}
            </article>
          </div>

          <div className="sales-report-note">
            <span><strong>Report rules:</strong> Completed orders count toward sales and best sellers. Cancelled orders are excluded. Orders still New, Preparing or Ready are shown in orders received but not yet counted as revenue.</span>
            {lastUpdated && <small>Updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>}
          </div>
        </>
      )}
    </section>
  );
}

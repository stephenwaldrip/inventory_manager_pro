import { useCallback, useEffect, useState } from 'react';
import axios from '../utils/axiosInstance';
import './InventoryReport.css';

export default function InventoryReport() {
  const [report, setReport] = useState(null);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get('/reports/inventory', {
        params: { category, lowStockOnly },
      });
      setReport(data);

      // Build the category list from an unfiltered run only. Seeding it from a
      // filtered response would leave you with a dropdown containing the one
      // category you already picked, and no way back.
      if (category === 'all' && !lowStockOnly) {
        setCategories([...new Set(data.items.map((i) => i.categoryName))].sort());
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not build the report. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [category, lowStockOnly]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !report) return <p className="report-status">Building report…</p>;

  if (error) {
    return (
      <div className="report-status">
        <p>{error}</p>
        <button className="report-btn" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  if (!report) return null;

  const { summary, items, generatedAt, threshold } = report;

  const filterLabel = [
    category === 'all' ? 'All categories' : category,
    lowStockOnly ? `low stock only (under ${threshold})` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="report">
      <div className="report-controls no-print">
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="report-check">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low stock only
        </label>

        <button className="report-btn" onClick={() => window.print()} disabled={loading}>
          Print report
        </button>
      </div>

      <header className="report-header">
        <h1>Inventory Report</h1>
        <p className="report-meta">
          {filterLabel} · Generated {new Date(generatedAt).toLocaleString()}
        </p>
      </header>

      <section className="report-summary">
        <div>
          <strong>{summary.totalMaterials}</strong>
          <span>Materials</span>
        </div>
        <div>
          <strong>{summary.totalUnits}</strong>
          <span>Units on hand</span>
        </div>
        <div>
          <strong>{summary.categoryCount}</strong>
          <span>Categories</span>
        </div>
        <div className={summary.lowStockCount ? 'is-low' : ''}>
          <strong>{summary.lowStockCount}</strong>
          <span>Low stock</span>
        </div>
      </section>

      {items.length === 0 ? (
        <p className="report-empty">
          No materials match these filters. Widen the category or turn off the low stock
          filter to see more.
        </p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Type</th>
              <th>Category</th>
              <th>Location</th>
              <th className="num">Qty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i._id} className={i.isLow ? 'low' : ''}>
                <td>{i.name}</td>
                <td>{i.type}</td>
                <td>{i.categoryName}</td>
                <td>{i.locationName}</td>
                <td className="num">{i.quantity}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total units</td>
              <td className="num">{summary.totalUnits}</td>
            </tr>
          </tfoot>
        </table>
      )}

      <p className="report-footnote">
        Rows marked ! are below the low inventory threshold of {threshold}.
      </p>
    </div>
  );
}
import { useEffect, useState } from 'react';
import './InventoryReport.css';

export default function InventoryReport() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/reports/inventory', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Request failed'))))
      .then(setReport)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <p>{error}</p>;
  if (!report) return <p>Building report…</p>;

  const money = n => `$${n.toFixed(2)}`;

  return (
    <div className="report">
      <div className="no-print">
        <button onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <header className="report-header">
        <h1>Inventory Report</h1>
        <p>Generated {new Date(report.generatedAt).toLocaleString()}</p>
      </header>

      <section className="summary">
        <div><strong>{report.summary.totalItems}</strong><span>Line items</span></div>
        <div><strong>{report.summary.totalUnits}</strong><span>Units on hand</span></div>
        <div><strong>{money(report.summary.totalValue)}</strong><span>Total value</span></div>
        <div><strong>{report.summary.lowStockCount}</strong><span>Low stock</span></div>
      </section>

      <table>
        <thead>
          <tr>
            <th>SKU</th><th>Name</th><th>Category</th>
            <th className="num">Qty</th><th className="num">Unit</th><th className="num">Value</th>
          </tr>
        </thead>
        <tbody>
          {report.items.map(i => (
            <tr key={i._id} className={i.isLow ? 'low' : ''}>
              <td>{i.sku}</td>
              <td>{i.name}</td>
              <td>{i.category}</td>
              <td className="num">{i.quantity}</td>
              <td className="num">{money(i.price || 0)}</td>
              <td className="num">{money(i.value)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5}>Total</td>
            <td className="num">{money(report.summary.totalValue)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
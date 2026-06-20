import { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';

const MaterialsPage = () => {
  const [materials, setMaterials] = useState([]);
  const [newMaterial, setNewMaterial] = useState({
    name: '', type: '', quantity: 0, location: '', notes: ''
  });

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await axiosInstance.get('/materials');
        setMaterials(res.data);
      } catch (err) {
        console.error('Failed to fetch materials:', err);
      }
    };
    fetchMaterials();
  }, []);

  const handleInputChange = (e) => {
    setNewMaterial({ ...newMaterial, [e.target.name]: e.target.value });
  };

  const handleAddMaterial = async () => {
    try {
      const res = await axiosInstance.post('/materials', {
        name: newMaterial.name,
        type: newMaterial.type,
        quantity: Number(newMaterial.quantity),
        location: newMaterial.location,
        notes: newMaterial.notes || ''
      });
      setMaterials((prev) => [...prev, res.data]);
      setNewMaterial({ name: '', type: '', quantity: 0, location: '', notes: '' });
    } catch (err) {
      if (err.response) {
        alert(`Failed: ${err.response.data.message}`);
      } else {
        alert('An error occurred.');
      }
    }
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    flex: 1,
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Materials</h1>
        <p style={{ color: '#64748b', marginTop: '4px' }}>Manage your materials inventory</p>
      </div>

      {/* Add Material Form */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
          Add New Material
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <input style={inputStyle} name="name" value={newMaterial.name} onChange={handleInputChange} placeholder="Material Name" />
          <input style={inputStyle} name="type" value={newMaterial.type} onChange={handleInputChange} placeholder="Material Type" />
          <input style={{ ...inputStyle, flex: 'none', width: '100px' }} name="quantity" type="number" value={newMaterial.quantity} onChange={handleInputChange} placeholder="Qty" />
          <input style={inputStyle} name="location" value={newMaterial.location} onChange={handleInputChange} placeholder="Location ID" />
          <input style={inputStyle} name="notes" value={newMaterial.notes} onChange={handleInputChange} placeholder="Notes" />
          <button
            onClick={handleAddMaterial}
            style={{
              padding: '8px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              {['Name', 'Type', 'Quantity', 'Location', 'Notes'].map((h) => (
                <th key={h} style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid #e2e8f0',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No materials yet. Add one above!
                </td>
              </tr>
            ) : (
              materials.map((mat, i) => (
                <tr key={mat._id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>{mat.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{mat.type}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{mat.quantity}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{mat.location?.name || mat.location || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{mat.notes || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialsPage;
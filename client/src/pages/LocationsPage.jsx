import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';

const LocationsPage = () => {
  const [locations, setLocations] = useState([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const fetchLocations = async () => {
    try {
      const res = await axiosInstance.get('/locations');
      setLocations(res.data);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/locations', { name: newName });
      setNewName('');
      fetchLocations();
    } catch (err) {
      console.error('Failed to add location:', err);
    }
  };

  const startEdit = (loc) => {
    setEditingId(loc._id);
    setEditName(loc.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSave = async (id) => {
    try {
      await axiosInstance.put(`/locations/${id}`, { name: editName });
      setEditingId(null);
      setEditName('');
      fetchLocations();
    } catch (err) {
      console.error('Failed to update location:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/locations/${id}`);
      fetchLocations();
    } catch (err) {
      console.error('Failed to delete location:', err);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
  };

  const btnStyle = (color) => ({
    padding: '8px 16px',
    backgroundColor: color,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  });

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Locations</h1>
        <p style={{ color: '#64748b', marginTop: '4px' }}>Manage your storage locations</p>
      </div>

      {/* Add Form */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
          Add New Location
        </h2>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            type="text"
            placeholder="Location name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <button type="submit" style={btnStyle('#3b82f6')}>+ Add Location</button>
        </form>
      </div>

      {/* Locations List */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 ? (
              <tr>
                <td colSpan="2" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No locations yet. Add one above!
                </td>
              </tr>
            ) : (
              locations.map((loc, i) => (
                <tr key={loc._id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>
                    {editingId === loc._id ? (
                      <input
                        style={inputStyle}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      <span>📍 {loc.name}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                    {editingId === loc._id ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleSave(loc._id)} style={btnStyle('#22c55e')}>Save</button>
                        <button onClick={cancelEdit} style={btnStyle('#94a3b8')}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => startEdit(loc)} style={btnStyle('#3b82f6')}>Edit</button>
                        <button onClick={() => handleDelete(loc._id)} style={btnStyle('#ef4444')}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationsPage;
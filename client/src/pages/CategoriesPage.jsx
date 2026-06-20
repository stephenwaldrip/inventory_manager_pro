import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await axiosInstance.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await axiosInstance.post('/categories', { name: newName });
      setCategories([...categories, res.data]);
      setNewName('');
    } catch (err) {
      console.error('Error creating category:', err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/categories/${id}`);
      setCategories(categories.filter(cat => cat._id !== id));
    } catch (err) {
      console.error('Error deleting category:', err.message);
    }
  };

  const handleEdit = (id, currentName) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleUpdate = async (id) => {
    if (!editingName.trim()) return;
    try {
      const res = await axiosInstance.put(`/categories/${id}`, { name: editingName });
      setCategories(categories.map(cat => (cat._id === id ? res.data : cat)));
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      console.error('Error updating category:', err.message);
    }
  };

  useEffect(() => {
    fetchCategories();
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
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Categories</h1>
        <p style={{ color: '#64748b', marginTop: '4px' }}>Manage your material categories</p>
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
          Add New Category
        </h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            type="text"
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <button type="submit" style={btnStyle('#3b82f6')}>+ Add Category</button>
        </form>
      </div>

      {/* Categories List */}
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
            {categories.length === 0 ? (
              <tr>
                <td colSpan="2" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No categories yet. Add one above!
                </td>
              </tr>
            ) : (
              categories.map((cat, i) => (
                <tr key={cat._id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>
                    {editingId === cat._id ? (
                      <input
                        style={inputStyle}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                      />
                    ) : (
                      <span>🗂️ {cat.name}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                    {editingId === cat._id ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleUpdate(cat._id)} style={btnStyle('#22c55e')}>Save</button>
                        <button onClick={() => setEditingId(null)} style={btnStyle('#94a3b8')}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEdit(cat._id, cat.name)} style={btnStyle('#3b82f6')}>Edit</button>
                        <button onClick={() => handleDelete(cat._id)} style={btnStyle('#ef4444')}>Delete</button>
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

export default CategoriesPage;
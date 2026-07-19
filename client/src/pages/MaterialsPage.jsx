import { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useToast } from '../context/ToastContext';

const MaterialsPage = () => {
  const { toast } = useToast();
  const [materials, setMaterials] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newMaterial, setNewMaterial] = useState({
    name: '', type: '', quantity: 0, location: '', category: '', notes: ''
  });
  const [editingMaterial, setEditingMaterial] = useState(null);

  useEffect(() => {
    fetchMaterials();
    fetchLocations();
    fetchCategories();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await axiosInstance.get('/materials');
      setMaterials(res.data);
    } catch (err) {
      console.error('Failed to fetch materials:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await axiosInstance.get('/locations');
      setLocations(res.data);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axiosInstance.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleInputChange = (e) => {
    setNewMaterial({ ...newMaterial, [e.target.name]: e.target.value });
  };

  const handleAddMaterial = async () => {
    try {
      const res = await axiosInstance.post('/materials', {
        name: newMaterial.name,
        type: newMaterial.type,
        quantity: Number(newMaterial.quantity),
        location: newMaterial.location || undefined,
        category: newMaterial.category || undefined,
        notes: newMaterial.notes || ''
      });
      setMaterials((prev) => [...prev, res.data]);
      setNewMaterial({ name: '', type: '', quantity: 0, location: '', category: '', notes: '' });
      toast.success('Material added.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add material.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    try {
      await axiosInstance.delete(`/materials/${id}`);
      setMaterials((prev) => prev.filter((m) => m._id !== id));
      toast.success('Material deleted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete material.');
    }
  };

  const handleEditSave = async () => {
    try {
      const res = await axiosInstance.put(`/materials/${editingMaterial._id}`, {
        name: editingMaterial.name,
        type: editingMaterial.type,
        quantity: Number(editingMaterial.quantity),
        location: editingMaterial.location?._id || editingMaterial.location || undefined,
        category: editingMaterial.category?._id || editingMaterial.category || undefined,
        notes: editingMaterial.notes || ''
      });
      setMaterials((prev) => prev.map((m) => m._id === res.data._id ? res.data : m));
      setEditingMaterial(null);
      toast.success('Material updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update material.');
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

  const btnStyle = (color) => ({
    padding: '6px 12px',
    backgroundColor: color,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  });

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Materials</h1>
        <p style={{ color: '#64748b', marginTop: '4px' }}>Manage your materials inventory</p>
      </div>

      {/* Add Material Form */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Add New Material</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <input style={inputStyle} name="name" value={newMaterial.name} onChange={handleInputChange} placeholder="Material Name" />
          <input style={inputStyle} name="type" value={newMaterial.type} onChange={handleInputChange} placeholder="Material Type" />
          <input style={{ ...inputStyle, flex: 'none', width: '100px' }} name="quantity" type="number" value={newMaterial.quantity} onChange={handleInputChange} placeholder="Qty" />
          <select style={inputStyle} name="location" value={newMaterial.location} onChange={handleInputChange}>
            <option value="">Select Location</option>
            {locations.map((loc) => (
              <option key={loc._id} value={loc._id}>{loc.name}</option>
            ))}
          </select>
          <select style={inputStyle} name="category" value={newMaterial.category} onChange={handleInputChange}>
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
          <input style={inputStyle} name="notes" value={newMaterial.notes} onChange={handleInputChange} placeholder="Notes" />
          <button onClick={handleAddMaterial} style={{ padding: '8px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            + Add
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {editingMaterial && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', width: '500px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Edit Material</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input style={{ ...inputStyle, flex: 'none' }} placeholder="Name" value={editingMaterial.name} onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })} />
              <input style={{ ...inputStyle, flex: 'none' }} placeholder="Type" value={editingMaterial.type} onChange={(e) => setEditingMaterial({ ...editingMaterial, type: e.target.value })} />
              <input style={{ ...inputStyle, flex: 'none' }} type="number" placeholder="Quantity" value={editingMaterial.quantity} onChange={(e) => setEditingMaterial({ ...editingMaterial, quantity: e.target.value })} />
              <select style={{ ...inputStyle, flex: 'none' }} value={editingMaterial.location?._id || editingMaterial.location || ''} onChange={(e) => setEditingMaterial({ ...editingMaterial, location: e.target.value })}>
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>{loc.name}</option>
                ))}
              </select>
              <select style={{ ...inputStyle, flex: 'none' }} value={editingMaterial.category?._id || editingMaterial.category || ''} onChange={(e) => setEditingMaterial({ ...editingMaterial, category: e.target.value })}>
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              <input style={{ ...inputStyle, flex: 'none' }} placeholder="Notes" value={editingMaterial.notes || ''} onChange={(e) => setEditingMaterial({ ...editingMaterial, notes: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={handleEditSave} style={btnStyle('#22c55e')}>Save</button>
              <button onClick={() => setEditingMaterial(null)} style={btnStyle('#94a3b8')}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              {['Name', 'Type', 'Quantity', 'Location', 'Category', 'Notes', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No materials yet. Add one above!
                </td>
              </tr>
            ) : (
              materials.map((mat, i) => (
                <tr key={mat._id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>{mat.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{mat.type}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{mat.quantity}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{mat.location?.name || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{mat.category?.name || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{mat.notes || '—'}</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setEditingMaterial(mat)} style={btnStyle('#3b82f6')}>Edit</button>
                      <button onClick={() => handleDelete(mat._id)} style={btnStyle('#ef4444')}>Delete</button>
                    </div>
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

export default MaterialsPage;
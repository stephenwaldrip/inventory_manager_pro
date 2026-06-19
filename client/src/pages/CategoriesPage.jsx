import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const res = await axios.post('/api/categories', { name: newName });
      setCategories([...categories, res.data]);
      setNewName('');
    } catch (err) {
      console.error('Error creating category:', err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/categories/${id}`);
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
      const res = await axios.put(`/api/categories/${id}`, { name: editingName });
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

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Categories</h2>

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="border p-2 flex-1"
          required
        />
        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat._id} className="flex justify-between items-center border p-2">
            {editingId === cat._id ? (
              <>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="border p-1 flex-1 mr-2"
                />
                <button
                  onClick={() => handleUpdate(cat._id)}
                  className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span>{cat.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(cat._id, cat.name)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cat._id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoriesPage;

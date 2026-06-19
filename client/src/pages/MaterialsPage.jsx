import { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';

const MaterialsPage = () => {
  const [materials, setMaterials] = useState([]);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    type: '',
    quantity: 0,
    location: '',
    notes: '' // ✅ added
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
      setNewMaterial({
        name: '',
        type: '',
        quantity: 0,
        location: '',
        notes: ''
      });
    } catch (err) {
      if (err.response) {
        console.error('Failed to add material:', err.response.data);
        alert(`Failed: ${err.response.data.message}`);
      } else {
        console.error('Error:', err);
        alert('An error occurred.');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📦 Materials Inventory</h1>
      </div>

      {/* Add Material Form */}
      <div className="mb-6 p-4 border rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Add New Material</h2>
        <div className="flex flex-wrap gap-4">
          <input
            name="name"
            value={newMaterial.name}
            onChange={handleInputChange}
            placeholder="Material Name"
            className="border p-2 flex-1"
          />
          <input
            name="type"
            value={newMaterial.type}
            onChange={handleInputChange}
            placeholder="Material Type"
            className="border p-2 flex-1"
          />
          <input
            name="quantity"
            type="number"
            value={newMaterial.quantity}
            onChange={handleInputChange}
            placeholder="Quantity"
            className="border p-2 w-32"
          />
          <input
            name="location"
            value={newMaterial.location}
            onChange={handleInputChange}
            placeholder="Location ID"
            className="border p-2 flex-1"
          />
          <input
            name="notes"
            value={newMaterial.notes}
            onChange={handleInputChange}
            placeholder="Notes"
            className="border p-2 flex-1"
          />
          <button
            onClick={handleAddMaterial}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Table Display */}
      <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100 text-left text-gray-600 text-sm uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 border-b">Name</th>
              <th className="px-4 py-3 border-b">Type</th>
              <th className="px-4 py-3 border-b">Quantity</th>
              <th className="px-4 py-3 border-b">Location</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((mat) => (
              <tr key={mat._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 border-b">{mat.name}</td>
                <td className="px-4 py-3 border-b">{mat.type}</td>
                <td className="px-4 py-3 border-b">{mat.quantity}</td>
                <td className="px-4 py-3 border-b">{mat.location?.name || mat.location || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialsPage;

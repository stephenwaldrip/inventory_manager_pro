// server/controllers/userController.js
import User from '../models/User.js';

export const getUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.status(200).json(users);
};

export const createUser = async (req, res) => {
  const { email, password, role } = req.body;
  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ message: 'User already exists' });

  const user = await User.create({ email, password, role });
  res.status(201).json({ message: 'User created', user });
};

export const deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.status(200).json({ message: 'User deleted' });
};

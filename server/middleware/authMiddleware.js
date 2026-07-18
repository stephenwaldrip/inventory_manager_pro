import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      // Block suspended/deactivated accounts even with a still-valid token.
      if (req.user.active === false) {
        return res.status(403).json({ message: 'Account is suspended' });
      }
      // Every authenticated request carries the caller's org. Read it from the
      // user record (not the token) so a stale token can't outlive a move.
      if (!req.user.tenantId) {
        return res.status(403).json({ message: 'No organization assigned' });
      }
      req.tenantId = req.user.tenantId;

      next();
    } catch (err) {
      console.error('Auth error:', err.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && ['admin', 'superadmin'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Admin access only' });
  }
};

export const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ message: 'Super Admin access only' });
  }
};
const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  // Check header for token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user id to request
    req.user = { id: decoded.id };
    
    next();
  } catch (error) {
    console.error('JWT Verification error:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protect };

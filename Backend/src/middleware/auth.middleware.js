// Middleware to ensure user is logged in
export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Middleware to ensure only users with role 'host' can perform host-specific actions
export const requireHost = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const role = req.session.user?.userType;
  if (role !== "host") {
    return res.status(403).json({
      message: "Access denied. Host permissions required.",
    });
  }

  next();
};

// Middleware to ensure only users with role 'superadmin' can access
export const requireSuperAdmin = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.session.user?.userType !== "superadmin") {
    return res.status(403).json({
      message: "Access denied. Super Admin privileges required.",
    });
  }

  next();
};

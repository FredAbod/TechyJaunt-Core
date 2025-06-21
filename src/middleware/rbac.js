const roleBasedAccess = (roles) => {
  return function (req, res, next) {
    // Check if user is authenticated and has a role
    if (!req.user || !req.user.role) {
      return res.status(403).json({ 
        status: "error",
        message: "Access denied: User role not found" 
      });
    }

    if (roles.includes(req.user.role)) {
      console.log(`Access granted for role: ${req.user.role}`);
      next();
    } else {
      return res.status(403).json({ 
        status: "error",
        message: `Access denied: Required roles: ${roles.join(', ')}. Your role: ${req.user.role}` 
      });
    }
  };
};

export default roleBasedAccess;

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// For screens only an ADMIN may open (Bulk Imports). Must sit inside
// <ProtectedRoute>, which has already waited for the session to load. The
// backend rejects these calls for other roles anyway; this just avoids
// showing a counsellor a page full of permission errors.
const AdminRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

export default AdminRoute;

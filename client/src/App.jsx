import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Chatbot from './components/Chatbot';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminDistributors from './pages/admin/Distributors';
import AdminProducts from './pages/admin/Products';
import AdminStock from './pages/admin/Stock';
import AdminCustomers from './pages/admin/Customers';
import AdminOrders from './pages/admin/Orders';
import AdminComplaints from './pages/admin/Complaints';

// Distributor Pages
import DistributorDashboard from './pages/distributor/Dashboard';
import DistributorStock from './pages/distributor/Stock';
import DistributorCustomers from './pages/distributor/Customers';
import DistributorOrders from './pages/distributor/Orders';
import DistributorStatement from './pages/distributor/Statement';
import DistributorProfile from './pages/distributor/Profile';

// Customer Pages
import CustomerDashboard from './pages/customer/Dashboard';
import BookRation from './pages/customer/BookRation';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import PaymentSuccess from './pages/customer/PaymentSuccess';
import MyRation from './pages/customer/MyRation';
import OrderDetail from './pages/customer/OrderDetail';
import Complaints from './pages/customer/Complaints';
import CustomerProfile from './pages/customer/Profile';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <>
      <Routes>
        <Route path="/" element={user ? <Navigate to={`/${user.role}/dashboard`} /> : <Home />} />
        <Route path="/login" element={user ? <Navigate to={`/${user.role}/dashboard`} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/customer/dashboard" /> : <Register />} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/distributors" element={<ProtectedRoute role="admin"><AdminDistributors /></ProtectedRoute>} />
        <Route path="/admin/products" element={<ProtectedRoute role="admin"><AdminProducts /></ProtectedRoute>} />
        <Route path="/admin/stock" element={<ProtectedRoute role="admin"><AdminStock /></ProtectedRoute>} />
        <Route path="/admin/customers" element={<ProtectedRoute role="admin"><AdminCustomers /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute role="admin"><AdminOrders /></ProtectedRoute>} />
        <Route path="/admin/complaints" element={<ProtectedRoute role="admin"><AdminComplaints /></ProtectedRoute>} />

        {/* Distributor Routes */}
        <Route path="/distributor/dashboard" element={<ProtectedRoute role="distributor"><DistributorDashboard /></ProtectedRoute>} />
        <Route path="/distributor/stock" element={<ProtectedRoute role="distributor"><DistributorStock /></ProtectedRoute>} />
        <Route path="/distributor/customers" element={<ProtectedRoute role="distributor"><DistributorCustomers /></ProtectedRoute>} />
        <Route path="/distributor/orders" element={<ProtectedRoute role="distributor"><DistributorOrders /></ProtectedRoute>} />
        <Route path="/distributor/statement" element={<ProtectedRoute role="distributor"><DistributorStatement /></ProtectedRoute>} />
        <Route path="/distributor/profile" element={<ProtectedRoute role="distributor"><DistributorProfile /></ProtectedRoute>} />

        {/* Customer Routes */}
        <Route path="/customer/dashboard" element={<ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/customer/book-ration" element={<ProtectedRoute role="customer"><BookRation /></ProtectedRoute>} />
        <Route path="/customer/cart" element={<ProtectedRoute role="customer"><Cart /></ProtectedRoute>} />
        <Route path="/customer/checkout" element={<ProtectedRoute role="customer"><Checkout /></ProtectedRoute>} />
        <Route path="/customer/payment-success" element={<ProtectedRoute role="customer"><PaymentSuccess /></ProtectedRoute>} />
        <Route path="/customer/my-ration" element={<ProtectedRoute role="customer"><MyRation /></ProtectedRoute>} />
        <Route path="/customer/orders/:id" element={<ProtectedRoute role="customer"><OrderDetail /></ProtectedRoute>} />
        <Route path="/customer/complaints" element={<ProtectedRoute role="customer"><Complaints /></ProtectedRoute>} />
        <Route path="/customer/profile" element={<ProtectedRoute role="customer"><CustomerProfile /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Floating AI chatbot — visible on all authenticated pages */}
      <Chatbot />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
    </AuthProvider>
  );
}
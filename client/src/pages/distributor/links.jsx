import { FiHome, FiPackage, FiUsers, FiShoppingCart, FiFileText, FiUser } from 'react-icons/fi';

export const distributorLinks = [
  { href: '/distributor/dashboard', label: 'Dashboard', icon: <FiHome /> },
  { href: '/distributor/stock', label: 'My Stock', icon: <FiPackage /> },
  { href: '/distributor/customers', label: 'Customers', icon: <FiUsers /> },
  { href: '/distributor/orders', label: 'Orders', icon: <FiShoppingCart /> },
  { href: '/distributor/statement', label: 'Statement', icon: <FiFileText /> },
  { href: '/distributor/profile', label: 'My Profile', icon: <FiUser /> },
];

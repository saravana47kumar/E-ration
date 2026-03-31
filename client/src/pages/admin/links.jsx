/**
 * links.jsx — Admin sidebar navigation
 * client/src/pages/admin/links.jsx
 */

import { FiHome, FiTruck, FiPackage, FiShoppingCart, FiUsers, FiAlertCircle, FiSend, FiCheckCircle, FiBarChart2 } from 'react-icons/fi';
import { MdDashboard, MdInventory, MdFamilyRestroom, MdVerified } from 'react-icons/md';

export const adminLinks = [
  { href: '/admin/dashboard',    label: 'Dashboard',        icon: <MdDashboard /> },
  { href: '/admin/distributors', label: 'Distributors',     icon: <FiTruck /> },
  { href: '/admin/products',     label: 'Products',         icon: <FiPackage /> },
  { href: '/admin/stock',        label: 'Stock Management', icon: <MdInventory /> },
  { href: '/admin/customers',    label: 'Customers',        icon: <FiUsers /> },
  { href: '/admin/orders',       label: 'Orders',           icon: <FiShoppingCart /> },
  { href: '/admin/complaints',   label: 'Complaints',       icon: <FiAlertCircle /> },
  { href: '/admin/ration-cards', label: 'Ration Cards',     icon: <MdFamilyRestroom /> },
  { href: '/admin/documents',    label: 'Documents',        icon: <MdVerified /> },
  { href: '/admin/offers',       label: 'Offers',           icon: <FiSend /> },
  { href: '/admin/refunds',      label: 'Refunds',          icon: <FiCheckCircle /> },
  { href: '/admin/reports',      label: 'Reports',          icon: <FiBarChart2 /> },
];
/**
 * links.jsx — Customer sidebar navigation
 * client/src/pages/customer/links.jsx
 */

import {
  FiHome, FiShoppingBag, FiShoppingCart,
  FiList, FiAlertCircle, FiUser, FiCreditCard, FiFolder,
} from 'react-icons/fi';

export const customerLinks = [
  { href: '/customer/dashboard',   label: 'Dashboard',   icon: <FiHome /> },
  { href: '/customer/book-ration', label: 'Book Ration', icon: <FiShoppingBag /> },
  { href: '/customer/cart',        label: 'My Cart',     icon: <FiShoppingCart /> },
  { href: '/customer/my-ration',   label: 'My Ration',   icon: <FiList /> },
  { href: '/customer/ration-card', label: 'Ration Card', icon: <FiCreditCard /> },
  { href: '/customer/documents',   label: 'My Documents', icon: <FiFolder /> },
  { href: '/customer/complaints',  label: 'Complaints',  icon: <FiAlertCircle /> },
  { href: '/customer/profile',     label: 'My Profile',  icon: <FiUser /> },
];
import { FiHome, FiShoppingBag, FiShoppingCart, FiList, FiAlertCircle, FiUser } from 'react-icons/fi';

export const customerLinks = [
  { href: '/customer/dashboard', label: 'Dashboard', icon: <FiHome /> },
  { href: '/customer/book-ration', label: 'Book Ration', icon: <FiShoppingBag /> },
  { href: '/customer/cart', label: 'My Cart', icon: <FiShoppingCart /> },
  { href: '/customer/my-ration', label: 'My Ration', icon: <FiList /> },
  { href: '/customer/complaints', label: 'Complaints', icon: <FiAlertCircle /> },
  { href: '/customer/profile', label: 'My Profile', icon: <FiUser /> },
];

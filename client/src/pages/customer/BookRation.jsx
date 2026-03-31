import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { customerLinks } from './links';
import { useCart } from '../../context/CartContext';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { FiShoppingCart, FiPlus, FiMinus } from 'react-icons/fi';

const categories = ['All', 'Rice', 'Wheat', 'Sugar', 'Oil', 'Kerosene', 'Pulses', 'Other'];

export default function BookRation() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [qty, setQty] = useState({});
  const { addToCart, cartCount } = useCart();

  useEffect(() => {
    setLoading(true);
    setError('');
    API.get('/customer/products')
      .then(({ data }) => {
        setProducts(data.products || []);
        const initial = {};
        (data.products || []).forEach(p => { initial[p._id] = p.minOrderQty || 1; });
        setQty(initial);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load products');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? products : products.filter(p => p.category === filter);

  const handleAdd = (product) => {
    if (product.availableStock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    addToCart(product, qty[product._id] || 1);
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={customerLinks} role="customer" />
      <main className="flex-1 p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Book Your Ration</h1>
            <p className="text-gray-500 text-sm mt-1">Select items and add to cart</p>
          </div>
          <Link to="/customer/cart" className="btn-primary flex items-center gap-2">
            <FiShoppingCart /> Cart ({cartCount})
          </Link>
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === cat ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            <p className="text-gray-400 text-sm">Loading products...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-red-500 font-medium mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-500 font-medium">No products found</p>
            <p className="text-gray-400 text-sm mt-1">
              {products.length === 0
                ? 'Admin has not added any products yet.'
                : `No products in "${filter}" category.`}
            </p>
            {filter !== 'All' && (
              <button onClick={() => setFilter('All')} className="btn-secondary mt-4">Show All</button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => {
              const outOfStock = p.availableStock <= 0;
              return (
                <div key={p._id} className={`card hover:shadow-md transition-shadow relative ${outOfStock ? 'opacity-75' : ''}`}>
                  {outOfStock && (
                    <div className="absolute top-3 right-3 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      Out of Stock
                    </div>
                  )}
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-36 object-cover rounded-lg mb-3" />
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg mb-3 flex items-center justify-center text-4xl">
                      {p.category === 'Rice' ? '🌾' : p.category === 'Wheat' ? '🌿' : p.category === 'Sugar' ? '🍬' : p.category === 'Oil' ? '🫙' : '📦'}
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">
                    {p.category} •{' '}
                    {outOfStock
                      ? <span className="text-red-400 font-medium">Out of stock</span>
                      : <span className="text-green-600">{p.availableStock} {p.unit} available</span>
                    }
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-primary-600 text-lg">
                      ₹{p.price}<span className="text-xs font-normal text-gray-400">/{p.unit}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      disabled={outOfStock}
                      onClick={() => setQty(q => ({ ...q, [p._id]: Math.max(p.minOrderQty || 1, (q[p._id] || 1) - 1) }))}
                      className="w-8 h-8 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <FiMinus className="text-sm" />
                    </button>
                    <span className="flex-1 text-center font-medium">{qty[p._id] || 1} {p.unit}</span>
                    <button
                      disabled={outOfStock}
                      onClick={() => setQty(q => ({ ...q, [p._id]: Math.min(p.maxOrderQty || 10, (q[p._id] || 1) + 1) }))}
                      className="w-8 h-8 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <FiPlus className="text-sm" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleAdd(p)}
                    disabled={outOfStock}
                    className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiShoppingCart />
                    {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
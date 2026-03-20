import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { customerLinks } from './links';
import { useCart } from '../../context/CartContext';
import { FiTrash2, FiPlus, FiMinus, FiShoppingBag } from 'react-icons/fi';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={customerLinks} role="customer" />
      <main className="flex-1 p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Cart</h1>
          {cart.length > 0 && <button onClick={clearCart} className="text-sm text-red-600 hover:text-red-700 font-medium">Clear Cart</button>}
        </div>
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Add ration items to get started</p>
            <Link to="/customer/book-ration" className="btn-primary inline-flex items-center gap-2"><FiShoppingBag /> Browse Rations</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {cart.map(item => (
                <div key={item._id} className="card flex items-center gap-4">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-green-50 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">₹{item.price}/{item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item._id, item.quantity - 1)} className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center">
                      <FiMinus className="text-xs" />
                    </button>
                    <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item._id, item.quantity + 1)} className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center">
                      <FiPlus className="text-xs" />
                    </button>
                  </div>
                  <div className="text-right w-20">
                    <p className="font-bold text-primary-600">₹{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                  <button onClick={() => removeFromCart(item._id)} className="text-red-400 hover:text-red-600 transition-colors ml-2">
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
            <div className="lg:col-span-1">
              <div className="card sticky top-6">
                <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-2 mb-4">
                  {cart.map(item => (
                    <div key={item._id} className="flex justify-between text-sm text-gray-600">
                      <span>{item.name} × {item.quantity}</span>
                      <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary-600">₹{cartTotal.toLocaleString()}</span>
                  </div>
                </div>
                <Link to="/customer/checkout" className="btn-primary w-full py-3 text-center block">
                  Proceed to Checkout
                </Link>
                <Link to="/customer/book-ration" className="btn-secondary w-full py-3 text-center block mt-3">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

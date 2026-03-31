import { useState, useEffect } from 'react';
import API from '../utils/api';
import { FiClock, FiGlobe, FiSmartphone, FiMonitor } from 'react-icons/fi';

export default function LoginHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/auth/login-history')
      .then(({ data }) => setHistory(data.history))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getDeviceIcon = (type) => {
    switch(type) {
      case 'mobile': return <FiSmartphone className="text-blue-500" />;
      case 'tablet': return <FiMonitor className="text-green-500" />;
      default: return <FiMonitor className="text-gray-500" />;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <FiClock className="text-orange-500" />
        <h2 className="font-bold text-gray-900">Login History</h2>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" /></div>
      ) : history.length === 0 ? (
        <p className="text-center text-gray-400 py-6">No login records found</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {history.map((item, i) => (
            <div key={item._id || i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="mt-0.5">{getDeviceIcon(item.deviceType)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(item.loginAt).toLocaleString()}
                  </span>
                  {item.logoutAt && (
                    <span className="text-xs text-gray-400">
                      Logout: {new Date(item.logoutAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <FiGlobe size={10} /> {item.ipAddress || 'IP not recorded'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{item.userAgent}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
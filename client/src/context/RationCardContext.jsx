
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const RationCardContext = createContext();

export const RationCardProvider = ({ children }) => {
  const [card,     setCard]     = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const fetchCard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/ration-card/me');
      setCard(data.card);
      // Only fetch requests when a card actually exists
      try {
        const req = await API.get('/ration-card/members/requests');
        setRequests(req.data.requests || []);
      } catch {
        setRequests([]);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setCard(null);    
        setRequests([]);   
      } else {
        setError(err.response?.data?.message || 'Failed to load ration card');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await API.get('/ration-card/members/requests');
      setRequests(data.requests || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  // Create ration card (first-time)
  const createCard = async (formData) => {
    const { data } = await API.post('/ration-card/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setCard(data.card);
    toast.success('Ration card created!');
    return data.card;
  };

  // Submit add/remove request
  // payload can be a plain object OR already a FormData (when file is attached)
  const submitRequest = async (payload) => {
    let body, headers;
    if (payload instanceof FormData) {
      body    = payload;
      headers = { 'Content-Type': 'multipart/form-data' };
    } else {
      body    = payload;
      headers = {};
    }
    const { data } = await API.post('/ration-card/members/request', body, { headers });
    toast.success('Request submitted for admin approval.');
    await fetchRequests();
    return data.request;
  };

  const refetch = () => { fetchCard(); fetchRequests(); };

  return (
    <RationCardContext.Provider value={{
      card, requests, loading, error,
      createCard, submitRequest, refetch,
    }}>
      {children}
    </RationCardContext.Provider>
  );
};

export const useRationCard = () => useContext(RationCardContext);
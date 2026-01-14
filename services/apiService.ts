/**
 * API Service - Handle all backend API calls
 * Supports both MongoDB (production) and localStorage (fallback)
 */

const API_BASE = '/api';

// Check if running in production with MongoDB
const useBackend = () => {
  // Check if MONGODB_URI is configured (will be available via environment)
  return typeof window !== 'undefined' &&
         (window.location.hostname.includes('vercel.app') ||
          window.location.hostname.includes('yourdomain.com'));
};

// ==================== TRANSACTIONS ====================

export const fetchTransactions = async (): Promise<any[]> => {
  if (!useBackend()) {
    // Fallback to localStorage
    const saved = localStorage.getItem('resort_finance_v4');
    return saved ? JSON.parse(saved) : [];
  }

  try {
    const response = await fetch(`${API_BASE}/transactions`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    // Fallback to localStorage on error
    const saved = localStorage.getItem('resort_finance_v4');
    return saved ? JSON.parse(saved) : [];
  }
};

export const createTransaction = async (transaction: any): Promise<any> => {
  if (!useBackend()) {
    // Store in localStorage only
    const saved = localStorage.getItem('resort_finance_v4');
    const transactions = saved ? JSON.parse(saved) : [];
    const newTx = { ...transaction, id: `TX${Date.now()}` };
    transactions.unshift(newTx);
    localStorage.setItem('resort_finance_v4', JSON.stringify(transactions));
    return newTx;
  }

  try {
    const response = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction)
    });
    if (!response.ok) throw new Error('Failed to create transaction');
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

export const updateTransaction = async (id: string, updates: any): Promise<void> => {
  if (!useBackend()) {
    const saved = localStorage.getItem('resort_finance_v4');
    if (saved) {
      const transactions = JSON.parse(saved);
      const index = transactions.findIndex((t: any) => t.id === id);
      if (index !== -1) {
        transactions[index] = { ...transactions[index], ...updates };
        localStorage.setItem('resort_finance_v4', JSON.stringify(transactions));
      }
    }
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/transactions?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update transaction');
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  if (!useBackend()) {
    const saved = localStorage.getItem('resort_finance_v4');
    if (saved) {
      const transactions = JSON.parse(saved);
      const filtered = transactions.filter((t: any) => t.id !== id);
      localStorage.setItem('resort_finance_v4', JSON.stringify(filtered));
    }
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/transactions?id=${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete transaction');
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

// ==================== BOOKINGS ====================

export const fetchBookings = async (): Promise<any[]> => {
  if (!useBackend()) {
    const saved = localStorage.getItem('resort_bookings_v4');
    return saved ? JSON.parse(saved) : [];
  }

  try {
    const response = await fetch(`${API_BASE}/bookings`);
    if (!response.ok) throw new Error('Failed to fetch bookings');
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching bookings:', error);
    const saved = localStorage.getItem('resort_bookings_v4');
    return saved ? JSON.parse(saved) : [];
  }
};

export const createBooking = async (booking: any): Promise<any> => {
  if (!useBackend()) {
    const saved = localStorage.getItem('resort_bookings_v4');
    const bookings = saved ? JSON.parse(saved) : [];
    const newBooking = { ...booking, id: `BK${Date.now()}` };
    bookings.unshift(newBooking);
    localStorage.setItem('resort_bookings_v4', JSON.stringify(bookings));
    return newBooking;
  }

  try {
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking)
    });
    if (!response.ok) throw new Error('Failed to create booking');
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

export const updateBooking = async (id: string, updates: any): Promise<void> => {
  if (!useBackend()) {
    const saved = localStorage.getItem('resort_bookings_v4');
    if (saved) {
      const bookings = JSON.parse(saved);
      const index = bookings.findIndex((b: any) => b.id === id);
      if (index !== -1) {
        bookings[index] = { ...bookings[index], ...updates };
        localStorage.setItem('resort_bookings_v4', JSON.stringify(bookings));
      }
    }
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/bookings?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update booking');
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
};

export const deleteBooking = async (id: string): Promise<void> => {
  if (!useBackend()) {
    const saved = localStorage.getItem('resort_bookings_v4');
    if (saved) {
      const bookings = JSON.parse(saved);
      const filtered = bookings.filter((b: any) => b.id !== id);
      localStorage.setItem('resort_bookings_v4', JSON.stringify(filtered));
    }
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/bookings?id=${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete booking');
  } catch (error) {
    console.error('Error deleting booking:', error);
    throw error;
  }
};

// ==================== SYNC DATA ====================

export const syncAllData = async (data: {
  transactions: any[];
  bookings: any[];
  settings: any;
}): Promise<boolean> => {
  if (!useBackend()) {
    // Store in localStorage
    localStorage.setItem('resort_finance_v4', JSON.stringify(data.transactions));
    localStorage.setItem('resort_bookings_v4', JSON.stringify(data.bookings));
    localStorage.setItem('resort_settings_v4', JSON.stringify(data.settings));
    return true;
  }

  try {
    const response = await fetch(`${API_BASE}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        lastSync: new Date().toISOString()
      })
    });
    if (!response.ok) throw new Error('Failed to sync data');
    return true;
  } catch (error) {
    console.error('Error syncing data:', error);
    return false;
  }
};

export const loadAllData = async (): Promise<any | null> => {
  if (!useBackend()) {
    return {
      transactions: JSON.parse(localStorage.getItem('resort_finance_v4') || '[]'),
      bookings: JSON.parse(localStorage.getItem('resort_bookings_v4') || '[]'),
      settings: JSON.parse(localStorage.getItem('resort_settings_v4') || '{}')
    };
  }

  try {
    const response = await fetch(`${API_BASE}/data`);
    if (!response.ok) throw new Error('Failed to load data');
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error loading data:', error);
    return null;
  }
};

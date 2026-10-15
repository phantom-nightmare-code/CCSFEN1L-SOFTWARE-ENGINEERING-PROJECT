import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Adjust path if needed
import { supabase } from '../lib/supabaseClient'; // Adjust path if needed

// Note: If SummaryCard or other components are imported here, 
// you can remove their imports if they are no longer used anywhere else in this file.

export default function Profile() {
  const { user, isAdmin } = useAuth(); // Assuming you have an auth context
  const navigate = useNavigate();
  
  // State for user data and tabs
  const [tab, setTab] = useState('overview');
  const [activeMembership, setActiveMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [rentals, setRentals] = useState([]);

  // Determine if the current user is a coach
  const isCoach = user?.role === 'coach';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch user data (memberships, transactions, rentals)
    const fetchData = async () => {
      setLoading(true);
      
      // TODO: Replace this with your actual Supabase fetch logic
      // Example:
      // const { data: membershipData } = await supabase.from('memberships').select('*').eq('user_id', user.id).eq('status', 'active').single();
      // setActiveMembership(membershipData);
      
      setLoading(false);
    };

    fetchData();
  }, [user, navigate]);

  if (loading) return <div className="p-8 text-center">Loading profile...</div>;
  if (!user) return null;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{user.full_name || user.email}</h1>
          <p className="text-gray-500">{user.email}</p>
        </div>
        
        {/* Membership Status Badge Removed */}
        {/* Previously: {!isAdmin && activeMembership && <span>ACTIVE</span>} */}
        
      </div>

      {/* Active Membership Banner Removed */}
      {/* Previously: {!isAdmin && activeMembership && <div>...banner content...</div>} */}

      {/* Admin Note (Kept for admins only) */}
      {isAdmin && (
        <div className="bg-blue-100 text-blue-800 p-4 rounded-lg mb-6">
          You are logged in as an Administrator.
        </div>
      )}

      {/* Summary Cards Removed */}
      {/* Previously: <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">...</div> */}

      {/* --- TABS NAVIGATION --- */}
      <div className="flex space-x-4 border-b mb-6">
        {['overview', 'transactions', 'memberships', 'rentals'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 capitalize ${
              tab === t ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* --- TAB CONTENT --- */}
      
      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Membership Panel Removed */}
          {/* Previously: {!isAdmin && user?.role !== 'coach' && (activeMembership ? (...) : (...))} */}
          
          {/* Other Overview Content */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Account Information</h3>
            <p><strong>Name:</strong> {user.full_name || 'N/A'}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role || 'Member'}</p>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
          {transactions.length > 0 ? (
            <ul>{/* Map your transactions here */}</ul>
          ) : (
            <p className="text-gray-500">No transactions found.</p>
          )}
        </div>
      )}

      {/* Memberships Tab */}
      {tab === 'memberships' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Membership History</h3>
          {/* If you want to hide this for coaches as well, add: {!isCoach && (...)} */}
          <p className="text-gray-500">Membership details go here.</p>
        </div>
      )}

      {/* Rentals Tab */}
      {tab === 'rentals' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Rental History</h3>
          {rentals.length > 0 ? (
            <ul>{/* Map your rentals here */}</ul>
          ) : (
            <p className="text-gray-500">No active rentals.</p>
          )}
        </div>
      )}
    </div>
  );
}

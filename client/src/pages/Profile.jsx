import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Adjust path if needed
import { supabase } from '../lib/supabaseClient'; // Adjust path if needed

// Keep your SummaryCard import if you have it
// import SummaryCard from '../components/SummaryCard'; 

export default function Profile() {
  const { user, isAdmin } = useAuth(); 
  const navigate = useNavigate();
  
  const [tab, setTab] = useState('overview');
  const [activeMembership, setActiveMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [rentals, setRentals] = useState([]);

  // 👇 1. CHECK IF THE USER IS A COACH
  const isCoach = user?.role === 'coach';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      // TODO: Your actual fetch logic here
      // const { data } = await supabase.from('memberships').select('*').eq('user_id', user.id)...
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
        
        {/* 👇 2. ONLY SHOW MEMBERSHIP BADGE IF NOT A COACH */}
        {!isAdmin && !isCoach && activeMembership && (
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            ACTIVE MEMBER
          </span>
        )}
      </div>

      {/* 👇 3. ONLY SHOW MEMBERSHIP BANNER IF NOT A COACH */}
      {!isAdmin && !isCoach && activeMembership && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-800">Active Membership</h3>
          <p className="text-blue-600 text-sm">Your membership is active.</p>
        </div>
      )}

      {/* Admin Note (Kept for admins only) */}
      {isAdmin && (
        <div className="bg-blue-100 text-blue-800 p-4 rounded-lg mb-6">
          You are logged in as an Administrator.
        </div>
      )}

      {/* 👇 4. ONLY SHOW SUMMARY CARDS IF NOT A COACH */}
      {!isCoach && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Replace these with your actual SummaryCard components */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">TOTAL SPENT</p>
            <p className="text-green-500 font-bold">₱0.00</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">REFUNDED</p>
            <p className="text-white font-bold">₱0.00</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">TRANSACTIONS</p>
            <p className="text-blue-500 font-bold">0</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">ACTIVE RENTALS</p>
            <p className="text-orange-500 font-bold">0</p>
          </div>
        </div>
      )}

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
          
          {/* 👇 5. ONLY SHOW MEMBERSHIP PANEL IN OVERVIEW IF NOT A COACH */}
          {!isAdmin && !isCoach && (
            activeMembership ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Membership Status</h3>
                <p className="text-gray-600">Your membership is active.</p>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Membership Status</h3>
                <p className="text-gray-600">No active membership. <Link to="/membership" className="text-blue-600 hover:underline">Subscribe</Link></p>
              </div>
            )
          )}
          
          {/* Other Overview Content (Shown to everyone) */}
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
          {!isCoach ? (
             <p className="text-gray-500">Membership details go here.</p>
          ) : (
             <p className="text-gray-500">Coaches do not have membership history.</p>
          )}
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

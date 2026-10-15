import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

// Replace this with your actual backend URL (e.g., http://localhost:5000)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'; 

export default function Profile() {
  const { user, isAdmin, token } = useAuth(); // Ensure your AuthContext provides 'token' for API calls
  const navigate = useNavigate();
  
  const [tab, setTab] = useState('overview');
  const [activeMembership, setActiveMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [rentals, setRentals] = useState([]);

  // State for Coach Details
  const [coachDetails, setCoachDetails] = useState({
    experience_years: 0,
    expertise: ''
  });
  const [isEditingCoach, setIsEditingCoach] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const isCoach = user?.role === 'coach';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      try {
        // 1. Fetch general user data (membership, transactions)
        // TODO: Replace with your actual API endpoints
        // const response = await fetch(`${API_URL}/api/users/${user.id}/data`, { headers: { Authorization: `Bearer ${token}` }});
        // const data = await response.json();
        // setActiveMembership(data.activeMembership);
        // setTransactions(data.transactions);
        // setRentals(data.rentals);

        // 2. Fetch Coach Details if the user is a coach
        if (isCoach) {
          const response = await fetch(`${API_URL}/api/users/${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            setCoachDetails({
              experience_years: data.experience_years || 0,
              expertise: data.expertise || ''
            });
          }
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, navigate, isCoach, token]);

  // Function to save coach details to MySQL backend
  const handleSaveCoachDetails = async () => {
    setSaveLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users/${user.id}/coach-details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(coachDetails)
      });

      if (response.ok) {
        setIsEditingCoach(false);
      } else {
        const errorData = await response.json();
        alert("Error saving details: " + (errorData.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error saving coach details:", error);
      alert("Network error. Please try again.");
    }
    setSaveLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-white">Loading profile...</div>;
  if (!user) return null;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl text-gray-200">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{user.full_name || user.email}</h1>
          <p className="text-gray-400">{user.email}</p>
        </div>
        
        {!isAdmin && !isCoach && activeMembership && (
          <span className="bg-green-900 text-green-300 border border-green-700 px-3 py-1 rounded-full text-sm font-medium">
            ACTIVE MEMBER
          </span>
        )}
      </div>

      {/* --- COACH SPECIFIC INFORMATION SECTION --- */}
      {isCoach && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700 mb-6 border-l-4 border-l-blue-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Coach Information</h3>
            <button 
              onClick={() => setIsEditingCoach(!isEditingCoach)}
              className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              {isEditingCoach ? 'Cancel' : 'Edit Details'}
            </button>
          </div>

          {isEditingCoach ? (
            // EDIT MODE
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400">Years in the Gym</label>
                <input 
                  type="number" 
                  value={coachDetails.experience_years}
                  onChange={(e) => setCoachDetails({...coachDetails, experience_years: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm p-2 border focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Expertise</label>
                <textarea 
                  value={coachDetails.expertise}
                  onChange={(e) => setCoachDetails({...coachDetails, expertise: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm p-2 border focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  rows="3"
                  placeholder="e.g., Weightlifting, Yoga, Nutrition"
                />
              </div>
              <button 
                onClick={handleSaveCoachDetails}
                disabled={saveLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saveLoading ? 'Saving...' : 'Save Coach Details'}
              </button>
            </div>
          ) : (
            // VIEW MODE
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Years in the Gym</p>
                <p className="font-semibold text-lg text-white">{coachDetails.experience_years} years</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Expertise</p>
                <p className="font-semibold text-lg text-white">{coachDetails.expertise || 'Not specified yet'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Membership Banner (Hidden for Coaches) */}
      {!isAdmin && !isCoach && activeMembership && (
        <div className="bg-blue-900 bg-opacity-30 border border-blue-800 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-300">Active Membership</h3>
          <p className="text-blue-400 text-sm">Your membership is active.</p>
        </div>
      )}

      {/* Summary Cards (Hidden for Coaches) */}
      {!isCoach && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Total Spent</p>
            <p className="text-green-400 font-bold text-xl mt-1">₱0.00</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Refunded</p>
            <p className="text-gray-200 font-bold text-xl mt-1">₱0.00</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Transactions</p>
            <p className="text-blue-400 font-bold text-xl mt-1">0</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Active Rentals</p>
            <p className="text-orange-400 font-bold text-xl mt-1">0</p>
          </div>
        </div>
      )}

      {/* --- TABS NAVIGATION --- */}
      <div className="flex space-x-6 border-b border-gray-700 mb-6">
        {['overview', 'transactions', 'memberships', 'rentals'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 capitalize text-sm font-medium transition-colors border-b-2 ${
              tab === t 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
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
          
          {/* Membership Panel (Hidden for Coaches) */}
          {!isAdmin && !isCoach && (
            activeMembership ? (
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Membership Status</h3>
                <p className="text-gray-400">Your membership is active.</p>
              </div>
            ) : (
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Membership Status</h3>
                <p className="text-gray-400">No active membership. <Link to="/membership" className="text-blue-400 hover:underline">Subscribe</Link></p>
              </div>
            )
          )}
          
          {/* Account Info (Shown to everyone) */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
            <div className="space-y-3">
              <p className="text-gray-300"><strong className="text-gray-400 w-24 inline-block">Name:</strong> {user.full_name || 'N/A'}</p>
              <p className="text-gray-300"><strong className="text-gray-400 w-24 inline-block">Email:</strong> {user.email}</p>
              <p className="text-gray-300"><strong className="text-gray-400 w-24 inline-block">Role:</strong> <span className="capitalize">{user.role || 'Member'}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
          {transactions.length > 0 ? (
            <ul className="space-y-2">{/* Map your transactions here */}</ul>
          ) : (
            <p className="text-gray-400">No transactions found.</p>
          )}
        </div>
      )}

      {/* Memberships Tab */}
      {tab === 'memberships' && (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Membership History</h3>
          {!isCoach ? (
             <p className="text-gray-400">Membership details go here.</p>
          ) : (
             <p className="text-gray-400">Coaches do not have membership history.</p>
          )}
        </div>
      )}

      {/* Rentals Tab */}
      {tab === 'rentals' && (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Rental History</h3>
          {rentals.length > 0 ? (
            <ul className="space-y-2">{/* Map your rentals here */}</ul>
          ) : (
            <p className="text-gray-400">No active rentals.</p>
          )}
        </div>
      )}
    </div>
  );
}

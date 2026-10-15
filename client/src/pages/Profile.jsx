import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

// Define your backend API URL here (e.g., http://localhost:5000)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'; 

export default function Profile() {
  const { user, isAdmin, token } = useAuth(); // Assuming your auth context provides a token
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
        // Fetch general profile data (transactions, memberships, etc.)
        // Replace this with your actual backend fetch logic
        // const response = await fetch(`${API_URL}/api/users/${user.id}`, { headers: { Authorization: `Bearer ${token}` }});
        // const data = await response.json();
        // setActiveMembership(data.activeMembership);
        // setTransactions(data.transactions);

        // Fetch Coach Details if the user is a coach
        if (isCoach) {
          const response = await fetch(`${API_URL}/api/users/${user.id}`, {
            headers: {
              'Authorization': `Bearer ${token}` // Include auth token if your API requires it
            }
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

  // Function to save coach details to MySQL
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
        
        {!isAdmin && !isCoach && activeMembership && (
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            ACTIVE MEMBER
          </span>
        )}
      </div>

      {/* --- COACH SPECIFIC INFORMATION SECTION --- */}
      {isCoach && (
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 border-l-4 border-l-blue-600">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Coach Information</h3>
            <button 
              onClick={() => setIsEditingCoach(!isEditingCoach)}
              className="text-sm text-blue-600 hover:underline"
            >
              {isEditingCoach ? 'Cancel' : 'Edit Details'}
            </button>
          </div>

          {isEditingCoach ? (
            // EDIT MODE
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Years in the Gym</label>
                <input 
                  type="number" 
                  value={coachDetails.experience_years}
                  onChange={(e) => setCoachDetails({...coachDetails, experience_years: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expertise</label>
                <textarea 
                  value={coachDetails.expertise}
                  onChange={(e) => setCoachDetails({...coachDetails, expertise: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  rows="3"
                  placeholder="e.g., Weightlifting, Yoga, Nutrition"
                />
              </div>
              <button 
                onClick={handleSaveCoachDetails}
                disabled={saveLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saveLoading ? 'Saving...' : 'Save Coach Details'}
              </button>
            </div>
          ) : (
            // VIEW MODE
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Years in the Gym</p>
                <p className="font-semibold text-lg">{coachDetails.experience_years} years</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expertise</p>
                <p className="font-semibold text-lg">{coachDetails.expertise || 'Not specified yet'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Membership Banner (Hidden for Coaches) */}
      {!isAdmin && !isCoach && activeMembership && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-800">Active Membership</h3>
          <p className="text-blue-600 text-sm">Your membership is active.</p>
        </div>
      )}

      {/* Summary Cards (Hidden for Coaches) */}
      {!isCoach && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* ... your existing SummaryCard components ... */}
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
          {/* Membership Panel (Hidden for Coaches) */}
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
          
          {/* Account Info (Shown to everyone) */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Account Information</h3>
            <p><strong>Name:</strong> {user.full_name || 'N/A'}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role || 'Member'}</p>
          </div>
        </div>
      )}

      {/* ... Keep your other tabs (Transactions, Memberships, Rentals) as they were ... */}
      
    </div>
  );
}

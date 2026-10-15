import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

const API_URL = import.meta.env.VITE_API_URL || 'https://fitforge-backend-wey2.onrender.com'; 

export default function Profile() {
  const { user, setUser, isAdmin, token } = useAuth(); 
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  const [coachDetails, setCoachDetails] = useState({
    experience_years: 0,
    expertise: '',
    created_at: null
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const isCoach = user?.role === 'coach';

  // --- BULLETPROOF DATE FORMATTING ---
  const formatDate = (dateString) => {
    // If no date exists in DB, fallback to current date
    if (!dateString) {
      return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    const safeDateString = typeof dateString === 'string' ? dateString.replace(' ', 'T') : dateString;
    const date = new Date(safeDateString);
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    // ✅ Shows exact date (e.g., Oct 15, 2026)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // --- FETCH DATA FROM BACKEND ---
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/users/${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Backend Data Received:", data); 
          
          setCoachDetails({
            experience_years: data.experience_years || 0,
            expertise: data.expertise || '',
            created_at: data.created_at || data.createdAt || null
          });

          if (setUser && data.full_name) {
            setUser(prev => ({ ...prev, full_name: data.full_name }));
          }
        } else {
          const errorText = await response.text();
          console.error(`Failed to fetch profile. Status: ${response.status}. Error: ${errorText}`);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
      setLoading(false);
    };

    fetchData();
  }, [user, navigate, token, setUser]);

  // --- SAVE PROFILE CHANGES ---
  const handleSaveProfile = async () => {
    setSaveLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/${user.id}/coach-details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: user.full_name,
          experience_years: coachDetails.experience_years,
          expertise: coachDetails.expertise
        })
      });

      if (response.ok) {
        setIsEditing(false);
        alert("Profile saved successfully!"); 
      } else {
        // ✅ FIXED: Reading as text instead of JSON so we see the real error
        const errorText = await response.text();
        alert(`Failed to save. Server said: ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Network error. Please try again.");
    } finally {
      // ✅ This ensures the button always un-sticks, even if it fails
      setSaveLoading(false); 
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading profile...</div>;
  if (!user) return null;

  const tabs = isCoach ? ['overview'] : ['overview', 'transactions', 'memberships', 'rentals'];

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl text-gray-200">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-white">
          {user.full_name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{user.full_name || 'User'}</h1>
          <p className="text-gray-400 text-sm">{user.email}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${
            isCoach ? 'bg-blue-600 text-white' : 'bg-yellow-500 text-black'
          }`}>
            {user.role}
          </span>
        </div>
      </div>

      {/* --- SUMMARY CARDS --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {isCoach ? (
          <>
            <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-5">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Years in Gym</p>
              <p className="text-green-400 font-bold text-2xl">{coachDetails.experience_years}</p>
            </div>
            <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-5">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Expertise</p>
              <p className="text-white font-bold text-lg truncate">{coachDetails.expertise || 'Not set'}</p>
            </div>
            <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-5">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Status</p>
              <p className="text-blue-400 font-bold text-2xl">Active</p>
            </div>
            <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-5">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Member Since</p>
              <p className="text-gray-200 font-bold text-2xl">{formatDate(coachDetails.created_at)}</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-5">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total Spent</p>
              <p className="text-green-400 font-bold text-2xl">₱0.00</p>
            </div>
            <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-5">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Transactions</p>
              <p className="text-blue-400 font-bold text-2xl">0</p>
            </div>
            <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-5">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Active Rentals</p>
              <p className="text-orange-400 font-bold text-2xl">0</p>
            </div>
            <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-5">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Member Since</p>
              <p className="text-gray-200 font-bold text-2xl">{formatDate(coachDetails.created_at)}</p>
            </div>
          </>
        )}
      </div>

      {/* --- TABS NAVIGATION --- */}
      <div className="flex space-x-6 border-b border-gray-800 mb-6">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`pb-3 capitalize text-sm font-medium transition-colors border-b-2 ${
              activeTab === t 
                ? 'border-white text-white' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* --- TAB CONTENT --- */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Account Details Card */}
          <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Account Details</h3>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <span className="text-gray-500">Username</span>
                <span className="text-white font-medium">{user.username || '—'}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <span className="text-gray-500">Full Name</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={user.full_name || ''} 
                    onChange={(e) => setUser({...user, full_name: e.target.value})}
                    className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-sm w-1/2 focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <span className="text-white font-medium">{user.full_name || '—'}</span>
                )}
              </div>

              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <span className="text-gray-500">Email</span>
                <span className="text-white font-medium">{user.email}</span>
              </div>

              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <span className="text-gray-500">Role</span>
                <span className="text-white font-medium capitalize">{user.role}</span>
              </div>

              {isCoach && (
                <>
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-gray-500">Years in Gym</span>
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={coachDetails.experience_years} 
                        onChange={(e) => setCoachDetails({...coachDetails, experience_years: e.target.value})}
                        className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-sm w-1/2 focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <span className="text-white font-medium">{coachDetails.experience_years} years</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-gray-500">Expertise</span>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={coachDetails.expertise} 
                        onChange={(e) => setCoachDetails({...coachDetails, expertise: e.target.value})}
                        className="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-sm w-1/2 focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <span className="text-white font-medium">{coachDetails.expertise || '—'}</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {isEditing && (
              <button 
                onClick={handleSaveProfile}
                disabled={saveLoading}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition-colors disabled:opacity-50"
              >
                {saveLoading ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>

          {/* Current Status Card */}
          <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Current Status</h3>
            <div className="space-y-4">
              {isCoach ? (
                <>
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-gray-500">Coach Status</span>
                    <span className="text-green-400 font-medium">Active</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-gray-500">Assigned Classes</span>
                    <span className="text-gray-300">None scheduled</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-gray-500">Member Since</span>
                    <span className="text-white font-medium">{formatDate(coachDetails.created_at)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-gray-500">Membership</span>
                    <span className="text-gray-300">No active membership</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-gray-500">Active Rentals</span>
                    <span className="text-gray-300">None</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-gray-500">Latest Payment</span>
                    <span className="text-white font-medium">₱0.00</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Other tabs for non-coaches */}
      {activeTab === 'transactions' && !isCoach && (
        <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-6 text-center text-gray-500">
          No transactions found.
        </div>
      )}
      {activeTab === 'memberships' && !isCoach && (
        <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-6 text-center text-gray-500">
          No membership history.
        </div>
      )}
      {activeTab === 'rentals' && !isCoach && (
        <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-6 text-center text-gray-500">
          No active rentals.
        </div>
      )}
    </div>
  );
}

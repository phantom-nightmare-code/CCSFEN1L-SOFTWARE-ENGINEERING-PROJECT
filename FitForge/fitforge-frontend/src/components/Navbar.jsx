import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isCoach = role === 'coach';

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0 flex-1">
          <Link to="/" className="font-bold text-lg flex items-center gap-2 shrink-0">
            <img
              src="/logo.png"
              alt="FitForge"
              className="w-8 h-8 rounded-lg object-cover"
            />
            FitForge
          </Link>

          {user && (
            <div className="flex items-center gap-5 overflow-x-auto whitespace-nowrap">
              {!isAdmin && !isCoach && (
                <>
                  <Link to="/workouts"        className="text-sm hover:text-brand-600">Workouts</Link>
                  <Link to="/routines"        className="text-sm hover:text-brand-600">Routines</Link>
                  <Link to="/exercises"       className="text-sm hover:text-brand-600">Exercises</Link>
                  <Link to="/analytics"       className="text-sm hover:text-brand-600">Analytics</Link>
                  <Link to="/recommendations" className="text-sm hover:text-brand-600">For You</Link>
                  <Link to="/membership"      className="text-sm hover:text-brand-600">Membership</Link>
                  <Link to="/rentals"         className="text-sm hover:text-brand-600">Rentals</Link>
                  <Link to="/my-coach"        className="text-sm hover:text-brand-600">My Coach</Link>
                  <Link to="/profile"         className="text-sm hover:text-brand-600">Profile</Link>
                </>
              )}

              {isCoach && (
                <>
                  <Link to="/coach"   className="text-sm hover:text-brand-600">Coach</Link>
                  <Link to="/profile" className="text-sm hover:text-brand-600">Profile</Link>
                </>
              )}

              {isAdmin && (
                <>
                  <Link to="/profile" className="text-sm hover:text-brand-600">Profile</Link>
                  <Link to="/admin"   className="text-sm hover:text-brand-600">Admin</Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggle}
            className="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
            <span className="hidden sm:inline capitalize">{theme}</span>
          </button>

          {user ? (
            <>
              <span className="text-sm text-gray-500 hidden md:inline">{user.email}</span>
              <button
                onClick={() => { logout(); nav('/login'); }}
                className="text-sm text-red-600 hover:underline"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm">Login</Link>
              <Link
                to="/register"
                className="text-sm px-3 py-1 bg-brand-600 text-white rounded hover:bg-brand-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
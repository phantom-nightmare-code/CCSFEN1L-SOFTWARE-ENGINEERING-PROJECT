import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, AdminRoute, CoachRoute } from './components/ProtectedRoute';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Membership from './pages/Membership';
import Rentals from './pages/Rentals';
import Recommendations from './pages/Recommendations';
import Workouts from './pages/Workouts';
import Routines from './pages/Routines';
import Analytics from './pages/Analytics';
import Exercises from './pages/Exercises';
import VerifyPayment from './pages/VerifyPayment';
import MyCoach from './pages/MyCoach';
import Coach from './pages/Coach';
import CoachClient from './pages/CoachClient';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/"         element={<Home />} />
                  <Route path="/login"    element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-payment/:reference" element={<VerifyPayment />} />

                  <Route element={<ProtectedRoute />}>
                    <Route path="/workouts"        element={<Workouts />} />
                    <Route path="/routines"        element={<Routines />} />
                    <Route path="/exercises"       element={<Exercises />} />
                    <Route path="/analytics"       element={<Analytics />} />
                    <Route path="/profile"         element={<Profile />} />
                    <Route path="/membership"      element={<Membership />} />
                    <Route path="/rentals"         element={<Rentals />} />
                    <Route path="/recommendations" element={<Recommendations />} />
                    <Route path="/my-coach"        element={<MyCoach />} />
                  </Route>

                  <Route element={<CoachRoute />}>
                    <Route path="/coach"             element={<Coach />} />
                    <Route path="/coach/client/:id"  element={<CoachClient />} />
                  </Route>

                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<Admin />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
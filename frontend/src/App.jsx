import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ShowContactus from "../pages/ShowConactus.jsx";
import ShowFeedback from "../pages/ShowFeedback.jsx";
import SignIn from "../pages/SignIn.jsx";
import Register from "../pages/Register.jsx";
import Dashboard from "../pages/DashBoard.jsx";
import AdminSignIn from "../pages/AdminSignIn.jsx";
import AdminDashboard from "../pages/AdminDashboard.jsx";
import UserShowpage from "../pages/UsersShowpage.jsx";
import UserDashboard from "../pages/UserDashboard.jsx";
import ForgotPassword from "../pages/ForgotPassword.jsx";
import ResetPassword from "../pages/ResetPassword.jsx";
import AdminRegister from "../pages/AdminRegister.jsx";
import SubscriptionPage from "../pages/SubscriptionPage.jsx";
import PaymentSuccess from "../pages/PaymentSuccess.jsx";
import PaymentCancel from "../pages/PaymentCancel.jsx";

import { AdminAuthContext } from "./AdminAuthContext";
import { AuthContext } from "./AuthContext";
import DetailedStats from "../pages/DetailedStats.jsx";
import BusinessUserProfile from "../pages/BusinessUserProfile.jsx";
import PayHereNotify from "../pages/PayHereNotify.jsx";
import AdminOffersManagement from "../pages/AdminOffersManagement.jsx";
import AdminSubscriptionsManagement from "../pages/Adminsubscriptionmanagement.jsx";

// Loading component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif'
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f4f6',
        borderTop: '4px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <p>Loading...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

// Protected route for normal users with loading state check
const ProtectedRoute = ({ element }) => {
  const { user, isAuthenticated, isAuthLoading } = useContext(AuthContext);
  
  // Show loading spinner while checking authentication
  if (isAuthLoading()) {
    return <LoadingSpinner />;
  }
  
  // Check if user is authenticated after loading is complete
  if (!isAuthenticated()) {
    return <Navigate to="/signin" replace />;
  }
  
  return element;
};

// Protected route for admin - FIXED VERSION
const AdminProtectedRoute = ({ element }) => {
  const { adminUser, isLoading } = useContext(AdminAuthContext);
  
  // Show loading spinner while checking admin authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Only redirect to signin after loading is complete and no admin user found
  if (!adminUser) {
    return <Navigate to="/adminsignin" replace />;
  }
  
  return element;
};

// Special Protected Route for Admin Register - FIXED VERSION
// Only accessible if adminUser is logged in
const AdminRegisterProtectedRoute = ({ element }) => {
  const { adminUser, isLoading } = useContext(AdminAuthContext);
  
  // Show loading spinner while checking admin authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Only redirect to signin after loading is complete and no admin user found
  if (!adminUser) {
    return <Navigate to="/adminsignin" replace />;
  }
  
  return element;
};

const App = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<SignIn />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/register" element={<Register />} />
      <Route path="/ShowContactus" element={<ShowContactus />} />
      <Route path="/ShowFeedback" element={<ShowFeedback />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/usershowpage" element={<UserShowpage />} />
      <Route path="/userdashboard" element={<UserDashboard />} />
      <Route path="/detailsstats" element={<DetailedStats />} />
      <Route path="/payhere-notify" element={<PayHereNotify />} />

      {/* User Protected Routes - Now require authentication */}
      <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
      
      {/* Subscription page - Now protected and only accessible to logged-in users */}
      <Route 
        path="/SubscriptionPage" 
        element={<ProtectedRoute element={<SubscriptionPage />} />} 
      />
      
       <Route 
        path="/Business-Profile" 
        element={<ProtectedRoute element={<BusinessUserProfile />} />} 
      />
      {/* PayPal payment result pages - Protected routes */}
      <Route 
        path="/payment-success" 
        element={<ProtectedRoute element={<PaymentSuccess />} />} 
      />
      
      <Route 
        path="/payment-cancel" 
        element={<ProtectedRoute element={<PaymentCancel />} />} 
      />

      {/* Admin routes */}
      <Route path="/adminsignin" element={<AdminSignIn />} />

      {/* Admin register - protected route, only accessible if admin is logged in */}
      <Route
        path="/adminregister"
        element={<AdminRegisterProtectedRoute element={<AdminRegister />} />}
      />

      {/* Admin dashboard protected */}
      <Route
        path="/admindashboard"
        element={<AdminProtectedRoute element={<AdminDashboard />} />}
      />

      {/* Admin offers management - protected route */}
      <Route 
        path="/admin/offers" 
        element={<AdminProtectedRoute element={<AdminOffersManagement />} />} 
      />
      
      {/* FIXED: Admin subscription management - protected route with correct spelling */}
      <Route 
        path="/admin/subscriptionmanagement" 
        element={<AdminProtectedRoute element={<AdminSubscriptionsManagement />} />} 
      />
      
      {/* Catch all route - redirect to signin */}
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  );
};

export default App;
import { createContext, useState, useEffect } from "react";

export const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load admin user from localStorage on component mount
  useEffect(() => {
    try {
      const savedAdminUser = localStorage.getItem('adminUser');
      const loginTime = localStorage.getItem('adminLoginTime');
      
      if (savedAdminUser && loginTime) {
        const currentTime = new Date().getTime();
        const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        // Check if session is still valid
        if (currentTime - parseInt(loginTime) < sessionDuration) {
          setAdminUser(JSON.parse(savedAdminUser));
        } else {
          // Session expired, clear storage
          localStorage.removeItem('adminUser');
          localStorage.removeItem('adminLoginTime');
        }
      }
    } catch (error) {
      console.error('Error loading admin user from localStorage:', error);
      // Clear invalid data
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminLoginTime');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Custom setter that also saves to localStorage
  const setAdminUserPersistent = (user) => {
    try {
      if (user) {
        // Save user and login time to localStorage
        localStorage.setItem('adminUser', JSON.stringify(user));
        localStorage.setItem('adminLoginTime', new Date().getTime().toString());
      } else {
        // Remove user from localStorage when logging out
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminLoginTime');
      }
      setAdminUser(user);
    } catch (error) {
      console.error('Error saving admin user to localStorage:', error);
      // Still update state even if localStorage fails
      setAdminUser(user);
    }
  };

  // Function to logout admin user
  const logoutAdmin = () => {
    setAdminUserPersistent(null);
  };

  // Function to check if admin is logged in
  const isAdminLoggedIn = () => {
    return adminUser !== null;
  };

  return (
    <AdminAuthContext.Provider value={{
      adminUser,
      setAdminUser: setAdminUserPersistent,
      logoutAdmin,
      isAdminLoggedIn,
      isLoading
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
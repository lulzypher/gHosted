import React, { createContext, useState, useEffect, useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import { User, Device } from '@/types';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

interface UserContextProps {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  devices: Device[];
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterFormData) => Promise<void>;
  logout: () => void;
  getCurrentDevice: () => Device | undefined;
  isMobileDevice: () => boolean;
}

interface RegisterFormData {
  username: string;
  password: string;
  displayName: string;
  bio?: string;
  did: string;
  publicKey: string;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Check for existing session on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('ghosted_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchUserDevices(parsedUser.id);
      } catch (err) {
        console.error('Failed to parse stored user data', err);
        localStorage.removeItem('ghosted_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Register a new user
  const register = async (userData: RegisterFormData): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/auth/register', userData);
      const newUser = await response.json();
      
      // Register device
      await registerDevice(newUser.id);
      
      setUser(newUser);
      localStorage.setItem('ghosted_user', JSON.stringify(newUser));
      
      toast({
        title: "Registration successful",
        description: `Welcome to gHosted, ${newUser.displayName}!`,
      });
    } catch (err) {
      console.error('Registration failed:', err);
      setError('Registration failed. Please try again.');
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: err instanceof Error ? err.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Login an existing user
  const login = async (username: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/auth/login', { username, password });
      const userData = await response.json();
      
      // Register or update device if needed
      await registerDevice(userData.id);
      
      setUser(userData);
      localStorage.setItem('ghosted_user', JSON.stringify(userData));
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.displayName}!`,
      });
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please check your credentials.');
      toast({
        variant: "destructive",
        title: "Login failed",
        description: err instanceof Error ? err.message : "Invalid username or password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Logout the current user
  const logout = (): void => {
    setUser(null);
    localStorage.removeItem('ghosted_user');
    queryClient.clear();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  // Fetch user's devices
  const fetchUserDevices = async (userId: number): Promise<void> => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/users/${userId}/devices`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }
      
      const deviceData = await response.json();
      setDevices(deviceData);
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  // Register the current device
  const registerDevice = async (userId: number): Promise<void> => {
    try {
      // Generate a unique device ID or use a stored one
      let deviceId = localStorage.getItem('ghosted_device_id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('ghosted_device_id', deviceId);
      }
      
      // Detect device type
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const deviceType = isMobile ? 'mobile' : 'pc';
      const deviceName = isMobile ? `Mobile ${navigator.platform}` : `Desktop ${navigator.platform}`;
      
      // Register device with the server
      await apiRequest('POST', '/api/devices', {
        userId,
        deviceId,
        name: deviceName,
        type: deviceType
      });
      
      // Fetch updated devices
      await fetchUserDevices(userId);
    } catch (err) {
      console.error('Failed to register device:', err);
    }
  };

  // Get current device
  const getCurrentDevice = (): Device | undefined => {
    const deviceId = localStorage.getItem('ghosted_device_id');
    if (!deviceId) return undefined;
    
    return devices.find(d => d.deviceId === deviceId);
  };

  // Check if current device is mobile
  const isMobileDevice = (): boolean => {
    const currentDevice = getCurrentDevice();
    return currentDevice?.type === 'mobile';
  };

  return (
    <UserContext.Provider value={{
      user,
      isLoading,
      error,
      devices,
      login,
      register,
      logout,
      getCurrentDevice,
      isMobileDevice
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextProps => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

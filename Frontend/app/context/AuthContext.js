"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { request } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check active session on initial load
  const checkAuth = async () => {
    try {
      const data = await request("/api/auth/me");
      if (data && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials) => {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    if (data && data.user) {
      setUser(data.user);
    }
    return data;
  };

  const signup = async (userData) => {
    const data = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    if (data && data.user) {
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    try {
      await request("/api/auth/logout", {
        method: "POST",
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      router.push("/");
    }
  };

  const updateUser = (updatedUserData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUserData } : updatedUserData));
  };

  const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const data = await request("/api/auth/avatar", {
      method: "POST",
      body: formData,
    });

    if (data && data.user) {
      setUser(data.user);
    } else if (data && data.avatar) {
      setUser((prev) => (prev ? { ...prev, avatar: data.avatar } : prev));
    }
    return data;
  };

  const updateProfile = async (profileData) => {
    const data = await request("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });

    if (data && data.user) {
      setUser(data.user);
    }
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        checkAuth,
        updateUser,
        uploadAvatar,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;

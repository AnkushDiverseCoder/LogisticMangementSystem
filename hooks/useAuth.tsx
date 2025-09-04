"use client"

import React, { createContext, useState, useEffect, useContext } from "react"
import authService from "@/lib/authService"

interface AuthContextType {
  user: any
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<{ success: boolean; user?: any }>
  logout: () => Promise<void>
  register: (
    username: string,
    email: string,
    password: string,
    label?: string
  ) => Promise<{ success: boolean }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Load session from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      setLoading(true)
      const current = await authService.getCurrentUser()
      if (current && !current.error) {
        setUser(current)
      } else {
        setUser(null)
      }
      setLoading(false)
    }
    loadUser()
  }, [])

  const login = async (username: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authService.login(username, password)
      console.log(res)
      if (!res.success) {
        setError(res.error || "Login failed")
        return { success: false }
      }
      setUser(res.data)
      return { success: true, user: res.data }
    } catch (err: any) {
      setError(err.message || "Login failed")
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  const register = async (
    username: string,
    email: string,
    password: string,
    label?: string
  ) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authService.register(username, email, password, label ? [label] : [])
      if (!res.success) {
        setError(res.error || "Registration failed")
        return { success: false }
      }
      return { success: true }
    } catch (err: any) {
      setError(err.message || "Registration failed")
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// src/components/Login.tsx
import React, { useEffect } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest } from '../authConfig'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'

export default function Login() {
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()

  const handleLogin = async () => {
    try {
      const authResponse = await instance.loginPopup(loginRequest)
      console.info('Authentication successful:', authResponse)
      const [account] = instance.getAllAccounts()
      instance.setActiveAccount(account)
      navigate('/')
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Please sign in</h1>
        <button
          onClick={handleLogin}
          className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <LogIn className="w-5 h-5 mr-2" />
          Login with Azure AD
        </button>
      </div>
    </div>
  )
}

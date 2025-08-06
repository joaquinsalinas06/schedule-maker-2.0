"use client"

import { useState, useEffect } from 'react'

const FIRST_TIME_USER_KEY = 'schedule-maker-first-time-user'

export function useFirstTimeUser() {
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null) // null = checking
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkFirstTime = () => {
      try {
        if (typeof window === 'undefined') {
          return
        }

        const hasVisited = localStorage.getItem(FIRST_TIME_USER_KEY)
        const firstTime = hasVisited !== 'true'
        
        setIsFirstTime(firstTime)
      } catch (error) {
        console.warn('Error accessing localStorage:', error)
        // If localStorage is not available, assume first time
        setIsFirstTime(true)
      } finally {
        setIsLoading(false)
      }
    }

    // Add a small delay to ensure proper hydration
    const timeoutId = setTimeout(checkFirstTime, 100)
    
    return () => clearTimeout(timeoutId)
  }, [])

  const markAsVisited = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(FIRST_TIME_USER_KEY, 'true')
        setIsFirstTime(false)
      }
    } catch (error) {
      console.warn('Error setting localStorage:', error)
      // Still update state even if localStorage fails
      setIsFirstTime(false)
    }
  }

  const resetFirstTime = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(FIRST_TIME_USER_KEY)
        setIsFirstTime(true)
      }
    } catch (error) {
      console.warn('Error removing from localStorage:', error)
      setIsFirstTime(true)
    }
  }

  return {
    isFirstTime,
    isLoading,
    markAsVisited,
    resetFirstTime
  }
}
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FavoriteSchedule, ShareResponse } from "@/types"
import { FavoriteSchedules } from "@/components/FavoriteSchedules"
import { useToast } from '@/hooks/use-toast'
import { SecureStorage } from "@/utils/secureStorage"

export default function MySchedulesPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [favoriteSchedules, setFavoriteSchedules] = useState<FavoriteSchedule[]>([])

  // Load favorite schedules from localStorage AND database on component mount
  useEffect(() => {
    const loadSchedules = async () => {
      if (typeof window !== 'undefined') {
        // Load from localStorage first (for immediate display)
        const savedFavorites = SecureStorage.getItem('favoriteSchedules') // 🔒 User-specific
        if (savedFavorites) {
          try {
            setFavoriteSchedules(JSON.parse(savedFavorites))
          } catch {
            // Error loading saved favorites
          }
        }

        // Also load from database (for schedules saved from other devices/sessions)
        try {
          console.log('Attempting to load schedules from database...')
          const { CollaborationAPI } = await import('@/services/collaborationAPI')
          const databaseSchedules = await CollaborationAPI.getSavedSchedules()
          console.log('Loaded schedules from database:', databaseSchedules)
          
          // Convert database schedules to FavoriteSchedule format
          const convertedSchedules = databaseSchedules.map(schedule => ({
            id: `db_${schedule.id}`,
            name: schedule.name || 'Untitled Schedule',
            combination: schedule.combination_data || {},
            created_at: schedule.created_at || new Date().toISOString(),
            notes: schedule.description || ''
          }))
          
          console.log('Converted schedules:', convertedSchedules)
          
          // Merge with localStorage schedules, avoiding duplicates
          setFavoriteSchedules(prev => {
            const merged = [...prev]
            convertedSchedules.forEach(dbSchedule => {
              // Check if this schedule already exists in localStorage
              const exists = prev.some(localSchedule => 
                localSchedule.combination?.combination_id === dbSchedule.combination?.combination_id
              )
              if (!exists) {
                merged.push(dbSchedule)
              }
            })
            console.log('Final merged schedules:', merged)
            return merged
          })
        } catch (error) {
          console.error('Failed to load schedules from database:', error)
          // Continue with localStorage-only schedules - don't break the user experience
        }
      }
    }
    
    loadSchedules()
  }, [])

  const editFavorite = (scheduleId: string, newName: string, newNotes?: string) => {
    const updatedFavorites = favoriteSchedules.map(schedule => 
      schedule.id === scheduleId 
        ? { ...schedule, name: newName, notes: newNotes }
        : schedule
    )
    setFavoriteSchedules(updatedFavorites)
    SecureStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites)) // 🔒 User-specific
  }

  const removeFavorite = (scheduleId: string) => {
    const updatedFavorites = favoriteSchedules.filter(schedule => schedule.id !== scheduleId)
    setFavoriteSchedules(updatedFavorites)
    SecureStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites)) // 🔒 User-specific
    
    // Also remove from favorited combinations
    const schedule = favoriteSchedules.find(s => s.id === scheduleId)
    if (schedule) {
      const savedCombinations = SecureStorage.getItem('favoritedCombinations') // 🔒 User-specific
      if (savedCombinations) {
        try {
          const combinations = JSON.parse(savedCombinations)
          const updatedCombinations = combinations.filter(
            (id: string) => id !== schedule.combination.combination_id?.toString()
          )
          SecureStorage.setItem('favoritedCombinations', JSON.stringify(updatedCombinations)) // 🔒 User-specific
        } catch {
          // Error updating combinations
        }
      }
    }
  }

  const shareSchedule = async (favoriteSchedule: FavoriteSchedule): Promise<ShareResponse | undefined> => {
    try {
      // Import CollaborationAPI
      const { CollaborationAPI } = await import('@/services/collaborationAPI');
      
      // First, save the schedule to the database
      const scheduleData = {
        name: favoriteSchedule.name,
        combination: favoriteSchedule.combination,
        description: favoriteSchedule.notes || ''
      };
      
      const savedSchedule = await CollaborationAPI.saveSchedule(scheduleData);
      const scheduleId = savedSchedule.data.schedule_id;
      
      // Share the schedule (simplified - always view-only)
      const shareData = {
        schedule_id: scheduleId
      };
      
      const sharedSchedule = await CollaborationAPI.shareSchedule(shareData);
      
      // Generate shareable link
      const shareableLink = `${window.location.origin}/dashboard/collaboration?code=${sharedSchedule.share_token}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareableLink);
      
      toast({
        title: "Schedule Shared!",
        description: `Share code: ${sharedSchedule.share_token}\nLink copied to clipboard. Anyone can view this schedule with this code.`,
      });

      return { share_token: sharedSchedule.share_token };
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share schedule",
        variant: "destructive",
      });
    }
  }

  const handleViewSchedule = (favorite: FavoriteSchedule) => {
    // Use the actual favorite schedule object for viewing
    sessionStorage.setItem('viewingFavoriteSchedule', JSON.stringify(favorite))
    router.push('/dashboard/schedules')
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <FavoriteSchedules
        favorites={favoriteSchedules}
        onEdit={editFavorite}
        onRemove={removeFavorite}
        onShare={shareSchedule}
        onView={handleViewSchedule}
      />
    </div>
  )
}
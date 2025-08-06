"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FavoriteSchedule, ShareResponse } from "@/types"
import { FavoriteSchedules } from "@/components/FavoriteSchedules"
import { useToast } from '@/hooks/use-toast'

export default function MySchedulesPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [favoriteSchedules, setFavoriteSchedules] = useState<FavoriteSchedule[]>([])

  // Load favorite schedules from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFavorites = localStorage.getItem('favoriteSchedules')
      
      if (savedFavorites) {
        try {
          setFavoriteSchedules(JSON.parse(savedFavorites))
        } catch {
          // Error loading saved favorites
        }
      }
    }
  }, [])

  const editFavorite = (scheduleId: string, newName: string, newNotes?: string) => {
    const updatedFavorites = favoriteSchedules.map(schedule => 
      schedule.id === scheduleId 
        ? { ...schedule, name: newName, notes: newNotes }
        : schedule
    )
    console.log('Favorite schedules before update:', favoriteSchedules)
    console.log('Updated favorite schedules:', updatedFavorites)
    setFavoriteSchedules(updatedFavorites)
    localStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites))
  }

  const removeFavorite = (scheduleId: string) => {
    const updatedFavorites = favoriteSchedules.filter(schedule => schedule.id !== scheduleId)
    setFavoriteSchedules(updatedFavorites)
    localStorage.setItem('favoriteSchedules', JSON.stringify(updatedFavorites))
    
    // Also remove from favorited combinations
    const schedule = favoriteSchedules.find(s => s.id === scheduleId)
    if (schedule) {
      const savedCombinations = localStorage.getItem('favoritedCombinations')
      if (savedCombinations) {
        try {
          const combinations = JSON.parse(savedCombinations)
          const updatedCombinations = combinations.filter(
            (id: string) => id !== schedule.combination.combination_id?.toString()
          )
          localStorage.setItem('favoritedCombinations', JSON.stringify(updatedCombinations))
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || error.message || "Failed to share schedule",
        variant: "destructive",
      });
    }
  }

  const handleViewSchedule = (favorite: FavoriteSchedule) => {
    // Use the actual favorite schedule object for viewing
    console.log('Viewing favorite:', favorite)
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
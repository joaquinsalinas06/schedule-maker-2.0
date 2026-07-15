"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { FavoriteSchedule } from "@/types"
import { FavoriteSchedules } from "@/components/FavoriteSchedules"
import { useToast } from '@/hooks/use-toast'
import { SecureStorage } from "@/utils/secureStorage"
import {
  listMySchedules,
  saveSchedule,
  deleteSchedule,
  setFavorite,
  renameSchedule,
  shareSchedule,
  type ScheduleRow,
} from "@/features/schedule"
import { Star } from "lucide-react"
import { CourseListSkeleton } from "@/components/ui/loading-skeletons";

function toFavoriteSchedule(row: ScheduleRow): FavoriteSchedule {
  return {
    id: row.id,
    name: row.name || "Sin nombre",
    combination: row.combination_data,
    created_at: row.created_at,
  };
}

export default function MySchedulesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const schedules = await listMySchedules();
    setRows(schedules);
    return schedules;
  }, []);

  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const schedules = await refresh();

        // One-time migration: localStorage favorites -> Supabase, only if the
        // user has no rows yet (avoids duplicating on every load).
        if (schedules.length === 0) {
          const savedFavorites = SecureStorage.getItem("favoriteSchedules");
          if (savedFavorites) {
            try {
              const localFavorites: FavoriteSchedule[] = JSON.parse(savedFavorites);
              for (const fav of localFavorites) {
                await saveSchedule({
                  name: fav.name || "Sin nombre",
                  combination: fav.combination,
                  isFavorite: true,
                });
              }
              SecureStorage.removeItem("favoriteSchedules");
              SecureStorage.removeItem("favoritedCombinations");
              await refresh();
            } catch (error) {
              console.error("Failed to migrate local favorites to Supabase:", error);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load schedules:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedules();
  }, [refresh]);

  const editFavorite = async (scheduleId: string, newName: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === scheduleId ? { ...row, name: newName } : row)),
    );
    try {
      await renameSchedule(scheduleId, newName);
    } catch (error) {
      console.error("Failed to rename schedule:", error);
    }
  };

  const removeFavorite = async (scheduleId: string) => {
    setRows((prev) => prev.filter((row) => row.id !== scheduleId));
    try {
      await deleteSchedule(scheduleId);
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el horario",
        variant: "destructive",
      });
      await refresh();
    }
  };

  const toggleFavorite = async (scheduleId: string) => {
    const row = rows.find((r) => r.id === scheduleId);
    if (!row) return;
    const next = !row.is_favorite;
    setRows((prev) =>
      prev.map((r) => (r.id === scheduleId ? { ...r, is_favorite: next } : r)),
    );
    try {
      await setFavorite(scheduleId, next);
    } catch (error) {
      console.error("Failed to update favorite:", error);
      await refresh();
    }
  };

  const shareFavorite = async (favorite: FavoriteSchedule) => {
    try {
      const { url } = await shareSchedule(favorite.id);
      const shareableLink = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(shareableLink);
      toast({
        title: "Horario compartido",
        description: "Enlace copiado al portapapeles.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error al compartir el horario",
        variant: "destructive",
      });
    }
  };

  const handleViewSchedule = (favorite: FavoriteSchedule) => {
    sessionStorage.setItem("viewingFavoriteSchedule", JSON.stringify(favorite));
    router.push("/dashboard/schedules");
  };

  const favoriteSchedules = rows.map(toFavoriteSchedule);

  return (
    <div className="h-full animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Mis Horarios
            </h1>
            <p className="text-sm text-muted-foreground">
              Horarios guardados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {favoriteSchedules.length}{" "}
              {favoriteSchedules.length === 1 ? "horario" : "horarios"}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-3xl">
          {isLoading ? (
            <CourseListSkeleton count={4} />
          ) : (
            <FavoriteSchedules
              favorites={favoriteSchedules}
              onEdit={editFavorite}
              onRemove={removeFavorite}
              onShare={shareFavorite}
              onView={handleViewSchedule}
              onToggleFavorite={toggleFavorite}
              favoriteIds={new Set(rows.filter((r) => r.is_favorite).map((r) => r.id))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

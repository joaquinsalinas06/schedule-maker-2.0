"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FavoriteSchedule, ShareResponse } from "@/types"
import { FavoriteSchedules } from "@/components/FavoriteSchedules"
import { useToast } from '@/hooks/use-toast'
import { SecureStorage } from "@/utils/secureStorage"
import { Star } from "lucide-react"
import { CourseListSkeleton } from "@/components/ui/loading-skeletons";

export default function MySchedulesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [favoriteSchedules, setFavoriteSchedules] = useState<
    FavoriteSchedule[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSchedules = async () => {
      if (typeof window !== "undefined") {
        const savedFavorites = SecureStorage.getItem("favoriteSchedules");
        if (savedFavorites) {
          try {
            setFavoriteSchedules(JSON.parse(savedFavorites));
          } catch {
            // Error loading saved favorites
          }
        }

        try {
          const { CollaborationAPI } =
            await import("@/services/collaborationAPI");
          const databaseSchedules = await CollaborationAPI.getSavedSchedules();

          const convertedSchedules = databaseSchedules.map((schedule) => ({
            id: `db_${schedule.id}`,
            name: schedule.name || "Sin nombre",
            combination: schedule.combination_data || {},
            created_at: schedule.created_at || new Date().toISOString(),
            notes: schedule.description || "",
          }));

          setFavoriteSchedules((prev) => {
            const allSchedules = [...prev, ...convertedSchedules];
            const uniqueSchedules = new Map();

            allSchedules.forEach((schedule) => {
              const comboId = schedule.combination?.combination_id;
              if (comboId !== undefined && comboId !== null) {
                // Ensure number vs string matching works perfectly
                uniqueSchedules.set(String(comboId), schedule);
              } else {
                // Fallback for missing combo ids
                uniqueSchedules.set(schedule.id, schedule);
              }
            });

            const deduplicated = Array.from(uniqueSchedules.values());

            // Clean up localStorage to permanently remove duplicates globally
            SecureStorage.setItem(
              "favoriteSchedules",
              JSON.stringify(deduplicated),
            );

            // Re-sync favoritedCombinations array
            const combinationsSet = new Set(
              deduplicated.map((s) => String(s.combination?.combination_id)),
            );
            SecureStorage.setItem(
              "favoritedCombinations",
              JSON.stringify(Array.from(combinationsSet)),
            );

            return deduplicated;
          });
        } catch (error) {
          console.error("Failed to load schedules from database:", error);
        }

        setIsLoading(false);
      }
    };

    loadSchedules();
  }, []);

  const editFavorite = (
    scheduleId: string,
    newName: string,
    newNotes?: string,
  ) => {
    const updatedFavorites = favoriteSchedules.map((schedule) =>
      schedule.id === scheduleId
        ? { ...schedule, name: newName, notes: newNotes }
        : schedule,
    );
    setFavoriteSchedules(updatedFavorites);
    SecureStorage.setItem(
      "favoriteSchedules",
      JSON.stringify(updatedFavorites),
    );
  };

  const removeFavorite = (scheduleId: string) => {
    const updatedFavorites = favoriteSchedules.filter(
      (schedule) => schedule.id !== scheduleId,
    );
    setFavoriteSchedules(updatedFavorites);
    SecureStorage.setItem(
      "favoriteSchedules",
      JSON.stringify(updatedFavorites),
    );

    const schedule = favoriteSchedules.find((s) => s.id === scheduleId);
    if (schedule) {
      const savedCombinations = SecureStorage.getItem("favoritedCombinations");
      if (savedCombinations) {
        try {
          const combinations = JSON.parse(savedCombinations);
          const updatedCombinations = combinations.filter(
            (id: string) =>
              id !== schedule.combination.combination_id?.toString(),
          );
          SecureStorage.setItem(
            "favoritedCombinations",
            JSON.stringify(updatedCombinations),
          );
        } catch {
          // Error updating combinations
        }
      }
    }
  };

  const shareSchedule = async (
    favoriteSchedule: FavoriteSchedule,
  ): Promise<ShareResponse | undefined> => {
    try {
      const { CollaborationAPI } = await import("@/services/collaborationAPI");

      const scheduleData = {
        name: favoriteSchedule.name,
        combination: favoriteSchedule.combination,
        description: favoriteSchedule.notes || "",
      };

      const savedSchedule = await CollaborationAPI.saveSchedule(scheduleData);
      const scheduleId = savedSchedule.data.schedule_id;

      const shareData = {
        schedule_id: scheduleId,
      };

      const sharedSchedule = await CollaborationAPI.shareSchedule(shareData);

      const shareableLink = `${window.location.origin}/dashboard/collaboration?code=${sharedSchedule.share_token}`;

      await navigator.clipboard.writeText(shareableLink);

      toast({
        title: "Horario compartido",
        description: `Enlace copiado al portapapeles. Codigo: ${sharedSchedule.share_token}`,
      });

      return { share_token: sharedSchedule.share_token };
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Error al compartir el horario",
        variant: "destructive",
      });
    }
  };

  const handleViewSchedule = (favorite: FavoriteSchedule) => {
    sessionStorage.setItem("viewingFavoriteSchedule", JSON.stringify(favorite));
    router.push("/dashboard/schedules");
  };

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
              Horarios guardados como favoritos
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
              onShare={shareSchedule}
              onView={handleViewSchedule}
            />
          )}
        </div>
      </div>
    </div>
  );
}

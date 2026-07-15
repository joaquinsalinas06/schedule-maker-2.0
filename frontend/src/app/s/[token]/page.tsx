import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ScheduleVisualization } from "@/components/ScheduleVisualization"

interface SchedulesRow {
  name: string | null
  combination_data: {
    combination_id: string | number
    course_count?: number
    courses?: unknown[]
  }
}

export default async function SharedSchedulePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("schedules")
    .select("name, combination_data")
    .eq("share_token", token)
    .eq("is_public", true)
    .single()

  if (error || !data) {
    notFound()
  }

  const row = data as SchedulesRow
  const combination = row.combination_data
  const courses = combination.courses ?? []

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <ScheduleVisualization
          scheduleName={row.name || undefined}
          scheduleData={{
            combinations: [
              {
                combination_id: String(combination.combination_id),
                course_count: combination.course_count ?? courses.length,
                courses: courses as never,
              },
            ],
            total_combinations: 1,
            selected_courses_count: courses.length,
          }}
        />
      </div>
    </div>
  )
}

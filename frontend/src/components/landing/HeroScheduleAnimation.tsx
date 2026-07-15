"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { Download, Star } from "lucide-react"

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00"]

type Block = {
  id: string
  day: number
  hour: number
  span: number
  label: string
  color: string
}

const INITIAL_BLOCKS: Block[] = [
  { id: "a", day: 0, hour: 0, span: 2, label: "Cálculo II", color: "bg-primary/15 border-primary/30 text-primary" },
  { id: "b", day: 1, hour: 1, span: 2, label: "Física I", color: "bg-muted border-border text-foreground/70" },
  { id: "c", day: 2, hour: 0, span: 2, label: "Cálculo II", color: "bg-primary/15 border-primary/30 text-primary" },
  { id: "d", day: 3, hour: 2, span: 2, label: "Programación", color: "bg-foreground/5 border-foreground/10 text-foreground/60" },
  { id: "e", day: 4, hour: 1, span: 2, label: "Física I", color: "bg-muted border-border text-foreground/70" },
  { id: "f", day: 0, hour: 3, span: 2, label: "Química", color: "bg-foreground/5 border-foreground/10 text-foreground/60" },
  { id: "g", day: 2, hour: 4, span: 2, label: "Lab. Física", color: "bg-primary/10 border-primary/20 text-primary/80" },
  { id: "h", day: 4, hour: 4, span: 1, label: "Tutoría", color: "bg-muted/80 border-border text-foreground/50" },
]

/**
 * Decorative hero mockup: a mini weekly schedule grid that builds itself
 * block-by-block on mount, then gently reshuffles a pair of blocks every
 * few seconds. Pure decoration, no real data.
 */
export function HeroScheduleAnimation() {
  const [blocks, setBlocks] = useState(INITIAL_BLOCKS)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    // ponytail: no swap loop for reduced-motion users, avoids pointless reflow
    if (shouldReduceMotion) return

    const interval = setInterval(() => {
      setBlocks((prev) => {
        const next = [...prev]
        const a = Math.floor(Math.random() * next.length)
        let b = Math.floor(Math.random() * next.length)
        while (b === a) b = Math.floor(Math.random() * next.length)
        const posA = { day: next[a].day, hour: next[a].hour, span: next[a].span }
        next[a] = { ...next[a], day: next[b].day, hour: next[b].hour, span: next[b].span }
        next[b] = { ...next[b], day: posA.day, hour: posA.hour, span: posA.span }
        return next
      })
    }, 4500)

    return () => clearInterval(interval)
  }, [shouldReduceMotion])

  return (
    <div className="relative mx-auto max-w-2xl mt-16">
      <motion.div
        className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive/40" />
            <div className="w-3 h-3 rounded-full bg-warning/40" />
            <div className="w-3 h-3 rounded-full bg-success/40" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Combinación 1 de 24</span>
          <div className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <Star className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Grid */}
        <div className="p-3">
          {/* Day headers */}
          <div className="grid grid-cols-[48px_repeat(6,1fr)] gap-0.5 mb-1">
            <div />
            {DAYS.map((day) => (
              <div key={day} className="text-center text-[11px] font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Time grid: explicit placement so blocks can be repositioned/animated independently */}
          <div className="relative grid grid-cols-[48px_repeat(6,1fr)] gap-0.5">
            {HOURS.map((hour, hi) => (
              <div
                key={hour}
                className="text-[10px] text-muted-foreground/60 text-right pr-2 py-2 leading-none"
                style={{ gridColumn: 1, gridRow: hi + 1 }}
              >
                {hour}
              </div>
            ))}

            {HOURS.map((_, hi) =>
              DAYS.map((_, di) => (
                <div
                  key={`cell-${di}-${hi}`}
                  className="rounded-sm bg-muted/20 min-h-[28px]"
                  style={{ gridColumn: di + 2, gridRow: hi + 1 }}
                />
              ))
            )}

            {blocks.map((block, i) => (
              <motion.div
                key={block.id}
                layout
                className={`rounded-md border text-[10px] font-medium px-1.5 py-1 ${block.color}`}
                style={{
                  gridColumn: block.day + 2,
                  gridRow: `${block.hour + 1} / span ${block.span}`,
                }}
                initial={{ opacity: 0, scale: 0.4, y: -12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0.2 }
                    : { type: "spring", stiffness: 320, damping: 20, delay: 0.5 + i * 0.12 }
                }
              >
                {block.label}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Decorative glow */}
      <div className="absolute -inset-4 bg-primary/5 rounded-2xl -z-10 blur-2xl" />
    </div>
  )
}

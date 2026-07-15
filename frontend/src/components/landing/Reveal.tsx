"use client"

import { motion, type Variants } from "motion/react"
import type { ReactNode } from "react"

const VIEWPORT = { once: true, margin: "-80px" } as const

const fadeRise: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}

/** Fade+rise a single block in when it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{
        hidden: fadeRise.hidden,
        show: { ...fadeRise.show, transition: { duration: 0.5, ease: "easeOut", delay } },
      }}
    >
      {children}
    </motion.div>
  )
}

/** Wrap a list of children so they reveal one-by-one (staggered) as a group. */
export function RevealGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  )
}

/** A single staggered item, used inside a RevealGroup. */
export function RevealItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={fadeRise}>
      {children}
    </motion.div>
  )
}

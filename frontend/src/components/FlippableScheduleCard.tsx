"use client"

import React from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ArrowLeft } from "lucide-react"

interface FlippableScheduleCardProps {
  children: React.ReactNode
  scheduleContent: React.ReactNode
  isFlipped: boolean
  onFlip: () => void
  hasSelectedSections: boolean
  className?: string
}

export function FlippableScheduleCard({
  children,
  scheduleContent,
  isFlipped,
  onFlip,
  hasSelectedSections,
  className = ""
}: FlippableScheduleCardProps) {
  return (
    <Card className={`w-full h-full min-h-[600px] flip-card-3d ${className}`}>
      <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
        {/* Front side - Course Selection */}
        <div className="flip-card-front">
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  Seleccionar Cursos
                </h2>
                <Button
                  onClick={onFlip}
                  disabled={!hasSelectedSections}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 px-6 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  title={hasSelectedSections ? "Ver horarios generados" : "Selecciona al menos una sección para ver horarios"}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Ver Horarios
                </Button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-hidden">
              <div className="h-full custom-scrollbar overflow-y-auto">
                {children}
              </div>
            </div>
          </div>
        </div>

        {/* Back side - Schedule Visualization */}
        <div className="flip-card-back">
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  Horarios Generados
                </h2>
                <Button
                  onClick={onFlip}
                  variant="outline"
                  className="border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-700 px-6 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cambiar Cursos
                </Button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-hidden">
              <div className="h-full custom-scrollbar overflow-y-auto">
                {scheduleContent}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

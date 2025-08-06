"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, Menu } from "lucide-react"
import { useState } from "react"

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-600 rounded-lg flex items-center justify-center animate-pulse-slow">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Schedule Maker</h1>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/how-it-works" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
              Cómo funciona
            </Link>
            <Link href="/universities" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
              Universidades
            </Link>
            <Link href="/auth">
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 text-sm font-medium transition-colors">
                Ingresar
              </Button>
            </Link>
          </div>
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="w-6 h-6 text-white" />
            </Button>
          </div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-950/95 backdrop-blur-sm border-t border-gray-800 py-4 px-6 space-y-4">
          <Link
            href="/how-it-works"
            className="block text-gray-400 hover:text-white text-base font-medium transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            Cómo funciona
          </Link>
          <Link
            href="/universities"
            className="block text-gray-400 hover:text-white text-base font-medium transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            Universidades
          </Link>
          <Link href="/auth">
            <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 text-base font-medium transition-colors">
              Ingresar
            </Button>
          </Link>
        </div>
      )}
    </nav>
  )
}
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Target } from 'lucide-react';

// Dashboard Components for course search
import { CourseSearchCard } from '@/components/dashboard/CourseSearchCard';
import { CourseResultsGrid } from '@/components/dashboard/CourseResultsGrid';
import { SectionSelectionPopup } from '@/components/dashboard/SectionSelectionPopup';

import { Course, SectionPopupState, Filter } from '@/types';

interface CourseSearchSectionProps {
  activeSearchType: 'shared' | 'individual';
  setActiveSearchType: (type: 'shared' | 'individual') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Course[];
  sectionPopup: SectionPopupState | null;
  setSectionPopup: (popup: SectionPopupState | null) => void;
  filters: Filter;
  setFilters: (filters: Filter) => void;
  addSection: (course: Course, sectionId: number) => Promise<void>;
  removeSection?: (index: number) => void;
  selectedSections: any[];
  autocompleteLoading?: boolean;
  autocompleteError?: string | null;
  displayPage?: number;
  resultsPerPage?: number;
}

export function CourseSearchSection({
  activeSearchType,
  setActiveSearchType,
  searchQuery,
  setSearchQuery,
  searchResults,
  sectionPopup,
  setSectionPopup,
  filters,
  setFilters,
  addSection,
  removeSection,
  selectedSections,
  autocompleteLoading = false,
  autocompleteError = null,
  displayPage = 1,
  resultsPerPage = 10
}: CourseSearchSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Búsqueda de Cursos
        </CardTitle>
        <Badge 
          variant="default"
          className={`cursor-pointer transition-colors ${
            activeSearchType === 'shared' 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
          onClick={() => setActiveSearchType(activeSearchType === 'shared' ? 'individual' : 'shared')}
        >
          <Target className="w-3 h-3 mr-1" />
          {activeSearchType === 'shared' ? 'Compartidos' : 'Individuales'}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Course Search */}
        <CourseSearchCard
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filters={filters}
          setFilters={setFilters}
          isLoading={autocompleteLoading}
        />

        {/* Search Results */}
        <CourseResultsGrid
          searchResults={searchResults}
          displayPage={displayPage}
          resultsPerPage={resultsPerPage}
          setSectionPopup={setSectionPopup}
          autocompleteLoading={autocompleteLoading}
          isLoading={autocompleteLoading}
          autocompleteError={autocompleteError}
          searchQuery={searchQuery}
        />

        {/* Section Selection Popup */}
        <SectionSelectionPopup
          sectionPopup={sectionPopup}
          setSectionPopup={setSectionPopup}
          selectedSections={selectedSections}
          addSection={addSection}
          removeSection={removeSection || ((index: number) => {
            console.log('Remove section at index:', index);
          })}
        />
      </CardContent>
    </Card>
  );
}
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Schedule, TimeCoordination, TimeSlotResponse } from '@/types/types';

interface AppContextType {
  // Coordination (local until full backend support)
  coordinations: TimeCoordination[];
  addCoordination: (coord: TimeCoordination) => void;
  addCoordinationResponses: (coordId: string, responses: TimeSlotResponse[]) => void;

  // UI state (shared across pages)
  selectedSchedule: Schedule | null;
  setSelectedSchedule: (s: Schedule | null) => void;
  showScheduleDetail: boolean;
  setShowScheduleDetail: (v: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coordinations, setCoordinations] = useState<TimeCoordination[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showScheduleDetail, setShowScheduleDetail] = useState(false);

  const addCoordination = useCallback((coord: TimeCoordination) => {
    setCoordinations(prev => [...prev, coord]);
  }, []);

  const addCoordinationResponses = useCallback((coordId: string, responses: TimeSlotResponse[]) => {
    setCoordinations(prev => prev.map(c =>
      c.id === coordId ? { ...c, responses: [...c.responses, ...responses] } : c
    ));
  }, []);

  return (
    <AppContext.Provider value={{
      coordinations,
      addCoordination, addCoordinationResponses,
      selectedSchedule, setSelectedSchedule, showScheduleDetail, setShowScheduleDetail,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

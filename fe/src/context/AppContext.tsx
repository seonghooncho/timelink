import React, { createContext, useContext, useState } from 'react';
import { Schedule } from '@/types/types';

interface AppContextType {
  selectedSchedule: Schedule | null;
  setSelectedSchedule: (s: Schedule | null) => void;
  showScheduleDetail: boolean;
  setShowScheduleDetail: (v: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showScheduleDetail, setShowScheduleDetail] = useState(false);

  return (
    <AppContext.Provider value={{
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

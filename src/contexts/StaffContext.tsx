import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface StaffContextType {
  staffName: string | null;
  setStaffName: (name: string) => void;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staffName, setStaffNameState] = useState<string | null>(() => {
    return localStorage.getItem("selectedStaffName");
  });

  const setStaffName = (name: string) => {
    localStorage.setItem("selectedStaffName", name);
    setStaffNameState(name);
  };

  useEffect(() => {
    const stored = localStorage.getItem("selectedStaffName");
    if (stored) {
      setStaffNameState(stored);
    }
  }, []);

  return (
    <StaffContext.Provider value={{ staffName, setStaffName }}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error("useStaff must be used within StaffProvider");
  }
  return context;
}

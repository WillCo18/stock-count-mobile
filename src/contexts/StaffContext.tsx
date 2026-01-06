import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface StaffContextType {
  staffName: string | null;
  staffRole: string | null;
  staffUserId: number | null;
  setStaff: (name: string, role: string, userId: number) => void;
  clearStaff: () => void;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staffName, setStaffNameState] = useState<string | null>(() => {
    return localStorage.getItem("staffName");
  });
  const [staffRole, setStaffRoleState] = useState<string | null>(() => {
    return localStorage.getItem("staffRole");
  });
  const [staffUserId, setStaffUserIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem("staffUserId");
    return stored ? parseInt(stored, 10) : null;
  });

  const setStaff = (name: string, role: string, userId: number) => {
    localStorage.setItem("staffName", name);
    localStorage.setItem("staffRole", role);
    localStorage.setItem("staffUserId", userId.toString());
    setStaffNameState(name);
    setStaffRoleState(role);
    setStaffUserIdState(userId);
  };

  const clearStaff = () => {
    localStorage.removeItem("staffName");
    localStorage.removeItem("staffRole");
    localStorage.removeItem("staffUserId");
    setStaffNameState(null);
    setStaffRoleState(null);
    setStaffUserIdState(null);
  };

  useEffect(() => {
    const storedName = localStorage.getItem("staffName");
    const storedRole = localStorage.getItem("staffRole");
    const storedUserId = localStorage.getItem("staffUserId");
    if (storedName) setStaffNameState(storedName);
    if (storedRole) setStaffRoleState(storedRole);
    if (storedUserId) setStaffUserIdState(parseInt(storedUserId, 10));
  }, []);

  return (
    <StaffContext.Provider value={{ staffName, staffRole, staffUserId, setStaff, clearStaff }}>
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

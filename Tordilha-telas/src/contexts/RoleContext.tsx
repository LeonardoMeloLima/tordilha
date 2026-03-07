import React, { createContext, useContext, useState } from "react";

export type Role = "gestor" | "professor" | "pais";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType>({ role: "gestor", setRole: () => {} });

export const useRole = () => useContext(RoleContext);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>("gestor");
  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
};

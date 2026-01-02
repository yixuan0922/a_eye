"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface Site {
  id: string;
  name: string;
  code: string;
  location: string;
  description?: string;
  userRole?: string;
  userSiteId?: string;
  isActive: boolean;
  cameras?: any[];
  personnel?: any[];
  violations?: any[];
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface SiteContextType {
  currentSite: Site | null;
  availableSites: Site[];
  currentUser: User | null;
  setCurrentSite: (site: Site) => void;
  setAvailableSites: (sites: Site[]) => void;
  setCurrentUser: (user: User) => void;
  switchSite: (siteCode: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [currentSite, setCurrentSiteState] = useState<Site | null>(null);
  const [availableSites, setAvailableSitesState] = useState<Site[]>([]);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    const storedSite = localStorage.getItem("currentSite");
    const storedSites = localStorage.getItem("availableSites");

    if (storedUser) {
      setCurrentUserState(JSON.parse(storedUser));
    }

    if (storedSite) {
      setCurrentSiteState(JSON.parse(storedSite));
    }

    if (storedSites) {
      setAvailableSitesState(JSON.parse(storedSites));
    }

    setIsLoading(false);
  }, []);

  const setCurrentSite = (site: Site) => {
    setCurrentSiteState(site);
    localStorage.setItem("currentSite", JSON.stringify(site));
  };

  const setAvailableSites = (sites: Site[]) => {
    setAvailableSitesState(sites);
    localStorage.setItem("availableSites", JSON.stringify(sites));
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    localStorage.setItem("currentUser", JSON.stringify(user));
  };

  const switchSite = (siteCode: string) => {
    const site = availableSites.find((s) => s.code === siteCode);
    if (site) {
      setCurrentSite(site);
      // Redirect to the new site's dashboard
      window.location.href = `/${siteCode}`;
    }
  };

  const logout = () => {
    setCurrentSiteState(null);
    setAvailableSitesState([]);
    setCurrentUserState(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentSite");
    localStorage.removeItem("availableSites");
    window.location.href = "/login";
  };

  return (
    <SiteContext.Provider
      value={{
        currentSite,
        availableSites,
        currentUser,
        setCurrentSite,
        setAvailableSites,
        setCurrentUser,
        switchSite,
        logout,
        isLoading,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error("useSite must be used within a SiteProvider");
  }
  return context;
}

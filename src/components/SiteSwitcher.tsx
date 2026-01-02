"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, Check, ChevronsUpDown, LogOut } from "lucide-react";

interface Site {
  id: string;
  name: string;
  code: string;
  location: string;
  userRole?: string;
}

export function SiteSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const storedSite = localStorage.getItem("currentSite");
    const storedSites = localStorage.getItem("availableSites");

    if (storedSite) {
      setCurrentSite(JSON.parse(storedSite));
    }

    if (storedSites) {
      setAvailableSites(JSON.parse(storedSites));
    }
  }, [pathname]);

  const handleSiteSwitch = (site: Site) => {
    localStorage.setItem("currentSite", JSON.stringify(site));
    setCurrentSite(site);
    setOpen(false);
    router.push(`/${site.code}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentSite");
    localStorage.removeItem("availableSites");
    router.push("/login");
  };

  if (!currentSite || availableSites.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <span className="font-medium">{currentSite.name}</span>
              <span className="text-xs text-muted-foreground">
                {currentSite.code}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px]" align="start">
        <DropdownMenuLabel>Switch Site</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableSites.map((site) => (
          <DropdownMenuItem
            key={site.id}
            onSelect={() => handleSiteSwitch(site)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="font-medium">{site.name}</span>
                <span className="text-xs text-muted-foreground">
                  {site.location}
                </span>
              </div>
              {currentSite.id === site.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="cursor-pointer text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, MapPin, Building2, LogOut } from "lucide-react";

interface Site {
  id: string;
  name: string;
  code: string;
  location: string;
  description?: string;
  userRole?: string;
}

export default function SelectSite() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("currentUser");
    const storedSites = localStorage.getItem("availableSites");

    if (!storedUser || !storedSites) {
      router.replace("/login");
      return;
    }

    setUser(JSON.parse(storedUser));
    setSites(JSON.parse(storedSites));
  }, [router]);

  const handleSiteSelect = (site: Site) => {
    // Store selected site
    localStorage.setItem("currentSite", JSON.stringify(site));

    // Navigate to site dashboard
    router.replace(`/${site.code}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("availableSites");
    localStorage.removeItem("currentSite");
    router.replace("/login");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="w-full max-w-4xl relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <Shield className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Select Site</h1>
              <p className="text-sm text-gray-400">
                Welcome back, {user.name || user.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {sites.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">No Sites Available</h2>
              <p className="text-muted-foreground">
                You don't have access to any sites yet. Please contact your administrator.
              </p>
            </CardContent>
          </Card>
        ) : sites.length === 1 ? (
          // Auto-redirect if only one site
          <div className="text-center text-white">
            <p>Redirecting to {sites[0].name}...</p>
            {setTimeout(() => handleSiteSelect(sites[0]), 500) && null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sites.map((site) => (
              <Card
                key={site.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary"
                onClick={() => handleSiteSelect(site)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                        <Building2 className="text-white w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{site.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {site.code}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{site.location}</span>
                    </div>
                    {site.description && (
                      <p className="text-sm text-muted-foreground">
                        {site.description}
                      </p>
                    )}
                    {site.userRole && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-xs font-medium bg-black text-white px-2 py-1 rounded">
                          {site.userRole.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

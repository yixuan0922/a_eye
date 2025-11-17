"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  LogOut,
  Activity,
  AlertTriangle,
  Users,
  Camera,
  FileText,
  Calendar,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import OverviewStats from "@/components/overview-stats";
import PersonnelManagement from "@/components/personnel-management";
import PPEViolations from "@/components/ppe-violations";
import Reports from "@/components/reports";
import AttendanceDashboard from "@/components/AttendanceDashboard";

type Tab =
  | "overview"
  | "cameras"
  | "personnel"
  | "violations"
  | "reports"
  | "attendance"
  | "face-management";

export default function Dashboard() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const siteSlug = params?.siteSlug as string;

  // Get site data
  const { data: siteData, isLoading: siteLoading } =
    trpc.getSiteByCode.useQuery(siteSlug);

  // Get dashboard stats
  const { data: cameras } = trpc.getCamerasBySite.useQuery(siteData?.id || "", {
    enabled: !!siteData?.id,
  });

  const { data: personnel } = trpc.getPersonnelBySite.useQuery(
    siteData?.id || "",
    {
      enabled: !!siteData?.id,
    }
  );

  const { data: violations } = trpc.getActiveViolationsBySite.useQuery(
    siteData?.id || "",
    {
      enabled: !!siteData?.id,
      refetchInterval: 5000, // Refresh every 5 seconds for live monitoring
    }
  );

  const { data: ppeViolations } = trpc.getActivePPEViolationsBySite.useQuery(
    {
      siteId: siteData?.id || "",
      limit: 10,
      skip: 0,
    },
    {
      enabled: !!siteData?.id,
      refetchInterval: 5000, // Refresh every 5 seconds for live monitoring
    }
  );

  const handleLogout = () => {
    // Clear user session from localStorage
    localStorage.removeItem('currentUser');

    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    router.push("/login");
  };

  if (siteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading site data...</p>
        </div>
      </div>
    );
  }

  if (!siteData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Site Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              The site &quot;{siteSlug}&quot; was not found.
            </p>
            <Button onClick={() => router.push("/login")} variant="outline">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter out low severity violations
  const filteredViolations = violations?.filter((v) => v.severity !== "low") || [];
  const filteredPPEViolations = ppeViolations?.filter((v) => v.severity !== "low") || [];

  const stats = {
    cameras: cameras?.length || 0,
    personnel: personnel?.length || 0,
    violations: filteredViolations.length + filteredPPEViolations.length,
    activeCameras: cameras?.filter((c) => c.status === "online").length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <Shield className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{siteData.name}</h1>
              <p className="text-sm text-muted-foreground">
                Security Dashboard • {siteData.location}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge
              variant="outline"
              className="bg-authorized-green/10 text-authorized-green border-authorized-green"
            >
              <Activity className="w-3 h-3 mr-1" />
              ONLINE
            </Badge>
            <Button onClick={handleLogout} size="sm" className="bg-black text-white hover:bg-gray-800">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as Tab)}
        >
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="cameras" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Cameras
            </TabsTrigger>
            <TabsTrigger value="personnel" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Personnel ({stats.personnel})
            </TabsTrigger>
            <TabsTrigger value="violations" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Violations ({stats.violations})
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Attendance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewStats siteId={siteData.id} />
          </TabsContent>

          <TabsContent value="cameras" className="mt-6">
            <iframe
              src="https://aeye001.biofuel.osiris.sg/"
              className="w-full h-[calc(100vh-200px)] border-0 rounded-lg"
              title="Camera Feed"
            />
          </TabsContent>

          <TabsContent value="personnel" className="mt-6">
            <PersonnelManagement siteId={siteData.id} />
          </TabsContent>

          <TabsContent value="violations" className="mt-6">
            <PPEViolations siteId={siteData.id} />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <Reports siteId={siteData.id} />
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <AttendanceDashboard siteId={siteData.id} />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}

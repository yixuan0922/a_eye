"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc/client";
import { generatePPEViolationReport } from "@/lib/pdf-generator";

import { toast } from "sonner";
import {
  Users,
  Camera,
  Shield,
  AlertTriangle,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  UserPlus,
  Eye,
  QrCode,
  Bell,
  Download,
  MessageCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

interface OverviewStatsProps {
  siteId: string;
}

export default function OverviewStats({ siteId }: OverviewStatsProps) {
  const params = useParams();
  const router = useRouter();
  const siteSlug = params?.siteSlug as string;

  const { data: cameras, isLoading: camerasLoading } =
    trpc.getCamerasBySite.useQuery(siteId);
  const { data: personnel, isLoading: personnelLoading } =
    trpc.getPersonnelBySite.useQuery(siteId);
  const { data: violations, isLoading: violationsLoading } =
    trpc.getActiveViolationsBySite.useQuery(siteId);
  const { data: ppeViolations, isLoading: ppeViolationsLoading } =
    trpc.getActivePPEViolationsBySite.useQuery({
      siteId,
      limit: 100,
      skip: 0,
    });
  const { data: incidents, isLoading: incidentsLoading } =
    trpc.getIncidentsBySite.useQuery(siteId);
  const { data: site } = trpc.getSite.useQuery(siteId);

  const { mutate: generateQRCode, isPending: isGeneratingQR } =
    trpc.generateQRCode.useMutation({
      onSuccess: (data) => {
        toast(`QR Code Generated\nSite signup URL: ${data.signupUrl}`);

        // Download QR code
        const link = document.createElement("a");
        link.href = data.qrCode;
        link.download = "site-qr-code.png";
        link.click();
      },
      onError: () => {
        toast.error("Failed to Generate QR Code");
      },
    });

  const utils = trpc.useUtils();
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);

  const handleGenerateReport = async () => {
    if (!site) {
      toast.error("Site information not available");
      return;
    }

    setIsGeneratingReport(true);
    toast.loading("Generating PPE Violation Report...", { id: "report-generation" });

    try {
      const reportData = await utils.client.getPPEViolationReport.query({
        siteId,
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
        endDate: new Date(),
      });

      generatePPEViolationReport(reportData, site);
      toast.success("PPE Violation Report Generated Successfully", { id: "report-generation" });
    } catch (error: any) {
      toast.error(`Failed to Generate Report: ${error.message}`, { id: "report-generation" });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (
    camerasLoading ||
    personnelLoading ||
    violationsLoading ||
    ppeViolationsLoading ||
    incidentsLoading
  ) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Filter out low severity violations
  const filteredViolations = violations?.filter((v: any) => v.severity !== "low") || [];
  const filteredPPEViolations = ppeViolations?.filter((v: any) => v.severity !== "low") || [];

  const stats = {
    totalPersonnel: personnel?.length || 0,
    pendingApprovals:
      personnel?.filter((p: any) => p.status === "pending").length || 0,
    authorizedPersonnel:
      personnel?.filter((p: any) => p.status === "authorized").length || 0,
    totalCameras: cameras?.length || 0,
    activeCameras: cameras?.filter((c: any) => c.status === "online").length || 0,
    offlineCameras: cameras?.filter((c: any) => c.status === "offline").length || 0,
    activeViolations: filteredViolations.length + filteredPPEViolations.length,
    ppeViolationsCount: filteredPPEViolations.length,
    unauthorizedAccessCount: filteredViolations.length,
    totalIncidents: incidents?.length || 0,
    recentIncidents:
      incidents?.filter((i: any) => {
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return i.reportedAt && new Date(i.reportedAt) > dayAgo;
      }).length || 0,
  };

  const cameraHealthPercentage =
    stats.totalCameras > 0
      ? Math.round((stats.activeCameras / stats.totalCameras) * 100)
      : 0;

  const personnelAuthPercentage =
    stats.totalPersonnel > 0
      ? Math.round((stats.authorizedPersonnel / stats.totalPersonnel) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Alert for active violations */}
      {stats.activeViolations > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stats.activeViolations} active safety violation
            {stats.activeViolations !== 1 ? "s" : ""} detected
            {stats.ppeViolationsCount > 0 && stats.unauthorizedAccessCount > 0
              ? ` (${stats.ppeViolationsCount} PPE, ${stats.unauthorizedAccessCount} Unauthorized Access)`
              : stats.ppeViolationsCount > 0
              ? ` (PPE violations)`
              : ` (Unauthorized Access)`}
            . Immediate attention required.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Personnel Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personnel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPersonnel}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{stats.authorizedPersonnel} authorized</span>
              {stats.pendingApprovals > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {stats.pendingApprovals} pending
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Camera Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cameras</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCameras}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{stats.activeCameras} online</span>
              {stats.offlineCameras > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.offlineCameras} offline
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Violations Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Safety Violations
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violation-red">
              {stats.activeViolations}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{stats.ppeViolationsCount} PPE</span>
              <span>•</span>
              <span>{stats.unauthorizedAccessCount} Unauthorized</span>
            </div>
          </CardContent>
        </Card>

        {/* Incidents Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidents</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.recentIncidents} in last 24h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Camera Network</span>
                <span className="text-sm text-muted-foreground">
                  {cameraHealthPercentage}%
                </span>
              </div>
              <Progress value={cameraHealthPercentage} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Personnel Authorization
                </span>
                <span className="text-sm text-muted-foreground">
                  {personnelAuthPercentage}%
                </span>
              </div>
              <Progress value={personnelAuthPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add Personnel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Add Camera
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View Live Feed
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card> */}

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="p-4 h-auto bg-security-blue hover:bg-blue-700 text-white flex flex-col items-center"
              onClick={() => generateQRCode(siteId)}
              disabled={isGeneratingQR}
            >
              <QrCode className="text-2xl mb-2" />
              <span className="text-sm font-medium">
                {isGeneratingQR ? "Generating..." : "Generate QR Code"}
              </span>
            </Button>

            <Button className="p-4 h-auto bg-authorized-green hover:bg-green-700 text-white flex flex-col items-center">
              <UserPlus className="text-2xl mb-2" />
              <span className="text-sm font-medium">Add Personnel</span>
            </Button>

            <Button className="p-4 h-auto bg-warning-orange hover:bg-orange-600 text-white flex flex-col items-center">
              <Bell className="text-2xl mb-2" />
              <span className="text-sm font-medium">Send Alert</span>
            </Button>

            <Button
              className="p-4 h-auto bg-gray-600 hover:bg-gray-700 text-white flex flex-col items-center"
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
            >
              <Download className="text-2xl mb-2" />
              <span className="text-sm font-medium">
                {isGeneratingReport ? "Generating..." : "Export Report"}
              </span>
            </Button>

            <Button
              className="p-4 h-auto bg-purple-600 hover:bg-purple-700 text-white flex flex-col items-center"
              onClick={() => router.push(`/${siteSlug}/settings`)}
            >
              <MessageCircle className="text-2xl mb-2" />
              <span className="text-sm font-medium">Telegram Setup</span>
            </Button>
          </div>

          {/* QR Code Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Site Sign-up QR Code
            </h4>
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center">
                <QrCode className="text-3xl text-gray-400" />
              </div>
              <div className="flex-1 ml-4">
                <p className="text-xs text-gray-600">Scan to access:</p>
                <p className="text-xs font-mono bg-white px-2 py-1 rounded border">
                  /signup
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Valid for today only
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {personnel?.slice(0, 3).map((person: any) => (
              <div
                key={person.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">{person.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.status === "authorized"
                        ? "Authorized access"
                        : "Pending authorization"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    person.status === "authorized" ? "default" : "secondary"
                  }
                >
                  {person.status === "authorized" ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <XCircle className="w-3 h-3 mr-1" />
                  )}
                  {person.status}
                </Badge>
              </div>
            ))}
            {(!personnel || personnel.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No recent activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Calendar, Eye, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { generatePPEViolationReportBlob } from "@/lib/pdf-generator";
import { toast } from "sonner";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReportsProps {
  siteId: string;
  siteName: string;
  siteLocation: string;
  siteCode: string;
}

export default function Reports({ siteId, siteName, siteLocation, siteCode }: ReportsProps) {
  const { data: incidents, isLoading: incidentsLoading } =
    trpc.getIncidentsBySite.useQuery(siteId);

  // Fetch recent violations to display as incidents
  const { data: ppeViolations, isLoading: ppeLoading } = trpc.getPPEViolationsBySite.useQuery(
    { siteId, limit: 5, skip: 0 },
    { refetchInterval: 5000 }
  );

  const { data: unauthorizedAccess, isLoading: unauthLoading } = trpc.getUnauthorizedAccessBySite.useQuery(
    { siteId, limit: 5, skip: 0 },
    { refetchInterval: 5000 }
  );

  const { data: restrictedZone, isLoading: zoneLoading } = trpc.getRestrictedZoneViolationsBySite.useQuery(
    { siteId, limit: 5, skip: 0 },
    { refetchInterval: 5000 }
  );

  const isLoading = incidentsLoading || ppeLoading || unauthLoading || zoneLoading;

  const utils = trpc.useUtils();
  const [isGeneratingDaily, setIsGeneratingDaily] = React.useState(false);
  const [isGeneratingMonthly, setIsGeneratingMonthly] = React.useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = React.useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = React.useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const site = {
    name: siteName,
    location: siteLocation,
    code: siteCode,
  };

  const handleClosePreviw = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
    setIsPreviewOpen(false);
  };

  const handleGenerateDailyReport = async () => {
    setIsGeneratingDaily(true);
    toast.loading("Generating Daily Summary...", { id: "daily-report" });

    try {
      // Get today's date range in Singapore time
      const now = new Date();
      const todayStart = new Date(Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0, 0, 0, 0
      ));
      const todayEnd = new Date(Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23, 59, 59, 999
      ));

      const reportData = await utils.client.getPPEViolationReport.query({
        siteId,
        startDate: todayStart,
        endDate: todayEnd,
      });

      // Generate PDF blob and create URL for preview
      const pdfBlob = generatePPEViolationReportBlob(reportData, site);
      const url = URL.createObjectURL(pdfBlob);

      setPdfPreviewUrl(url);
      setPreviewTitle("Daily Summary");
      setIsPreviewOpen(true);

      toast.success("Daily Summary Generated Successfully", { id: "daily-report" });
    } catch (error: any) {
      toast.error(`Failed to Generate Report: ${error.message}`, { id: "daily-report" });
    } finally {
      setIsGeneratingDaily(false);
    }
  };

  const handleGenerateMonthlyReport = async () => {
    setIsGeneratingMonthly(true);
    toast.loading("Generating Monthly Report...", { id: "monthly-report" });

    try {
      // Create dates for last 30 days
      const now = new Date();
      const endDate = new Date(Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      ));

      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = new Date(Date.UTC(
        thirtyDaysAgo.getFullYear(),
        thirtyDaysAgo.getMonth(),
        thirtyDaysAgo.getDate(),
        0, 0, 0, 0
      ));

      const reportData = await utils.client.getPPEViolationReport.query({
        siteId,
        startDate,
        endDate,
      });

      // Generate PDF blob and create URL for preview
      const pdfBlob = generatePPEViolationReportBlob(reportData, site);
      const url = URL.createObjectURL(pdfBlob);

      setPdfPreviewUrl(url);
      setPreviewTitle("Monthly Report");
      setIsPreviewOpen(true);

      toast.success("Monthly Report Generated Successfully", { id: "monthly-report" });
    } catch (error: any) {
      toast.error(`Failed to Generate Report: ${error.message}`, { id: "monthly-report" });
    } finally {
      setIsGeneratingMonthly(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const reportTypes = [
    {
      title: "Daily Summary",
      description: "Today's violations and attendance",
      icon: FileText,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Monthly Report",
      description: "Comprehensive site analytics and violations",
      icon: Calendar,
      color: "bg-green-50 text-green-600",
    },
  ];

  const formatTime = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Reports & Analytics
        </h2>
        <p className="text-gray-600">Generate and download site reports</p>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {reportTypes.map((report, index) => {
          const Icon = report.icon;
          const isDaily = report.title === "Daily Summary";
          const isGenerating = isDaily ? isGeneratingDaily : isGeneratingMonthly;
          const handleClick = isDaily ? handleGenerateDailyReport : handleGenerateMonthlyReport;

          return (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-lg ${report.color} flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClick}
                  disabled={isGenerating}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {isGenerating ? "Generating..." : "Preview"}
                </Button>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {report.title}
              </h3>
              <p className="text-sm text-gray-600">{report.description}</p>
            </Card>
          );
        })}
      </div>

      {/* Recent Incidents - Combined Violations */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Safety Incidents
        </h3>
        <div className="space-y-4">
          {/* PPE Violations */}
          {ppeViolations?.slice(0, 3).map((violation: any) => {
            const missing = Array.isArray(violation.ppeMissing)
              ? violation.ppeMissing
              : JSON.parse(violation.ppeMissing || '[]');

            return (
              <Card
                key={`ppe-${violation.id}`}
                className="p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        PPE Violation
                      </h4>
                      <Badge className={getSeverityColor(violation.severity)}>
                        {violation.severity.charAt(0).toUpperCase() +
                          violation.severity.slice(1)}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {violation.personName} - Missing: {missing.join(", ")}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Location: {violation.location || violation.cameraName || "N/A"}</span>
                      <span>{formatTime(violation.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant={violation.status === "active" ? "destructive" : "default"}>
                      {violation.status === "active" ? "Active" : "Resolved"}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Unauthorized Access */}
          {unauthorizedAccess?.slice(0, 2).map((violation: any) => (
            <Card
              key={`unauth-${violation.id}`}
              className="p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-gray-900">
                      Unauthorized Access
                    </h4>
                    <Badge className={getSeverityColor(violation.severity)}>
                      {violation.severity.charAt(0).toUpperCase() +
                        violation.severity.slice(1)}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {violation.identifiedPersonName || "Unknown Person"} detected
                  </p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Location: {violation.location || "N/A"}</span>
                    <span>Duration: {Math.floor(violation.durationSeconds)}s</span>
                    <span>{formatTime(violation.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant={violation.status === "active" ? "destructive" : "default"}>
                    {violation.status === "active" ? "Active" : "Resolved"}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}

          {/* Restricted Zone Violations */}
          {restrictedZone?.slice(0, 2).map((violation: any) => {
            const personName = violation.description?.split(' detected in ')[0] || 'Unknown';
            const zoneName = violation.description?.split(' detected in ')[1] || violation.location;

            return (
              <Card
                key={`zone-${violation.id}`}
                className="p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        Restricted Zone Intrusion
                      </h4>
                      <Badge className={getSeverityColor(violation.severity)}>
                        {violation.severity.charAt(0).toUpperCase() +
                          violation.severity.slice(1)}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {personName} entered {zoneName}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Location: {violation.location || "N/A"}</span>
                      <span>{formatTime(violation.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant={violation.status === "active" ? "destructive" : "default"}>
                      {violation.status === "active" ? "Active" : "Resolved"}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* No incidents message */}
      {!ppeViolations?.length && !unauthorizedAccess?.length && !restrictedZone?.length && !isLoading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Recent Safety Incidents
          </h3>
          <p className="text-gray-600">All systems are running smoothly</p>
        </div>
      )}

      {/* PDF Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={handleClosePreviw}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>{previewTitle} - Preview</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (pdfPreviewUrl) {
                    const link = document.createElement('a');
                    link.href = pdfPreviewUrl;
                    link.download = `${previewTitle.replace(' ', '_')}_${site.code}_${new Date().toISOString().split('T')[0]}.pdf`;
                    link.click();
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden" style={{ height: 'calc(95vh - 80px)' }}>
            {pdfPreviewUrl && (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

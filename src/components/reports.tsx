"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Calendar, BarChart } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface ReportsProps {
  siteId: string;
}

export default function Reports({ siteId }: ReportsProps) {
  const { data: incidents, isLoading } =
    trpc.getIncidentsBySite.useQuery(siteId);

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
      description: "Personnel activity and incidents",
      icon: FileText,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Safety Report",
      description: "PPE violations and safety metrics",
      icon: BarChart,
      color: "bg-red-50 text-red-600",
    },
    {
      title: "Monthly Report",
      description: "Comprehensive site analytics",
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {reportTypes.map((report, index) => {
          const Icon = report.icon;
          return (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-lg ${report.color} flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download
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

      {/* Recent Incidents */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Incidents
        </h3>
        <div className="space-y-4">
          {incidents?.map((incident) => (
            <Card
              key={incident.id}
              className="p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {incident.type}
                    </h4>
                    <Badge className={getSeverityColor(incident.severity)}>
                      {incident.severity.charAt(0).toUpperCase() +
                        incident.severity.slice(1)}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {incident.description}
                  </p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Type: {incident.type}</span>
                    <span>Reported by: {incident.reportedBy}</span>
                    <span>{formatTime(incident.reportedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge
                    variant={!incident.isResolved ? "destructive" : "default"}
                  >
                    {incident.isResolved ? "Resolved" : "Open"}
                  </Badge>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {incidents?.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Recent Incidents
          </h3>
          <p className="text-gray-600">All systems are running smoothly</p>
        </div>
      )}
    </div>
  );
}

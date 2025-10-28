"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface PPEViolationsProps {
  siteId: string;
}

export default function PPEViolations({ siteId }: PPEViolationsProps) {
  const { data: violations, isLoading } = trpc.getViolationsBySite.useQuery(
    siteId,
    {
      refetchInterval: 5000, // Refresh every 5 seconds for live monitoring
    }
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
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

  const formatTime = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          PPE Violations
        </h2>
        <p className="text-gray-600">
          AI-detected safety violations and incidents
        </p>
      </div>

      <div className="space-y-4">
        {violations?.map((violation) => (
          <Card
            key={violation.id}
            className="p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  {violation.imageUrl ? (
                    <img
                      src={violation.imageUrl}
                      alt="Violation"
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-gray-400" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {violation.type.replace(/_/g, " ").toUpperCase()}
                    </h3>
                    <Badge className={getSeverityColor(violation.severity)}>
                      {violation.severity.charAt(0).toUpperCase() +
                        violation.severity.slice(1)}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {violation.description}
                  </p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{formatTime(violation.createdAt)}</span>
                    {violation.location && (
                      <span>Location: {violation.location}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4" />
                </Button>
                {!violation.resolvedAt && violation.status === "active" && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {violations?.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Violations Detected
          </h3>
          <p className="text-gray-600">
            All personnel are complying with safety protocols
          </p>
        </div>
      )}
    </div>
  );
}

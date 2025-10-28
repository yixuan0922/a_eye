"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Eye, CheckCircle, HardHat, ShieldAlert, X, Search, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { convertS3UrlToHttps } from "@/lib/s3";
import { useToast } from "@/hooks/use-toast";

interface PPEViolationsProps {
  siteId: string;
}

export default function PPEViolations({ siteId }: PPEViolationsProps) {
  const { toast } = useToast();
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch PPE violations from the PPEViolation table
  const { data: ppeViolations, isLoading: isPPELoading, refetch: refetchPPE } = trpc.getPPEViolationsBySite.useQuery(
    siteId,
    {
      refetchInterval: 5000, // Refresh every 5 seconds for live monitoring
    }
  );

  // Fetch Unauthorized Access violations from the Violation table
  const { data: unauthorizedViolations, isLoading: isUnauthorizedLoading, refetch: refetchUnauthorized } = trpc.getViolationsBySite.useQuery(
    siteId,
    {
      refetchInterval: 5000, // Refresh every 5 seconds for live monitoring
    }
  );

  // Resolve PPE violation mutation
  const resolvePPEViolationMutation = trpc.resolvePPEViolation.useMutation({
    onSuccess: () => {
      toast({
        title: "Violation Resolved",
        description: "The violation has been marked as resolved.",
      });
      refetchPPE();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to resolve violation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Resolve unauthorized violation mutation
  const resolveViolationMutation = trpc.resolveViolation.useMutation({
    onSuccess: () => {
      toast({
        title: "Violation Resolved",
        description: "The violation has been marked as resolved.",
      });
      refetchUnauthorized();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to resolve violation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const isLoading = isPPELoading || isUnauthorizedLoading;

  // Filter out low severity violations and apply search/date filters
  const filteredPPEViolations = ppeViolations?.filter((v: any) => {
    // Filter out low severity
    if (v.severity === "low") return false;

    // Filter by name search
    if (searchName && !v.personName.toLowerCase().includes(searchName.toLowerCase())) {
      return false;
    }

    // Filter by date & time range
    if (startDate || endDate) {
      const violationDate = new Date(v.updatedAt);
      if (startDate) {
        const start = new Date(startDate);
        if (violationDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (violationDate > end) return false;
      }
    }

    return true;
  });

  const filteredUnauthorizedViolations = unauthorizedViolations?.filter(
    (v: any) => v.severity !== "low"
  );

  const handleViewDetails = (violation: any) => {
    setSelectedViolation(violation);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedViolation(null);
  };

  const handleResolvePPEViolation = (violationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    resolvePPEViolationMutation.mutate({
      id: violationId,
      resolvedBy: "System Admin", // You can replace this with actual user info
      resolutionNotes: "Resolved via dashboard",
    });
  };

  const handleResolveViolation = (violationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    resolveViolationMutation.mutate({
      id: violationId,
      resolvedBy: "System Admin", // You can replace this with actual user info
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Safety Violations
          </h2>
          <p className="text-gray-600">
            AI-detected safety violations and incidents
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PPE Violations Loading */}
          <div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          {/* Unauthorized Access Loading */}
          <div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
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

  const formatTime = (date: Date | string | null) => {
    if (!date) return "Never";

    // Manual date formatting helper that doesn't apply timezone conversion
    const formatDateManually = (year: number, month: number, day: number, hour: number, minute: number, second: number) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const monthStr = pad(month);
      const dayStr = pad(day);
      const hourStr12 = hour % 12 || 12; // Convert to 12-hour format
      const hourStr = pad(hourStr12);
      const minuteStr = pad(minute);
      const secondStr = pad(second);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return `${monthStr}/${dayStr}/${year}, ${hourStr}:${minuteStr}:${secondStr} ${ampm}`;
    };

    // Convert Date object to SGT by adding 8 hours
    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date);
      return "Invalid date";
    }

    // Add 8 hours to convert UTC to SGT
    const sgtDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));

    // Extract components from SGT date
    const year = sgtDate.getUTCFullYear();
    const month = sgtDate.getUTCMonth() + 1;
    const day = sgtDate.getUTCDate();
    const hour = sgtDate.getUTCHours();
    const minute = sgtDate.getUTCMinutes();
    const second = sgtDate.getUTCSeconds();

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / 60000);

    // If the date is in the future (negative diff), show the formatted date
    if (diffInMinutes < -5) {
      return formatDateManually(year, month, day, hour, minute, second);
    }

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}d ago`;

    // For older dates, return formatted date manually
    return formatDateManually(year, month, day, hour, minute, second);
  };

  const renderPPEViolation = (violation: any) => {
    // Parse JSON fields if they're strings
    const ppeMissing = Array.isArray(violation.ppeMissing)
      ? violation.ppeMissing
      : typeof violation.ppeMissing === 'string'
      ? JSON.parse(violation.ppeMissing)
      : [];

    const ppeWearing = Array.isArray(violation.ppeWearing)
      ? violation.ppeWearing
      : typeof violation.ppeWearing === 'string'
      ? JSON.parse(violation.ppeWearing)
      : [];

    // Convert S3 URL to HTTPS URL
    const imageUrl = convertS3UrlToHttps(violation.snapshotUrl);

    return (
      <Card
        key={violation.id}
        className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => handleViewDetails(violation)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="PPE Violation"
                  className="w-full h-full object-cover"
                />
              ) : (
                <HardHat className="w-8 h-8 text-gray-400" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="font-semibold text-gray-900">
                  {violation.personName}
                </h3>
                <Badge className={getSeverityColor(violation.severity)}>
                  {violation.severity.charAt(0).toUpperCase() +
                    violation.severity.slice(1)}
                </Badge>
              </div>

              {ppeMissing.length > 0 && (
                <p className="text-sm text-red-600 mb-1">
                  <span className="font-medium">Missing:</span> {ppeMissing.join(", ")}
                </p>
              )}

              {ppeWearing.length > 0 && (
                <p className="text-sm text-green-600 mb-2">
                  <span className="font-medium">Wearing:</span> {ppeWearing.join(", ")}
                </p>
              )}

              <div className="flex flex-col space-y-1 text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>{formatTime(violation.updatedAt)}</span>
                  {violation.cameraName && (
                    <span>Camera: {violation.cameraName}</span>
                  )}
                </div>
                {violation.location && (
                  <span>Location: {violation.location}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!violation.resolvedAt && violation.status === "active" && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={(e) => handleResolvePPEViolation(violation.id, e)}
                disabled={resolvePPEViolationMutation.isPending}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderUnauthorizedViolation = (violation: any) => (
    <Card
      key={violation.id}
      className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => handleViewDetails(violation)}
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
              <ShieldAlert className="w-8 h-8 text-gray-400" />
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
          {!violation.resolvedAt && violation.status === "active" && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={(e) => handleResolveViolation(violation.id, e)}
              disabled={resolveViolationMutation.isPending}
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Safety Violations
        </h2>
        <p className="text-gray-600">
          AI-detected safety violations and incidents
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PPE Violations Column */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <HardHat className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">
              PPE Violations ({filteredPPEViolations?.length || 0})
            </h3>
          </div>

          {/* Search and Filter Controls */}
          <div className="space-y-3 mb-4">
            {/* Name Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Date & Time Range Filter */}
            <div className="grid grid-cols-1 gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start date & time"
                  className="pl-10 text-sm"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End date & time"
                  className="pl-10 text-sm"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {(searchName || startDate || endDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchName("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {filteredPPEViolations && filteredPPEViolations.length > 0 ? (
              filteredPPEViolations.map(renderPPEViolation)
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  No PPE Violations
                </h4>
                <p className="text-xs text-gray-600">
                  All personnel are wearing required PPE
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Unauthorized Access Violations Column */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">
              Unauthorized Access ({filteredUnauthorizedViolations?.length || 0})
            </h3>
          </div>
          <div className="space-y-4">
            {filteredUnauthorizedViolations && filteredUnauthorizedViolations.length > 0 ? (
              filteredUnauthorizedViolations.map(renderUnauthorizedViolation)
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  No Unauthorized Access
                </h4>
                <p className="text-xs text-gray-600">
                  All access is authorized
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Violation Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Violation Details</span>
              {selectedViolation && (
                <Badge className={getSeverityColor(selectedViolation.severity)}>
                  {selectedViolation.severity.toUpperCase()}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedViolation && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Side - Snapshot Image */}
              <div className="flex flex-col">
                {selectedViolation.snapshotUrl ? (
                  <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                    <img
                      src={convertS3UrlToHttps(selectedViolation.snapshotUrl) || ''}
                      alt="Violation Snapshot"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height: '500px' }}>
                    <div className="text-center">
                      <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No snapshot available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Details */}
              <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '500px' }}>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Person Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-sm font-medium">{selectedViolation.personName || 'Unknown'}</p>
                    </div>
                    {selectedViolation.confidenceScore && (
                      <div>
                        <p className="text-xs text-gray-500">Recognition Confidence</p>
                        <p className="text-sm font-medium">{(selectedViolation.confidenceScore * 100).toFixed(1)}%</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* PPE Information (for PPE violations) */}
                {selectedViolation.ppeMissing && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">PPE Status</h3>
                    <div className="space-y-2">
                      {(() => {
                        const missing = Array.isArray(selectedViolation.ppeMissing)
                          ? selectedViolation.ppeMissing
                          : JSON.parse(selectedViolation.ppeMissing || '[]');
                        const wearing = Array.isArray(selectedViolation.ppeWearing)
                          ? selectedViolation.ppeWearing
                          : JSON.parse(selectedViolation.ppeWearing || '[]');
                        const required = Array.isArray(selectedViolation.ppeRequired)
                          ? selectedViolation.ppeRequired
                          : JSON.parse(selectedViolation.ppeRequired || '[]');

                        return (
                          <>
                            {missing.length > 0 && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-red-800 mb-1">Missing PPE</p>
                                <p className="text-sm text-red-700">{missing.join(', ')}</p>
                              </div>
                            )}
                            {wearing.length > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-green-800 mb-1">Wearing</p>
                                <p className="text-sm text-green-700">{wearing.join(', ')}</p>
                              </div>
                            )}
                            {required.length > 0 && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-blue-800 mb-1">Required PPE</p>
                                <p className="text-sm text-blue-700">{required.join(', ')}</p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Location & Camera */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Location Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Camera</p>
                      <p className="text-sm font-medium">{selectedViolation.cameraName || 'N/A'}</p>
                    </div>
                    {selectedViolation.location && (
                      <div>
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="text-sm font-medium">{selectedViolation.location}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Violation Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Violation Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Detection Time</p>
                      <p className="text-sm font-medium">
                        {formatTime(selectedViolation.updatedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className="text-sm font-medium capitalize">{selectedViolation.status}</p>
                    </div>
                    {selectedViolation.violationReason && (
                      <div>
                        <p className="text-xs text-gray-500">Reason</p>
                        <p className="text-sm font-medium capitalize">
                          {selectedViolation.violationReason.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                    {selectedViolation.type && (
                      <div>
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="text-sm font-medium capitalize">
                          {selectedViolation.type.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                    {selectedViolation.description && (
                      <div>
                        <p className="text-xs text-gray-500">Description</p>
                        <p className="text-sm font-medium">{selectedViolation.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolution Information */}
                {(selectedViolation.resolvedAt || selectedViolation.acknowledgedAt) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Resolution</h3>
                    <div className="space-y-3">
                      {selectedViolation.resolvedAt && (
                        <>
                          <div>
                            <p className="text-xs text-gray-500">Resolved At</p>
                            <p className="text-sm font-medium">
                              {new Date(selectedViolation.resolvedAt).toLocaleString()}
                            </p>
                          </div>
                          {selectedViolation.resolvedBy && (
                            <div>
                              <p className="text-xs text-gray-500">Resolved By</p>
                              <p className="text-sm font-medium">{selectedViolation.resolvedBy}</p>
                            </div>
                          )}
                        </>
                      )}
                      {selectedViolation.acknowledgedAt && (
                        <>
                          <div>
                            <p className="text-xs text-gray-500">Acknowledged At</p>
                            <p className="text-sm font-medium">
                              {new Date(selectedViolation.acknowledgedAt).toLocaleString()}
                            </p>
                          </div>
                          {selectedViolation.acknowledgedBy && (
                            <div>
                              <p className="text-xs text-gray-500">Acknowledged By</p>
                              <p className="text-sm font-medium">{selectedViolation.acknowledgedBy}</p>
                            </div>
                          )}
                        </>
                      )}
                      {selectedViolation.resolutionNotes && (
                        <div>
                          <p className="text-xs text-gray-500">Notes</p>
                          <p className="text-sm font-medium">{selectedViolation.resolutionNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

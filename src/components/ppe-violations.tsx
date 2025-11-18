"use client";

import { useState, useEffect } from "react";
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
import { AlertTriangle, Eye, CheckCircle, HardHat, ShieldAlert, X, Search, Calendar, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { convertS3UrlToHttps } from "@/lib/s3";
import { useToast } from "@/hooks/use-toast";

interface PPEViolationsProps {
  siteId: string;
}

const ITEMS_PER_PAGE = 10;

export default function PPEViolations({ siteId }: PPEViolationsProps) {
  const { toast } = useToast();
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Search and filter states for PPE
  const [searchName, setSearchName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Search and filter states for Unauthorized Access
  const [unauthorizedStartDate, setUnauthorizedStartDate] = useState("");
  const [unauthorizedEndDate, setUnauthorizedEndDate] = useState("");

  // Search and filter states for Restricted Zone
  const [restrictedZoneSearchName, setRestrictedZoneSearchName] = useState("");
  const [restrictedZoneStartDate, setRestrictedZoneStartDate] = useState("");
  const [restrictedZoneEndDate, setRestrictedZoneEndDate] = useState("");


  // Check for recent PPE violations and send Telegram notifications
  useEffect(() => {
    const checkRecentViolations = async () => {
      try {
        await fetch('/api/check-recent-violations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId }),
        });
      } catch (error) {
        console.error('Failed to check recent PPE violations:', error);
      }
    };

    // Check immediately on mount
    checkRecentViolations();

    // Then check every 3 seconds
    const interval = setInterval(checkRecentViolations, 3000);

    return () => clearInterval(interval);
  }, [siteId]);

  // Check for recent zone intrusions and send Telegram notifications
  useEffect(() => {
    const checkRecentZoneIntrusions = async () => {
      try {
        await fetch('/api/check-recent-zone-intrusions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId }),
        });
      } catch (error) {
        console.error('Failed to check recent zone intrusions:', error);
      }
    };

    // Check immediately on mount
    checkRecentZoneIntrusions();

    // Then check every 3 seconds
    const interval = setInterval(checkRecentZoneIntrusions, 3000);

    return () => clearInterval(interval);
  }, [siteId]);

  // Pagination states for each section
  const [ppePage, setPpePage] = useState(0);
  const [unauthorizedPage, setUnauthorizedPage] = useState(0);
  const [restrictedZonePage, setRestrictedZonePage] = useState(0);

  // Fetch PPE violations with pagination
  const { data: ppeViolations, isLoading: isPPELoading, refetch: refetchPPE } = trpc.getPPEViolationsBySite.useQuery(
    {
      siteId,
      limit: ITEMS_PER_PAGE,
      skip: ppePage * ITEMS_PER_PAGE,
    },
    {
      refetchInterval: 3000, // Refresh every 3 seconds for live monitoring
    }
  );

  // Fetch PPE violations count
  const { data: ppeCount } = trpc.getPPEViolationsCount.useQuery(siteId, {
    refetchInterval: 3000,
  });

  // Fetch Unauthorized Access violations with pagination
  const { data: unauthorizedViolations, isLoading: isUnauthorizedLoading, refetch: refetchUnauthorized } = trpc.getUnauthorizedAccessBySite.useQuery(
    {
      siteId,
      limit: ITEMS_PER_PAGE,
      skip: unauthorizedPage * ITEMS_PER_PAGE,
    },
    {
      refetchInterval: 3000, // Refresh every 3 seconds for live monitoring
    }
  );

  // Fetch Unauthorized Access count
  const { data: unauthorizedCount } = trpc.getUnauthorizedAccessCount.useQuery(siteId, {
    refetchInterval: 3000,
  });

  // Fetch Restricted Zone violations with pagination
  const { data: restrictedZoneViolations, isLoading: isRestrictedZoneLoading, refetch: refetchRestrictedZone } = trpc.getRestrictedZoneViolationsBySite.useQuery(
    {
      siteId,
      limit: ITEMS_PER_PAGE,
      skip: restrictedZonePage * ITEMS_PER_PAGE,
    },
    {
      refetchInterval: 3000, // Refresh every 3 seconds for live monitoring
    }
  );

  // Fetch Restricted Zone count
  const { data: restrictedZoneCount } = trpc.getRestrictedZoneViolationsCount.useQuery(siteId, {
    refetchInterval: 3000,
  });

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

  // Resolve unauthorized access mutation
  const resolveUnauthorizedAccessMutation = trpc.resolveUnauthorizedAccess.useMutation({
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

  // Resolve violation mutation (for restricted zone)
  const resolveViolationMutation = trpc.resolveViolation.useMutation({
    onSuccess: () => {
      toast({
        title: "Violation Resolved",
        description: "The violation has been marked as resolved.",
      });
      refetchRestrictedZone();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to resolve violation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const isLoading = isPPELoading || isUnauthorizedLoading || isRestrictedZoneLoading;

  // Filter out low severity violations and apply search/date filters for PPE
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

  // Filter unauthorized access violations
  const filteredUnauthorizedViolations = unauthorizedViolations?.filter((v: any) => {
    // Filter out low severity
    if (v.severity === "low") return false;

    // Filter by date & time range
    if (unauthorizedStartDate || unauthorizedEndDate) {
      const violationDate = new Date(v.detectionTimestamp);
      if (unauthorizedStartDate) {
        const start = new Date(unauthorizedStartDate);
        if (violationDate < start) return false;
      }
      if (unauthorizedEndDate) {
        const end = new Date(unauthorizedEndDate);
        if (violationDate > end) return false;
      }
    }

    return true;
  });

  // Filter restricted zone violations
  const filteredRestrictedZoneViolations = restrictedZoneViolations?.filter((v: any) => {
    // Filter out low severity
    if (v.severity === "low") return false;

    // Extract person name from description for filtering
    const personName = v.description?.split(' detected in ')[0] || '';

    // Filter by name search
    if (restrictedZoneSearchName && !personName.toLowerCase().includes(restrictedZoneSearchName.toLowerCase())) {
      return false;
    }

    // Filter by date & time range
    if (restrictedZoneStartDate || restrictedZoneEndDate) {
      const violationDate = new Date(v.createdAt);
      if (restrictedZoneStartDate) {
        const start = new Date(restrictedZoneStartDate);
        if (violationDate < start) return false;
      }
      if (restrictedZoneEndDate) {
        const end = new Date(restrictedZoneEndDate);
        if (violationDate > end) return false;
      }
    }

    return true;
  });

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

  const handleResolveUnauthorizedAccess = (violationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    resolveUnauthorizedAccessMutation.mutate({
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          {/* Restricted Zone Loading */}
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

  const renderUnauthorizedAccessViolation = (violation: any) => {
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
            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Unauthorized Access"
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                <ShieldAlert className="w-8 h-8 text-gray-400" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="font-semibold text-gray-900">
                  {violation.identifiedPersonName || "Unknown Person"}
                </h3>
                <Badge className={getSeverityColor(violation.severity)}>
                  {violation.severity.charAt(0).toUpperCase() +
                    violation.severity.slice(1)}
                </Badge>
              </div>

              <p className="text-sm text-gray-600 mb-2">
                Duration: {Math.floor(violation.durationSeconds)}s • Frames: {violation.totalFramesTracked}
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
                onClick={(e) => handleResolveUnauthorizedAccess(violation.id, e)}
                disabled={resolveUnauthorizedAccessMutation.isPending}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // Format time for restricted zone violations (timestamps already in SGT, no conversion needed)
  const formatRestrictedZoneTime = (date: Date | string | null) => {
    if (!date) return "Never";

    const formatDateManually = (year: number, month: number, day: number, hour: number, minute: number, second: number) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const monthStr = pad(month);
      const dayStr = pad(day);
      const hourStr12 = hour % 12 || 12;
      const hourStr = pad(hourStr12);
      const minuteStr = pad(minute);
      const secondStr = pad(second);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return `${monthStr}/${dayStr}/${year}, ${hourStr}:${minuteStr}:${secondStr} ${ampm}`;
    };

    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date);
      return "Invalid date";
    }

    // Use UTC components directly (timestamps are already stored in SGT)
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth() + 1;
    const day = dateObj.getUTCDate();
    const hour = dateObj.getUTCHours();
    const minute = dateObj.getUTCMinutes();
    const second = dateObj.getUTCSeconds();

    // For relative time, we need to compare SGT timestamp with current SGT time
    // Since timestamp is stored in SGT (as UTC), we add 8 hours to current time to match
    const now = new Date();
    const nowSgt = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const diffInMinutes = Math.floor((nowSgt.getTime() - dateObj.getTime()) / 60000);

    if (diffInMinutes < -5) {
      return formatDateManually(year, month, day, hour, minute, second);
    }

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}d ago`;

    return formatDateManually(year, month, day, hour, minute, second);
  };

  const renderRestrictedZoneViolation = (violation: any) => {
    // Convert S3 URL to HTTPS URL
    const imageUrl = convertS3UrlToHttps(violation.imageUrl);

    // Extract person name from description if available
    // Expected format: "PersonName detected in ZoneName"
    const personName = violation.description?.split(' detected in ')[0] || 'Unknown Person';
    const zoneName = violation.description?.split(' detected in ')[1] || violation.location;

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
                  alt="Restricted Zone Violation"
                  className="w-full h-full object-cover"
                />
              ) : (
                <MapPin className="w-8 h-8 text-gray-400" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="font-semibold text-gray-900">
                  {personName}
                </h3>
                <Badge className={getSeverityColor(violation.severity)}>
                  {violation.severity.charAt(0).toUpperCase() +
                    violation.severity.slice(1)}
                </Badge>
              </div>

              <p className="text-sm text-red-600 mb-1">
                <span className="font-medium">Zone:</span> {zoneName}
              </p>

              <div className="flex flex-col space-y-1 text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>{formatRestrictedZoneTime(violation.createdAt)}</span>
                  {violation.camera?.name && (
                    <span>Camera: {violation.camera.name}</span>
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
  };

  const renderPagination = (currentPage: number, totalCount: number, onPageChange: (page: number) => void) => {
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-600">
          Page {currentPage + 1} of {totalPages} ({totalCount} total)
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PPE Violations Column */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <HardHat className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">
              PPE Violations ({ppeCount || 0})
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

          {renderPagination(ppePage, ppeCount || 0, setPpePage)}
        </div>

        {/* Unauthorized Access Violations Column */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">
              Unauthorized Access ({unauthorizedCount || 0})
            </h3>
          </div>

          {/* Search and Filter Controls */}
          <div className="space-y-3 mb-4">
            {/* Date & Time Range Filter */}
            <div className="grid grid-cols-1 gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="datetime-local"
                  value={unauthorizedStartDate}
                  onChange={(e) => setUnauthorizedStartDate(e.target.value)}
                  placeholder="Start date & time"
                  className="pl-10 text-sm"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="datetime-local"
                  value={unauthorizedEndDate}
                  onChange={(e) => setUnauthorizedEndDate(e.target.value)}
                  placeholder="End date & time"
                  className="pl-10 text-sm"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {(unauthorizedStartDate || unauthorizedEndDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUnauthorizedStartDate("");
                  setUnauthorizedEndDate("");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {filteredUnauthorizedViolations && filteredUnauthorizedViolations.length > 0 ? (
              filteredUnauthorizedViolations.map(renderUnauthorizedAccessViolation)
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

          {renderPagination(unauthorizedPage, unauthorizedCount || 0, setUnauthorizedPage)}
        </div>

        {/* Restricted Zone Violations Column */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">
              Restricted Zone ({restrictedZoneCount || 0})
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
                value={restrictedZoneSearchName}
                onChange={(e) => setRestrictedZoneSearchName(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Date & Time Range Filter */}
            <div className="grid grid-cols-1 gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="datetime-local"
                  value={restrictedZoneStartDate}
                  onChange={(e) => setRestrictedZoneStartDate(e.target.value)}
                  placeholder="Start date & time"
                  className="pl-10 text-sm"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="datetime-local"
                  value={restrictedZoneEndDate}
                  onChange={(e) => setRestrictedZoneEndDate(e.target.value)}
                  placeholder="End date & time"
                  className="pl-10 text-sm"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {(restrictedZoneSearchName || restrictedZoneStartDate || restrictedZoneEndDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRestrictedZoneSearchName("");
                  setRestrictedZoneStartDate("");
                  setRestrictedZoneEndDate("");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {filteredRestrictedZoneViolations && filteredRestrictedZoneViolations.length > 0 ? (
              filteredRestrictedZoneViolations.map(renderRestrictedZoneViolation)
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  No Restricted Zone Violations
                </h4>
                <p className="text-xs text-gray-600">
                  All zones are secure
                </p>
              </div>
            )}
          </div>

          {renderPagination(restrictedZonePage, restrictedZoneCount || 0, setRestrictedZonePage)}
        </div>
      </div>

      {/* Violation Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className={`${
          selectedViolation?.type === 'restricted_zone' || selectedViolation?.durationSeconds !== undefined
            ? 'max-w-7xl'
            : 'max-w-5xl'
        } max-h-[90vh] overflow-y-auto`}>
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
            <div className={`grid grid-cols-1 gap-6 ${
              selectedViolation.type === 'restricted_zone' || selectedViolation.durationSeconds !== undefined
                ? 'lg:grid-cols-[2fr,1fr]'
                : 'lg:grid-cols-2'
            }`}>
              {/* Left Side - Snapshot Image */}
              <div className="flex flex-col">
                {(selectedViolation.snapshotUrl || selectedViolation.imageUrl) ? (
                  <div
                    className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center"
                    style={{
                      height: selectedViolation.type === 'restricted_zone' || selectedViolation.durationSeconds !== undefined
                        ? '600px'
                        : '500px'
                    }}
                  >
                    <img
                      src={convertS3UrlToHttps(selectedViolation.snapshotUrl || selectedViolation.imageUrl) || ''}
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
              <div
                className="space-y-4 overflow-y-auto"
                style={{
                  maxHeight: selectedViolation.type === 'restricted_zone' || selectedViolation.durationSeconds !== undefined
                    ? '600px'
                    : '500px'
                }}
              >
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Person Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-sm font-medium">{selectedViolation.personName || selectedViolation.identifiedPersonName || 'Unknown'}</p>
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

                {/* Unauthorized Access Information */}
                {selectedViolation.durationSeconds !== undefined && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Detection Details</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="text-sm font-medium">{Math.floor(selectedViolation.durationSeconds)} seconds</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Frames Tracked</p>
                        <p className="text-sm font-medium">{selectedViolation.totalFramesTracked}</p>
                      </div>
                      {selectedViolation.faceDetectionAttempts !== undefined && (
                        <div>
                          <p className="text-xs text-gray-500">Face Detection Attempts</p>
                          <p className="text-sm font-medium">{selectedViolation.faceDetectionAttempts}</p>
                        </div>
                      )}
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
                        {selectedViolation.type === 'restricted_zone'
                          ? formatRestrictedZoneTime(selectedViolation.createdAt)
                          : formatTime(selectedViolation.updatedAt || selectedViolation.detectionTimestamp || selectedViolation.createdAt)
                        }
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

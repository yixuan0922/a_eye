// components/AttendanceDashboard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";
import {
  Users,
  UserCheck,
  Clock,
  Calendar as CalendarIcon,
  Download,
  Eye,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

interface AttendanceDashboardProps {
  siteId: string;
}

interface DayRecord {
  date: string;
  present: boolean;
  firstSeen: Date;
  lastSeen: Date;
  totalDetections: number;
  cameras: string[];
}

interface PersonReport {
  name: string;
  photoUrl: string;
  days: {
    [date: string]: DayRecord;
  };
}

interface AttendanceRecord {
  id: string;
  timestamp: Date;
  confidence: number;
  personnel: {
    id: string;
    name: string;
    photos: any;
  };
}

export default function AttendanceDashboard({
  siteId,
}: AttendanceDashboardProps) {
  // Render timestamps in UTC without applying local timezone (+8)
  const formatUtcDateTime = (ts: Date | string) => {
    const iso = (ts instanceof Date ? ts : new Date(ts)).toISOString();
    // YYYY-MM-DDTHH:mm:ss.sssZ -> YYYY-MM-DD HH:mm:ss
    return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
  };
  const formatUtcTime = (ts: Date | string, withSeconds: boolean = true) => {
    const iso = (ts instanceof Date ? ts : new Date(ts)).toISOString();
    const hhmmss = iso.slice(11, 19);
    return withSeconds ? hhmmss : hhmmss.slice(0, 5);
  };
  // Helpers to format timestamps:
  // - If ts is a naive string like "YYYY-MM-DD HH:mm:ss(.sss)", show it AS-IS (no timezone math)
  // - Otherwise, render in SGT using Intl (UTC+8)
  const isNaiveDateTimeString = (s: string) => {
    return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(s) && !/[zZ]|([+-]\d{2}:?\d{2})$/.test(s);
  };

  const formatSgtParts = (ts: Date | string) => {
    if (typeof ts === "string" && isNaiveDateTimeString(ts)) {
      // Parse manually without timezone adjustments
      const [datePart, timePartFull] = ts.split(/[T ]/);
      const [year, month, day] = datePart.split("-");
      const [hh, mm] = timePartFull.split(":");
      const hour24 = parseInt(hh, 10);
      const dayPeriod = hour24 < 12 ? "am" : "pm";
      const hour12 = (hour24 % 12 || 12).toString();
      return {
        year,
        month,
        day,
        hour: hour12,
        minute: mm,
        dayPeriod,
      };
    }

    // For Date or ISO strings, render using UTC fields (no timezone shift)
    const d = ts instanceof Date ? ts : new Date(ts);
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = String(d.getUTCFullYear());
    const month = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hour24 = d.getUTCHours();
    const minute = pad(d.getUTCMinutes());
    const dayPeriod = hour24 < 12 ? "am" : "pm";
    const hour = String(hour24 % 12 || 12);
    return { year, month, day, hour, minute, dayPeriod };
  };
  const formatSgtTime12 = (ts: Date | string) => {
    const p = formatSgtParts(ts);
    return `${p.hour}.${p.minute} ${p.dayPeriod}`;
  };
  const formatSgtDateTime12 = (ts: Date | string) => {
    const p = formatSgtParts(ts);
    return `${p.year}-${p.month}-${p.day} ${p.hour}.${p.minute} ${p.dayPeriod}`;
  };

  const getPrimaryPhotoUrl = (photos: any): string | null => {
    if (!photos) return null;
    if (typeof photos === "string") return photos;
    if (Array.isArray(photos)) {
      const firstString = photos.find((p) => typeof p === "string");
      return firstString || null;
    }
    // If photos is stored as an object with urls field
    if (typeof photos === "object" && photos !== null) {
      const maybeUrls = (photos as any).urls || (photos as any).images;
      if (Array.isArray(maybeUrls)) {
        const firstString = maybeUrls.find((p: any) => typeof p === "string");
        return firstString || null;
      }
    }
    return null;
  };
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
  });

  const { data: todayAttendance, isLoading: loadingToday } =
    trpc.getAttendance.useQuery({
      siteId,
      date: selectedDate,
    });

  const { data: attendanceReport, isLoading: loadingReport } =
    trpc.getAttendanceReport.useQuery({
      siteId,
      startDate: dateRange.start,
      endDate: dateRange.end,
    });

  const { data: knownFaces } = trpc.getKnownFaces.useQuery(siteId);
  const { data: authorizedPersonnel } =
    trpc.getAuthorizedPersonnelBySite.useQuery(siteId);

  // Calculate statistics
  const totalPeople = knownFaces?.length || 0;
  const presentToday = todayAttendance?.length || 0;
  const attendanceRate =
    totalPeople > 0 ? Math.round((presentToday / totalPeople) * 100) : 0;

  // Attendance view tab (present | absent)
  const [attendanceTab, setAttendanceTab] = useState<"present" | "absent">(
    "present"
  );

  // Compute absent list: authorized personnel not in today's attendance
  const presentIdSet = new Set(
    (todayAttendance as AttendanceRecord[] | undefined)?.map(
      (r) => r.personnel.id
    )
  );
  const absentAuthorized =
    (authorizedPersonnel || []).filter((p: any) => !presentIdSet.has(p.id)) ||
    [];

  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  const clearTodayAttendance = async () => {
    if (!confirm("Are you sure you want to clear all attendance records for today? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(`/api/attendance/clear?date=${dateStr}&siteId=${siteId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully deleted ${data.deletedCount} attendance record(s)`);
        // Refresh the data
        window.location.reload();
      } else {
        alert(`Failed to clear attendance: ${data.message}`);
      }
    } catch (error) {
      console.error("Error clearing attendance:", error);
      alert("An error occurred while clearing attendance records");
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteAttendanceRecord = async (recordId: string, personnelName: string) => {
    if (!confirm(`Delete attendance record for ${personnelName}?`)) {
      return;
    }

    setDeletingRecordId(recordId);
    try {
      const response = await fetch(`/api/attendance/${recordId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the data
        window.location.reload();
      } else {
        alert(`Failed to delete record: ${data.message}`);
      }
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("An error occurred while deleting the record");
    } finally {
      setDeletingRecordId(null);
    }
  };

  const exportAttendance = () => {
    if (!attendanceReport) return;

    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Name,Date,First Seen,Last Seen,Total Detections,Cameras\n" +
      (attendanceReport as PersonReport[])
        .flatMap((person) =>
          Object.values(person.days).map(
            (day: DayRecord) =>
              `${person.name},${day.date},${formatUtcTime(
                day.firstSeen,
                true
              )},${formatUtcTime(day.lastSeen, true)},${
                day.totalDetections
              },"${day.cameras.join(", ")}"`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `attendance_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total People
                </p>
                <p className="text-2xl font-bold">{totalPeople}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Present Today
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {presentToday}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Attendance Rate
                </p>
                <p className="text-2xl font-bold">{attendanceRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Today's Attendance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Attendance for {format(selectedDate, "MMMM dd, yyyy")}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Tabs
                  value={attendanceTab}
                  onValueChange={(v) => setAttendanceTab(v as any)}
                >
                  <TabsList>
                    <TabsTrigger value="present">
                      Present ({presentToday})
                    </TabsTrigger>
                    <TabsTrigger value="absent">
                      Absent ({absentAuthorized.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearTodayAttendance}
                  disabled={isDeleting || presentToday === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? "Clearing..." : "Clear"}
                </Button>
                <Button variant="outline" size="sm" onClick={exportAttendance}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={attendanceTab}>
              <TabsContent value="present" className="m-0">
                {loadingToday ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/3 mb-1 animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : todayAttendance?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No attendance recorded for this date</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(todayAttendance as AttendanceRecord[])?.map((record) => {
                      const photoUrl = getPrimaryPhotoUrl(record.personnel.photos);
                      return (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {photoUrl ? (
                              <img
                                src={photoUrl as string}
                                alt={record.personnel.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium">
                                {record.personnel.name}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {formatSgtDateTime12(record.timestamp)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {Math.round(
                                record.confidence <= 1
                                  ? record.confidence * 100
                                  : record.confidence
                              )}
                              % confidence
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAttendanceRecord(record.id, record.personnel.name)}
                              disabled={deletingRecordId === record.id}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="absent" className="m-0">
                {authorizedPersonnel && authorizedPersonnel.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No authorized personnel</p>
                  </div>
                ) : absentAuthorized.length === 0 ? (
                  <div className="text-center py-8 text-green-600">
                    Everyone was present today
                  </div>
                ) : (
                  <div className="space-y-3">
                    {absentAuthorized.map((person: any) => {
                      const photoUrl = getPrimaryPhotoUrl(person.photos);
                      return (
                        <div
                          key={person.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {photoUrl ? (
                              <img
                                src={photoUrl as string}
                                alt={person.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium">{person.name}</h4>
                              <p className="text-sm text-gray-500">
                                {(person.role || person.position || "Role N/A") +
                                  " • Absent"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">Authorized</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Report */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Attendance Report</CardTitle>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(dateRange.start, "MMM dd")} -{" "}
                  {format(dateRange.end, "MMM dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.start, to: dateRange.end }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ start: range.from, end: range.to });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {loadingReport ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-200 rounded animate-pulse"
                />
              ))}
            </div>
          ) : attendanceReport?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No attendance data for the selected period</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(attendanceReport as PersonReport[])?.map((person) => (
                <div key={person.name} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {person.photoUrl ? (
                      <img
                        src={person.photoUrl}
                        alt={person.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <h4 className="font-medium">{person.name}</h4>
                    <Badge variant="outline">
                      {Object.keys(person.days).length} days present
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.values(person.days).map((day: DayRecord) => (
                      <div
                        key={day.date}
                        className="bg-gray-50 rounded p-3 text-sm"
                      >
                        <div className="font-medium">
                          {format(new Date(day.date), "MMM dd")}
                        </div>
                        <div className="text-gray-600">
                          {new Date(day.firstSeen).getTime() ===
                          new Date(day.lastSeen).getTime()
                            ? formatSgtTime12(day.firstSeen)
                            : `${formatSgtTime12(day.firstSeen)} - ${formatSgtTime12(day.lastSeen)}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {day.totalDetections} detections
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

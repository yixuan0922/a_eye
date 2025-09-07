// components/AttendanceDashboard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";
import { 
  Users, 
  UserCheck, 
  Clock, 
  Calendar as CalendarIcon,
  Download,
  Eye,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";

interface AttendanceDashboardProps {
  siteId: string;
}

export default function AttendanceDashboard({ siteId }: AttendanceDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date()
  });

  const { data: todayAttendance, isLoading: loadingToday } = trpc.getAttendance.useQuery({
    siteId,
    date: selectedDate
  });

  const { data: attendanceReport, isLoading: loadingReport } = trpc.getAttendanceReport.useQuery({
    siteId,
    startDate: dateRange.start,
    endDate: dateRange.end
  });

  const { data: knownFaces } = trpc.getKnownFaces.useQuery(siteId);

  // Calculate statistics
  const totalPeople = knownFaces?.length || 0;
  const presentToday = todayAttendance?.length || 0;
  const attendanceRate = totalPeople > 0 ? Math.round((presentToday / totalPeople) * 100) : 0;

  const exportAttendance = () => {
    if (!attendanceReport) return;
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,Date,First Seen,Last Seen,Total Detections,Cameras\n" +
      attendanceReport.flatMap(person => 
        Object.values(person.days).map((day: any) =>
          `${person.name},${day.date},${format(new Date(day.firstSeen), 'HH:mm:ss')},${format(new Date(day.lastSeen), 'HH:mm:ss')},${day.totalDetections},"${day.cameras.join(', ')}"`
        )
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
                <p className="text-sm font-medium text-gray-600">Total People</p>
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
                <p className="text-sm font-medium text-gray-600">Present Today</p>
                <p className="text-2xl font-bold text-green-600">{presentToday}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
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
                Attendance for {format(selectedDate, 'MMMM dd, yyyy')}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={exportAttendance}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                {todayAttendance?.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={record.knownFace.photoUrl}
                        alt={record.knownFace.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-medium">{record.knownFace.name}</h4>
                        <p className="text-sm text-gray-500">
                          {format(new Date(record.timestamp), 'HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {Math.round(record.confidence)}% confidence
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Camera: {record.camera?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                  {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd')}
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
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : attendanceReport?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No attendance data for the selected period</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attendanceReport?.map((person) => (
                <div key={person.name} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={person.photoUrl}
                      alt={person.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <h4 className="font-medium">{person.name}</h4>
                    <Badge variant="outline">
                      {Object.keys(person.days).length} days present
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.values(person.days).map((day: any) => (
                      <div key={day.date} className="bg-gray-50 rounded p-3 text-sm">
                        <div className="font-medium">{format(new Date(day.date), 'MMM dd')}</div>
                        <div className="text-gray-600">
                          {format(new Date(day.firstSeen), 'HH:mm')} - {format(new Date(day.lastSeen), 'HH:mm')}
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
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Check, X, MoreVertical, Search, Edit } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PersonnelEditDialog } from "./personnel-edit-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PersonnelManagementProps {
  siteId: string;
}

type FilterType = "all" | "pending" | "authorized";

export default function PersonnelManagement({
  siteId,
}: PersonnelManagementProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter] = useState("all");
  const [editingPersonnel, setEditingPersonnel] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const {
    data: personnel,
    isLoading,
    refetch,
  } = trpc.getPersonnelBySite.useQuery(siteId);

  const approvePersonnelMutation = trpc.updatePersonnelStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Personnel Status Updated",
        description: "Personnel status has been updated successfully.",
      });
      refetch(); // Refresh the data after update
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update personnel status.",
        variant: "destructive",
      });
    },
  });

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "authorized":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleApprove = (personnelId: string, approve: boolean) => {
    approvePersonnelMutation.mutate({
      id: personnelId,
      status: approve ? "authorized" : "rejected",
      isAuthorized: approve,
      authorizedBy: "admin", // You can replace this with actual user info later
    });
  };

  const handleEdit = (person: any) => {
    setEditingPersonnel(person);
    setIsEditDialogOpen(true);
  };

  const filteredPersonnel = personnel?.filter((person: any) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && person.status === "pending") ||
      (filter === "authorized" &&
        (person.isAuthorized || person.status === "authorized"));

    const matchesSearch =
      searchTerm === "" ||
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (person.role &&
        person.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (person.position &&
        person.position.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === "all" || person.role === roleFilter;

    return matchesFilter && matchesSearch && matchesRole;
  });

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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Personnel Management
        </h2>
        <p className="text-gray-600">
          Manage site access and personnel authorization
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search personnel..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="bg-security-blue hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Personnel
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "authorized"] as FilterType[]).map(
            (filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`personnel-filter-btn ${
                  filter === filterType ? "active" : ""
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Personnel List */}
      <div className="space-y-4">
        {filteredPersonnel?.map((person: any) => (
          <Card
            key={person.id}
            className="p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {person.photos && Array.isArray(person.photos) && person.photos.length > 0 ? (
                    <img
                      src={person.photos[0]} // Show first photo as avatar
                      alt={person.name}
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        console.log("Image failed to load:", person.photos[0]);
                        console.log("Error details:", e);
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-gray-500 font-medium">
                      {person.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">{person.name}</h3>
                  <p className="text-sm text-gray-500">
                    {person.role || person.position || "No role specified"}
                  </p>
                  {person.employeeId && (
                    <p className="text-sm text-gray-400">
                      ID: {person.employeeId}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <Badge className={getStatusColor(person.status)}>
                    {person.status.charAt(0).toUpperCase() +
                      person.status.slice(1)}
                  </Badge>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatTimeAgo(person.requestDate || person.createdAt)}
                  </p>
                  {person.currentZone && (
                    <p className="text-sm text-gray-400">
                      Zone: {person.currentZone}
                    </p>
                  )}
                </div>

                {person.status === "pending" && (
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(person.id, true)}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={approvePersonnelMutation.isPending}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleApprove(person.id, false)}
                      disabled={approvePersonnelMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(person)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredPersonnel?.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Personnel Found
          </h3>
          <p className="text-gray-600 mb-4">
            {filter === "all"
              ? "No personnel registered for this site"
              : `No ${filter} personnel found`}
          </p>
          <Button className="bg-security-blue hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Personnel
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <PersonnelEditDialog
        personnel={editingPersonnel}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => {
          refetch();
          setEditingPersonnel(null);
        }}
      />
    </div>
  );
}

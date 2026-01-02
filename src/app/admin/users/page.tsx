"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, Plus, Trash2, UserPlus, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

export default function UserManagement() {
  const router = useRouter();
  const { toast } = useToast();
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: users, refetch: refetchUsers } = trpc.getAllUsersWithSites.useQuery();
  const { data: allSites } = trpc.getAllSites.useQuery();
  const createUserMutation = trpc.createUser.useMutation();
  const assignUserToSiteMutation = trpc.assignUserToSite.useMutation();
  const removeUserFromSiteMutation = trpc.removeUserFromSite.useMutation();

  const handleCreateUser = async () => {
    try {
      await createUserMutation.mutateAsync({
        email: newUserEmail,
        name: newUserName,
        password: newUserPassword || undefined,
        siteIds: selectedSiteIds,
      });

      toast({
        title: "User Created",
        description: `User ${newUserEmail} has been created successfully.`,
      });

      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setSelectedSiteIds([]);
      setIsCreateDialogOpen(false);
      refetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleAssignSite = async (userId: string, siteId: string) => {
    try {
      await assignUserToSiteMutation.mutateAsync({ userId, siteId });

      toast({
        title: "Site Assigned",
        description: "User has been assigned to the site successfully.",
      });

      refetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to assign site",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSite = async (userId: string, siteId: string) => {
    try {
      await removeUserFromSiteMutation.mutateAsync({ userId, siteId });

      toast({
        title: "Site Removed",
        description: "User has been removed from the site successfully.",
      });

      refetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to remove site",
        variant: "destructive",
      });
    }
  };

  const toggleSiteSelection = (siteId: string) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <Shield className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">User Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage users and their site access
              </p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-black text-white hover:bg-gray-800">
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user and assign them to sites.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password (optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Leave empty for default (admin123)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assign to Sites</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {allSites?.map((site) => (
                      <div key={site.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`site-${site.id}`}
                          checked={selectedSiteIds.includes(site.id)}
                          onCheckedChange={() => toggleSiteSelection(site.id)}
                        />
                        <label
                          htmlFor={`site-${site.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {site.name} ({site.code})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={!newUserEmail || !newUserName}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Assigned Sites</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.sites.length === 0 ? (
                          <span className="text-muted-foreground text-sm">
                            No sites
                          </span>
                        ) : (
                          user.sites.map((userSite) => (
                            <Badge
                              key={userSite.id}
                              variant="outline"
                              className="gap-1"
                            >
                              {userSite.site.code}
                              <button
                                onClick={() =>
                                  handleRemoveSite(user.id, userSite.site.id)
                                }
                                className="ml-1 hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-500/10">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            Assign Site
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign Site to {user.email}</DialogTitle>
                            <DialogDescription>
                              Select a site to grant access to this user.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 py-4">
                            {allSites
                              ?.filter(
                                (site) =>
                                  !user.sites.some((us) => us.site.id === site.id)
                              )
                              .map((site) => (
                                <Button
                                  key={site.id}
                                  variant="outline"
                                  className="w-full justify-start"
                                  onClick={() => handleAssignSite(user.id, site.id)}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  {site.name} ({site.code})
                                </Button>
                              ))}
                            {allSites?.every((site) =>
                              user.sites.some((us) => us.site.id === site.id)
                            ) && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                User is already assigned to all sites
                              </p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

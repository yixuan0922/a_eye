"use client";

import { useEffect, useState } from "react";
import { TelegramLinkCard } from "@/components/telegram-link-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage({
  params,
}: {
  params: { siteSlug: string };
}) {
  const { siteSlug } = params;
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Try to get user from localStorage, otherwise use mock data
    const currentUserStr = localStorage.getItem('currentUser');

    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        // Fall back to mock data
        setUser({
          id: "test-user-123",
          email: "admin@changi01",
          name: "Admin User"
        });
      }
    } else {
      // Use mock data if no session
      setUser({
        id: "test-user-123",
        email: "admin@changi01",
        name: "Admin User"
      });
    }
  }, []);

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const userId = user.id;
  const userEmail = user.email;
  const userName = user.name;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and notification preferences
        </p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <TelegramLinkCard
            userId={userId}
            userEmail={userEmail}
            userName={userName}
          />

          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">PPE Violations</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when PPE violations are detected
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Unauthorized Access</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when unauthorized access is detected
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">System Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified about system events and updates
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Name
                </p>
                <p className="text-lg">{userName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Email
                </p>
                <p className="text-lg">{userEmail}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Site
                </p>
                <p className="text-lg">{siteSlug}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

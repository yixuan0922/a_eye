"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

export default function Login() {
  const router = useRouter();
  const { toast } = useToast();
  const [siteCode, setSiteCode] = useState("changi-site-01");
  const [email, setEmail] = useState("admin@changi01");
  const [password, setPassword] = useState("admin123");

  const loginMutation = trpc.login.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await loginMutation.mutateAsync({ siteCode, email, password });

      // Store user session in localStorage
      localStorage.setItem('currentUser', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        siteId: data.site.id,
        siteCode: data.site.code,
      }));

      toast({
        title: "Login Successful",
        description: `Welcome to ${data.site.name}`,
      });

      // Use replace to avoid needing back navigation and ensure single navigation
      router.replace(`/${data.site.code}`);
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error?.message || "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <Card className="w-full max-w-md shadow-lg relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto">
            <Shield className="text-white w-8 h-8" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">
              Site Access Login
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Construction Site Security Dashboard
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteCode">Site Code</Label>
              <Input
                id="siteCode"
                type="text"
                value={siteCode}
                onChange={(e) => setSiteCode(e.target.value)}
                placeholder="Enter site code"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accessing Dashboard...
                </>
              ) : (
                "Access Dashboard"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Sample site: <span className="font-medium">changi-site-01</span>
            </p>
            <p className="text-xs text-muted-foreground">
              For demonstration purposes, use the pre-filled credentials above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, Upload } from "lucide-react";

export default function Signup() {
  const { siteSlug } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    console.log("SITE SLUG",siteSlug);
  }, [siteSlug]);

  // Fetch site info
  const { data: siteData, isLoading } = useQuery({
    queryKey: ["site", siteSlug],
    queryFn: async () => {
      const response = await fetch(`/api/sites/${siteSlug}`);
      console.log("RESPONSE",response);
      if (!response.ok) {
        throw new Error("Site not found");
      }
      return response.json();
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/personnel", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Signup failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Submitted",
        description:
          "Your request has been submitted for approval. You will be notified once approved.",
      });
      router.push("/");
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("siteSlug", siteSlug as string);
    formData.append("name", name);
    formData.append("role", role);
    if (photo) {
      formData.append("photo", photo);
    }

    signupMutation.mutate(formData);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast({
          title: "File Too Large",
          description: "Photo must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setPhoto(file);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-security-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading site information...</p>
        </div>
      </div>
    );
  }

  if (!siteData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Site Not Found
            </h1>
            <p className="text-gray-600">
              The requested construction site could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roles = [
    "Site Manager",
    "Safety Inspector",
    "Electrician",
    "Plumber",
    "Carpenter",
    "Construction Worker",
    "Equipment Operator",
    "Security Guard",
    "Visitor",
    "Other",
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-security-blue rounded-full flex items-center justify-center mx-auto">
            <UserPlus className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Site Access Request
            </h1>
            <p className="text-gray-600 mt-2">{siteData.site.name}</p>
            <p className="text-sm text-warning-orange font-medium">
              Valid for today only
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Full Name *
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <Label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Role/Position *
              </Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((roleOption) => (
                    <SelectItem key={roleOption} value={roleOption}>
                      {roleOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label
                htmlFor="photo"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Photo (Optional)
              </Label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="photo"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      {photo ? photo.name : "Click to upload photo"}
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG (MAX. 5MB)</p>
                  </div>
                  <input
                    id="photo"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                </label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-security-blue hover:bg-blue-700"
              disabled={signupMutation.isPending || !name || !role}
            >
              {signupMutation.isPending
                ? "Submitting..."
                : "Submit Access Request"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Your request will be reviewed by site administrators.
              <br />
              Access is valid for today only and must be renewed daily.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

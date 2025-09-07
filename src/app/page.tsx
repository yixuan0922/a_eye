"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Camera, AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to login after a short delay
    const timer = setTimeout(() => {
      router.push("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  const handleGetStarted = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl bg-white/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="text-white w-10 h-10" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold text-gray-900 mb-4">
            AI CCTV Security System
          </CardTitle>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Smart construction site monitoring with AI-powered threat detection,
            PPE compliance checking, and real-time security alerts.
          </p>
        </CardHeader>

        <CardContent className="pb-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-6 rounded-lg bg-blue-50">
              <Camera className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">
                Live Monitoring
              </h3>
              <p className="text-gray-600 text-sm">
                Real-time camera feeds with AI-powered analysis
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-green-50">
              <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">
                PPE Detection
              </h3>
              <p className="text-gray-600 text-sm">
                Automatic safety equipment compliance checking
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-orange-50">
              <AlertTriangle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Smart Alerts</h3>
              <p className="text-gray-600 text-sm">
                Instant notifications for security violations
              </p>
            </div>
          </div>

          <div className="text-center">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              Access Security Dashboard
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              Redirecting to login in 3 seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

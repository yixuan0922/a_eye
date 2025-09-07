"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc/client";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface P2PSetupProps {
  siteId: string;
  onP2PConnected?: (streams: any[]) => void;
}

export default function P2PSetup({ siteId, onP2PConnected }: P2PSetupProps) {
  const [serialNumber, setSerialNumber] = useState("9E0C780PAZ8FC4E"); // From your QR code
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin8888");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const establishP2P = trpc.establishP2PConnection.useMutation();
  const updateCamera = trpc.updateCameraWithP2P.useMutation();
  const createCamera = trpc.createCamera.useMutation();

  const handleP2PConnection = async () => {
    setIsConnecting(true);
    setError(null);
    setConnectionResult(null);

    try {
      console.log("Establishing P2P connection...", {
        serialNumber,
        username: username.substring(0, 3) + "***",
      });

      const result = await establishP2P.mutateAsync({
        serialNumber,
        username,
        password,
      });

      if (result.success) {
        setConnectionResult(result);

        // Create cameras for each stream
        if (result.streams) {
          for (const stream of result.streams) {
            await createCamera.mutateAsync({
              siteId,
              name: `NVR Channel ${stream.channelId}`,
              location: `Camera ${stream.channelId}`,
              streamUrl: stream.streamUrl,
              status: "online",
            });
          }
        }

        onP2PConnected?.(result.streams || []);
      } else {
        setError(result.error || "P2P connection failed");
      }
    } catch (err) {
      console.error("P2P connection error:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📡 P2P Connection Setup
        </CardTitle>
        <CardDescription>
          Connect to your Dahua NVR using P2P (the standard way)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="serialNumber">Device Serial Number</Label>
          <Input
            id="serialNumber"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="9E0C780PAZ8FC4E"
          />
          <p className="text-xs text-gray-500">From your device QR code</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="admin8888"
          />
        </div>

        <Button
          onClick={handleP2PConnection}
          disabled={isConnecting || !serialNumber || !username || !password}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting via P2P...
            </>
          ) : (
            "Connect P2P"
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {connectionResult && connectionResult.success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">P2P Connection Successful!</p>
                <p className="text-sm">
                  Connected {connectionResult.streams?.length || 0} camera
                  streams
                </p>
                <div className="text-xs space-y-1">
                  {connectionResult.streams?.map(
                    (stream: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-2 rounded">
                        Channel {stream.channelId}: {stream.streamType} stream
                      </div>
                    )
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <strong>✅ Benefits of P2P:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>No port forwarding needed</li>
            <li>Works from anywhere</li>
            <li>Secure encrypted connection</li>
            <li>Standard Dahua protocol</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}







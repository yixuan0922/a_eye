"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TelegramLinkCardProps {
  userId: string;
  userEmail: string;
  userName: string;
}

export function TelegramLinkCard({
  userId,
  userEmail,
  userName,
}: TelegramLinkCardProps) {
  const [isLinked, setIsLinked] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [linkedUsername, setLinkedUsername] = useState("");
  const [isUnlinking, setIsUnlinking] = useState(false);
  const { toast } = useToast();

  // Check if already linked
  useEffect(() => {
    checkLinkStatus();
  }, [userId]);

  const checkLinkStatus = async () => {
    try {
      setIsChecking(true);
      const response = await fetch(`/api/telegram/status?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setIsLinked(data.isLinked);
        setLinkedUsername(data.username || "");
      }
    } catch (error) {
      console.error("Failed to check Telegram link status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const generateCode = async () => {
    try {
      setIsGenerating(true);
      const response = await fetch("/api/telegram/generate-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          email: userEmail,
          name: userName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationCode(data.code);
        toast({
          title: "Verification code generated",
          description: `Your code: ${data.code}. Valid for ${data.expiresIn}.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate verification code",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(verificationCode);
    toast({
      title: "Copied!",
      description: "Verification code copied to clipboard",
    });
  };

  const openTelegram = () => {
    window.open("https://t.me/aeye_cctv_bot", "_blank");
  };

  const handleUnlink = async () => {
    try {
      setIsUnlinking(true);
      const response = await fetch("/api/telegram/unlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        setIsLinked(false);
        setLinkedUsername("");
        toast({
          title: "Account unlinked",
          description: "Your Telegram account has been unlinked successfully",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlink Telegram account",
        variant: "destructive",
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  if (isChecking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Telegram Notifications</CardTitle>
          <CardDescription>
            Receive real-time alerts via Telegram
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLinked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Telegram Notifications</CardTitle>
          <CardDescription>
            Receive real-time alerts via Telegram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Your Telegram account is linked!
              {linkedUsername && (
                <span className="block mt-1 text-sm">
                  Connected as: @{linkedUsername}
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>You will receive notifications for:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>PPE violations</li>
              <li>Unauthorized access</li>
              <li>System alerts</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={openTelegram}
              className="flex-1"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Telegram Bot
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlink}
              disabled={isUnlinking}
            >
              {isUnlinking ? "Unlinking..." : "Unlink"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link Telegram Account</CardTitle>
        <CardDescription>
          Get instant notifications on your phone via Telegram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!verificationCode ? (
          <>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Follow these steps to link your Telegram account:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Click the button below to generate a verification code</li>
                <li>Open Telegram and search for <strong>@aeye_cctv_bot</strong></li>
                <li>Send <strong>/verify YOUR_CODE</strong> to the bot</li>
                <li>You'll receive a confirmation message</li>
              </ol>
            </div>

            <Button
              onClick={generateCode}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Verification Code"
              )}
            </Button>
          </>
        ) : (
          <>
            <Alert>
              <AlertDescription>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold mb-2">Your Verification Code:</p>
                    <div className="flex items-center gap-2">
                      <code className="relative rounded bg-muted px-4 py-2 font-mono text-2xl font-bold flex-1 text-center">
                        {verificationCode}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={copyCode}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold mb-1">Next steps:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open Telegram and search for <strong>@aeye_cctv_bot</strong></li>
                      <li>Send this message: <code className="bg-muted px-1">/verify {verificationCode}</code></li>
                      <li>Wait for confirmation</li>
                    </ol>
                    <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                      ⏱️ Code expires in 10 minutes
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={openTelegram}
                className="flex-1"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Telegram Bot
              </Button>
              <Button
                variant="outline"
                onClick={checkLinkStatus}
              >
                Check Status
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={generateCode}
              className="w-full"
              disabled={isGenerating}
            >
              Generate New Code
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

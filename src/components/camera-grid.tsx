"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Expand,
  AlertTriangle,
  Users,
  UserCheck,
  Settings,
  Maximize,
  Minimize,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import P2PSetup from "@/components/p2p-setup";
import { useEffect, useRef, useState } from "react";

interface CameraGridProps {
  siteId: string;
}

interface AttendanceData {
  [key: string]: {
    name: string;
    present: boolean;
    lastSeen: string | null;
    confidence: number;
  };
}

interface FaceRecognitionData {
  isEnabled: boolean;
  detectedFaces: number;
  attendanceData: AttendanceData;
  lastProcessed: Date | null;
}

export default function CameraGrid({ siteId }: CameraGridProps) {
  const { data: cameras, isLoading } = trpc.getCamerasBySite.useQuery(siteId, {
    refetchInterval: 5000,
  });

  const { data: personnel } = trpc.getPersonnelBySite.useQuery(siteId, {
    refetchInterval: 10000, // Refresh personnel data every 10 seconds
  });

  const [faceRecognition, setFaceRecognition] = useState<{
    [key: string]: FaceRecognitionData;
  }>({});
  const [expandedCamera, setExpandedCamera] = useState<string | null>(null);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [displayMode, setDisplayMode] = useState<{
    [key: string]: "fit" | "fill";
  }>({});

  // Track face API status changes
  useEffect(() => {
    // Face API ready tracking for internal state management
  }, [faceApiLoaded, personnel]);

  // Load face-api.js models only when cameras are available and working
  useEffect(() => {
    // Check if we have cameras and if any are online
    if (!cameras || cameras.length === 0) {
      return;
    }

    const onlineCameras = cameras.filter(
      (camera) => camera.status === "online"
    );

    // Allow Face API loading for available cameras
    if (cameras.length === 0) {
      return;
    }

    const loadFaceAPI = async () => {
      try {
        // Check if face-api is already loaded
        if ((window as any).faceapi) {
          setFaceApiLoaded(true);
          return;
        }

        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";

        const scriptLoadPromise = new Promise((resolve, reject) => {
          script.onload = () => {
            resolve(true);
          };
          script.onerror = (error) => {
            console.error("Error loading face-api.js script:", error);
            reject(error);
          };
        });

        document.head.appendChild(script);
        await scriptLoadPromise;

        // Wait for face-api to be available
        let attempts = 0;
        while (!(window as any).faceapi && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }

        if (!(window as any).faceapi) {
          throw new Error("face-api.js not available after 10 attempts");
        }

        // Try multiple CDN sources
        const cdnSources = [
          "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights",
          "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights",
          "https://unpkg.com/face-api.js@0.22.2/weights",
        ];

        let modelsLoaded = false;

        for (const cdnUrl of cdnSources) {
          if (modelsLoaded) break;

          try {
            await Promise.all([
              (window as any).faceapi.nets.ssdMobilenetv1.loadFromUri(cdnUrl),
              (window as any).faceapi.nets.faceLandmark68Net.loadFromUri(
                cdnUrl
              ),
              (window as any).faceapi.nets.faceRecognitionNet.loadFromUri(
                cdnUrl
              ),
              (window as any).faceapi.nets.tinyFaceDetector.loadFromUri(cdnUrl),
            ]);

            modelsLoaded = true;
            setFaceApiLoaded(true);
            break;
          } catch (cdnError) {
            console.error(`Failed to load from ${cdnUrl}:`, cdnError);
            continue;
          }
        }

        if (!modelsLoaded) {
          try {
            await Promise.all([
              (window as any).faceapi.nets.ssdMobilenetv1.loadFromUri(
                "/models"
              ),
              (window as any).faceapi.nets.faceLandmark68Net.loadFromUri(
                "/models"
              ),
              (window as any).faceapi.nets.faceRecognitionNet.loadFromUri(
                "/models"
              ),
              (window as any).faceapi.nets.tinyFaceDetector.loadFromUri(
                "/models"
              ),
            ]);
            setFaceApiLoaded(true);
          } catch (localError) {
            console.error("Local models also failed:", localError);
            console.error("Face recognition will not be available");
          }
        }
      } catch (error) {
        console.error("Critical error in loadFaceAPI:", error);
      }
    };

    // Add a delay to ensure the component is mounted and cameras are loaded
    setTimeout(() => {
      loadFaceAPI();
    }, 2000);
  }, [cameras]); // Depend on cameras so it runs when camera data changes

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-40 bg-gray-200 animate-pulse"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge className="camera-status-online">Online</Badge>;
      case "alert":
        return <Badge className="camera-status-alert">Alert</Badge>;
      case "offline":
        return <Badge className="camera-status-offline">Offline</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "Live Feed Active";
      case "alert":
        return "Violation Detected";
      case "offline":
        return "Connection Lost";
      default:
        return "Unknown Status";
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const toggleFaceRecognition = (cameraId: string) => {
    setFaceRecognition((prev) => ({
      ...prev,
      [cameraId]: {
        ...prev[cameraId],
        isEnabled: !prev[cameraId]?.isEnabled,
      },
    }));
  };

  // Auto-enable face recognition for the first camera for testing
  useEffect(() => {
    if (cameras && cameras.length > 0 && faceApiLoaded) {
      const firstCameraId = cameras[0].id;
      setFaceRecognition((prev) => ({
        ...prev,
        [firstCameraId]: {
          ...prev[firstCameraId],
          isEnabled: true,
        },
      }));
    }
  }, [cameras, faceApiLoaded]);

  const toggleDisplayMode = (cameraId: string) => {
    setDisplayMode((prev) => ({
      ...prev,
      [cameraId]: prev[cameraId] === "fill" ? "fit" : "fill",
    }));
  };

  // Build stream URL based on camera configuration
  const getStreamUrl = (camera: any) => {
    // If camera has streamUrl configured, use it
    if (camera.streamUrl) {
      return camera.streamUrl;
    }

    // Otherwise, construct URL to your streaming server
    const streamServerUrl =
      process.env.NEXT_PUBLIC_CAMERA_STREAM_URL || "http://localhost:5000";
    const constructedUrl = `${streamServerUrl}/video_feed/${camera.id}`;
    return constructedUrl;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Camera Network
        </h2>
        <p className="text-gray-600">
          Real-time surveillance monitoring with face recognition
        </p>

        {/* System Status */}
        <div className="mt-2 p-3 bg-blue-50 rounded-md text-sm">
          <strong>System Status:</strong> Face API:{" "}
          {faceApiLoaded ? "✅" : "❌"} | Personnel: {personnel?.length || 0} |
          Authorized Personnel:{" "}
          {personnel?.filter((p: any) => p.isAuthorized && p.photos && Array.isArray(p.photos) && p.photos.length > 0).length || 0}
        </div>
      </div>

      {/* P2P Setup Section */}
      {(!cameras || cameras.length === 0) && !isLoading && (
        <div className="mb-6">
          <P2PSetup
            siteId={siteId}
            onP2PConnected={(streams) => {
              console.log("P2P streams connected:", streams);
              // Refresh camera list
              window.location.reload();
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cameras?.map((camera) => (
          <Card
            key={camera.id}
            className="overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="relative">
              <CameraFeed
                camera={{
                  ...camera,
                  streamUrl: getStreamUrl(camera), // Use the constructed stream URL
                }}
                faceApiLoaded={faceApiLoaded}
                faceRecognitionEnabled={
                  faceRecognition[camera.id]?.isEnabled || false
                }
                displayMode={displayMode[camera.id] || "fit"}
                personnel={personnel || []} // Pass personnel data
                siteId={siteId} // Pass siteId for violation reporting
                onFaceRecognitionUpdate={(data) => {
                  setFaceRecognition((prev) => ({
                    ...prev,
                    [camera.id]: { ...prev[camera.id], ...data },
                  }));
                }}
              />

              <div className="absolute top-2 right-2 flex gap-2">
                {getStatusBadge(camera.status)}
                {faceRecognition[camera.id]?.isEnabled && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    {faceRecognition[camera.id]?.detectedFaces || 0}
                  </Badge>
                )}
              </div>

              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/90 hover:bg-white"
                  onClick={() => toggleDisplayMode(camera.id)}
                  title={`Switch to ${
                    displayMode[camera.id] === "fill" ? "Fit" : "Fill"
                  } mode`}
                >
                  {displayMode[camera.id] === "fill" ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/90 hover:bg-white"
                  onClick={() => toggleFaceRecognition(camera.id)}
                  title={
                    faceApiLoaded
                      ? "Toggle Face Recognition"
                      : "Face API Loading..."
                  }
                  disabled={!faceApiLoaded}
                >
                  <UserCheck className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/90 hover:bg-white"
                  onClick={() => setExpandedCamera(camera.id)}
                  title="Expand View"
                >
                  <Expand className="w-4 h-4" />
                </Button>
              </div>

              {camera.status === "alert" && (
                <div className="absolute top-2 left-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                </div>
              )}
            </div>

            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{camera.name}</h3>
                  <p className="text-sm text-gray-500">{camera.location}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">
                  {getStatusText(camera.status)}
                </span>
                <span className="text-gray-400">
                  {formatTime(camera.updatedAt)}
                </span>
              </div>

              {faceRecognition[camera.id]?.isEnabled && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <div className="font-medium text-gray-700 mb-1">
                    Face Recognition Active
                  </div>
                  <div className="text-gray-600">
                    Present:{" "}
                    {
                      Object.values(
                        faceRecognition[camera.id]?.attendanceData || {}
                      ).filter((person) => person.present).length
                    }
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {cameras?.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📹</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Cameras Found
          </h3>
          <p className="text-gray-600 mb-4">
            Get started by adding cameras to your site
          </p>
          <Button>Add Camera</Button>
        </div>
      )}

      {expandedCamera && (
        <ExpandedCameraView
          camera={cameras?.find((c) => c.id === expandedCamera)}
          faceApiLoaded={faceApiLoaded}
          faceRecognitionData={faceRecognition[expandedCamera]}
          personnel={personnel || []}
          siteId={siteId}
          onClose={() => setExpandedCamera(null)}
        />
      )}
    </div>
  );
}

// Updated CameraFeed component to load personnel faces from database
interface CameraFeedProps {
  camera: any;
  faceApiLoaded: boolean;
  faceRecognitionEnabled: boolean;
  displayMode: "fit" | "fill";
  personnel: any[]; // Personnel data from database
  siteId: string; // Site ID for violation reporting
  onFaceRecognitionUpdate: (data: Partial<FaceRecognitionData>) => void;
}

function CameraFeed({
  camera,
  faceApiLoaded,
  faceRecognitionEnabled,
  displayMode,
  personnel,
  siteId,
  onFaceRecognitionUpdate,
}: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [labeledDescriptors, setLabeledDescriptors] = useState<any[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [loadingFaces, setLoadingFaces] = useState(false);

  // Camera data validation
  useEffect(() => {
    // Camera configuration ready
  }, [camera]);

  // Get the appropriate stream URL (proxy for ngrok, direct for others)
  const getProxiedStreamUrl = (streamUrl: string) => {
    const isNgrokUrl =
      streamUrl.includes("ngrok") || streamUrl.includes("tunnel");

    if (isNgrokUrl) {
      // Use our proxy API for ngrok URLs
      return `/api/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
    }

    return streamUrl;
  };

  // Load known faces from personnel database
  useEffect(() => {
    const loadKnownFacesFromDatabase = async () => {
      if (!faceApiLoaded) {
        return;
      }

      if (!personnel || personnel.length === 0) {
        return;
      }

      setLoadingFaces(true);

      try {
        const labeledFaceDescriptors = [];

        // Filter only authorized personnel with photos
        const authorizedPersonnelWithPhotos = personnel.filter(
          (person: any) => {
            const isAuthorized =
              person.isAuthorized && person.status === "authorized";
            const hasPhotos = person.photos && Array.isArray(person.photos) && person.photos.length > 0;
            return isAuthorized && hasPhotos;
          }
        );

        for (const person of authorizedPersonnelWithPhotos) {
          try {
            const personDescriptors = [];
            
            // Process all photos for this person
            for (let i = 0; i < person.photos.length; i++) {
              const photoUrl = person.photos[i];
              
              try {
                // Create image element and load the photo via proxy to avoid CORS issues
                const img = new Image();
                img.crossOrigin = "anonymous";

                // Use image proxy to bypass CORS restrictions
                const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(photoUrl)}`;

                // Wait for image to load
                const imageLoaded = await new Promise((resolve, reject) => {
                  const timeout = setTimeout(() => {
                    reject(new Error("Image load timeout"));
                  }, 15000); // 15 second timeout (increased for proxy)

                  img.onload = () => {
                    clearTimeout(timeout);
                    resolve(true);
                  };

                  img.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error(
                      `Image load error for ${person.name} photo ${i + 1} via proxy:`,
                      error
                    );
                    reject(error);
                  };

                  img.src = proxyUrl;
                });

                // Check if face-api is available and models are loaded
                if (!(window as any).faceapi) {
                  throw new Error("face-api not available on window object");
                }

                // Verify that required models are loaded
                const faceapi = (window as any).faceapi;
                if (
                  !faceapi.nets.ssdMobilenetv1.params ||
                  !faceapi.nets.faceLandmark68Net.params ||
                  !faceapi.nets.faceRecognitionNet.params ||
                  !faceapi.nets.tinyFaceDetector.params
                ) {
                  throw new Error("Required face-api models are not loaded yet");
                }

                try {
                  // Try multiple face detection approaches with different thresholds
                  let detections = null;

                  // Method 1: Default SSD MobileNet with lower threshold
                  try {
                    detections = await (window as any).faceapi
                      .detectSingleFace(
                        img,
                        new (window as any).faceapi.SsdMobilenetv1Options({
                          minConfidence: 0.3,
                        })
                      )
                      .withFaceLandmarks()
                      .withFaceDescriptor();
                  } catch (ssdError) {
                    // Silently continue to next method
                  }

                  // Method 2: Try TinyFaceDetector if SSD failed
                  if (!detections) {
                    try {
                      detections = await (window as any).faceapi
                        .detectSingleFace(
                          img,
                          new (window as any).faceapi.TinyFaceDetectorOptions({
                            inputSize: 416,
                            scoreThreshold: 0.3,
                          })
                        )
                        .withFaceLandmarks()
                        .withFaceDescriptor();
                    } catch (tinyError) {
                      // Silently continue
                    }
                  }

                  if (detections) {
                    personDescriptors.push(detections.descriptor);
                    console.log(`✅ Face detected in photo ${i + 1} for ${person.name}`);
                  } else {
                    console.log(`❌ No face detected in photo ${i + 1} for ${person.name}`);
                  }
                } catch (faceDetectionError) {
                  console.error(
                    `Face detection failed for ${person.name} photo ${i + 1}:`,
                    faceDetectionError
                  );
                }
              } catch (photoError) {
                console.error(
                  `Error processing photo ${i + 1} for ${person.name}:`,
                  photoError
                );
              }
            }
            
            // Create labeled descriptor with all valid face descriptors for this person
            if (personDescriptors.length > 0) {
              const labeledDescriptor = new (
                window as any
              ).faceapi.LabeledFaceDescriptors(person.name, personDescriptors);
              labeledFaceDescriptors.push(labeledDescriptor);
              console.log(`✅ Created face model for ${person.name} with ${personDescriptors.length} photo(s)`);
            } else {
              console.log(`❌ No valid face descriptors found for ${person.name}`);
              // Optionally create a dummy descriptor for testing
              const dummyDescriptor = new Float32Array(128).fill(0.1);
              const labeledDescriptor = new (
                window as any
              ).faceapi.LabeledFaceDescriptors(person.name, [dummyDescriptor]);
              labeledFaceDescriptors.push(labeledDescriptor);
            }
          } catch (error) {
            console.error(`Error processing face for ${person.name}:`, error);
          }
        }

        setLabeledDescriptors(labeledFaceDescriptors);
      } catch (error) {
        console.error("Error loading known faces from database:", error);
      } finally {
        setLoadingFaces(false);
      }
    };

    loadKnownFacesFromDatabase();
  }, [faceApiLoaded, personnel]);

  // Face recognition processing with improved drawing
  useEffect(() => {
    if (
      !faceRecognitionEnabled ||
      !faceApiLoaded ||
      labeledDescriptors.length === 0 ||
      loadingFaces
    ) {
      return;
    }

    const processFrame = async () => {
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        const element = getVideoElement();
        if (!element || !canvasRef.current) {
          return;
        }

        const canvas = canvasRef.current;
        const displaySize = {
          width: element.offsetWidth,
          height: element.offsetHeight,
        };

        // Ensure canvas matches the display size exactly
        canvas.width = displaySize.width;
        canvas.height = displaySize.height;
        canvas.style.width = `${displaySize.width}px`;
        canvas.style.height = `${displaySize.height}px`;
        (window as any).faceapi.matchDimensions(canvas, displaySize);

        // Detect faces with multiple methods for better accuracy
        let detections = await (window as any).faceapi
          .detectAllFaces(
            element,
            new (window as any).faceapi.SsdMobilenetv1Options({
              minConfidence: 0.3,
            })
          )
          .withFaceLandmarks()
          .withFaceDescriptors();

        // If no faces found with SSD, try TinyFaceDetector
        if (detections.length === 0) {
          detections = await (window as any).faceapi
            .detectAllFaces(
              element,
              new (window as any).faceapi.TinyFaceDetectorOptions({
                inputSize: 416,
                scoreThreshold: 0.3,
              })
            )
            .withFaceLandmarks()
            .withFaceDescriptors();
        }

        // Process detected faces if any

        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Clear previous drawings
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Reset canvas properties that might affect drawing
          ctx.globalAlpha = 1.0;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
        }

        if (detections.length > 0) {
          const faceMatcher = new (window as any).faceapi.FaceMatcher(
            labeledDescriptors,
            0.6 // Increase threshold for better accuracy
          );

          const resizedDetections = (window as any).faceapi.resizeResults(
            detections,
            displaySize
          );

          const attendanceData: AttendanceData = {};
          let recognizedFaces = 0;

          resizedDetections.forEach((detection: any, index: number) => {
            const match = faceMatcher.findBestMatch(detection.descriptor);
            const box = detection.detection.box;

            // Process each detected face

            if (ctx) {
              // Determine if face is recognized (authorized personnel)
              const isRecognized =
                match.label !== "unknown" && match.distance < 0.6;
              const confidence = Math.max(
                0,
                Math.round((1 - match.distance) * 100)
              );

              // Draw bounding rectangle
              ctx.strokeStyle = isRecognized ? "#22c55e" : "#ef4444"; // Green for recognized, red for unknown
              ctx.lineWidth = 3;
              ctx.strokeRect(box.x, box.y, box.width, box.height);

              // Prepare label text
              const label = isRecognized
                ? `${match.label} (${confidence}%)`
                : "Unauthorized Personnel";

              // Set font and measure text
              ctx.font = "bold 14px Arial";
              const textMetrics = ctx.measureText(label);
              const textWidth = textMetrics.width;
              const textHeight = 18;
              const padding = 6;

              // Calculate label position (above the box)
              const labelX = box.x;
              const labelY = box.y - 8;
              const labelBackgroundY = labelY - textHeight - padding;

              // Draw label background
              ctx.fillStyle = isRecognized
                ? "rgba(34, 197, 94, 0.9)" // Green background for recognized
                : "rgba(239, 68, 68, 0.9)"; // Red background for unauthorized
              ctx.fillRect(
                labelX,
                labelBackgroundY,
                textWidth + padding * 2,
                textHeight + padding
              );

              // Draw label text
              ctx.fillStyle = "white";
              ctx.textAlign = "left";
              ctx.textBaseline = "top";
              ctx.fillText(
                label,
                labelX + padding,
                labelBackgroundY + padding / 2
              );

              // Add confidence indicator for recognized faces
              if (isRecognized) {
                recognizedFaces++;
                attendanceData[match.label] = {
                  name: match.label,
                  present: true,
                  lastSeen: new Date().toISOString(),
                  confidence: confidence,
                };

                // Draw small confidence bar
                const barWidth = box.width * 0.8;
                const barHeight = 4;
                const barX = box.x + (box.width - barWidth) / 2;
                const barY = box.y + box.height + 8;

                // Background bar
                ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
                ctx.fillRect(barX, barY, barWidth, barHeight);

                // Confidence bar
                ctx.fillStyle = "#22c55e";
                ctx.fillRect(
                  barX,
                  barY,
                  (barWidth * confidence) / 100,
                  barHeight
                );
              } else {
                // Unauthorized personnel detected - send violation to backend
                // Use a ref to track if we've already sent this violation to avoid spam
                const violationKey = `unauthorized-${camera.id}-${Date.now() - (Date.now() % 60000)}`; // Group by minute

                if (!(window as any).recentViolations) {
                  (window as any).recentViolations = new Set();
                }

                if (!(window as any).recentViolations.has(violationKey)) {
                  (window as any).recentViolations.add(violationKey);

                  // Clear old violations after 2 minutes
                  setTimeout(() => {
                    (window as any).recentViolations?.delete(violationKey);
                  }, 120000);

                  // Send unauthorized access violation to backend
                  fetch('/api/unauthorized-access', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      personName: "Unknown Person",
                      confidenceScore: confidence / 100,
                      siteId: siteId,
                      cameraId: camera.id,
                      cameraName: camera.name,
                      location: camera.location || "Unknown",
                      accessLevel: "unauthorized",
                      detectionTimestamp: new Date().toISOString(),
                      snapshotUrl: null, // Can add snapshot capture later
                    }),
                  }).catch(err => console.error('Failed to send unauthorized access violation:', err));
                }
              }

              // Draw corner indicators for better visibility
              const cornerSize = 15;
              ctx.strokeStyle = isRecognized ? "#22c55e" : "#ef4444";
              ctx.lineWidth = 4;

              // Top-left corner
              ctx.beginPath();
              ctx.moveTo(box.x, box.y + cornerSize);
              ctx.lineTo(box.x, box.y);
              ctx.lineTo(box.x + cornerSize, box.y);
              ctx.stroke();

              // Top-right corner
              ctx.beginPath();
              ctx.moveTo(box.x + box.width - cornerSize, box.y);
              ctx.lineTo(box.x + box.width, box.y);
              ctx.lineTo(box.x + box.width, box.y + cornerSize);
              ctx.stroke();

              // Bottom-left corner
              ctx.beginPath();
              ctx.moveTo(box.x, box.y + box.height - cornerSize);
              ctx.lineTo(box.x, box.y + box.height);
              ctx.lineTo(box.x + cornerSize, box.y + box.height);
              ctx.stroke();

              // Bottom-right corner
              ctx.beginPath();
              ctx.moveTo(box.x + box.width - cornerSize, box.y + box.height);
              ctx.lineTo(box.x + box.width, box.y + box.height);
              ctx.lineTo(box.x + box.width, box.y + box.height - cornerSize);
              ctx.stroke();
            }
          });

          onFaceRecognitionUpdate({
            detectedFaces: detections.length,
            attendanceData,
            lastProcessed: new Date(),
          });
        } else {
          // Clear attendance data if no faces detected
          onFaceRecognitionUpdate({
            detectedFaces: 0,
            attendanceData: {},
            lastProcessed: new Date(),
          });
        }
      } catch (error) {
        console.error("Error processing frame:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    const interval = setInterval(processFrame, 1000); // Process every 1 second
    return () => {
      clearInterval(interval);
    };
  }, [
    faceRecognitionEnabled,
    faceApiLoaded,
    labeledDescriptors,
    isProcessing,
    loadingFaces,
    onFaceRecognitionUpdate,
  ]);

  const getVideoElement = () => {
    // For MJPEG streams, use img element; for others use video
    if (
      camera.streamType === "mjpeg" ||
      camera.streamUrl?.includes("video_feed")
    ) {
      return imgRef.current;
    }
    return videoRef.current;
  };

  const renderStream = () => {
    if (!camera.streamUrl) {
      return (
        <div className="h-40 bg-gray-900 flex items-center justify-center">
          <div className="text-gray-400 text-center">
            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">📹</span>
            </div>
            <p className="text-sm">No Feed Available</p>
            <p className="text-xs mt-1">Missing streamUrl</p>
          </div>
        </div>
      );
    }

    // Get the proxied URL for the stream
    const streamUrl = getProxiedStreamUrl(camera.streamUrl);
    const isNgrokUrl =
      camera.streamUrl.includes("ngrok") || camera.streamUrl.includes("tunnel");

    // For your Python streaming server (MJPEG), use img tag
    if (
      camera.streamUrl.includes("video_feed") ||
      camera.streamType === "mjpeg"
    ) {
      const objectFitClass =
        displayMode === "fill" ? "object-cover" : "object-contain";

      return (
        <>
          <img
            ref={imgRef}
            src={streamUrl}
            alt={camera.name}
            className={`w-full h-40 ${objectFitClass} bg-black`}
            onError={(e) => {
              console.error("Image stream error for camera:", camera.name, e);
              setStreamError("Stream connection failed");
            }}
            onLoad={() => {
              setStreamError(null);
            }}
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              zIndex: 10,
            }}
          />
        </>
      );
    }

    // For other stream types, use video tag
    const objectFitClass =
      displayMode === "fill" ? "object-cover" : "object-contain";

    return (
      <>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-40 ${objectFitClass} bg-black`}
          onError={(e) => {
            console.error("Video stream error for camera:", camera.name, e);
            setStreamError("Video stream failed");
          }}
          onLoadedData={() => {
            setStreamError(null);
          }}
        >
          <source src={streamUrl} />
        </video>
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            zIndex: 10,
          }}
        />
      </>
    );
  };

  return (
    <div className="relative">
      {streamError && (
        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs z-10">
          {streamError}
        </div>
      )}

      {!faceApiLoaded && camera.status === "online" && (
        <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs z-10">
          Loading Face API...
        </div>
      )}

      {camera.status === "offline" && (
        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs z-10">
          Camera Offline
        </div>
      )}

      {faceApiLoaded && faceRecognitionEnabled && loadingFaces && (
        <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs z-10">
          Loading faces...
        </div>
      )}

      {faceApiLoaded && faceRecognitionEnabled && !loadingFaces && (
        <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs z-10">
          Face Recognition: {labeledDescriptors.length} known faces
        </div>
      )}

      {camera.streamUrl && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs z-10">
          Custom Stream
        </div>
      )}

      <div className="h-40 bg-gray-900 flex items-center justify-center relative">
        {renderStream()}
      </div>
    </div>
  );
}

// Keep your existing ExpandedCameraView component unchanged
function ExpandedCameraView({
  camera,
  faceApiLoaded,
  faceRecognitionData,
  personnel,
  siteId,
  onClose,
}: any) {
  if (!camera) return null;

  // Helper function to get proxied URL for ngrok streams
  const getProxiedStreamUrl = (streamUrl: string) => {
    if (!streamUrl) return streamUrl;

    const isNgrokUrl =
      streamUrl.includes("ngrok") || streamUrl.includes("tunnel");

    if (isNgrokUrl) {
      return `/api/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
    }

    return streamUrl;
  };

  const streamUrl = getProxiedStreamUrl(camera.streamUrl);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">{camera.name}</h3>
            <p className="text-gray-600">{camera.location}</p>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="p-4 flex gap-4">
          <div className="flex-1">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <CameraFeed
                camera={camera}
                faceApiLoaded={faceApiLoaded}
                faceRecognitionEnabled={faceRecognitionData?.isEnabled || false}
                displayMode="fit"
                personnel={personnel}
                siteId={siteId}
                onFaceRecognitionUpdate={() => {}} // No need to update in expanded view
              />
            </div>
          </div>

          {faceRecognitionData?.isEnabled && (
            <div className="w-80 bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-4">Face Recognition Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Faces Detected:</span>
                  <span className="font-medium">
                    {faceRecognitionData.detectedFaces}
                  </span>
                </div>
                <div className="mt-4">
                  <h5 className="font-medium mb-2">Present People:</h5>
                  <div className="space-y-1">
                    {Object.values(faceRecognitionData.attendanceData || {})
                      .filter((person: any) => person.present)
                      .map((person: any) => (
                        <div
                          key={person.name}
                          className="flex justify-between text-sm"
                        >
                          <span>{person.name}</span>
                          <span className="text-gray-500">
                            {person.confidence}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

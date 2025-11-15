"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Shield,
  Camera,
  AlertTriangle,
  Users,
  Eye,
  Zap,
  Lock,
  BarChart3,
  Clock,
  UserCheck,
  HardHat,
  ScanFace,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spotlight } from "@/components/ui/spotlight-aceternity";

// Dynamically import SplineScene to avoid SSR issues
const SplineScene = dynamic(
  () => import("@/components/ui/splite").then((mod) => mod.SplineScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-2xl">
        <span className="loader"></span>
      </div>
    ),
  }
);

// Dynamically import ModelViewer to avoid SSR issues
const ModelViewer = dynamic(
  () => import("@/components/ui/model-viewer").then((mod) => mod.ModelViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-2xl">
        <span className="loader"></span>
      </div>
    ),
  }
);

export default function Home() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGetStarted = () => {
    router.push("/login");
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { label: 'Features', sectionId: 'features' },
    { label: 'How It Works', sectionId: 'how-it-works' },
    { label: 'Benefits', sectionId: 'benefits' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-200'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                isScrolled ? 'bg-black' : 'bg-white'
              }`}>
                <Shield className={`w-5 h-5 transition-colors ${
                  isScrolled ? 'text-white' : 'text-black'
                }`} />
              </div>
              <span className={`font-bold text-lg hidden sm:block transition-colors ${
                isScrolled ? 'text-black' : 'text-white'
              }`}>
                A-EYE
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.sectionId}
                  onClick={() => scrollToSection(link.sectionId)}
                  className={`font-medium transition-colors hover:opacity-70 ${
                    isScrolled ? 'text-gray-700' : 'text-white'
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <Button
                onClick={handleGetStarted}
                className={`transition-all ${
                  isScrolled
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                Get Started
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 transition-colors ${
                isScrolled ? 'text-black' : 'text-white'
              }`}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <button
                  key={link.sectionId}
                  onClick={() => scrollToSection(link.sectionId)}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
                >
                  {link.label}
                </button>
              ))}
              <Button
                onClick={handleGetStarted}
                className="w-full bg-black text-white hover:bg-gray-800"
              >
                Get Started
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-gray-800 min-h-screen flex items-center">
        {/* Animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        {/* Spotlight effect */}
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="white"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content - Text (Left aligned) */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-8">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm text-white font-medium">AI-Powered Security Intelligence</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
                Next-Gen Security
                <br />
                <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  For Construction Sites
                </span>
              </h1>

              <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-xl">
                Advanced AI surveillance platform with real-time threat detection, PPE compliance monitoring,
                and facial recognition-based access control.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-white text-black hover:bg-gray-100 px-8 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all group"
                >
                  Access Dashboard
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg backdrop-blur-sm"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Learn More
                </Button>
              </div>

              {/* Stats */}
              {/* <div className="grid grid-cols-2 gap-8">
                {[
                  { label: 'Real-Time Monitoring', value: '24/7' },
                  { label: 'AI Accuracy', value: '99.9%' },
                  { label: 'Response Time', value: '<1s' },
                  { label: 'Cloud Storage', value: 'Unlimited' },
                ].map((stat, idx) => (
                  <div key={idx}>
                    <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div> */}
            </div>

            {/* Right content - 3D Model */}
            <div className="relative h-[500px] lg:h-[600px] hidden lg:block">
              {/* Spline Scene - Commented out */}
              {/* <SplineScene
                scene="https://prod.spline.design/g3N3QmsnfIrWkw6d/scene.splinecode"
                className="w-full h-full"
              /> */}

              {/* Local 3D Model Viewer - GLB format */}
              <div className="w-full h-full">
                <ModelViewer
                  modelPath="/models/a_chinese_worker.glb"
                  autoRotate={true}
                  rotationSpeed={0.005}
                  showObjectControls={false}
                  className="w-full h-full"
                />
              </div>

              {/* Sketchfab Embed - Current */}
              {/* <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl">
                <iframe
                  title="Pete"
                  style={{ border: 0 }}
                  allowFullScreen
                  allow="autoplay; fullscreen; xr-spatial-tracking"
                  className="w-full h-full"
                  src="https://sketchfab.com/models/14cb64770751479094e2ca07fb5e4793/embed?autospin=1&autostart=1&preload=1&transparent=1&ui_hint=0&dnt=1&annotations_visible=0&ui_controls=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark=0"
                />
              </div> */}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to secure your construction site with cutting-edge AI technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Camera,
                title: 'Live Camera Monitoring',
                description: 'Multi-camera real-time surveillance with AI-powered video analytics and instant playback capabilities.',
                color: 'black'
              },
              {
                icon: ScanFace,
                title: 'Facial Recognition',
                description: 'Advanced face detection and recognition for automated personnel tracking and access control.',
                color: 'gray-800'
              },
              {
                icon: HardHat,
                title: 'PPE Compliance Detection',
                description: 'Automatic detection of missing safety equipment including helmets, vests, gloves, and protective gear.',
                color: 'gray-700'
              },
              {
                icon: UserCheck,
                title: 'Attendance Tracking',
                description: 'Touchless attendance management with facial recognition, timestamps, and comprehensive reports.',
                color: 'black'
              },
              {
                icon: AlertTriangle,
                title: 'Unauthorized Access Alerts',
                description: 'Real-time detection and alerts for unrecognized individuals entering restricted areas.',
                color: 'gray-800'
              },
              {
                icon: BarChart3,
                title: 'Analytics & Reports',
                description: 'Comprehensive dashboards with incident reports, safety metrics, and compliance analytics.',
                color: 'gray-700'
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group relative bg-gray-50 hover:bg-black transition-all duration-300 rounded-2xl p-8 border border-gray-200 hover:border-black hover:shadow-2xl"
              >
                <div className={`w-14 h-14 bg-${feature.color} group-hover:bg-white rounded-xl flex items-center justify-center mb-6 transition-all`}>
                  <feature.icon className="w-7 h-7 text-white group-hover:text-black transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-black group-hover:text-white mb-3 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 group-hover:text-gray-300 leading-relaxed transition-colors">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes with our streamlined security platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-gray-300 via-black to-gray-300"></div>

            {[
              {
                step: '01',
                icon: Camera,
                title: 'Connect Cameras',
                description: 'Integrate your existing CCTV cameras with our cloud platform using simple configuration.'
              },
              {
                step: '02',
                icon: Users,
                title: 'Register Personnel',
                description: 'Add your team members with facial recognition profiles for automated tracking.'
              },
              {
                step: '03',
                icon: Eye,
                title: 'Monitor & Protect',
                description: 'AI analyzes feeds in real-time, detecting violations and unauthorized access instantly.'
              },
            ].map((item, idx) => (
              <div key={idx} className="relative text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 bg-black rounded-2xl flex items-center justify-center shadow-xl relative z-10">
                    <item.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-white border-2 border-black rounded-full flex items-center justify-center font-bold text-2xl z-20">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-black mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section id="benefits" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold text-black mb-6">
                Why Choose Our Platform
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Built for construction sites, secured by AI, trusted by industry leaders.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: Zap,
                    title: 'Lightning Fast Response',
                    description: 'Sub-second detection and instant alerts for critical security events.'
                  },
                  {
                    icon: Lock,
                    title: 'Enterprise-Grade Security',
                    description: 'End-to-end encryption with secure cloud storage and access controls.'
                  },
                  {
                    icon: Clock,
                    title: 'Historical Tracking',
                    description: 'Complete audit trail with searchable video archives and detailed reports.'
                  },
                  {
                    icon: CheckCircle2,
                    title: 'Compliance Ready',
                    description: 'Automated compliance monitoring and documentation for safety regulations.'
                  },
                ].map((benefit, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                      <benefit.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-black mb-1">{benefit.title}</h4>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-black to-gray-700 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:32px_32px]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="w-64 h-64 text-white/10" />
                </div>
                <div className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-white font-semibold">System Active</span>
                  </div>
                  <p className="text-white/80 text-sm">All cameras online and monitoring</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-black via-gray-900 to-gray-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]"></div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Secure Your Site?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join leading construction companies using AI to protect their workforce and assets.
          </p>

          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-white text-black hover:bg-gray-100 px-10 py-6 text-lg font-semibold shadow-2xl hover:shadow-white/20 transition-all group"
          >
            Get Started Now
            <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <Shield className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-black text-lg">AI CCTV Security</span>
            </div>
            <p className="text-gray-600 text-sm">
              © 2025 AEYE Security System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client'

import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

interface ModelProps {
  url: string
  autoRotate?: boolean
  rotationSpeed?: number
}

function Model({ url, autoRotate = true, rotationSpeed = 0.005 }: ModelProps) {
  const modelRef = useRef<THREE.Group>(null)
  const gltf = useGLTF(url)

  // Auto-rotate the model
  useFrame(() => {
    if (modelRef.current && autoRotate) {
      modelRef.current.rotation.y += rotationSpeed
    }
  })

  return (
    <primitive
      ref={modelRef}
      object={gltf.scene}
      scale={0.00024}
      position={[0, -2.4, 0]}
    />
  )
}

interface ModelViewerProps {
  modelPath: string
  className?: string
  autoRotate?: boolean
  rotationSpeed?: number
}

export function ModelViewer({
  modelPath,
  className = '',
  autoRotate = true,
  rotationSpeed = 0.005
}: ModelViewerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <spotLight
            position={[-10, 10, -10]}
            angle={0.5}
            penumbra={1}
            intensity={0.6}
            castShadow
          />

          {/* Environment for reflections */}
          <Environment preset="studio" />

          {/* 3D Model */}
          <Model
            url={modelPath}
            autoRotate={autoRotate}
            rotationSpeed={rotationSpeed}
          />

          {/* Camera Controls (optional, can be disabled) */}
          <OrbitControls
            enableZoom={true}
            enablePan={true}
            autoRotate={false}
            minPolarAngle={Math.PI / 2.5}
            maxPolarAngle={Math.PI / 2.5}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

// Preload the model
export function preloadModel(url: string) {
  useGLTF.preload(url)
}

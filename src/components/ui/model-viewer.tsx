'use client'

import { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

interface ModelProps {
  url: string
  autoRotate?: boolean
  rotationSpeed?: number
  hiddenObjects?: string[]
}

interface ModelProps {
  url: string
  autoRotate?: boolean
  rotationSpeed?: number
  hiddenObjects?: string[]
  onObjectNamesLoaded?: (names: string[]) => void
}

function Model({ url, autoRotate = true, rotationSpeed = 0.005, hiddenObjects = [], onObjectNamesLoaded }: ModelProps) {
  const modelRef = useRef<THREE.Group>(null)
  const gltf = useGLTF(url)
  const [namesExtracted, setNamesExtracted] = useState(false)

  // Auto-rotate the model
  useFrame(() => {
    if (modelRef.current && autoRotate) {
      modelRef.current.rotation.y += rotationSpeed
    }
  })

  // Extract object names when model loads
  useEffect(() => {
    if (gltf.scene && !namesExtracted && onObjectNamesLoaded) {
      const names: string[] = []
      gltf.scene.traverse((child) => {
        if (child.name && child.name !== '') {
          names.push(child.name)
        }
      })
      const uniqueNames = [...new Set(names)]
      console.log('Extracted object names:', uniqueNames)
      onObjectNamesLoaded(uniqueNames)
      setNamesExtracted(true)
    }
  }, [gltf.scene, namesExtracted, onObjectNamesLoaded])

  // Toggle visibility of objects based on hiddenObjects prop
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Object3D) {
          // Check if this object's name is in the hiddenObjects array
          if (hiddenObjects.includes(child.name)) {
            child.visible = false
          } else {
            child.visible = true
          }
        }
      })
    }
  }, [hiddenObjects])

  return (
    <primitive
      ref={modelRef}
      object={gltf.scene}
      // scale={2.3}
      scale={0.00024}
      position={[0, -2.3, 0]}
    />
  )
}

interface ModelViewerProps {
  modelPath: string
  className?: string
  autoRotate?: boolean
  rotationSpeed?: number
  hiddenObjects?: string[]
  showObjectControls?: boolean
}

export function ModelViewer({
  modelPath,
  className = '',
  autoRotate = true,
  rotationSpeed = 0.005,
  hiddenObjects: externalHiddenObjects = [],
  showObjectControls = false
}: ModelViewerProps) {
  const [objectNames, setObjectNames] = useState<string[]>([])
  const [hiddenObjects, setHiddenObjects] = useState<string[]>(externalHiddenObjects)

  const handleObjectNamesLoaded = (names: string[]) => {
    console.log('Object names loaded in viewer:', names)
    setObjectNames(names)
  }

  const toggleObjectVisibility = (objectName: string) => {
    setHiddenObjects(prev => {
      if (prev.includes(objectName)) {
        return prev.filter(name => name !== objectName)
      } else {
        return [...prev, objectName]
      }
    })
  }

  return (
    <div className={`w-full h-full ${className} relative`}>
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
            angle={0.3}
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
            hiddenObjects={hiddenObjects}
            onObjectNamesLoaded={handleObjectNamesLoaded}
          />

          {/* Camera Controls (optional, can be disabled) */}
          <OrbitControls
            enableZoom={false}
            enablePan={true}
            enableRotate={true}
            autoRotate={false}
          />
        </Suspense>
      </Canvas>

      {/* Object Controls Panel */}
      {showObjectControls && objectNames.length > 0 && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 max-h-[400px] overflow-y-auto z-10 min-w-[200px]">
          <h3 className="font-semibold text-sm text-gray-900 mb-3">Model Objects ({objectNames.length})</h3>
          <div className="space-y-2">
            {objectNames.map((name) => (
              <label
                key={name}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={!hiddenObjects.includes(name)}
                  onChange={() => toggleObjectVisibility(name)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 select-none">{name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Debug info */}
      {showObjectControls && objectNames.length === 0 && (
        <div className="absolute top-4 right-4 bg-yellow-100 rounded-lg shadow-lg p-4 z-10 text-sm">
          Loading objects...
        </div>
      )}
    </div>
  )
}

// Preload the model
export function preloadModel(url: string) {
  useGLTF.preload(url)
}

// Helper function to log all object names in a GLB file
export function useModelObjectNames(url: string) {
  const gltf = useGLTF(url)
  const objectNames: string[] = []

  gltf.scene.traverse((child) => {
    if (child.name) {
      objectNames.push(child.name)
    }
  })

  return objectNames
}

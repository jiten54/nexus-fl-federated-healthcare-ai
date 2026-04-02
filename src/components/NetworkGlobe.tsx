import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { FederatedState } from '../types';
import { cn } from '../lib/utils';

export const NetworkGlobe = ({ state }: { state: FederatedState | null }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  const nodePositions = useMemo(() => {
    return [
      [2.5, 1.2, 0],
      [-2.5, -1.2, 1],
      [0, 2.5, -1.5],
      [1.5, -2.5, 0.5],
    ].map(p => new THREE.Vector3(...p));
  }, []);

  return (
    <group ref={groupRef}>
      {/* Central Global Model */}
      <Sphere args={[1, 32, 32]}>
        <meshStandardMaterial 
          color="#4f46e5" 
          emissive="#4f46e5" 
          emissiveIntensity={0.5} 
          wireframe 
        />
      </Sphere>

      {/* Distributed Nodes */}
      {state?.nodes.map((node, i) => (
        <group key={node.id} position={nodePositions[i]}>
          <Sphere args={[0.2, 16, 16]}>
            <meshStandardMaterial 
              color={node.status === 'training' ? '#10b981' : node.status === 'removed' ? '#ef4444' : '#6b7280'} 
              emissive={node.status === 'training' ? '#10b981' : node.status === 'removed' ? '#ef4444' : '#000'}
              emissiveIntensity={0.5}
            />
          </Sphere>
          
          {/* Connection Line */}
          {node.status !== 'removed' && (
            <line>
              <bufferGeometry attach="geometry" {...new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), nodePositions[i].clone().negate()])} />
              <lineBasicMaterial attach="material" color="#4f46e5" transparent opacity={0.3} />
            </line>
          )}

          <Html distanceFactor={10}>
            <div className={cn(
              "bg-black/80 text-white p-2 rounded text-[10px] whitespace-nowrap border backdrop-blur-sm",
              node.status === 'removed' ? "border-red-500/50" : "border-indigo-500/30"
            )}>
              <div className="font-bold">{node.id}</div>
              <div className="text-indigo-300">{node.location}</div>
              <div className={node.status === 'removed' ? "text-red-400 font-bold" : node.anomalies > 0 ? "text-amber-400" : "text-emerald-400"}>
                {node.status === 'removed' ? "🚫 QUARANTINED" : node.anomalies > 0 ? "⚠️ Anomaly Detected" : "✓ Healthy"}
              </div>
            </div>
          </Html>
        </group>
      ))}

      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
    </group>
  );
};

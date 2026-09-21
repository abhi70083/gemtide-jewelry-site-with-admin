import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';

const GemShape = () => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((_state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.25;
            meshRef.current.rotation.x += delta * 0.12;
        }
    });

    return (
        <Float speed={2.5} rotationIntensity={0.6} floatIntensity={1.8}>
            <mesh ref={meshRef} castShadow receiveShadow>
                <octahedronGeometry args={[2, 0]} />
                <meshPhysicalMaterial
                    color="#ffffff"
                    metalness={0.95}
                    roughness={0.08}
                    transmission={0.0}
                    thickness={0.0}
                    ior={2.5}
                    clearcoat={1.0}
                    clearcoatRoughness={0.05}
                />
            </mesh>
        </Float>
    );
};

const Hero3D: React.FC = () => {
    return (
        <div className="absolute inset-0 z-0 h-full w-full pointer-events-none">
            <Canvas shadows camera={{ position: [0, 0, 8], fov: 45 }} gl={{ alpha: true }}>
                <ambientLight intensity={0.6} />
                <directionalLight
                    position={[10, 10, 10]}
                    intensity={1.2}
                    castShadow
                    shadow-mapSize={1024}
                />
                <pointLight position={[-6, 5, 2]} intensity={5.0} color="#ffffff" />
                <pointLight position={[6, -5, 2]} intensity={4.0} color="#e2e8f0" />
                <pointLight position={[0, 0, 5]} intensity={3.5} color="#059669" />
                <Environment preset="studio" />
                <GemShape />
                <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2.0} far={4} />
            </Canvas>
        </div>
    );
};

export default Hero3D;

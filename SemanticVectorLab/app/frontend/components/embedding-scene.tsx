"use client";

import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import { Image as ImageIcon } from "lucide-react";
import type { ProjectionPoint, SearchMatch } from "../api-client/contracts";
import { RecordThumbnail } from "./record-thumbnail";

type SceneProps = {
  points: ProjectionPoint[];
  selectedId: string | null;
  matches: SearchMatch[];
  onSelect: (id: string) => void;
};

const PALETTE = ["#b8f7dd", "#90b8ff", "#ffc6a8", "#d8c1ff", "#f7e38b"];

function PointCloud({ points, selectedId, matches, onSelect }: SceneProps) {
  const pointsById = useMemo(
    () => new Map(points.map((point) => [point.id, point])),
    [points],
  );
  const selected = selectedId ? pointsById.get(selectedId) : undefined;
  const scores = useMemo(
    () => new Map(matches.map((match) => [match.id, match.similarity])),
    [matches],
  );

  useEffect(() => {
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  return (
    <>
      {selected &&
        matches.slice(0, 6).map((match) => {
          const target = pointsById.get(match.id);
          if (!target || target.id === selected.id) return null;
          return (
            <Line
              key={`${selected.id}-${target.id}`}
              points={[selected.position, target.position]}
              color="#83bca8"
              transparent
              opacity={Math.max(0.16, match.similarity * 0.72)}
              lineWidth={0.8}
            />
          );
        })}

      {points.map((point, index) => {
        const isSelected = point.id === selectedId;
        const similarity = scores.get(point.id);
        const isRelated = similarity !== undefined;
        const color = isSelected ? "#ffffff" : isRelated ? "#b8f7dd" : PALETTE[index % PALETTE.length];
        return (
          <group key={point.id} position={point.position}>
            <mesh
              scale={isSelected ? 1.55 : isRelated ? 1.15 : 1}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(point.id);
              }}
              onPointerOver={() => {
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "default";
              }}
            >
              {point.kind === "image" ? (
                <boxGeometry args={[isSelected ? 0.3 : 0.23, isSelected ? 0.3 : 0.23, 0.08]} />
              ) : (
                <sphereGeometry args={[isSelected ? 0.15 : 0.11, 24, 24]} />
              )}
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 1.35 : 0.55}
                roughness={0.25}
              />
            </mesh>
            {isSelected && (
              <>
                <mesh>
                  <ringGeometry args={[0.26, 0.29, 40]} />
                  <meshBasicMaterial color="#b8f7dd" transparent opacity={0.78} />
                </mesh>
                <Html center position={[0, 0.55, 0]} distanceFactor={8} className="point-label">
                  <span>{point.label}</span>
                </Html>
              </>
            )}
          </group>
        );
      })}
    </>
  );
}

export function EmbeddingScene(props: SceneProps) {
  const selectedPoint = props.points.find((point) => point.id === props.selectedId);
  return (
    <div className="scene-shell" aria-label="Interactive 3D projection of stored embeddings">
      <Canvas
        camera={{ position: [7.2, 5.4, 7.8], fov: 45 }}
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#101816"]} />
        <fog attach="fog" args={["#101816", 9, 18]} />
        <ambientLight intensity={0.8} />
        <pointLight position={[5, 7, 4]} intensity={18} color="#d8fff1" />
        <pointLight position={[-5, -2, -3]} intensity={10} color="#91aaff" />
        <gridHelper args={[12, 12, "#365249", "#263b35"]} position={[0, -4.5, 0]} />
        <axesHelper args={[4.8]} />
        <Suspense fallback={null}>
          <PointCloud {...props} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={5}
          maxDistance={14}
          dampingFactor={0.07}
        />
      </Canvas>
      <div className="axis-label axis-x">Axis 1</div>
      <div className="axis-label axis-y">Axis 2</div>
      <div className="axis-label axis-z">Axis 3</div>
      {selectedPoint && (
        <div className="selected-preview" aria-live="polite">
          <RecordThumbnail record={selectedPoint} className="selected-preview-media" />
          <div>
            <span className="selected-preview-type">
              {selectedPoint.kind === "image" ? <ImageIcon size={12} /> : null}
              {selectedPoint.kind} vector
            </span>
            <strong>{selectedPoint.label}</strong>
          </div>
        </div>
      )}
      <div className="scene-hint">Drag to orbit · Scroll to zoom · Select a point</div>
    </div>
  );
}

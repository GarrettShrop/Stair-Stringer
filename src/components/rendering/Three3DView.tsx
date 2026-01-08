"use client";

import { useEffect, useRef, useState } from "react";
import type { StairOutputs } from "@/lib/stairs";
import type { MaterialsOutputs } from "@/lib/materials";
import type { WoodType } from "@/lib/rendering/types";
import { buildStaircaseGeometry } from "@/lib/rendering/geometry";
import { createStaircaseScene, type SceneControls, type CalibrationData } from "@/lib/rendering/three3d";
import { PerspectiveCalibration, type CalibrationData as CalibrationUIData } from "./PerspectiveCalibration";

interface Three3DViewProps {
	stairData: StairOutputs;
	materialsData: MaterialsOutputs;
	stairWidthIn: number;
	backgroundImage?: File | null;
}

export function Three3DView({
	stairData,
	materialsData,
	stairWidthIn,
	backgroundImage,
}: Three3DViewProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<SceneControls | null>(null);
	const [woodType, setWoodType] = useState<WoodType>("pine");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showCalibration, setShowCalibration] = useState(false);
	const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);
	const [stairPosition, setStairPosition] = useState({ x: 0, y: 0, z: 0 });
	const [stairRotation, setStairRotation] = useState(0);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		setIsLoading(true);
		setError(null);

		const initScene = async () => {
			try {
				// Build geometry from stair data
				const geometry = buildStaircaseGeometry(
					stairData,
					materialsData,
					stairWidthIn
				);

				// Load background image if provided
				let bgImage: HTMLImageElement | undefined;
				if (backgroundImage) {
					bgImage = await loadImage(backgroundImage);
				}

				// Create 3D scene
				const scene = createStaircaseScene(
					container,
					geometry,
					bgImage,
					calibrationData || undefined
				);
				sceneRef.current = scene;

				// Apply initial position and rotation
				scene.updateStairPosition(stairPosition.x, stairPosition.y, stairPosition.z);
				scene.updateStairRotation(stairRotation);

				// Start animation
				scene.animate();

				setIsLoading(false);
			} catch (err) {
				console.error("Error initializing 3D scene:", err);
				setError(err instanceof Error ? err.message : "Failed to load 3D view");
				setIsLoading(false);
			}
		};

		initScene();

		// Cleanup on unmount
		return () => {
			if (sceneRef.current) {
				sceneRef.current.dispose();
				sceneRef.current = null;
			}
		};
	}, [stairData, materialsData, stairWidthIn, backgroundImage, calibrationData, stairPosition, stairRotation]);

	// Update wood type when changed
	useEffect(() => {
		if (sceneRef.current) {
			sceneRef.current.updateWoodType(woodType);
		}
	}, [woodType]);

	const loadImage = (file: File): Promise<HTMLImageElement> => {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const url = URL.createObjectURL(file);

			img.onload = () => {
				URL.revokeObjectURL(url);
				resolve(img);
			};

			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error("Failed to load background image"));
			};

			img.src = url;
		});
	};

	const handleScreenshot = () => {
		if (!sceneRef.current) return;

		try {
			const dataUrl = sceneRef.current.takeScreenshot();
			const link = document.createElement("a");
			link.download = "staircase-3d-view.png";
			link.href = dataUrl;
			link.click();
		} catch (error) {
			console.error("Error taking screenshot:", error);
			alert("Failed to take screenshot");
		}
	};

	const handleCalibrationComplete = (data: CalibrationUIData) => {
		const calibration: CalibrationData = {
			floorY: data.floorY,
			vanishingPointX: data.vanishingPointX,
			vanishingPointY: data.vanishingPointY,
			imageWidth: data.imageWidth,
			imageHeight: data.imageHeight,
		};
		setCalibrationData(calibration);
		setShowCalibration(false);
	};

	return (
		<>
			{showCalibration && backgroundImage && (
				<PerspectiveCalibration
					image={backgroundImage}
					onCalibrationComplete={handleCalibrationComplete}
					onSkip={() => setShowCalibration(false)}
				/>
			)}
		<div style={{ marginTop: 16 }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 12,
				}}
			>
				<div style={{ display: "flex", gap: 12, alignItems: "center" }}>
					<div style={{ fontWeight: 900, fontSize: 16, color: "#000" }}>
						3D Realistic View
					</div>
					<select
						value={woodType}
						onChange={(e) => setWoodType(e.target.value as WoodType)}
						style={{
							padding: "6px 12px",
							fontSize: 14,
							borderRadius: 6,
							border: "1px solid #ccc",
							backgroundColor: "#fff",
							color: "#000",
						}}
					>
						<option value="pine">Pine</option>
						<option value="oak">Oak</option>
						<option value="cedar">Cedar</option>
					</select>
				</div>
				<div style={{ display: "flex", gap: 8 }}>
					{backgroundImage && (
						<button
							onClick={() => setShowCalibration(true)}
							disabled={isLoading || !!error}
							style={{
								padding: "8px 16px",
								fontSize: 14,
								fontWeight: 900,
								borderRadius: 8,
								border: "1px solid #ccc",
								cursor: "pointer",
								backgroundColor: calibrationData ? "#4CAF50" : "#fff",
								color: calibrationData ? "#fff" : "#000",
								opacity: isLoading || error ? 0.5 : 1,
							}}
						>
							{calibrationData ? "✓ CALIBRATED" : "CALIBRATE"}
						</button>
					)}
					<button
						onClick={handleScreenshot}
						disabled={isLoading || !!error}
						style={{
							padding: "8px 16px",
							fontSize: 14,
							fontWeight: 900,
							borderRadius: 8,
							border: "1px solid #ccc",
							cursor: "pointer",
							backgroundColor: "#fff",
							color: "#000",
							opacity: isLoading || error ? 0.5 : 1,
						}}
					>
						SCREENSHOT
					</button>
				</div>
			</div>

			<div
				style={{
					border: "1px solid #e5e5e5",
					borderRadius: 10,
					overflow: "hidden",
					backgroundColor: "#f0f0f0",
					position: "relative",
					height: 600,
				}}
			>
				{isLoading && (
					<div
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
							textAlign: "center",
							color: "#000",
						}}
					>
						<div style={{ fontSize: 48, marginBottom: 12 }}>⚙️</div>
						<div style={{ fontWeight: 900, color: "#000" }}>Loading 3D view...</div>
					</div>
				)}

				{error && (
					<div
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
							textAlign: "center",
							color: "crimson",
						}}
					>
						<div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
						<div style={{ fontWeight: 900 }}>{error}</div>
					</div>
				)}

				<div ref={containerRef} style={{ width: "100%", height: "100%" }} />
			</div>

			<div
				style={{
					fontSize: 12,
					opacity: 0.7,
					marginTop: 8,
					textAlign: "center",
					color: "#000",
				}}
			>
				Use mouse to rotate, zoom, and pan. Right-click and drag to pan.
				{calibrationData && " Perspective calibrated!"}
			</div>

			{/* Position/Rotation Controls */}
			{calibrationData && (
				<div
					style={{
						marginTop: 12,
						padding: 12,
						backgroundColor: "#f9f9f9",
						borderRadius: 8,
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: 12,
					}}
				>
					<div>
						<label style={{ fontSize: 12, fontWeight: 900, color: "#000" }}>
							Position Z: {stairPosition.z.toFixed(0)}"
						</label>
						<input
							type="range"
							min="-200"
							max="200"
							value={stairPosition.z}
							onChange={(e) =>
								setStairPosition({ ...stairPosition, z: Number(e.target.value) })
							}
							style={{ width: "100%" }}
						/>
					</div>
					<div>
						<label style={{ fontSize: 12, fontWeight: 900, color: "#000" }}>
							Rotation: {(stairRotation * 180 / Math.PI).toFixed(0)}°
						</label>
						<input
							type="range"
							min="0"
							max={Math.PI * 2}
							step="0.1"
							value={stairRotation}
							onChange={(e) => setStairRotation(Number(e.target.value))}
							style={{ width: "100%" }}
						/>
					</div>
				</div>
			)}
		</div>
		</>
	);
}

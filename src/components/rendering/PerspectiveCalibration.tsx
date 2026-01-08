"use client";

import { useState, useRef, useEffect } from "react";

export interface CalibrationPoint {
	x: number; // Image coordinates (0-1)
	y: number;
	realHeight?: number; // Real-world height in inches
	label: string;
}

export interface CalibrationData {
	points: CalibrationPoint[];
	imageWidth: number;
	imageHeight: number;
	floorY: number; // Y coordinate of floor line (0-1)
	vanishingPointX?: number; // Vanishing point for perspective
	vanishingPointY?: number;
}

interface PerspectiveCalibrationProps {
	image: File;
	onCalibrationComplete: (data: CalibrationData) => void;
	onSkip: () => void;
}

export function PerspectiveCalibration({
	image,
	onCalibrationComplete,
	onSkip,
}: PerspectiveCalibrationProps) {
	const [imageUrl, setImageUrl] = useState<string>("");
	const [points, setPoints] = useState<CalibrationPoint[]>([]);
	const [currentStep, setCurrentStep] = useState<
		"floor" | "reference" | "vanishing" | "done"
	>("floor");
	const [floorY, setFloorY] = useState<number>(0.9);
	const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);

	useEffect(() => {
		const url = URL.createObjectURL(image);
		setImageUrl(url);

		const img = new Image();
		img.onload = () => {
			setImageDimensions({ width: img.width, height: img.height });
		};
		img.src = url;

		return () => URL.revokeObjectURL(url);
	}, [image]);

	useEffect(() => {
		drawCanvas();
	}, [imageUrl, points, floorY, currentStep, imageDimensions]);

	const drawCanvas = () => {
		const canvas = canvasRef.current;
		const img = imgRef.current;
		if (!canvas || !img || !img.complete) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Draw image
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

		// Draw floor line (always visible)
		ctx.strokeStyle = "#4CAF50";
		ctx.lineWidth = 3;
		ctx.setLineDash([10, 5]);
		ctx.beginPath();
		const y = floorY * canvas.height;
		ctx.moveTo(0, y);
		ctx.lineTo(canvas.width, y);
		ctx.stroke();
		ctx.setLineDash([]);

		// Label
		ctx.fillStyle = "#4CAF50";
		ctx.font = "bold 14px sans-serif";
		ctx.fillText("Floor Level", 10, y - 10);

		// Draw reference points
		points.forEach((point, i) => {
			const x = point.x * canvas.width;
			const y = point.y * canvas.height;

			// Draw crosshair
			ctx.strokeStyle = "#FF5722";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x - 15, y);
			ctx.lineTo(x + 15, y);
			ctx.moveTo(x, y - 15);
			ctx.lineTo(x, y + 15);
			ctx.stroke();

			// Draw circle
			ctx.beginPath();
			ctx.arc(x, y, 8, 0, Math.PI * 2);
			ctx.fillStyle = "#FF5722";
			ctx.fill();

			// Label
			ctx.fillStyle = "#FF5722";
			ctx.font = "bold 12px sans-serif";
			ctx.fillText(point.label, x + 12, y - 12);
		});
	};

	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) / rect.width;
		const y = (e.clientY - rect.top) / rect.height;

		if (currentStep === "floor") {
			setFloorY(y);
		} else if (currentStep === "reference") {
			// Add reference point
			const label = `Point ${points.length + 1}`;
			setPoints([...points, { x, y, label }]);
		}
	};

	const handleNext = () => {
		if (currentStep === "floor") {
			setCurrentStep("reference");
		} else if (currentStep === "reference") {
			if (points.length < 2) {
				alert("Please mark at least 2 reference points");
				return;
			}
			setCurrentStep("done");
		}
	};

	const handleComplete = () => {
		// Calculate vanishing point (simple estimation from reference points)
		let vanishingPointX: number | undefined;
		let vanishingPointY: number | undefined;

		if (points.length >= 2) {
			// Simple average for now - could be more sophisticated
			vanishingPointX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
			vanishingPointY = 0.4; // Assume vanishing point is above horizon
		}

		const calibrationData: CalibrationData = {
			points,
			imageWidth: imageDimensions.width,
			imageHeight: imageDimensions.height,
			floorY,
			vanishingPointX,
			vanishingPointY,
		};

		onCalibrationComplete(calibrationData);
	};

	const getInstructions = () => {
		switch (currentStep) {
			case "floor":
				return "Click to set the floor level where the stairs will sit";
			case "reference":
				return "Click to mark reference points (corners, walls, etc.) - at least 2 points";
			case "done":
				return "Review your calibration and click Complete";
			default:
				return "";
		}
	};

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: "rgba(0, 0, 0, 0.9)",
				zIndex: 1000,
				display: "flex",
				flexDirection: "column",
				padding: 20,
			}}
		>
			<div
				style={{
					backgroundColor: "#fff",
					borderRadius: 10,
					padding: 20,
					maxWidth: 1200,
					margin: "0 auto",
					width: "100%",
					maxHeight: "90vh",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 16,
					}}
				>
					<h2 style={{ margin: 0, color: "#000" }}>Calibrate Perspective</h2>
					<button
						onClick={onSkip}
						style={{
							padding: "8px 16px",
							fontSize: 14,
							fontWeight: 900,
							borderRadius: 8,
							border: "1px solid #ccc",
							cursor: "pointer",
							backgroundColor: "#fff",
							color: "#000",
						}}
					>
						SKIP
					</button>
				</div>

				<div
					style={{
						backgroundColor: "#f0f9ff",
						padding: 12,
						borderRadius: 8,
						marginBottom: 16,
						color: "#000",
					}}
				>
					<div style={{ fontWeight: 900, marginBottom: 4, color: "#000" }}>
						Step {currentStep === "floor" ? "1" : currentStep === "reference" ? "2" : "3"} of 3:
					</div>
					<div style={{ color: "#000" }}>{getInstructions()}</div>
				</div>

				<div
					style={{
						flex: 1,
						position: "relative",
						overflow: "auto",
						backgroundColor: "#f5f5f5",
						borderRadius: 8,
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<img
						ref={imgRef}
						src={imageUrl}
						alt="Calibration"
						style={{ display: "none" }}
						onLoad={drawCanvas}
					/>
					<canvas
						ref={canvasRef}
						width={800}
						height={600}
						onClick={handleCanvasClick}
						style={{
							maxWidth: "100%",
							maxHeight: "100%",
							cursor: "crosshair",
							border: "2px solid #ccc",
							borderRadius: 8,
						}}
					/>
				</div>

				<div
					style={{
						display: "flex",
						gap: 12,
						marginTop: 16,
						justifyContent: "flex-end",
					}}
				>
					{currentStep !== "done" && (
						<button
							onClick={handleNext}
							style={{
								padding: "12px 24px",
								fontSize: 16,
								fontWeight: 900,
								borderRadius: 8,
								border: "none",
								cursor: "pointer",
								backgroundColor: "#4CAF50",
								color: "#fff",
							}}
						>
							NEXT
						</button>
					)}
					{currentStep === "done" && (
						<button
							onClick={handleComplete}
							style={{
								padding: "12px 24px",
								fontSize: 16,
								fontWeight: 900,
								borderRadius: 8,
								border: "none",
								cursor: "pointer",
								backgroundColor: "#4CAF50",
								color: "#fff",
							}}
						>
							COMPLETE
						</button>
					)}
				</div>

				<div
					style={{
						marginTop: 12,
						fontSize: 12,
						color: "#666",
						textAlign: "center",
					}}
				>
					Points marked: {points.length} | Floor level: {(floorY * 100).toFixed(0)}%
				</div>
			</div>
		</div>
	);
}

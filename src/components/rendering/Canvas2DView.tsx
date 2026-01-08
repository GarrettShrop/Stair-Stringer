"use client";

import { useEffect, useRef, useState } from "react";
import type { StairOutputs } from "@/lib/stairs";
import type { MaterialsOutputs } from "@/lib/materials";
import type { ViewType2D } from "@/lib/rendering/types";
import {
	drawSideElevation,
	drawPlanView,
	drawStringerDetail,
} from "@/lib/rendering/canvas2d";

interface Canvas2DViewProps {
	stairData: StairOutputs;
	materialsData: MaterialsOutputs;
	stairWidthIn: number;
	viewType: ViewType2D;
	jobName?: string;
}

export function Canvas2DView({
	stairData,
	materialsData,
	stairWidthIn,
	viewType,
	jobName = "Stair Stringer",
}: Canvas2DViewProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [isExporting, setIsExporting] = useState(false);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Render based on view type
		try {
			if (viewType === "elevation") {
				drawSideElevation(ctx, stairData, jobName);
			} else if (viewType === "plan") {
				drawPlanView(ctx, stairData, materialsData, stairWidthIn, jobName);
			} else if (viewType === "stringer") {
				drawStringerDetail(ctx, stairData, jobName);
			}
		} catch (error) {
			console.error("Error rendering 2D view:", error);
		}
	}, [stairData, materialsData, stairWidthIn, viewType, jobName]);

	const handleExportPNG = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		setIsExporting(true);
		try {
			const dataUrl = canvas.toDataURL("image/png");
			const link = document.createElement("a");
			link.download = `${jobName}-${viewType}-view.png`;
			link.href = dataUrl;
			link.click();
		} catch (error) {
			console.error("Error exporting PNG:", error);
			alert("Failed to export PNG");
		} finally {
			setIsExporting(false);
		}
	};

	const handleExportPDF = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		setIsExporting(true);
		try {
			const dataUrl = canvas.toDataURL("image/png");

			const w = window.open("", "_blank");
			if (!w) {
				alert("Popup blocked. Please allow popups for this site.");
				setIsExporting(false);
				return;
			}

			w.document.write(`
				<html>
				<head>
					<title>${jobName} - ${viewType} view</title>
					<style>
						body { margin: 0; padding: 20px; }
						img { max-width: 100%; height: auto; }
						@media print {
							body { padding: 0; }
							.hint { display: none; }
						}
					</style>
				</head>
				<body>
					<img src="${dataUrl}" alt="${viewType} view" />
					<div class="hint" style="margin-top: 20px; opacity: 0.7;">
						Use your browser's Print dialog → "Save as PDF"
					</div>
					<script>
						window.onload = () => window.print();
					</script>
				</body>
				</html>
			`);
			w.document.close();
		} catch (error) {
			console.error("Error exporting PDF:", error);
			alert("Failed to export PDF");
		} finally {
			setIsExporting(false);
		}
	};

	const getViewTitle = () => {
		switch (viewType) {
			case "elevation":
				return "Side Elevation";
			case "plan":
				return "Plan View";
			case "stringer":
				return "Stringer Detail";
			default:
				return "";
		}
	};

	return (
		<div style={{ marginTop: 16 }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 12,
				}}
			>
				<div style={{ fontWeight: 900, fontSize: 16, color: "#000" }}>
					{getViewTitle()}
				</div>
				<div style={{ display: "flex", gap: 8 }}>
					<button
						onClick={handleExportPNG}
						disabled={isExporting}
						style={{
							padding: "8px 16px",
							fontSize: 14,
							fontWeight: 900,
							borderRadius: 8,
							border: "1px solid #ccc",
							cursor: "pointer",
							backgroundColor: "#fff",
							color: "#000",
							opacity: isExporting ? 0.5 : 1,
						}}
					>
						EXPORT PNG
					</button>
					<button
						onClick={handleExportPDF}
						disabled={isExporting}
						style={{
							padding: "8px 16px",
							fontSize: 14,
							fontWeight: 900,
							borderRadius: 8,
							border: "1px solid #ccc",
							cursor: "pointer",
							backgroundColor: "#fff",
							color: "#000",
							opacity: isExporting ? 0.5 : 1,
						}}
					>
						EXPORT PDF
					</button>
				</div>
			</div>

			<div
				style={{
					border: "1px solid #e5e5e5",
					borderRadius: 10,
					overflow: "hidden",
					backgroundColor: "#fff",
				}}
			>
				<canvas
					ref={canvasRef}
					width={1200}
					height={800}
					style={{ width: "100%", height: "auto", display: "block" }}
				/>
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
				Technical drawing with dimensions. Export to share or print.
			</div>
		</div>
	);
}

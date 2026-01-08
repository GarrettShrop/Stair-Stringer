"use client";

import type { RenderView, ViewType2D } from "@/lib/rendering/types";

interface RenderingControlsProps {
	activeView: RenderView;
	onViewChange: (view: RenderView) => void;
	view2DType: ViewType2D;
	onView2DTypeChange: (type: ViewType2D) => void;
}

export function RenderingControls({
	activeView,
	onViewChange,
	view2DType,
	onView2DTypeChange,
}: RenderingControlsProps) {
	const tabStyle = (isActive: boolean): React.CSSProperties => ({
		padding: "12px 24px",
		fontSize: 14,
		fontWeight: 900,
		borderRadius: 10,
		border: isActive ? "2px solid #000" : "1px solid #ccc",
		cursor: "pointer",
		backgroundColor: isActive ? "#000" : "#fff",
		color: isActive ? "#fff" : "#000",
		transition: "all 0.2s",
	});

	const subTabStyle = (isActive: boolean): React.CSSProperties => ({
		padding: "8px 16px",
		fontSize: 12,
		fontWeight: 900,
		borderRadius: 6,
		border: "none",
		cursor: "pointer",
		backgroundColor: isActive ? "#ddd" : "transparent",
		color: "#000",
		transition: "all 0.2s",
	});

	return (
		<div style={{ marginBottom: 16 }}>
			{/* Main view tabs */}
			<div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
				<button
					onClick={() => onViewChange("2d")}
					style={tabStyle(activeView === "2d")}
				>
					2D TECHNICAL
				</button>
				<button
					onClick={() => onViewChange("3d")}
					style={tabStyle(activeView === "3d")}
				>
					3D REALISTIC
				</button>
				{activeView !== "none" && (
					<button
						onClick={() => onViewChange("none")}
						style={{
							...tabStyle(false),
							marginLeft: "auto",
							padding: "12px 16px",
						}}
					>
						✕ CLOSE
					</button>
				)}
			</div>

			{/* 2D view sub-tabs */}
			{activeView === "2d" && (
				<div
					style={{
						display: "flex",
						gap: 6,
						padding: 12,
						backgroundColor: "#f9f9f9",
						borderRadius: 8,
					}}
				>
					<div
						style={{
							fontSize: 12,
							fontWeight: 900,
							marginRight: 8,
							alignSelf: "center",
							color: "#000",
						}}
					>
						VIEW:
					</div>
					<button
						onClick={() => onView2DTypeChange("elevation")}
						style={subTabStyle(view2DType === "elevation")}
					>
						SIDE ELEVATION
					</button>
					<button
						onClick={() => onView2DTypeChange("plan")}
						style={subTabStyle(view2DType === "plan")}
					>
						PLAN VIEW
					</button>
					<button
						onClick={() => onView2DTypeChange("stringer")}
						style={subTabStyle(view2DType === "stringer")}
					>
						STRINGER DETAIL
					</button>
				</div>
			)}

			{/* 3D view info */}
			{activeView === "3d" && (
				<div
					style={{
						padding: 12,
						backgroundColor: "#f0f9ff",
						borderRadius: 8,
						fontSize: 12,
						color: "#000",
					}}
				>
					<div style={{ fontWeight: 900, marginBottom: 4, color: "#000" }}>
						Interactive 3D Controls:
					</div>
					<ul style={{ margin: 0, paddingLeft: 18, opacity: 0.8, color: "#000" }}>
						<li>Left-click + drag to rotate</li>
						<li>Scroll or pinch to zoom</li>
						<li>Right-click + drag to pan</li>
					</ul>
				</div>
			)}
		</div>
	);
}

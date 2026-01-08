import type { Vector3 } from "three";

export interface StaircaseGeometry {
	stringers: Vector3[][]; // Array of stringer paths (each stringer is an array of vertices)
	treads: Vector3[][]; // Array of tread vertices (each tread is a rectangular shape)
	risers: Vector3[][]; // Array of riser vertices (if closed stair)
	dimensions: {
		width: number; // X-axis - stair width in inches
		height: number; // Y-axis - total rise in inches
		depth: number; // Z-axis - total run in inches
	};
}

export type ViewType2D = "elevation" | "plan" | "stringer";
export type RenderView = "none" | "2d" | "3d";
export type WoodType = "pine" | "oak" | "cedar";

export interface ImageMetadata {
	id: string;
	jobId: string;
	filename: string;
	size: number; // bytes
	width: number;
	height: number;
	uploadedAt: string; // ISO timestamp
}

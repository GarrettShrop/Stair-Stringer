import { Vector3 } from "three";
import type { StairOutputs } from "../stairs";
import type { MaterialsOutputs } from "../materials";
import type { StaircaseGeometry } from "./types";

const STRINGER_DEPTH = 11.25; // 2x12 actual depth in inches
const TREAD_THICKNESS = 1.0; // Typical tread thickness in inches

/**
 * Build 3D geometry data from stair calculations
 * Coordinate system: X = width, Y = height (rise), Z = depth (run)
 */
export function buildStaircaseGeometry(
	stairData: StairOutputs,
	materialsData: MaterialsOutputs,
	stairWidthIn: number
): StaircaseGeometry {
	const { exactRiserIn, treadRunIn, numRisers, numTreads, totalRunIn } =
		stairData;
	const { numStringers } = materialsData;

	// Build stringers
	const stringers: Vector3[][] = [];
	const stringerSpacing = stairWidthIn / (numStringers - 1);

	for (let i = 0; i < numStringers; i++) {
		const xPos = i * stringerSpacing;
		const stringerPath: Vector3[] = [];

		// Start at bottom
		stringerPath.push(new Vector3(xPos, 0, 0));

		// Create notched path for each step
		for (let step = 0; step < numTreads; step++) {
			const riseY = (step + 1) * exactRiserIn;
			const runZ = (step + 1) * treadRunIn;

			// Top of riser
			stringerPath.push(new Vector3(xPos, riseY, runZ - treadRunIn));

			// Back of tread
			stringerPath.push(new Vector3(xPos, riseY, runZ));
		}

		// Top landing
		const totalRise = numRisers * exactRiserIn;
		stringerPath.push(new Vector3(xPos, totalRise, totalRunIn));

		stringers.push(stringerPath);
	}

	// Build treads
	const treads: Vector3[][] = [];
	for (let step = 0; step < numTreads; step++) {
		const riseY = (step + 1) * exactRiserIn;
		const runZ = (step + 1) * treadRunIn;

		// Each tread is a rectangle at height riseY
		const tread: Vector3[] = [
			new Vector3(0, riseY, runZ - treadRunIn), // Front left
			new Vector3(stairWidthIn, riseY, runZ - treadRunIn), // Front right
			new Vector3(stairWidthIn, riseY, runZ), // Back right
			new Vector3(0, riseY, runZ), // Back left
			// Top surface
			new Vector3(0, riseY + TREAD_THICKNESS, runZ - treadRunIn), // Front left top
			new Vector3(stairWidthIn, riseY + TREAD_THICKNESS, runZ - treadRunIn), // Front right top
			new Vector3(stairWidthIn, riseY + TREAD_THICKNESS, runZ), // Back right top
			new Vector3(0, riseY + TREAD_THICKNESS, runZ), // Back left top
		];
		treads.push(tread);
	}

	// Build risers (vertical boards)
	const risers: Vector3[][] = [];
	for (let step = 0; step < numRisers; step++) {
		const bottomY = step * exactRiserIn;
		const topY = (step + 1) * exactRiserIn;
		const runZ = step * treadRunIn;

		// Each riser is a vertical rectangle
		const riser: Vector3[] = [
			new Vector3(0, bottomY, runZ), // Bottom left
			new Vector3(stairWidthIn, bottomY, runZ), // Bottom right
			new Vector3(stairWidthIn, topY, runZ), // Top right
			new Vector3(0, topY, runZ), // Top left
		];
		risers.push(riser);
	}

	return {
		stringers,
		treads,
		risers,
		dimensions: {
			width: stairWidthIn,
			height: numRisers * exactRiserIn,
			depth: totalRunIn,
		},
	};
}

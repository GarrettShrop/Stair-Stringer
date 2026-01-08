import type { StairOutputs } from "../stairs";
import type { MaterialsOutputs } from "../materials";
import { toFraction } from "../units";

const SCALE = 8; // pixels per inch
const MARGIN = 60; // margin in pixels
const LINE_WIDTH = 2;
const DIMENSION_OFFSET = 30; // offset for dimension lines

/**
 * Draw dimension line with arrows and text
 */
function drawDimension(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	text: string,
	offset: number = DIMENSION_OFFSET
) {
	ctx.save();
	ctx.strokeStyle = "#000";
	ctx.fillStyle = "#000";
	ctx.lineWidth = 1;

	// Calculate perpendicular offset
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.sqrt(dx * dx + dy * dy);
	const perpX = (-dy / len) * offset;
	const perpY = (dx / len) * offset;

	const startX = x1 + perpX;
	const startY = y1 + perpY;
	const endX = x2 + perpX;
	const endY = y2 + perpY;

	// Draw line
	ctx.beginPath();
	ctx.moveTo(startX, startY);
	ctx.lineTo(endX, endY);
	ctx.stroke();

	// Draw arrows
	const arrowSize = 8;
	const angle = Math.atan2(endY - startY, endX - startX);

	// Start arrow
	ctx.beginPath();
	ctx.moveTo(startX, startY);
	ctx.lineTo(
		startX - arrowSize * Math.cos(angle - Math.PI / 6),
		startY - arrowSize * Math.sin(angle - Math.PI / 6)
	);
	ctx.moveTo(startX, startY);
	ctx.lineTo(
		startX - arrowSize * Math.cos(angle + Math.PI / 6),
		startY - arrowSize * Math.sin(angle + Math.PI / 6)
	);
	ctx.stroke();

	// End arrow
	ctx.beginPath();
	ctx.moveTo(endX, endY);
	ctx.lineTo(
		endX + arrowSize * Math.cos(angle - Math.PI / 6),
		endY + arrowSize * Math.sin(angle - Math.PI / 6)
	);
	ctx.moveTo(endX, endY);
	ctx.lineTo(
		endX + arrowSize * Math.cos(angle + Math.PI / 6),
		endY + arrowSize * Math.sin(angle + Math.PI / 6)
	);
	ctx.stroke();

	// Draw text
	ctx.font = "12px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	const midX = (startX + endX) / 2;
	const midY = (startY + endY) / 2;

	// Background for text
	const textWidth = ctx.measureText(text).width;
	ctx.fillStyle = "#fff";
	ctx.fillRect(midX - textWidth / 2 - 2, midY - 8, textWidth + 4, 16);

	ctx.fillStyle = "#000";
	ctx.fillText(text, midX, midY);

	ctx.restore();
}

/**
 * Draw title block
 */
function drawTitleBlock(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	title: string
) {
	ctx.save();
	ctx.strokeStyle = "#000";
	ctx.fillStyle = "#000";
	ctx.lineWidth = 2;

	// Border
	ctx.strokeRect(width - 300, height - 100, 280, 80);

	// Title
	ctx.font = "16px sans-serif";
	ctx.fillText(title, width - 290, height - 75);

	// Date
	ctx.font = "12px sans-serif";
	ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, width - 290, height - 50);

	// Scale
	ctx.fillText(`Scale: ${SCALE} px/in`, width - 290, height - 30);

	ctx.restore();
}

/**
 * Draw side elevation view (profile of stairs)
 */
export function drawSideElevation(
	ctx: CanvasRenderingContext2D,
	stairData: StairOutputs,
	jobName: string = "Stair Stringer"
): void {
	const { exactRiserIn, treadRunIn, numRisers, numTreads, totalRunIn } =
		stairData;

	const width = ctx.canvas.width;
	const height = ctx.canvas.height;

	// Clear canvas
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, width, height);

	// Calculate drawing area
	const totalRise = numRisers * exactRiserIn;
	const drawWidth = totalRunIn * SCALE;
	const drawHeight = totalRise * SCALE;

	// Center the drawing
	const offsetX = MARGIN;
	const offsetY = height - MARGIN;

	// Draw stringers (simplified as stepped line)
	ctx.save();
	ctx.strokeStyle = "#000";
	ctx.lineWidth = LINE_WIDTH;

	ctx.beginPath();
	ctx.moveTo(offsetX, offsetY);

	for (let i = 0; i <= numTreads; i++) {
		const runZ = i * treadRunIn * SCALE;
		const riseY = i * exactRiserIn * SCALE;

		// Horizontal line (tread)
		ctx.lineTo(offsetX + runZ + treadRunIn * SCALE, offsetY - riseY);
		// Vertical line (riser)
		if (i < numTreads) {
			ctx.lineTo(
				offsetX + runZ + treadRunIn * SCALE,
				offsetY - (riseY + exactRiserIn * SCALE)
			);
		}
	}

	ctx.stroke();
	ctx.restore();

	// Draw treads
	ctx.save();
	ctx.strokeStyle = "#000";
	ctx.lineWidth = LINE_WIDTH;
	ctx.fillStyle = "rgba(200, 150, 100, 0.3)"; // Light wood color

	for (let i = 0; i < numTreads; i++) {
		const runZ = i * treadRunIn * SCALE;
		const riseY = (i + 1) * exactRiserIn * SCALE;

		ctx.fillRect(
			offsetX + runZ,
			offsetY - riseY - 4,
			treadRunIn * SCALE,
			4
		);
	}
	ctx.restore();

	// Dimensions - Rise
	for (let i = 1; i <= numRisers; i++) {
		const riseY = i * exactRiserIn * SCALE;
		const prevRiseY = (i - 1) * exactRiserIn * SCALE;
		const runZ = (i - 1) * treadRunIn * SCALE;

		drawDimension(
			ctx,
			offsetX + runZ - 20,
			offsetY - prevRiseY,
			offsetX + runZ - 20,
			offsetY - riseY,
			toFraction(exactRiserIn, 16) + '"',
			-10
		);
	}

	// Dimensions - Run
	for (let i = 0; i < numTreads; i++) {
		const runZ = i * treadRunIn * SCALE;
		const nextRunZ = (i + 1) * treadRunIn * SCALE;
		const riseY = (i + 1) * exactRiserIn * SCALE;

		drawDimension(
			ctx,
			offsetX + runZ,
			offsetY - riseY + 20,
			offsetX + nextRunZ,
			offsetY - riseY + 20,
			toFraction(treadRunIn, 16) + '"',
			10
		);
	}

	// Total run dimension
	drawDimension(
		ctx,
		offsetX,
		offsetY + 40,
		offsetX + drawWidth,
		offsetY + 40,
		`Total Run: ${toFraction(totalRunIn, 16)}"`,
		10
	);

	// Total rise dimension
	drawDimension(
		ctx,
		offsetX - 60,
		offsetY,
		offsetX - 60,
		offsetY - drawHeight,
		`Total Rise: ${toFraction(totalRise, 16)}"`,
		-10
	);

	// Title block
	drawTitleBlock(ctx, width, height, `${jobName} - Side Elevation`);
}

/**
 * Draw plan view (top-down view)
 */
export function drawPlanView(
	ctx: CanvasRenderingContext2D,
	stairData: StairOutputs,
	materialsData: MaterialsOutputs,
	stairWidthIn: number,
	jobName: string = "Stair Stringer"
): void {
	const { treadRunIn, numTreads, totalRunIn } = stairData;
	const { numStringers } = materialsData;

	const width = ctx.canvas.width;
	const height = ctx.canvas.height;

	// Clear canvas
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, width, height);

	// Calculate drawing area
	const drawWidth = totalRunIn * SCALE;
	const drawHeight = stairWidthIn * SCALE;

	// Center the drawing
	const offsetX = MARGIN;
	const offsetY = (height - drawHeight) / 2;

	// Draw treads
	ctx.save();
	ctx.strokeStyle = "#000";
	ctx.lineWidth = LINE_WIDTH;
	ctx.fillStyle = "rgba(200, 150, 100, 0.2)";

	for (let i = 0; i < numTreads; i++) {
		const runZ = i * treadRunIn * SCALE;
		ctx.fillRect(
			offsetX + runZ,
			offsetY,
			treadRunIn * SCALE,
			drawHeight
		);
		ctx.strokeRect(
			offsetX + runZ,
			offsetY,
			treadRunIn * SCALE,
			drawHeight
		);
	}
	ctx.restore();

	// Draw stringers
	ctx.save();
	ctx.strokeStyle = "#333";
	ctx.lineWidth = 3;
	ctx.setLineDash([5, 5]);

	const stringerSpacing = stairWidthIn / (numStringers - 1);
	for (let i = 0; i < numStringers; i++) {
		const yPos = offsetY + i * stringerSpacing * SCALE;
		ctx.beginPath();
		ctx.moveTo(offsetX, yPos);
		ctx.lineTo(offsetX + drawWidth, yPos);
		ctx.stroke();
	}
	ctx.restore();

	// Dimensions - Width
	drawDimension(
		ctx,
		offsetX - 40,
		offsetY,
		offsetX - 40,
		offsetY + drawHeight,
		toFraction(stairWidthIn, 16) + '"',
		-10
	);

	// Dimensions - Total run
	drawDimension(
		ctx,
		offsetX,
		offsetY + drawHeight + 40,
		offsetX + drawWidth,
		offsetY + drawHeight + 40,
		`Total Run: ${toFraction(totalRunIn, 16)}"`,
		10
	);

	// Stringer spacing
	if (numStringers > 1) {
		drawDimension(
			ctx,
			offsetX - 80,
			offsetY,
			offsetX - 80,
			offsetY + stringerSpacing * SCALE,
			toFraction(stringerSpacing, 16) + '" o.c.',
			-10
		);
	}

	// Title block
	drawTitleBlock(ctx, width, height, `${jobName} - Plan View`);

	// Legend
	ctx.save();
	ctx.font = "12px sans-serif";
	ctx.fillStyle = "#000";
	ctx.fillText(`${numStringers} Stringers`, offsetX, offsetY - 20);
	ctx.fillText(`${numTreads} Treads`, offsetX, offsetY - 5);
	ctx.restore();
}

/**
 * Draw stringer detail (cutout pattern)
 */
export function drawStringerDetail(
	ctx: CanvasRenderingContext2D,
	stairData: StairOutputs,
	jobName: string = "Stair Stringer"
): void {
	const { exactRiserIn, treadRunIn, numTreads, stringerLenIn } = stairData;

	const width = ctx.canvas.width;
	const height = ctx.canvas.height;

	// Clear canvas
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, width, height);

	// Calculate drawing area
	const totalRun = numTreads * treadRunIn;
	const totalRise = (numTreads + 1) * exactRiserIn;
	const drawWidth = totalRun * SCALE;
	const drawHeight = totalRise * SCALE;

	// Center the drawing
	const offsetX = MARGIN;
	const offsetY = height - MARGIN;

	// Draw stringer outline with notches
	ctx.save();
	ctx.strokeStyle = "#000";
	ctx.lineWidth = LINE_WIDTH * 1.5;

	ctx.beginPath();

	// Start at bottom left
	ctx.moveTo(offsetX, offsetY);

	// Draw notched pattern
	for (let i = 0; i < numTreads; i++) {
		const runZ = i * treadRunIn * SCALE;
		const riseY = (i + 1) * exactRiserIn * SCALE;

		// Vertical cut (riser)
		ctx.lineTo(offsetX + runZ, offsetY - riseY);
		// Horizontal cut (tread)
		ctx.lineTo(offsetX + runZ + treadRunIn * SCALE, offsetY - riseY);
	}

	// Top of stringer
	const finalRise = (numTreads + 1) * exactRiserIn * SCALE;
	ctx.lineTo(offsetX + drawWidth, offsetY - finalRise);

	// Back edge (straight line) - close the path
	ctx.lineTo(offsetX, offsetY - finalRise);
	ctx.closePath();

	ctx.stroke();
	ctx.restore();

	// Mark cut lines
	ctx.save();
	ctx.strokeStyle = "#f00";
	ctx.lineWidth = 1;
	ctx.setLineDash([5, 3]);

	for (let i = 0; i < numTreads; i++) {
		const runZ = i * treadRunIn * SCALE;
		const riseY = (i + 1) * exactRiserIn * SCALE;

		// Riser cut
		ctx.beginPath();
		ctx.moveTo(offsetX + runZ, offsetY - (i * exactRiserIn * SCALE));
		ctx.lineTo(offsetX + runZ, offsetY - riseY);
		ctx.stroke();

		// Tread cut
		ctx.beginPath();
		ctx.moveTo(offsetX + runZ, offsetY - riseY);
		ctx.lineTo(offsetX + runZ + treadRunIn * SCALE, offsetY - riseY);
		ctx.stroke();
	}
	ctx.restore();

	// Dimensions for cuts
	drawDimension(
		ctx,
		offsetX,
		offsetY,
		offsetX + treadRunIn * SCALE,
		offsetY,
		`Tread: ${toFraction(treadRunIn, 16)}"`,
		-30
	);

	drawDimension(
		ctx,
		offsetX,
		offsetY,
		offsetX,
		offsetY - exactRiserIn * SCALE,
		`Riser: ${toFraction(exactRiserIn, 16)}"`,
		-70
	);

	// Stringer length
	ctx.save();
	ctx.font = "14px monospace";
	ctx.fillStyle = "#000";
	ctx.fillText(
		`Stringer Length: ${toFraction(stringerLenIn, 16)}" (${Math.ceil(stringerLenIn / 12)}')`,
		offsetX,
		offsetY + 40
	);
	ctx.fillText(
		`Stock needed: 2x12 x ${Math.ceil(stringerLenIn / 12)}'`,
		offsetX,
		offsetY + 60
	);
	ctx.restore();

	// Title block
	drawTitleBlock(ctx, width, height, `${jobName} - Stringer Detail`);

	// Note
	ctx.save();
	ctx.font = "11px sans-serif";
	ctx.fillStyle = "#f00";
	ctx.fillText("Red dashed lines indicate cuts", offsetX, height - 110);
	ctx.restore();
}

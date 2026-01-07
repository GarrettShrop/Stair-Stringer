export type MaterialsInputs = {
	stairWidthIn: number; // e.g. 36
	stringerOcin: number; // e.g. 16
	closedStair: boolean; // true => has risers
	numTreads: number;
	numRisers: number;
	stringerLenIn: number;
};
export type MaterialsOutputs = {
	numStringers: number;
	suggestedStockLenFt: number;
	treadsQty: number;
	risersQty: number;
	notes: string[];
};
const COMMON_STOCK_FT = [8, 10, 12, 14, 16, 18, 20];
export function calcMaterials(m: MaterialsInputs): MaterialsOutputs {
	const notes: string[] = [];
	// Conservative: ceil(width/OC) + 1, min 2
	let numStringers = Math.ceil(m.stairWidthIn / m.stringerOcin) + 1;
	if (numStringers < 2) numStringers = 2;
	// Typical real-world: 36" usually 3 stringers
	if (m.stairWidthIn <= 36) numStringers = Math.max(numStringers, 3);
	const neededFt = m.stringerLenIn / 12;
	const suggestedStockLenFt =
		COMMON_STOCK_FT.find((ft) => ft >= neededFt) ?? Math.ceil(neededFt);
	const treadsQty = m.numTreads;
	const risersQty = m.closedStair ? m.numRisers : 0;
	if (suggestedStockLenFt >= 18)
		notes.push("Long stock: consider LVL or splicing plan.");
	notes.push("Blocking/bridging as required (especially mid-span).");
	notes.push(
		"Check local code for max riser/min tread + guard/handrail requirements."
	);
	return {
		numStringers,
		suggestedStockLenFt,
		treadsQty,
		risersQty,
		notes,
	};
}

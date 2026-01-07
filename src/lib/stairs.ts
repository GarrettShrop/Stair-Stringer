export type StairInputs = {
	totalRiseIn: number;
	treadRunIn: number;
	targetRiserIn?: number; // if undefined, default inside function
	finishMode: boolean;
	topFinishIn?: number; // only used if finishMode=true
	bottomFinishIn?: number; // only used if finishMode=true
};
export type StairOutputs = {
	numRisers: number;
	numTreads: number;
	exactRiserIn: number;
	treadRunIn: number;
	totalRunIn: number;
	angleDeg: number;
	stringerLenIn: number;
	firstRiserIn: number;
	lastRiserIn: number;
	remainingMeatIn: number;
	meatPass: boolean;
	warnings: string[];
};
const STRINGER_ACTUAL_DEPTH_IN = 11.25; // 2x12 actual
const MIN_MEAT_IN = 3.5;
export function calcStairs(input: StairInputs): StairOutputs {
	const warnings: string[] = [];
	const totalRiseIn = input.totalRiseIn;
	const treadRunIn = input.treadRunIn ?? 10.0;
	const targetRiserIn = input.targetRiserIn ?? 7.25;
	if (!(totalRiseIn > 0)) throw new Error("Total rise must be > 0");
	if (!(treadRunIn > 0)) throw new Error("Tread run must be > 0");
	// risers
	const raw = totalRiseIn / targetRiserIn;
	let numRisers = Math.round(raw);
	if (numRisers < 2) numRisers = 2;
	const exactRiserIn = totalRiseIn / numRisers;
	// treads + run
	const numTreads = numRisers - 1;
	const totalRunIn = numTreads * treadRunIn;
	// angle
	const angleDeg = Math.atan(exactRiserIn / treadRunIn) * (180 / Math.PI);
	// stringer length
	const stringerLenIn = Math.sqrt(totalRiseIn ** 2 + totalRunIn ** 2);
	// finish adjustments
	let firstRiserIn = exactRiserIn;
	let lastRiserIn = exactRiserIn;
	if (input.finishMode) {
		const top = input.topFinishIn ?? 0;
		const bottom = input.bottomFinishIn ?? 0;
		firstRiserIn = exactRiserIn + bottom;
		lastRiserIn = exactRiserIn - top;
	}
	// “meat” check (quick, conservative)
	const remainingMeatIn = STRINGER_ACTUAL_DEPTH_IN - exactRiserIn - treadRunIn;
	const meatPass = remainingMeatIn >= MIN_MEAT_IN;
	// warnings (soft)
	if (exactRiserIn > 7.75)
		warnings.push(
			'Riser over 7.75" (may fail code depending on jurisdiction).'
		);
	if (treadRunIn < 10.0)
		warnings.push(
			'Tread run under 10" (may fail code depending on jurisdiction).'
		);
	if (!meatPass)
		warnings.push(
			"2x12 meat FAIL — redesign needed (bigger stock/LVL or adjust rise/run)."
		);
	return {
		numRisers,
		numTreads,
		exactRiserIn,
		treadRunIn,
		totalRunIn,
		angleDeg,
		stringerLenIn,
		firstRiserIn,
		lastRiserIn,
		remainingMeatIn,
		meatPass,
		warnings,
	};
}

export function parseInches(input: string): number {
	const s = input.trim().toLowerCase();
	if (!s) throw new Error("Empty input");
	// If it’s a plain number, treat as inches (decimal allowed)
	if (/^[+-]?\d+(\.\d+)?$/.test(s)) return Number(s);
	// Normalize: remove double quotes, keep feet marker '
	// Allow forms like: 9' 1 1/2, 9'1-1/2, 10", 9 1/2
	let str = s.replace(/"/g, "").replace(/\s+/g, " ").trim();
	// Split feet part if present
	let feet = 0;
	let rest = str;
	const feetMatch = str.match(/^([+-]?\d+)\s*'\s*(.*)$/);
	if (feetMatch) {
		feet = Number(feetMatch[1]);
		rest = (feetMatch[2] ?? "").trim();
	}
	const inches = rest ? parseInchesPart(rest) : 0;
	return feet * 12 + inches;
}
function parseInchesPart(part: string): number {
	let p = part.trim();
	if (!p) return 0;
	// Support hyphen mixed fraction: 1-1/2 => 1 1/2
	p = p.replace(/-/g, " ");
	// If just a decimal/integer inches
	if (/^[+-]?\d+(\.\d+)?$/.test(p)) return Number(p);
	// Mixed fraction: "1 1/2"
	const mixed = p.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
	if (mixed) {
		const whole = Number(mixed[1]);
		const num = Number(mixed[2]);
		const den = Number(mixed[3]);
		if (den === 0) throw new Error("Invalid fraction");
		return whole + num / den;
	}
	// Pure fraction: "17/64"
	const frac = p.match(/^(\d+)\s*\/\s*(\d+)$/);
	if (frac) {
		const num = Number(frac[1]);
		const den = Number(frac[2]);
		if (den === 0) throw new Error("Invalid fraction");
		return num / den;
	}
	// Allow something like "1 1/2 in" (extra text)
	const cleaned = p.replace(/[a-z]/g, "").trim();
	if (cleaned !== p) return parseInchesPart(cleaned);
	throw new Error("Unrecognized format");
}
export function toFeetInches(inches: number): string {
	const sign = inches < 0 ? "-" : "";
	const abs = Math.abs(inches);
	const ft = Math.floor(abs / 12);
	const inch = abs - ft * 12;
	// show inches to nearest 1/16 in display
	const frac = toFraction(inch, 16);
	return ft > 0 ? `${sign}${ft}' ${frac}"` : `${sign}${frac}"`;
}
export function toFraction(valueIn: number, denom: number): string {
	// valueIn is inches (can be decimal)
	const whole = Math.floor(valueIn + 1e-9);
	const frac = valueIn - whole;
	const n = Math.round(frac * denom);
	if (n === 0) return `${whole}`;
	if (n === denom) return `${whole + 1}`;
	const g = gcd(n, denom);
	const nn = n / g;
	const dd = denom / g;
	if (whole === 0) return `${nn}/${dd}`;
	return `${whole} ${nn}/${dd}`;
}
function gcd(a: number, b: number): number {
	let x = Math.abs(a),
		y = Math.abs(b);
	while (y) [x, y] = [y, x % y];
	return x;
}

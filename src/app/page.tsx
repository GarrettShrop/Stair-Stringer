"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { calcStairs } from "@/lib/stairs";
import { parseInches, toFeetInches, toFraction } from "@/lib/units";
import { calcMaterials } from "@/lib/materials";
import { saveImage, getImage } from "@/lib/storage/images";
import { ImageUpload } from "@/components/rendering/ImageUpload";
import { Canvas2DView } from "@/components/rendering/Canvas2DView";
import { RenderingControls } from "@/components/rendering/RenderingControls";
import type { RenderView, ViewType2D } from "@/lib/rendering/types";

// Lazy load 3D component for better performance
const Three3DView = dynamic(
	() =>
		import("@/components/rendering/Three3DView").then((mod) => ({
			default: mod.Three3DView,
		})),
	{
		loading: () => (
			<div style={{ textAlign: "center", padding: 40 }}>
				Loading 3D viewer...
			</div>
		),
		ssr: false,
	}
);
const DISPLAY_DENOM = 16; // field standard (1/16")
function fmtDec(n: number) {
	return n.toFixed(3);
}
type SavedJob = {
	id: string;
	createdAt: string; // ISO
	name: string;
	totalRise: string;
	targetRiser: string;
	treadRun: string;
	finishMode: boolean;
	topFinish: string;
	bottomFinish: string;
	stairWidth: string;
	stringerOc: string;
	closedStair: boolean;
	imageId?: string; // IndexedDB image reference
	renderViewPreference?: "2d" | "3d"; // Last active view
};
const STORAGE_KEY = "stairStringerJobsV1";
export default function Home() {
	// Core inputs
	const [totalRise, setTotalRise] = useState(`9' 1 1/2"`);
	const [targetRiser, setTargetRiser] = useState(`7.25`);
	const [treadRun, setTreadRun] = useState(`10`);
	const [finishMode, setFinishMode] = useState(false);
	const [topFinish, setTopFinish] = useState(`0`);
	const [bottomFinish, setBottomFinish] = useState(`0`);
	// Materials inputs (v1)
	const [stairWidth, setStairWidth] = useState(`36`);
	const [stringerOc, setStringerOc] = useState(`16`);
	const [closedStair, setClosedStair] = useState(true);
	// Save/Load
	const [jobs, setJobs] = useState<SavedJob[]>([]);
	const [jobName, setJobName] = useState("Job");
	// Rendering
	const [uploadedImage, setUploadedImage] = useState<File | null>(null);
	const [activeRenderView, setActiveRenderView] = useState<RenderView>("none");
	const [view2DType, setView2DType] = useState<ViewType2D>("elevation");
	useEffect(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) setJobs(JSON.parse(raw));
		} catch {
			// ignore
		}
	}, []);
	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
		} catch {
			// ignore
		}
	}, [jobs]);
	const result = useMemo(() => {
		try {
			const totalRiseIn = parseInches(totalRise);
			const treadRunIn = parseInches(treadRun);
			const targetRiserIn = targetRiser.trim()
				? parseInches(targetRiser)
				: undefined;
			const out = calcStairs({
				totalRiseIn,
				treadRunIn,
				targetRiserIn,
				finishMode,
				topFinishIn: finishMode ? parseInches(topFinish) : 0,
				bottomFinishIn: finishMode ? parseInches(bottomFinish) : 0,
			});
			// materials
			const stairWidthIn = parseInches(stairWidth);
			const stringerOcin = parseInches(stringerOc);
			const mat = calcMaterials({
				stairWidthIn,
				stringerOcin,
				closedStair,
				numTreads: out.numTreads,
				numRisers: out.numRisers,
				stringerLenIn: out.stringerLenIn,
			});
			return {
				ok: true as const,
				totalRiseIn,
				out,
				stairWidthIn,
				stringerOcin,
				mat,
			};
		} catch (e: any) {
			return { ok: false as const, error: e?.message ?? "Error" };
		}
	}, [
		totalRise,
		targetRiser,
		treadRun,
		finishMode,
		topFinish,
		bottomFinish,
		stairWidth,
		stringerOc,
		closedStair,
	]);
	const buildReportText = () => {
		if (!result.ok) return "";
		const o = result.out;
		const mat = result.mat;
		return [
			`STAIR STRINGER REPORT`,
			``,
			`INPUTS`,
			`Total Rise: ${fmtDec(result.totalRiseIn)} in (${toFeetInches(
				result.totalRiseIn
			)})`,
			`Target Riser: ${targetRiser.trim() ? targetRiser : "Auto (7.25)"} in`,
			`Tread Run: ${fmtDec(o.treadRunIn)} in (${toFraction(
				o.treadRunIn,
				DISPLAY_DENOM
			)}")`,
			`Finish Mode: ${finishMode ? "ON" : "OFF"}`,
			finishMode ? `Top Finish: ${topFinish} in` : "",
			finishMode ? `Bottom Finish: ${bottomFinish} in` : "",
			``,
			`LAYOUT`,
			`Rise: ${toFraction(o.exactRiserIn, DISPLAY_DENOM)}" (${fmtDec(
				o.exactRiserIn
			)}")`,
			`Run: ${toFraction(o.treadRunIn, DISPLAY_DENOM)}" (${fmtDec(
				o.treadRunIn
			)}")`,
			`${o.numRisers} risers / ${o.numTreads} treads`,
			`Total Run: ${fmtDec(o.totalRunIn)} in (${toFeetInches(o.totalRunIn)})`,
			`Angle: ${o.angleDeg.toFixed(1)}°`,
			`Stringer Length: ${fmtDec(o.stringerLenIn)} in (${toFeetInches(
				o.stringerLenIn
			)})`,
			`2x12 Meat: ${o.remainingMeatIn.toFixed(2)}" ${
				o.meatPass ? "PASS" : "FAIL"
			}`,
			finishMode
				? `First Riser: ${toFraction(o.firstRiserIn, DISPLAY_DENOM)}"`
				: "",
			finishMode
				? `Last Riser: ${toFraction(o.lastRiserIn, DISPLAY_DENOM)}"`
				: "",
			``,
			`MATERIALS (v1)`,
			`Stair Width: ${fmtDec(result.stairWidthIn)} in (${toFeetInches(
				result.stairWidthIn
			)})`,
			`Stringer Spacing: ${fmtDec(result.stringerOcin)} in o.c.`,
			`Stringers: ${mat.numStringers} pcs of 2x12 x ${mat.suggestedStockLenFt}'`,
			`Treads: ${mat.treadsQty} pcs`,
			`Risers (closed): ${mat.risersQty} pcs`,
			`Adhesive: 2 tubes (typical)`,
			`Fasteners: framing + finish as required`,
			``,
			`NOTES`,
			...mat.notes.map((n) => `- ${n}`),
			``,
			`WARNINGS`,
			...(o.warnings.length ? o.warnings.map((w) => `- ${w}`) : [`- None`]),
		]
			.filter(Boolean)
			.join("\n");
	};
	const copyCutList = async () => {
		if (!result.ok) return;
		const text = buildReportText();
		await navigator.clipboard.writeText(text);
		alert("Report copied.");
	};
	const exportPdf = () => {
		if (!result.ok) return;
		const text = buildReportText();
		// Print-to-PDF: opens a clean printable page
		const w = window.open("", "_blank");
		if (!w) return;
		w.document.write(`
 <html>
 <head>
 <title>Stair Stringer Report</title>
 <meta name="viewport" content="width=device-width, initial-scale=1" />
 <style>
 body { font-family: system-ui, sans-serif; padding: 24px; }
 pre { white-space: pre-wrap; font-size: 14px; line-height: 1.35; }
 .hint { opacity: 0.7; margin-top: 12px; }
 @media print { .hint { display: none; } }
 </style>
 </head>
 <body>
 <pre>${escapeHtml(text)}</pre>
 <div class="hint">Use your browser’s Print dialog → “Save as PDF”.</div>
 <script>window.print();</script>
 </body>
 </html>
 `);
		w.document.close();
	};
	const saveJob = async () => {
		const now = new Date();
		const id = crypto.randomUUID();
		const j: SavedJob = {
			id,
			createdAt: now.toISOString(),
			name: jobName.trim() || "Job",
			totalRise,
			targetRiser,
			treadRun,
			finishMode,
			topFinish,
			bottomFinish,
			stairWidth,
			stringerOc,
			closedStair,
		};

		// Save image if uploaded
		if (uploadedImage) {
			try {
				const imageId = await saveImage(id, uploadedImage);
				j.imageId = imageId;
			} catch (error) {
				console.error("Failed to save image:", error);
			}
		}

		// Save render view preference
		if (activeRenderView !== "none") {
			j.renderViewPreference = activeRenderView;
		}

		setJobs((prev) => [j, ...prev]);
		alert("Job saved.");
	};
	const loadJob = async (j: SavedJob) => {
		setJobName(j.name);
		setTotalRise(j.totalRise);
		setTargetRiser(j.targetRiser);
		setTreadRun(j.treadRun);
		setFinishMode(j.finishMode);
		setTopFinish(j.topFinish);
		setBottomFinish(j.bottomFinish);
		setStairWidth(j.stairWidth);
		setStringerOc(j.stringerOc);
		setClosedStair(j.closedStair);

		// Load image if exists
		if (j.imageId) {
			try {
				const blob = await getImage(j.imageId);
				if (blob) {
					const file = new File([blob], "saved-image.jpg", { type: blob.type });
					setUploadedImage(file);
				}
			} catch (error) {
				console.error("Failed to load image:", error);
			}
		} else {
			setUploadedImage(null);
		}

		// Load render view preference
		if (j.renderViewPreference) {
			setActiveRenderView(j.renderViewPreference);
		} else {
			setActiveRenderView("none");
		}
	};
	const deleteJob = (id: string) => {
		setJobs((prev) => prev.filter((j) => j.id !== id));
	};
	const parsedLine = (raw: string) => {
		try {
			const v = parseInches(raw);
			return (
				<div style={{ fontSize: 12, opacity: 0.75 }}>
					Parsed: {fmtDec(v)} in ({toFeetInches(v)})
				</div>
			);
		} catch {
			return (
				<div style={{ fontSize: 12, color: "crimson" }}>
					■ Enter like 109.5 or 9' 1 1/2"
				</div>
			);
		}
	};
	return (
		<main
			style={{
				maxWidth: 820,
				margin: "0 auto",
				padding: 16,
				fontFamily: "system-ui, sans-serif",
			}}
		>
			<h1 style={{ marginBottom: 8 }}>Stair Stringer Field Calculator</h1>
			<div style={{ opacity: 0.8, marginBottom: 16 }}>
				Inches or feet/inches. Display rounding: 1/{DISPLAY_DENOM}.
			</div>
			<div style={{ display: "grid", gap: 14 }}>
				{/* Core inputs */}
				<section style={card}>
					<div style={cardTitle}>STRINGER INPUTS</div>
					<div style={grid2}>
						<div>
							<label style={label}>TOTAL RISE</label>
							<input
								value={totalRise}
								onChange={(e) => setTotalRise(e.target.value)}
								style={inputStyle}
							/>
							{parsedLine(totalRise)}
						</div>
						<div>
							<label style={label}>TREAD RUN</label>
							<input
								value={treadRun}
								onChange={(e) => setTreadRun(e.target.value)}
								style={inputStyle}
							/>
							{parsedLine(treadRun)}
						</div>
						<div>
							<label style={label}>TARGET RISER (optional)</label>
							<input
								value={targetRiser}
								onChange={(e) => setTargetRiser(e.target.value)}
								placeholder="7.25"
								style={inputStyle}
							/>
							{parsedLine(targetRiser || "7.25")}
						</div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 10,
								paddingTop: 26,
							}}
						>
							<input
								type="checkbox"
								checked={finishMode}
								onChange={(e) => setFinishMode(e.target.checked)}
							/>
							<label style={{ fontWeight: 900 }}>FINISH MODE</label>
						</div>
					</div>
					{finishMode && (
						<div style={grid2}>
							<div>
								<label style={label}>TOP FINISH (in)</label>
								<input
									value={topFinish}
									onChange={(e) => setTopFinish(e.target.value)}
									style={inputStyle}
								/>
							</div>
							<div>
								<label style={label}>BOTTOM FINISH (in)</label>
								<input
									value={bottomFinish}
									onChange={(e) => setBottomFinish(e.target.value)}
									style={inputStyle}
								/>
							</div>
						</div>
					)}
				</section>
				{/* Materials */}
				<section style={card}>
					<div style={cardTitle}>MATERIALS MODE (v1)</div>
					<div style={grid2}>
						<div>
							<label style={label}>STAIR WIDTH</label>
							<input
								value={stairWidth}
								onChange={(e) => setStairWidth(e.target.value)}
								style={inputStyle}
							/>
							{parsedLine(stairWidth)}
						</div>
						<div>
							<label style={label}>STRINGER SPACING (o.c.)</label>
							<input
								value={stringerOc}
								onChange={(e) => setStringerOc(e.target.value)}
								style={inputStyle}
							/>
							{parsedLine(stringerOc)}
						</div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 10,
								paddingTop: 26,
							}}
						>
							<input
								type="checkbox"
								checked={closedStair}
								onChange={(e) => setClosedStair(e.target.checked)}
							/>
							<label style={{ fontWeight: 900 }}>
								CLOSED STAIR (HAS RISERS)
							</label>
						</div>
					</div>
				</section>
				{/* Actions */}
				<section style={card}>
					<div style={cardTitle}>ACTIONS</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr 1fr",
							gap: 10,
						}}
					>
						<button
							onClick={copyCutList}
							disabled={!result.ok}
							style={buttonStyle}
						>
							COPY REPORT
						</button>
						<button
							onClick={exportPdf}
							disabled={!result.ok}
							style={buttonStyle}
						>
							EXPORT PDF
						</button>
						<button onClick={saveJob} disabled={!result.ok} style={buttonStyle}>
							SAVE JOB
						</button>
					</div>
					<div
						style={{
							marginTop: 10,
							display: "flex",
							gap: 10,
							alignItems: "center",
						}}
					>
						<label style={{ fontWeight: 900 }}>Job name:</label>
						<input
							value={jobName}
							onChange={(e) => setJobName(e.target.value)}
							style={inputStyle}
						/>
					</div>
				</section>
				{/* Output */}
				<section style={card}>
					<div style={cardTitle}>OUTPUT</div>
					{!result.ok ? (
						<div style={{ color: "crimson", fontWeight: 900 }}>
							{result.error}
						</div>
					) : (
						<div style={{ display: "grid", gap: 8 }}>
							<div style={bigLine}>
								RISE: {toFraction(result.out.exactRiserIn, DISPLAY_DENOM)}"{" "}
								<span style={small}>({fmtDec(result.out.exactRiserIn)}")</span>
							</div>
							<div style={bigLine}>
								RUN: {toFraction(result.out.treadRunIn, DISPLAY_DENOM)}"{" "}
								<span style={small}>({fmtDec(result.out.treadRunIn)}")</span>
							</div>
							<div style={bigLine}>
								{result.out.numRisers} RISERS / {result.out.numTreads} TREADS
							</div>
							<div style={bigLine}>
								TOTAL RUN: {toFeetInches(result.out.totalRunIn)}{" "}
								<span style={small}>({fmtDec(result.out.totalRunIn)}")</span>
							</div>
							<div style={bigLine}>
								ANGLE: {result.out.angleDeg.toFixed(1)}°
							</div>
							<div style={bigLine}>
								STRINGER LEN: {toFeetInches(result.out.stringerLenIn)}{" "}
								<span style={small}>({fmtDec(result.out.stringerLenIn)}")</span>
							</div>
							<div style={bigLine}>
								2x12 MEAT: {result.out.remainingMeatIn.toFixed(2)}"{" "}
								<span
									style={{
										fontWeight: 900,
										color: result.out.meatPass ? "green" : "crimson",
									}}
								>
									{result.out.meatPass ? "PASS" : "FAIL"}
								</span>
							</div>
							{finishMode && (
								<div
									style={{
										padding: 12,
										border: "1px solid #ddd",
										borderRadius: 10,
									}}
								>
									<div style={{ fontWeight: 900 }}>FINISH ADJUSTED</div>
									<div>
										FIRST RISER:{" "}
										<span style={{ color: "crimson", fontWeight: 900 }}>
											{toFraction(result.out.firstRiserIn, DISPLAY_DENOM)}"
										</span>{" "}
										({fmtDec(result.out.firstRiserIn)}")
									</div>
									<div>
										LAST RISER:{" "}
										<span style={{ color: "crimson", fontWeight: 900 }}>
											{toFraction(result.out.lastRiserIn, DISPLAY_DENOM)}"
										</span>{" "}
										({fmtDec(result.out.lastRiserIn)}")
									</div>
								</div>
							)}
							{/* Materials output */}
							<div
								style={{
									padding: 12,
									border: "1px solid #ddd",
									borderRadius: 10,
								}}
							>
								<div style={{ fontWeight: 900, marginBottom: 6 }}>
									MATERIALS (v1)
								</div>
								<div>
									Stringers: <b>{result.mat.numStringers}</b> pcs of{" "}
									<b>2x12 x{result.mat.suggestedStockLenFt}'</b>
								</div>
								<div>
									Treads: <b>{result.mat.treadsQty}</b> pcs
								</div>
								<div>
									Risers (closed): <b>{result.mat.risersQty}</b> pcs
								</div>
								<div>Adhesive: 2 tubes (typical)</div>
								<div>Fasteners: framing + finish as required</div>
							</div>
							{result.out.warnings.length > 0 && (
								<div
									style={{
										padding: 12,
										background: "#fff6d8",
										borderRadius: 10,
									}}
								>
									<div style={{ fontWeight: 900, marginBottom: 6 }}>
										WARNINGS
									</div>
									<ul style={{ margin: 0, paddingLeft: 18 }}>
										{result.out.warnings.map((w, i) => (
											<li key={i}>{w}</li>
										))}
									</ul>
								</div>
							)}
						</div>
					)}
				</section>

				{/* Visualization */}
				{result.ok && (
					<section style={card}>
						<div style={cardTitle}>VISUALIZATION</div>

						<ImageUpload
							onImageUploaded={setUploadedImage}
							currentImage={uploadedImage}
						/>

						<RenderingControls
							activeView={activeRenderView}
							onViewChange={setActiveRenderView}
							view2DType={view2DType}
							onView2DTypeChange={setView2DType}
						/>

						{activeRenderView === "2d" && (
							<Canvas2DView
								stairData={result.out}
								materialsData={result.mat}
								stairWidthIn={result.stairWidthIn}
								viewType={view2DType}
								jobName={jobName}
							/>
						)}

						{activeRenderView === "3d" && (
							<Three3DView
								stairData={result.out}
								materialsData={result.mat}
								stairWidthIn={result.stairWidthIn}
								backgroundImage={uploadedImage}
							/>
						)}
					</section>
				)}
			</div>
		</main>
	);
}
function escapeHtml(s: string) {
	return s
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}
const card: React.CSSProperties = {
	border: "1px solid #e5e5e5",
	borderRadius: 14,
	padding: 14,
};
const cardTitle: React.CSSProperties = {
	fontWeight: 900,
	marginBottom: 10,
	letterSpacing: 0.3,
};
const grid2: React.CSSProperties = {
	display: "grid",
	gridTemplateColumns: "1fr 1fr",
	gap: 12,
};
const label: React.CSSProperties = { fontWeight: 900 };
const inputStyle: React.CSSProperties = {
	width: "100%",
	padding: "12px 12px",
	fontSize: 18,
	borderRadius: 10,
	border: "1px solid #ccc",
};
const buttonStyle: React.CSSProperties = {
	padding: "14px 14px",
	fontSize: 16,
	fontWeight: 900,
	borderRadius: 12,
	border: "none",
	cursor: "pointer",
};
const bigLine: React.CSSProperties = { fontSize: 20, fontWeight: 900 };
const small: React.CSSProperties = {
	fontSize: 13,
	opacity: 0.75,
	fontWeight: 600,
};

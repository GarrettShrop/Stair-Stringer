"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";

interface ImageUploadProps {
	onImageUploaded: (file: File | null) => void;
	currentImage?: File | null;
}

export function ImageUpload({ onImageUploaded, currentImage }: ImageUploadProps) {
	const [dragActive, setDragActive] = useState(false);
	const [preview, setPreview] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFile = (file: File | null) => {
		if (!file) {
			setPreview(null);
			onImageUploaded(null);
			return;
		}

		// Validate file type
		if (!file.type.startsWith("image/")) {
			alert("Please upload an image file");
			return;
		}

		// Create preview
		const url = URL.createObjectURL(file);
		setPreview(url);
		onImageUploaded(file);
	};

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		e.preventDefault();
		if (e.target.files && e.target.files[0]) {
			handleFile(e.target.files[0]);
		}
	};

	const handleDrag = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			handleFile(e.dataTransfer.files[0]);
		}
	};

	const handleButtonClick = () => {
		inputRef.current?.click();
	};

	const handleDelete = () => {
		if (preview) {
			URL.revokeObjectURL(preview);
		}
		setPreview(null);
		onImageUploaded(null);
		if (inputRef.current) {
			inputRef.current.value = "";
		}
	};

	return (
		<div style={{ marginBottom: 16 }}>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				onChange={handleChange}
				style={{ display: "none" }}
			/>

			{!preview ? (
				<div
					onDragEnter={handleDrag}
					onDragLeave={handleDrag}
					onDragOver={handleDrag}
					onDrop={handleDrop}
					onClick={handleButtonClick}
					style={{
						border: dragActive ? "2px dashed #4CAF50" : "2px dashed #ccc",
						borderRadius: 10,
						padding: 40,
						textAlign: "center",
						cursor: "pointer",
						backgroundColor: dragActive ? "#f0f9f0" : "#fafafa",
						transition: "all 0.2s",
						color: "#000",
					}}
				>
					<div style={{ fontSize: 48, marginBottom: 10 }}>📸</div>
					<div style={{ fontWeight: 900, marginBottom: 6, color: "#000" }}>
						Upload Room Photo or Floor Plan
					</div>
					<div style={{ fontSize: 14, opacity: 0.7, color: "#000" }}>
						Click to browse or drag and drop
					</div>
					<div style={{ fontSize: 12, opacity: 0.5, marginTop: 6, color: "#000" }}>
						Supports: JPG, PNG, WebP
					</div>
				</div>
			) : (
				<div
					style={{
						border: "1px solid #e5e5e5",
						borderRadius: 10,
						padding: 12,
						display: "flex",
						gap: 12,
						alignItems: "center",
						backgroundColor: "#fff",
					}}
				>
					<img
						src={preview}
						alt="Preview"
						style={{
							width: 120,
							height: 120,
							objectFit: "cover",
							borderRadius: 8,
						}}
					/>
					<div style={{ flex: 1 }}>
						<div style={{ fontWeight: 900, marginBottom: 4, color: "#000" }}>
							{currentImage?.name || "Image uploaded"}
						</div>
						<div style={{ fontSize: 14, opacity: 0.7, color: "#000" }}>
							{currentImage &&
								`${(currentImage.size / 1024).toFixed(0)} KB`}
						</div>
					</div>
					<button
						onClick={handleDelete}
						style={{
							padding: "8px 16px",
							fontSize: 14,
							fontWeight: 900,
							borderRadius: 8,
							border: "none",
							cursor: "pointer",
							backgroundColor: "#fee",
							color: "crimson",
						}}
					>
						DELETE
					</button>
				</div>
			)}
		</div>
	);
}

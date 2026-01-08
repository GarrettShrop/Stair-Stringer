import { openDB, type IDBPDatabase } from "idb";
import type { ImageMetadata } from "../rendering/types";

const DB_NAME = "stairStringerImages";
const DB_VERSION = 1;
const STORE_NAME = "images";
const MAX_IMAGES_PER_JOB = 10;
const MAX_IMAGE_SIZE = 2048; // max width/height in pixels

interface ImageRecord {
	id: string;
	jobId: string;
	filename: string;
	blob: Blob;
	width: number;
	height: number;
	uploadedAt: string;
}

async function getDB(): Promise<IDBPDatabase> {
	return openDB(DB_NAME, DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
				store.createIndex("jobId", "jobId", { unique: false });
			}
		},
	});
}

/**
 * Resize image to max dimensions while maintaining aspect ratio
 */
async function resizeImage(file: File): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);

			let { width, height } = img;

			// Calculate new dimensions
			if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
				if (width > height) {
					height = (height / width) * MAX_IMAGE_SIZE;
					width = MAX_IMAGE_SIZE;
				} else {
					width = (width / height) * MAX_IMAGE_SIZE;
					height = MAX_IMAGE_SIZE;
				}
			}

			// Create canvas and resize
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Could not get canvas context"));
				return;
			}

			ctx.drawImage(img, 0, 0, width, height);

			// Convert to WebP if supported, otherwise JPEG
			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error("Failed to create blob"));
					}
				},
				"image/webp",
				0.85
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image"));
		};

		img.src = url;
	});
}

/**
 * Get image dimensions without fully loading
 */
async function getImageDimensions(
	blob: Blob
): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(blob);

		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.width, height: img.height });
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image"));
		};

		img.src = url;
	});
}

/**
 * Save an image to IndexedDB with automatic resizing and optimization
 */
export async function saveImage(
	jobId: string,
	file: File
): Promise<string> {
	const db = await getDB();

	// Check existing images for this job
	const existingImages = await db.getAllFromIndex(STORE_NAME, "jobId", jobId);

	// If at limit, delete oldest
	if (existingImages.length >= MAX_IMAGES_PER_JOB) {
		const sorted = existingImages.sort(
			(a, b) =>
				new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
		);
		const toDelete = sorted.slice(
			0,
			existingImages.length - MAX_IMAGES_PER_JOB + 1
		);
		for (const img of toDelete) {
			await db.delete(STORE_NAME, img.id);
		}
	}

	// Resize and optimize
	const optimizedBlob = await resizeImage(file);
	const { width, height } = await getImageDimensions(optimizedBlob);

	// Create record
	const id = crypto.randomUUID();
	const record: ImageRecord = {
		id,
		jobId,
		filename: file.name,
		blob: optimizedBlob,
		width,
		height,
		uploadedAt: new Date().toISOString(),
	};

	await db.add(STORE_NAME, record);

	return id;
}

/**
 * Get an image blob by ID
 */
export async function getImage(imageId: string): Promise<Blob | null> {
	const db = await getDB();
	const record = await db.get(STORE_NAME, imageId);
	return record?.blob ?? null;
}

/**
 * Delete an image by ID
 */
export async function deleteImage(imageId: string): Promise<void> {
	const db = await getDB();
	await db.delete(STORE_NAME, imageId);
}

/**
 * List all images for a job
 */
export async function listImagesForJob(
	jobId: string
): Promise<ImageMetadata[]> {
	const db = await getDB();
	const records = await db.getAllFromIndex(STORE_NAME, "jobId", jobId);

	return records.map((r) => ({
		id: r.id,
		jobId: r.jobId,
		filename: r.filename,
		size: r.blob.size,
		width: r.width,
		height: r.height,
		uploadedAt: r.uploadedAt,
	}));
}

/**
 * Delete all images for a job
 */
export async function deleteAllImagesForJob(jobId: string): Promise<void> {
	const db = await getDB();
	const records = await db.getAllFromIndex(STORE_NAME, "jobId", jobId);
	for (const record of records) {
		await db.delete(STORE_NAME, record.id);
	}
}

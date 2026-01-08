import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { StaircaseGeometry, WoodType } from "./types";

const WOOD_COLORS = {
	pine: 0xdeb887, // burlywood
	oak: 0xb8860b, // darkgoldenrod
	cedar: 0xd2691e, // chocolate
};

export interface CalibrationData {
	floorY: number;
	vanishingPointX?: number;
	vanishingPointY?: number;
	imageWidth: number;
	imageHeight: number;
}

export interface SceneControls {
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	renderer: THREE.WebGLRenderer;
	controls: OrbitControls;
	animate: () => void;
	dispose: () => void;
	updateWoodType: (woodType: WoodType) => void;
	takeScreenshot: () => string;
	updateStairPosition: (x: number, y: number, z: number) => void;
	updateStairRotation: (rotationY: number) => void;
}

/**
 * Create a 3D scene with staircase geometry
 */
export function createStaircaseScene(
	container: HTMLElement,
	geometry: StaircaseGeometry,
	backgroundImage?: HTMLImageElement,
	calibrationData?: CalibrationData
): SceneControls {
	// Scene setup
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xf0f0f0);

	// Camera
	const aspect = container.clientWidth / container.clientHeight;
	const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 10000);

	// Position camera to view the entire staircase
	const { width, height, depth } = geometry.dimensions;
	const maxDim = Math.max(width, height, depth);

	// Use calibration data if available to match photo perspective
	if (calibrationData) {
		// Position camera to match the photo's viewpoint
		const floorHeight = (1 - calibrationData.floorY) * height;
		const cameraHeight = floorHeight + height * 0.5; // Eye level above floor
		const cameraDistance = maxDim * 3; // Further back for room view

		// Position based on vanishing point if available
		const horizontalOffset = calibrationData.vanishingPointX
			? (calibrationData.vanishingPointX - 0.5) * depth * 2
			: 0;

		camera.position.set(
			width / 2 + horizontalOffset,
			cameraHeight,
			cameraDistance
		);
		camera.lookAt(width / 2, height / 2, depth / 2);
	} else {
		// Default isometric view
		const cameraDistance = maxDim * 2.5;
		camera.position.set(cameraDistance, cameraDistance * 0.8, cameraDistance);
		camera.lookAt(width / 2, height / 2, depth / 2);
	}

	// Renderer
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(container.clientWidth, container.clientHeight);
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	container.appendChild(renderer.domElement);

	// Controls
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.target.set(width / 2, height / 2, depth / 2);
	controls.update();

	// Lighting
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
	directionalLight.position.set(maxDim, maxDim * 2, maxDim);
	directionalLight.castShadow = true;
	directionalLight.shadow.mapSize.width = 2048;
	directionalLight.shadow.mapSize.height = 2048;
	directionalLight.shadow.camera.near = 0.1;
	directionalLight.shadow.camera.far = maxDim * 5;
	directionalLight.shadow.camera.left = -maxDim * 2;
	directionalLight.shadow.camera.right = maxDim * 2;
	directionalLight.shadow.camera.top = maxDim * 2;
	directionalLight.shadow.camera.bottom = -maxDim * 2;
	scene.add(directionalLight);

	// Grid helper (floor reference)
	const gridSize = Math.max(width, depth) * 2;
	const grid = new THREE.GridHelper(gridSize, 20, 0xcccccc, 0xe5e5e5);
	grid.position.y = -1; // Slightly below stairs
	scene.add(grid);

	// Background image (if provided)
	if (backgroundImage) {
		const texture = new THREE.Texture(backgroundImage);
		texture.needsUpdate = true;
		scene.background = texture;
	}

	// Materials
	const woodMaterial = new THREE.MeshStandardMaterial({
		color: WOOD_COLORS.pine,
		roughness: 0.8,
		metalness: 0.0,
	});

	const treadMaterial = new THREE.MeshStandardMaterial({
		color: WOOD_COLORS.oak,
		roughness: 0.6,
		metalness: 0.0,
	});

	// Create a parent group for all stair parts (for easy positioning/rotation)
	const stairGroup = new THREE.Group();
	scene.add(stairGroup);

	// Build stringer meshes
	const stringerGroup = new THREE.Group();
	geometry.stringers.forEach((stringerPath) => {
		// Create shape from path
		const shape = new THREE.Shape();
		if (stringerPath.length > 0) {
			// Project to 2D (YZ plane) for extrusion
			shape.moveTo(stringerPath[0].z, stringerPath[0].y);
			for (let i = 1; i < stringerPath.length; i++) {
				shape.lineTo(stringerPath[i].z, stringerPath[i].y);
			}
			shape.lineTo(stringerPath[0].z, stringerPath[0].y);
		}

		// Extrude settings - make it thin like a board
		const extrudeSettings = {
			depth: 1.5, // 2x12 is actually 1.5" thick
			bevelEnabled: false,
		};

		const extrudeGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
		const mesh = new THREE.Mesh(extrudeGeometry, woodMaterial);

		// Rotate to correct orientation (YZ to XY)
		mesh.rotation.x = Math.PI / 2;
		mesh.position.x = stringerPath[0].x;
		mesh.castShadow = true;
		mesh.receiveShadow = true;

		stringerGroup.add(mesh);
	});
	stairGroup.add(stringerGroup);

	// Build tread meshes
	const treadGroup = new THREE.Group();
	geometry.treads.forEach((treadVerts) => {
		// Create box geometry for tread
		if (treadVerts.length >= 8) {
			const treadWidth = width;
			const treadDepth =
				treadVerts[2].z - treadVerts[0].z;
			const treadThickness = 1.0;

			const treadGeometry = new THREE.BoxGeometry(
				treadWidth,
				treadThickness,
				treadDepth
			);
			const mesh = new THREE.Mesh(treadGeometry, treadMaterial);

			mesh.position.set(
				width / 2,
				treadVerts[0].y + treadThickness / 2,
				(treadVerts[0].z + treadVerts[2].z) / 2
			);

			mesh.castShadow = true;
			mesh.receiveShadow = true;

			treadGroup.add(mesh);
		}
	});
	stairGroup.add(treadGroup);

	// Build riser meshes (if closed stair)
	const riserGroup = new THREE.Group();
	geometry.risers.forEach((riserVerts) => {
		if (riserVerts.length >= 4) {
			const riserWidth = width;
			const riserHeight = riserVerts[2].y - riserVerts[0].y;
			const riserThickness = 0.75;

			const riserGeometry = new THREE.BoxGeometry(
				riserWidth,
				riserHeight,
				riserThickness
			);
			const mesh = new THREE.Mesh(riserGeometry, woodMaterial);

			mesh.position.set(
				width / 2,
				(riserVerts[0].y + riserVerts[2].y) / 2,
				riserVerts[0].z - riserThickness / 2
			);

			mesh.castShadow = true;
			mesh.receiveShadow = true;

			riserGroup.add(mesh);
		}
	});
	stairGroup.add(riserGroup);

	// Add a ground plane for shadows (semi-transparent)
	const groundGeometry = new THREE.PlaneGeometry(maxDim * 4, maxDim * 4);
	const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
	const ground = new THREE.Mesh(groundGeometry, groundMaterial);
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -1;
	ground.receiveShadow = true;
	scene.add(ground);

	// Animation loop
	let animationId: number;
	const animate = () => {
		animationId = requestAnimationFrame(animate);
		controls.update();
		renderer.render(scene, camera);
	};

	// Cleanup function
	const dispose = () => {
		cancelAnimationFrame(animationId);
		controls.dispose();
		renderer.dispose();
		container.removeChild(renderer.domElement);

		// Dispose geometries and materials
		scene.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				object.geometry.dispose();
				if (object.material instanceof THREE.Material) {
					object.material.dispose();
				}
			}
		});
	};

	// Update wood type
	const updateWoodType = (woodType: WoodType) => {
		const color = WOOD_COLORS[woodType];
		stringerGroup.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				(object.material as THREE.MeshStandardMaterial).color.setHex(color);
			}
		});
		riserGroup.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				(object.material as THREE.MeshStandardMaterial).color.setHex(color);
			}
		});
	};

	// Take screenshot
	const takeScreenshot = (): string => {
		renderer.render(scene, camera);
		return renderer.domElement.toDataURL("image/png");
	};

	// Update stair position
	const updateStairPosition = (x: number, y: number, z: number) => {
		stairGroup.position.set(x, y, z);
	};

	// Update stair rotation
	const updateStairRotation = (rotationY: number) => {
		stairGroup.rotation.y = rotationY;
	};

	// Handle window resize
	const handleResize = () => {
		const newAspect = container.clientWidth / container.clientHeight;
		camera.aspect = newAspect;
		camera.updateProjectionMatrix();
		renderer.setSize(container.clientWidth, container.clientHeight);
	};
	window.addEventListener("resize", handleResize);

	// Cleanup resize listener in dispose
	const originalDispose = dispose;
	const enhancedDispose = () => {
		window.removeEventListener("resize", handleResize);
		originalDispose();
	};

	return {
		scene,
		camera,
		renderer,
		controls,
		animate,
		dispose: enhancedDispose,
		updateWoodType,
		takeScreenshot,
		updateStairPosition,
		updateStairRotation,
	};
}

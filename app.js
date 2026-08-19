import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const viewer = document.querySelector("#viewer");
const statusEl = document.querySelector("#viewerStatus");
const shirtInput = document.querySelector("#shirtInput");
const pantsInput = document.querySelector("#pantsInput");
const shirtName = document.querySelector("#shirtName");
const pantsName = document.querySelector("#pantsName");
const resetButton = document.querySelector("#resetView");
const clearButton = document.querySelector("#clearTextures");

let scene;
let camera;
let renderer;
let controls;
let avatar;
let shirtTexture = null;
let pantsTexture = null;
let shirtObjectUrl = null;
let pantsObjectUrl = null;

const textureLoader = new THREE.TextureLoader();

function setStatus(text, hidden = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("is-hidden", hidden);
}

function createScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(38, viewer.clientWidth / viewer.clientHeight, 0.1, 100);
  camera.position.set(0, 1.45, 4.2);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  viewer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2.4;
  controls.maxDistance = 5.5;
  controls.minPolarAngle = Math.PI * 0.22;
  controls.maxPolarAngle = Math.PI * 0.74;
  controls.target.set(0, 1.05, 0);

  scene.add(new THREE.HemisphereLight(0xf9f4df, 0x31462f, 2.1));

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 5, 4);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xd7ffd8, 1.1);
  rim.position.set(-4, 3, -2);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 72),
    new THREE.ShadowMaterial({ opacity: 0.18 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.08;
  scene.add(floor);

  loadAvatar();
  animate();
}

function loadAvatar() {
  const loader = new GLTFLoader();
  loader.load(
    "assets/models/roblox_model_blocky.glb",
    (gltf) => {
      avatar = gltf.scene;
      normalizeAvatar(avatar);
      scene.add(avatar);
      applyTextures();
      setStatus("", true);
    },
    undefined,
    (error) => {
      console.error(error);
      setStatus("Could not load model");
    }
  );
}

function normalizeAvatar(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 2.65 / Math.max(size.x, size.y, size.z);

  model.scale.setScalar(scale);
  model.position.sub(center.multiplyScalar(scale));
  model.position.y += 1.0;

  model.traverse((child) => {
    if (!child.isMesh) return;

    child.frustumCulled = false;
    child.renderOrder = child.name.toLowerCase().includes("bot") ? 1 : 2;

    const oldMaterial = Array.isArray(child.material) ? child.material[0] : child.material;
    child.material = new THREE.MeshStandardMaterial({
      color: oldMaterial?.color || new THREE.Color(0xffffff),
      map: oldMaterial?.map || null,
      roughness: 0.68,
      metalness: 0,
      transparent: true,
      alphaTest: 0.01,
      side: THREE.FrontSide,
    });
  });
}

function disposeTexture(texture) {
  if (texture) texture.dispose();
}

function loadTexture(file, type) {
  if (!file) return;

  const previousUrl = type === "shirt" ? shirtObjectUrl : pantsObjectUrl;
  if (previousUrl) URL.revokeObjectURL(previousUrl);

  const url = URL.createObjectURL(file);

  if (type === "shirt") {
    shirtObjectUrl = url;
    shirtName.textContent = file.name;
    disposeTexture(shirtTexture);
  } else {
    pantsObjectUrl = url;
    pantsName.textContent = file.name;
    disposeTexture(pantsTexture);
  }

  setStatus("Applying texture");
  textureLoader.load(
    url,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.needsUpdate = true;

      if (type === "shirt") {
        shirtTexture = texture;
      } else {
        pantsTexture = texture;
      }

      applyTextures();
      setStatus("", true);
    },
    undefined,
    (error) => {
      console.error(error);
      setStatus("Texture failed");
    }
  );
}

function applyTextures() {
  if (!avatar) return;

  avatar.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const name = child.name.toLowerCase();
    const materialName = child.material.name?.toLowerCase() || "";
    const isBottom = name.includes("bot") || materialName.includes("leg");
    const isTop = name.includes("top") || materialName.includes("torso");
    const isGhost = name.includes("ghost");

    if (isGhost) {
      child.material.color.set(0xe8e5d7);
      child.material.map = null;
      child.material.transparent = false;
      child.material.opacity = 1;
    } else if (isBottom && pantsTexture) {
      child.material.map = pantsTexture;
      child.material.color.set(0xffffff);
    } else if (isTop && shirtTexture) {
      child.material.map = shirtTexture;
      child.material.color.set(0xffffff);
    } else {
      child.material.map = null;
      child.material.color.set(isBottom ? 0x8f9f84 : 0xf0ead6);
    }

    child.material.needsUpdate = true;
  });
}

function clearTextures() {
  disposeTexture(shirtTexture);
  disposeTexture(pantsTexture);
  shirtTexture = null;
  pantsTexture = null;

  if (shirtObjectUrl) URL.revokeObjectURL(shirtObjectUrl);
  if (pantsObjectUrl) URL.revokeObjectURL(pantsObjectUrl);
  shirtObjectUrl = null;
  pantsObjectUrl = null;

  shirtInput.value = "";
  pantsInput.value = "";
  shirtName.textContent = "PNG, JPG, WEBP";
  pantsName.textContent = "PNG, JPG, WEBP";
  applyTextures();
}

function resetView() {
  controls.reset();
  camera.position.set(0, 1.45, 4.2);
  controls.target.set(0, 1.05, 0);
  controls.update();
}

function wireDropZone(label, input, type) {
  input.addEventListener("change", () => loadTexture(input.files[0], type));

  ["dragenter", "dragover"].forEach((eventName) => {
    label.addEventListener(eventName, (event) => {
      event.preventDefault();
      label.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    label.addEventListener(eventName, (event) => {
      event.preventDefault();
      label.classList.remove("is-dragging");
    });
  });

  label.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) loadTexture(file, type);
  });
}

function resize() {
  if (!renderer || !camera) return;
  const width = viewer.clientWidth;
  const height = viewer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

wireDropZone(document.querySelector("#shirtDrop"), shirtInput, "shirt");
wireDropZone(document.querySelector("#pantsDrop"), pantsInput, "pants");
resetButton.addEventListener("click", resetView);
clearButton.addEventListener("click", clearTextures);
window.addEventListener("resize", resize);

createScene();

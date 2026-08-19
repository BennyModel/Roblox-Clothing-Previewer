import * as THREE from "three";
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
let shirtMeshes = [];
let pantsMeshes = [];
let neutralMeshes = [];
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

  createAvatar();
  animate();
}

function createAvatar() {
  avatar = new THREE.Group();
  avatar.name = "code-built-r6-blocky-avatar";
  shirtMeshes = [];
  pantsMeshes = [];
  neutralMeshes = [];

  const skin = createMaterial(0xe8e5d7);
  const shirt = createMaterial(0xf0ead6);
  const pants = createMaterial(0x8f9f84);

  addPart("Head", [0.86, 0.64, 0.86], [0, 2.72, 0], skin, neutralMeshes);
  addPart("Torso", [1.52, 1.42, 0.68], [0, 1.78, 0], shirt, shirtMeshes);
  addPart("Left Arm", [0.46, 1.42, 0.62], [-1.02, 1.78, 0], shirt, shirtMeshes);
  addPart("Right Arm", [0.46, 1.42, 0.62], [1.02, 1.78, 0], shirt, shirtMeshes);
  addPart("Left Leg", [0.58, 1.2, 0.62], [-0.36, 0.48, 0], pants, pantsMeshes);
  addPart("Right Leg", [0.58, 1.2, 0.62], [0.36, 0.48, 0], pants, pantsMeshes);

  avatar.scale.setScalar(0.86);
  avatar.position.y = 0.12;
  scene.add(avatar);
  setStatus("", true);
}

function createMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0,
    transparent: true,
    alphaTest: 0.01,
    side: THREE.FrontSide,
  });
}

function addPart(name, size, position, material, bucket) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  avatar.add(mesh);
  bucket.push(mesh);
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

  shirtMeshes.forEach((mesh) => setMeshTexture(mesh, shirtTexture, 0xf0ead6));
  pantsMeshes.forEach((mesh) => setMeshTexture(mesh, pantsTexture, 0x8f9f84));
  neutralMeshes.forEach((mesh) => setMeshTexture(mesh, null, 0xe8e5d7));
}

function setMeshTexture(mesh, texture, fallbackColor) {
  mesh.material.map = texture || null;
  mesh.material.color.set(texture ? 0xffffff : fallbackColor);
  mesh.material.needsUpdate = true;
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



// Cél: ne legyen több, mint kb. 1.3 millió ténylegesen renderelt pixel
// (ez a szám finomhangolható — kísérletezz vele a te jelenetedhez)
const MAX_RENDER_PIXELS = 1_300_000;

function computeAdaptivePixelRatio(basePixelRatio) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const requestedPixels = width * height * basePixelRatio * basePixelRatio;

    if (requestedPixels <= MAX_RENDER_PIXELS) {
        return basePixelRatio; // belefér a büdzsébe, mehet az eredeti érték
    }

    // Ha túllépné a büdzsét, arányosan csökkentjük a pixelRatio-t
    const scale = Math.sqrt(MAX_RENDER_PIXELS / (width * height));
    return Math.max(0.6, scale); // ne menjünk 0.6 alá, az már túl elmosódott lenne
}

// Egyszeri, indításkori döntés — eszköz alapján, NEM futásidejű FPS alapján
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

// Csak akkor jelöljük "gyengének", ha az API ténylegesen visszaigazolja —
// ha nem elérhető, ne feltételezzünk semmi rosszat
const lowMemory = navigator.deviceMemory ? navigator.deviceMemory <= 2 : false;
const lowCoreCount = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 2 : false;
const isLowEndDevice = lowMemory || lowCoreCount; // csak akkor igaz, ha van konkrét adat rá

const profile = isLowEndDevice
    ? { pixelRatio: 1.0, antialias: false, shadows: false, shadowMapSize: 512, exposure: 1.0 }
    : isMobile
        ? { pixelRatio: 1.15, antialias: true, shadows: true, shadowMapSize: 1024, exposure: 1.05 }
        : { pixelRatio: Math.min(window.devicePixelRatio || 1, 1.75), antialias: true, shadows: true, shadowMapSize: 1024, exposure: 1.12 };

// Felülírjuk a pixelRatio-t a TÉNYLEGES viewport-méret alapján, eszköz-kategóriától függetlenül
profile.pixelRatio = computeAdaptivePixelRatio(profile.pixelRatio);

const canvas = document.querySelector("#bg");
const container = canvas?.parentElement || document.body;
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: profile.antialias,
    alpha: false,
    powerPreference: isLowEndDevice ? 'low-power' : 'high-performance'
});
renderer.setPixelRatio(profile.pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = profile.exposure;
renderer.shadowMap.enabled = profile.shadows;
renderer.shadowMap.type = profile.shadows
    ? (isLowEndDevice ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap)
    : THREE.BasicShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;

proflie.shadows = false;

sun.castShadow = profile.shadows;
sun.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
sun.shadow.camera.updateProjectionMatrix();


const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath(import.meta.env.BASE_URL + 'basis/');
ktx2Loader.detectSupport(renderer);
const loader = new GLTFLoader();
loader.setKTX2Loader(ktx2Loader);

// ===== KIEGÉSZÍTŐ FÉNYEK =====
const fpsOverlay = document.createElement("div");
fpsOverlay.className = "fps-overlay";
fpsOverlay.textContent = "FPS: --";
document.body.appendChild(fpsOverlay);

let fpsFrames = 0;
let fpsLastUpdate = performance.now();
let shadowDirty = true;
let lastShadowUpdate = 0;

function updateFpsDisplay(now) {
    fpsFrames += 1;
    if (now - fpsLastUpdate < 300) return;
    const fps = (fpsFrames * 1000) / (now - fpsLastUpdate);
    fpsOverlay.textContent = `FPS: ${Math.round(fps)}`;
    fpsFrames = 0;
    fpsLastUpdate = now;
}

function requestShadowUpdate() {
    shadowDirty = true;
}

function updateShadowMap(now) {
    if (!profile.shadows) return;

    const interval = isLowEndDevice ? 240 : 140;
    if (shadowDirty && (now - lastShadowUpdate >= interval || lastShadowUpdate === 0)) {
        renderer.shadowMap.needsUpdate = true;
        lastShadowUpdate = now;
        shadowDirty = false;
    }
}

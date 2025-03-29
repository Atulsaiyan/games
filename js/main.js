// js/main.js

// --- Ensure THREE is loaded ---
if (typeof THREE === 'undefined') {
    console.error("FATAL: THREE.js library not loaded before main.js!");
    alert("Error: Could not load 3D library. Please check console (F12).");
}

// --- Core Three.js Setup ---
let scene, camera, renderer, controls;
let car, airplane;
let clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();

// --- Game State ---
let hitCount = 0;
let carSpeed = 0;
const acceleration = 0.015;
const brakingForce = 0.02;
const maxSpeed = 0.4;
const rotationSpeed = 0.025;
let moveForward = false;
let moveBackward = false;
let turnLeft = false;
let turnRight = false;

// --- Define Road Boundary ---
const roadBoundaryX = 8; // Car's X position will be clamped between -8 and +8
const roadBoundaryZ = 190; // Car's Z position will be clamped between -190 and +190

// --- Pedestrian Management ---
let pedestrians = [];
const maxPedestrians = 8;
const pedestrianRespawnDelay = 1500;

// --- Building Textures ---
let leftBuildingTexture, rightBuildingTexture;
let leftBuildingMat, rightBuildingMat;

// --- UI Elements ---
const hitCounterElement = document.getElementById('hit-counter');
const uiContainer = document.getElementById('ui-container');
const playPauseButton = document.getElementById('play-pause');
const prevTrackButton = document.getElementById('prev-track');
const nextTrackButton = document.getElementById('next-track');
const volDownButton = document.getElementById('vol-down');
const volUpButton = document.getElementById('vol-up');
const volumeDisplay = document.getElementById('volume-display');
const toggleBgmButton = document.getElementById('toggle-bgm');

// --- Audio ---
const radioTracks = [
    'audio/dushman.mp3',
    'audio/bol.mp3',
];
let currentTrackIndex = 0;
const radioAudio = new Audio();
radioAudio.volume = 1.0;
const bgmAudio = new Audio('audio/durgesh_dai.mp3');
bgmAudio.loop = true;
bgmAudio.volume = 0.3;

// --- Audio Interaction Tracking ---
let hasInteracted = false; // Flag to track first interaction

// --- Initialization Function ---
function init() {
    // --- Basic safety checks ---
    if (!hitCounterElement || !uiContainer || !playPauseButton || !prevTrackButton || 
        !nextTrackButton || !volDownButton || !volUpButton || !volumeDisplay || !toggleBgmButton) {
        console.error("UI elements not found. Check your HTML IDs.");
    }
    
    if (radioTracks.length === 0 || radioTracks[0].includes('your_music.mp3')) {
        console.warn("Default radio track filenames. Please update your track URLs.");
    }
    
    if (bgmAudio.src.includes('durgesh_dai.mp3')) {
        console.warn("Default BGM filename. Please update your BGM audio file.");
    }

    // --- Scene, Camera, Renderer Setup ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 150);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4, 8);
    camera.lookAt(0, 0, 0);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '1';
    uiContainer.style.zIndex = '10';

    // --- Lighting Setup ---
    const ambientLight = new THREE.AmbientLight(0x606060);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);

    // --- Load Building Textures ---
    leftBuildingTexture = textureLoader.load('img/kpsharmaoli.jpg');
    rightBuildingTexture = textureLoader.load('img/gyanendrashah.jpg');
    
    // Create materials using the loaded textures
    leftBuildingMat = new THREE.MeshLambertMaterial({ map: leftBuildingTexture });
    rightBuildingMat = new THREE.MeshLambertMaterial({ map: rightBuildingTexture });

    // --- Create World Objects ---
    createRoad();
    createBuildings(); // Create buildings AFTER textures/materials are ready
    createCar();
    createAirplane();
    spawnInitialPedestrians();

    // --- Setup Audio ---
    setupAudio();

    // --- Setup Event Listeners ---
    setupEventListeners();

    // --- Initial UI Update ---
    updateHitCounter();
    updateVolumeDisplay();

    // --- Start the animation loop ---
    animate();
}

// --- Creation Functions ---

function createRoad() {
    const roadGeometry = new THREE.PlaneGeometry(roadBoundaryX * 2, roadBoundaryZ * 2);
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.01;
    road.receiveShadow = true;
    scene.add(road);

    // Center line
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFF00 });
    const points = [];
    points.push(new THREE.Vector3(0, 0.01, -roadBoundaryZ));
    points.push(new THREE.Vector3(0, 0.01, roadBoundaryZ));
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const centerLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(centerLine);
    
    // Add boundary lines
    const leftBoundaryPoints = [];
    leftBoundaryPoints.push(new THREE.Vector3(-roadBoundaryX, 0.01, -roadBoundaryZ));
    leftBoundaryPoints.push(new THREE.Vector3(-roadBoundaryX, 0.01, roadBoundaryZ));
    const leftBoundaryGeometry = new THREE.BufferGeometry().setFromPoints(leftBoundaryPoints);
    const leftBoundaryLine = new THREE.Line(leftBoundaryGeometry, new THREE.LineBasicMaterial({ color: 0xFFFFFF }));
    scene.add(leftBoundaryLine);
    
    const rightBoundaryPoints = [];
    rightBoundaryPoints.push(new THREE.Vector3(roadBoundaryX, 0.01, -roadBoundaryZ));
    rightBoundaryPoints.push(new THREE.Vector3(roadBoundaryX, 0.01, roadBoundaryZ));
    const rightBoundaryGeometry = new THREE.BufferGeometry().setFromPoints(rightBoundaryPoints);
    const rightBoundaryLine = new THREE.Line(rightBoundaryGeometry, new THREE.LineBasicMaterial({ color: 0xFFFFFF }));
    scene.add(rightBoundaryLine);
}

function createNepalFlag() {
    const flagGroup = new THREE.Group();

    // Flagpole
    const poleHeight = 1.5;
    const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, poleHeight, 8);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    poleMesh.position.y = poleHeight / 2; // Position pole relative to group origin
    flagGroup.add(poleMesh);

    // Flag Texture Plane
    const flagTexture = textureLoader.load('img/nepal.png');
    const flagAspect = 0.8; // Approximate aspect ratio of Nepal flag - adjust if needed
    const flagWidth = 0.6;
    const flagHeight = flagWidth / flagAspect;
    const flagGeo = new THREE.PlaneGeometry(flagWidth, flagHeight);
    // Use MeshBasicMaterial so flag isn't affected by light, set transparent if PNG has transparency
    const flagMat = new THREE.MeshBasicMaterial({
        map: flagTexture,
        side: THREE.DoubleSide, // See flag from both sides
        transparent: true,
        alphaTest: 0.1 // Adjust if transparent edges look bad
    });
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    // Position flag relative to the top of the pole
    flagMesh.position.set(flagWidth / 2 + 0.03, poleHeight - flagHeight / 2, 0);
    flagGroup.add(flagMesh);

    return flagGroup;
}

function createCar() {
    const carBodyGeometry = new THREE.BoxGeometry(1.2, 0.6, 2.5);
    const carBodyMaterial = new THREE.MeshLambertMaterial({ color: 0xcc0000 });
    car = new THREE.Mesh(carBodyGeometry, carBodyMaterial);
    car.position.y = 0.3;
    car.castShadow = true;
    scene.add(car);

    // --- Wheels ---
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const wheelPositions = [
        { x: 0.6, y: 0.15, z: 0.8 }, { x: -0.6, y: 0.15, z: 0.8 },
        { x: 0.6, y: 0.15, z: -0.8 }, { x: -0.6, y: 0.15, z: -0.8 }
    ];
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos.x, pos.y, pos.z);
        wheel.castShadow = true;
        car.add(wheel);
    });

    // --- Add Nepal Flag to Car ---
    const flag = createNepalFlag();
    // Position the flag on top-back of the car body
    flag.position.set(0, 0.6, -0.8); // x=center, y=above body, z=towards back
    flag.scale.set(0.6, 0.6, 0.6); // Scale it down a bit
    car.add(flag); // Add flag AS A CHILD of the car
}

function createAirplane() {
    airplane = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xcccccc }); // Silver/Grey

    // Fuselage (simple cylinder)
    const fuselageGeo = new THREE.CylinderGeometry(0.3, 0.4, 4, 12);
    const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
    fuselage.rotation.x = Math.PI / 2; // Lay it flat
    airplane.add(fuselage);

    // Wings (simple boxes)
    const wingGeo = new THREE.BoxGeometry(4, 0.1, 1);
    const wing = new THREE.Mesh(wingGeo, bodyMat);
    wing.position.y = 0.1;
    airplane.add(wing);

    // Tail fin
    const tailGeo = new THREE.BoxGeometry(0.1, 1, 0.5);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(0, 0.5, -1.8); // Position at the back, sticking up
    airplane.add(tail);

    // --- Photo Displays ---
    const photoTexture1 = textureLoader.load('img/kpsharmaoli.jpg');
    const photoTexture2 = textureLoader.load('img/gyanendrashah.jpg');

    const displayWidth = 1.5;
    const displayHeight = 1.0; // Adjust aspect ratio if needed
    const displayGeo = new THREE.PlaneGeometry(displayWidth, displayHeight);

    const displayMat1 = new THREE.MeshBasicMaterial({ map: photoTexture1, side: THREE.DoubleSide });
    const displayMat2 = new THREE.MeshBasicMaterial({ map: photoTexture2, side: THREE.DoubleSide });

    const display1 = new THREE.Mesh(displayGeo, displayMat1);
    const display2 = new THREE.Mesh(displayGeo, displayMat2);

    // Position displays under the wings
    display1.position.set(-1.2, -0.3, 0); // Under left wing
    display1.rotation.x = -0.1; // Slight angle down

    display2.position.set(1.2, -0.3, 0); // Under right wing
    display2.rotation.x = -0.1; // Slight angle down

    airplane.add(display1);
    airplane.add(display2);

    // Initial position and add to scene
    airplane.position.set(0, 15, -50); // Start high up and back
    airplane.rotation.y = -0.2; // Slight angle
    airplane.scale.set(1.5, 1.5, 1.5); // Make it bigger
    scene.add(airplane);
}

function createBuilding(x, z, width, height, depth, material) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const building = new THREE.Mesh(geometry, material);
    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
}

function createBuildings() {
    // Ensure materials are loaded before proceeding
    if (!leftBuildingMat || !rightBuildingMat) {
        console.error("Building materials not ready!");
        return;
    }

    const buildingSpacing = 10;
    const buildingDepth = 5;
    // Offset from the defined roadBoundary where buildings start
    const sideBuildingOffset = 1; // Place buildings just outside the car boundary

    // Use roadBoundaryZ instead of a fixed value
    const buildingZoneLength = roadBoundaryZ - 10; // Give a bit of margin

    for (let z = -buildingZoneLength; z < buildingZoneLength; z += buildingSpacing + Math.random() * 5) {
        const height = 5 + Math.random() * 15;
        const width = 4 + Math.random() * 4;

        // Left side buildings: Use leftBuildingMat
        const leftX = -(roadBoundaryX + sideBuildingOffset + width / 2 + Math.random());
        createBuilding(leftX, z + buildingDepth / 2, width, height, buildingDepth, leftBuildingMat);

        // Right side buildings: Use rightBuildingMat
        const rightX = (roadBoundaryX + sideBuildingOffset + width / 2 + Math.random());
        createBuilding(rightX, z + buildingDepth / 2, width, height, buildingDepth, rightBuildingMat);
    }
}

function spawnInitialPedestrians() {
    for (let i = 0; i < maxPedestrians; i++) {
        spawnPedestrian(true); // Pass flag for initial wide spawn
    }
}

function spawnPedestrian(initialSpawn = false) {
    if (!scene || !car || pedestrians.length >= maxPedestrians) return;

    const pedestrianGeometry = new THREE.BoxGeometry(0.4, 1.7, 0.4);
    const pedestrianMaterial = new THREE.MeshLambertMaterial({ color: Math.random() * 0x00ffff });
    const newPed = new THREE.Mesh(pedestrianGeometry, pedestrianMaterial);

    let spawnDistance = 20 + Math.random() * 30;
    if (initialSpawn) {
        spawnDistance = 10 + Math.random() * 100;
    }

    // --- Constrain sideOffset to the roadBoundaryX ---
    // Spawn within +/- roadBoundaryX, slightly offset from edge
    const sideOffset = (Math.random() - 0.5) * (roadBoundaryX * 2 * 0.9);

    const forwardVector = new THREE.Vector3(0, 0, -1);
    let basePosition = car.position.clone();

    if (initialSpawn && Math.random() < 0.5) {
        basePosition.set(0, 0, 0);
        forwardVector.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    } else {
        forwardVector.applyQuaternion(car.quaternion);
    }

    const spawnPos = basePosition.add(forwardVector.multiplyScalar(spawnDistance));
    // Set X position based on calculated sideOffset relative to center line (0)
    spawnPos.x = sideOffset;
    spawnPos.y = 0.85; // Pedestrian height offset

    // --- Prevent spawning too close ---
    let tooClose = false;
    for (const p of pedestrians) {
        if (p.position.distanceTo(spawnPos) < 3.0) {
            tooClose = true;
            break;
        }
    }
    if (tooClose) {
        newPed.geometry.dispose();
        newPed.material.dispose();
        return; // Skip spawn
    }

    newPed.position.copy(spawnPos);
    newPed.castShadow = true;
    scene.add(newPed);
    pedestrians.push(newPed);
}

// --- Audio Functions with Interaction Handling ---
function playBgmIfNotStarted() {
    if (!hasInteracted) {
        hasInteracted = true; // Only try this once automatically on interaction
        playBGM(); // Attempt to play now that user interacted
    }
}

function setupAudio() {
    if (radioTracks.length > 0) radioAudio.src = radioTracks[currentTrackIndex];
    else { 
        console.error("No radio tracks defined!"); 
        // Disable buttons if needed
    }
    radioAudio.addEventListener('ended', nextTrack);
    toggleBgmButton.addEventListener('click', toggleBGM);
    playPauseButton.addEventListener('click', toggleRadioPlay);
    prevTrackButton.addEventListener('click', prevTrack);
    nextTrackButton.addEventListener('click', nextTrack);
    volDownButton.addEventListener('click', volumeDown);
    volUpButton.addEventListener('click', volumeUp);
}

function playBGM() {
    bgmAudio.play().catch(e => {
        console.warn("BGM play attempt failed/blocked:", e.message);
    });
    updateBgmButton(); // Update button text based on muted state
}

function toggleBGM() {
    // If toggling to Unmute, ensure play is attempted
    if (bgmAudio.muted) { // If it WAS muted, we are unmuting
        bgmAudio.muted = false;
        bgmAudio.play().catch(e => console.error("Could not play BGM after unmute:", e));
    } else { // If it WAS playing, we are muting
        bgmAudio.muted = true;
        // No need to call pause explicitly, muting is enough
    }
    updateBgmButton();
    // Make sure interaction flag is set even if they just mute/unmute
    if (!hasInteracted) {
        hasInteracted = true;
    }
}

function updateBgmButton() {
    toggleBgmButton.textContent = bgmAudio.muted ? 'Unmute BGM' : 'Mute BGM';
}

function playCurrentRadioTrack() {
    if (radioTracks.length === 0) return;
    radioAudio.src = radioTracks[currentTrackIndex];
    radioAudio.play().catch(e => console.error("Radio play failed:", e));
    playPauseButton.textContent = '⏸️';
}

function toggleRadioPlay() {
    playBgmIfNotStarted(); // Try starting BGM on radio interaction
    
    if (radioTracks.length === 0) return;
    if (radioAudio.paused) { 
        if (!radioAudio.src || radioAudio.src !== radioTracks[currentTrackIndex]) { 
            radioAudio.src = radioTracks[currentTrackIndex]; 
        } 
        radioAudio.play().catch(e => console.error("Radio play failed:", e)); 
        playPauseButton.textContent = '⏸️'; 
    }
    else { 
        radioAudio.pause(); 
        playPauseButton.textContent = '▶️'; 
    }
}

function nextTrack() {
    if (radioTracks.length === 0) return; 
    currentTrackIndex = (currentTrackIndex + 1) % radioTracks.length; 
    playCurrentRadioTrack();
}

function prevTrack() {
    if (radioTracks.length === 0) return; 
    currentTrackIndex--; 
    if (currentTrackIndex < 0) { 
        currentTrackIndex = radioTracks.length - 1; 
    } 
    playCurrentRadioTrack();
}

function volumeUp() {
    if (radioTracks.length === 0) return; 
    radioAudio.volume = Math.min(1.0, radioAudio.volume + 0.1); 
    updateVolumeDisplay();
}

function volumeDown() {
    if (radioTracks.length === 0) return; 
    radioAudio.volume = Math.max(0.0, radioAudio.volume - 0.1); 
    updateVolumeDisplay();
}

function updateVolumeDisplay() {
    volumeDisplay.textContent = `Vol: ${Math.round(radioAudio.volume * 100)}%`;
}

// --- Event Listener Setup ---
function setupEventListeners() {
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': moveForward = true; break;
            case 'KeyS': case 'ArrowDown': moveBackward = true; break;
            case 'KeyA': case 'ArrowLeft': turnLeft = true; break;
            case 'KeyD': case 'ArrowRight': turnRight = true; break;
        }
        
        // Mark as interacted on any key press
        playBgmIfNotStarted();
    });
    
    document.addEventListener('keyup', (event) => {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': moveForward = false; break;
            case 'KeyS': case 'ArrowDown': moveBackward = false; break;
            case 'KeyA': case 'ArrowLeft': turnLeft = false; break;
            case 'KeyD': case 'ArrowRight': turnRight = false; break;
        }
    });
    
    window.addEventListener('resize', onWindowResize);
    
    // Add click listener to the entire document to handle first interaction
    document.addEventListener('click', () => {
        playBgmIfNotStarted();
    });
}

// --- Helper Functions (Resize, UI Update, Collision) ---
function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateHitCounter() {
    if (hitCounterElement) {
        hitCounterElement.textContent = `Hits: ${hitCount}`;
    }
}

function checkCollision() {
    if (!car || pedestrians.length === 0) return;
    const collisionThreshold = 1.8;
    
    for (let i = pedestrians.length - 1; i >= 0; i--) {
        const currentPed = pedestrians[i];
        if (!currentPed) continue;
        
        const distance = car.position.distanceTo(currentPed.position);
        if (distance < collisionThreshold) {
            hitCount++; 
            updateHitCounter();
            scene.remove(currentPed);
            
            if (currentPed.geometry) currentPed.geometry.dispose();
            if (currentPed.material) currentPed.material.dispose();
            
            pedestrians.splice(i, 1);
            setTimeout(spawnPedestrian, pedestrianRespawnDelay);
            // Optional hit sound
            break;
        }
    }
}

// --- Update Functions (Car Movement, Camera) ---
function updateCarMovement(deltaTime) {
    if (!car) return;

    const effectiveRotationSpeed = rotationSpeed * (Math.abs(carSpeed) / maxSpeed + 0.3);

    // --- Acceleration/Deceleration ---
    if (moveForward) {
        carSpeed = Math.min(carSpeed + acceleration, maxSpeed);
    } else if (moveBackward) {
        carSpeed = Math.max(carSpeed - acceleration * 1.5, -maxSpeed / 2); // Faster braking/reverse
    } else {
        // Natural deceleration (friction/drag)
        if (Math.abs(carSpeed) > 0.01) {
            carSpeed *= 0.97; // Exponential decay
        } else {
            carSpeed = 0; // Stop completely
        }
    }

    // --- Turning (only when moving) ---
    if (Math.abs(carSpeed) > 0.01) {
        if (turnLeft) {
            car.rotation.y += effectiveRotationSpeed;
        }
        if (turnRight) {
            car.rotation.y -= effectiveRotationSpeed;
        }
    }

    // --- Apply Movement ---
    const moveDirection = new THREE.Vector3(0, 0, -1); // Car's local forward
    moveDirection.applyQuaternion(car.quaternion);
    car.position.addScaledVector(moveDirection, carSpeed);

    // --- Clamp Car Position to Road Boundary ---
    // Clamp X position (width)
    car.position.x = THREE.MathUtils.clamp(car.position.x, -roadBoundaryX, roadBoundaryX);
    
    // Clamp Z position (length)
    car.position.z = THREE.MathUtils.clamp(car.position.z, -roadBoundaryZ, roadBoundaryZ);
}

function updateCamera() {
    if (!camera || !car) return; // Check objects exist

    // Simple follow camera
    const offset = new THREE.Vector3(0, 4, 8); // Camera offset from car (behind, up)
    offset.applyQuaternion(car.quaternion); // Rotate offset with the car

    const targetPosition = car.position.clone().add(offset);
    const lookAtPosition = car.position.clone().add(new THREE.Vector3(0, 1, 0)); // Look slightly above the car center

    // Smooth camera movement (lerp)
    camera.position.lerp(targetPosition, 0.05); // Adjust the lerp factor (0.05 is smooth)
    camera.lookAt(lookAtPosition);
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    if (!renderer || !scene || !camera) return;

    const deltaTime = clock.getDelta();

    updateCarMovement(deltaTime);
    checkCollision();
    updateCamera();

    // Animate Airplane
    if (airplane) {
        airplane.position.x += 5 * deltaTime; // Move airplane across the screen
        // Simple wrap-around logic
        if (airplane.position.x > 100) {
            airplane.position.x = -100; // Reset to the other side
            airplane.position.z = -30 - Math.random() * 40; // Vary depth
        }
    }

    // Respawn Pedestrians
    if (pedestrians.length < maxPedestrians && Math.random() < 0.1) {
        spawnPedestrian();
    }

    renderer.render(scene, camera);
}

// --- Start the simulation ---
init();
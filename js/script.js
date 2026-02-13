const camera = document.getElementById('camera');
const lineHorizontal = document.getElementById('lineHorizontal');
const lineVertical = document.getElementById('lineVertical');
const angleDisplay = document.getElementById('angleDisplay');
const info = document.getElementById('info');
const permissionBtn = document.getElementById('permissionBtn');
const cameraToggle = document.getElementById('cameraToggle');
const calibrateToggle = document.getElementById('calibrateToggle');
const modeToggle = document.getElementById('modeToggle');
const calibration = document.getElementById('calibration');
const calibrateBtn = document.getElementById('calibrateBtn');
const errorScreen = document.getElementById('errorScreen');

const RAD_TO_DEG = 180 / Math.PI;

// State
let cameraActive = false;
let cameraStream = null;
let calibrated = false;
let xSign = 1;
let ySign = 1;
let swapXY = false;
let motionDetected = false;

// Line display mode: 'horizontal', 'vertical', 'cross'
let lineMode = 'horizontal';

// EWMA smoothing
let smoothedRoll = 0;
const SMOOTHING_FACTOR = 0.1; // Lower = more smoothing (0.1-0.3 typical)

// Throttle angle display updates
let lastDisplayUpdate = 0;
const DISPLAY_UPDATE_INTERVAL = 500; // ms

// Camera toggle
cameraToggle.addEventListener('click', async () => {
    if (!cameraActive) {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            camera.srcObject = cameraStream;
            camera.classList.add('active');
            cameraActive = true;
            cameraToggle.textContent = '📷 Camera On';
        } catch (error) {
            info.textContent = 'Camera error: ' + error.message;
        }
    } else {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        camera.classList.remove('active');
        cameraActive = false;
        cameraToggle.textContent = '📷 Camera Off';
    }
});

// Mode toggle
modeToggle.addEventListener('click', () => {
    if (lineMode === 'cross') {
        lineMode = 'horizontal';
        modeToggle.textContent = '— Horizontal';
        updateLineVisibility();
    } else if (lineMode === 'horizontal') {
        lineMode = 'vertical';
        modeToggle.textContent = '| Vertical';
        updateLineVisibility();
    } else {
        lineMode = 'cross';
        modeToggle.textContent = '➕ Cross';
        updateLineVisibility();
    }
});

// Update line visibility based on mode
function updateLineVisibility() {
    if (lineMode === 'horizontal') {
        lineHorizontal.classList.remove('hidden');
        lineVertical.classList.add('hidden');
    } else if (lineMode === 'vertical') {
        lineHorizontal.classList.add('hidden');
        lineVertical.classList.remove('hidden');
    } else { // cross
        lineHorizontal.classList.remove('hidden');
        lineVertical.classList.remove('hidden');
    }
}

// Initialize with horizontal only
updateLineVisibility();

// Calculate required line length to maintain consistent margin from edge
function getLineLength(angleDeg, marginFraction = 0.05) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Convert to radians and normalize
    const angleRad = (angleDeg % 180) * Math.PI / 180;
    const absAngle = Math.abs(angleRad);
    
    // Calculate cos and sin
    const cos = Math.abs(Math.cos(absAngle));
    const sin = Math.abs(Math.sin(absAngle));
    
    // Determine distance to nearest edge in the direction of the line
    let distanceToEdge;
    if (sin < 0.001) {
        // Nearly horizontal
        distanceToEdge = width / 2;
    } else if (cos < 0.001) {
        // Nearly vertical
        distanceToEdge = height / 2;
    } else {
        // Check which edge we hit first
        const distToVerticalEdge = width / (2 * cos);
        const distToHorizontalEdge = height / (2 * sin);
        distanceToEdge = Math.min(distToVerticalEdge, distToHorizontalEdge);
    }
    
    // Apply margin and return full length (line extends both directions from center)
    return distanceToEdge * (1 - marginFraction) * 2;
}

// Calibrate toggle
calibrateToggle.addEventListener('click', () => {
    calibration.classList.add('active');
});

// Motion handler
function handleMotion(event) {
    const gravity = event.accelerationIncludingGravity;
    
    if (!gravity || gravity.x === null || gravity.y === null) {
        return;
    }
    
    // Mark that we've received valid motion data
    if (!motionDetected) {
        motionDetected = true;
        info.textContent = 'Motion sensor detected';
    }
    
    let gx = gravity.x;
    let gy = gravity.y;
    
    // Apply calibration if calibrated
    if (calibrated) {
        gx = gravity.x * xSign;
        gy = gravity.y * ySign;
        
        if (swapXY) {
            [gx, gy] = [gy, gx];
        }
    }
    
    // Default: atan2(x, y)
    let roll = Math.atan2(gx, gy) * RAD_TO_DEG;
    
    // Adjust for screen orientation mode (not physical holding)
    const orientation = screen.orientation || screen.mozOrientation || screen.msOrientation;
    if (orientation) {
        const orientationType = orientation.type || '';
        
        // Adjust based on whether screen is in portrait or landscape mode
        if (orientationType.includes('landscape-primary')) {
            roll = roll - 90;
        } else if (orientationType.includes('landscape-secondary')) {
            roll = roll + 90;
        } else if (orientationType.includes('portrait-secondary')) {
            roll = roll - 180;
        }
        // portrait-primary needs no adjustment
    }
    
    // Apply EWMA smoothing
    smoothedRoll = SMOOTHING_FACTOR * roll + (1 - SMOOTHING_FACTOR) * smoothedRoll;
    
    // Calculate required line lengths separately (vertical is 90° offset from horizontal)
    const horizontalLength = getLineLength(smoothedRoll);
    const verticalLength = getLineLength(smoothedRoll + 90);
    
    // Update horizontal line
    lineHorizontal.style.width = `${horizontalLength}px`;
    lineHorizontal.style.marginLeft = `${-horizontalLength / 2}px`;
    lineHorizontal.style.transform = `rotate(${smoothedRoll}deg)`;
    
    // Update vertical line
    lineVertical.style.height = `${verticalLength}px`;
    lineVertical.style.marginTop = `${-verticalLength / 2}px`;
    lineVertical.style.transform = `rotate(${smoothedRoll}deg)`;
    
    // Update color based on how level it is
    const absAngle = Math.abs(smoothedRoll);
    let colorClass;
    
    if (absAngle <= 1) {
        colorClass = 'level-perfect'; // Green - within 1 degree
    } else if (absAngle <= 5) {
        colorClass = 'level-good'; // Yellow - within 5 degrees
    } else {
        colorClass = 'level-off'; // Red - beyond 5 degrees
    }
    
    // Apply color class to both lines (preserve hidden class if set)
    const horizontalHidden = lineHorizontal.classList.contains('hidden');
    const verticalHidden = lineVertical.classList.contains('hidden');
    
    lineHorizontal.className = `line horizontal ${colorClass}`;
    lineVertical.className = `line vertical ${colorClass}`;
    
    if (horizontalHidden) lineHorizontal.classList.add('hidden');
    if (verticalHidden) lineVertical.classList.add('hidden');
    
    // Update angle display (throttled to improve readability)
    const now = Date.now();
    if (now - lastDisplayUpdate >= DISPLAY_UPDATE_INTERVAL) {
        angleDisplay.textContent = `${smoothedRoll.toFixed(1)}°`;
        lastDisplayUpdate = now;
    }
    
    // Update info (optional debug)
    // info.textContent = `x: ${gravity.x.toFixed(2)} | y: ${gravity.y.toFixed(2)} | type: ${orientation?.type}`;
}

// Calibration
function calibrate() {
    const orientation = screen.orientation || screen.mozOrientation || screen.msOrientation;
    const angle = orientation ? orientation.angle : 0;
    
    info.textContent = `Screen angle: ${angle}° - Calibrating...`;
    
    const samples = [];
    let sampleCount = 0;
    const maxSamples = 10;
    
    const sampleHandler = (event) => {
        const gravity = event.accelerationIncludingGravity;
        if (!gravity || gravity.x === null || gravity.y === null) return;
        
        samples.push({ x: gravity.x, y: gravity.y, z: gravity.z });
        sampleCount++;
        
        if (sampleCount >= maxSamples) {
            window.removeEventListener('devicemotion', sampleHandler);
            
            // Average the samples
            const avgX = samples.reduce((sum, s) => sum + s.x, 0) / samples.length;
            const avgY = samples.reduce((sum, s) => sum + s.y, 0) / samples.length;
            const avgZ = samples.reduce((sum, s) => sum + s.z, 0) / samples.length;
            
            // Determine mapping based on screen orientation
            switch(angle) {
                case 0: // Portrait
                    if (Math.abs(avgY) > Math.abs(avgX)) {
                        swapXY = false;
                        xSign = 1;
                        ySign = avgY > 0 ? 1 : -1;
                    } else {
                        swapXY = true;
                        xSign = avgX > 0 ? 1 : -1;
                        ySign = 1;
                    }
                    break;
                case 90: // Landscape right
                    if (Math.abs(avgX) > Math.abs(avgY)) {
                        swapXY = false;
                        xSign = avgX > 0 ? -1 : 1;
                        ySign = 1;
                    } else {
                        swapXY = true;
                        xSign = 1;
                        ySign = avgY > 0 ? -1 : 1;
                    }
                    break;
                case 180: // Portrait upside down
                    if (Math.abs(avgY) > Math.abs(avgX)) {
                        swapXY = false;
                        xSign = 1;
                        ySign = avgY > 0 ? -1 : 1;
                    } else {
                        swapXY = true;
                        xSign = avgX > 0 ? -1 : 1;
                        ySign = 1;
                    }
                    break;
                case 270: // Landscape left
                    if (Math.abs(avgX) > Math.abs(avgY)) {
                        swapXY = false;
                        xSign = avgX > 0 ? 1 : -1;
                        ySign = 1;
                    } else {
                        swapXY = true;
                        xSign = 1;
                        ySign = avgY > 0 ? 1 : -1;
                    }
                    break;
            }
            
            calibrated = true;
            calibration.classList.remove('active');
            info.textContent = `Calibrated! (swap: ${swapXY}, xSign: ${xSign}, ySign: ${ySign})`;
        }
    };
    
    window.addEventListener('devicemotion', sampleHandler);
}

calibrateBtn.addEventListener('click', calibrate);

// Initialize
async function init() {
    // Check if DeviceMotionEvent is supported - instant detection
    if (!window.DeviceMotionEvent) {
        errorScreen.classList.add('active');
        return;
    }
    
    // iOS 13+ requires permission
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        permissionBtn.style.display = 'block';
        permissionBtn.onclick = async () => {
            try {
                const permission = await DeviceMotionEvent.requestPermission();
                if (permission === 'granted') {
                    window.addEventListener('devicemotion', handleMotion);
                    permissionBtn.style.display = 'none';
                    info.textContent = 'Waiting for motion data...';
                    
                    // Check if motion sensor is actually working (reduced to 1 second)
                    setTimeout(() => {
                        if (!motionDetected) {
                            errorScreen.classList.add('active');
                            info.textContent = 'No motion sensor detected';
                        }
                    }, 1000);
                } else {
                    info.textContent = 'Permission denied';
                }
            } catch (error) {
                info.textContent = 'Error: ' + error.message;
            }
        };
    } else {
        // Non-iOS or older iOS
        window.addEventListener('devicemotion', handleMotion);
        info.textContent = 'Waiting for motion data...';
        
        // Check if motion sensor is actually working (reduced to 1 second)
        setTimeout(() => {
            if (!motionDetected) {
                errorScreen.classList.add('active');
                info.textContent = 'No motion sensor detected';
            }
        }, 1000);
    }
}

init();
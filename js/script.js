const camera = document.getElementById('camera');
const line = document.getElementById('line');
const angleDisplay = document.getElementById('angleDisplay');
const info = document.getElementById('info');
const permissionBtn = document.getElementById('permissionBtn');
const cameraToggle = document.getElementById('cameraToggle');
const calibrateToggle = document.getElementById('calibrateToggle');
const calibration = document.getElementById('calibration');
const calibrateBtn = document.getElementById('calibrateBtn');

const RAD_TO_DEG = 180 / Math.PI;

// State
let cameraActive = false;
let cameraStream = null;
let calibrated = false;
let xSign = 1;
let ySign = 1;
let swapXY = false;

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
    
    // Adjust for screen orientation
    const orientation = screen.orientation || screen.mozOrientation || screen.msOrientation;
    const screenAngle = orientation ? orientation.angle : 0;
    roll = roll - screenAngle;
    
    // Update line rotation
    line.style.transform = `translate(-50%, -50%) rotate(${roll}deg)`;
    
    // Update angle display
    angleDisplay.textContent = `${roll.toFixed(1)}°`;
    
    // Update info (optional debug)
    // info.textContent = `x: ${gravity.x.toFixed(2)} | y: ${gravity.y.toFixed(2)} | roll: ${roll.toFixed(1)}°`;
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
    if (!window.DeviceMotionEvent) {
        info.textContent = 'Device motion not supported';
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
                    info.textContent = 'Sensors enabled';
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
        info.textContent = 'Ready';
    }
}

init();
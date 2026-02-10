
let videoStream = null;

// Smoothed gravity vector
let alphaSmoothed = 0;
let betaSmoothed = 0;
let gammaSmoothed = 0;
const SMOOTHING = 0.2; // 0.1 = very stable, 0.8 = more responsive

// --- CAMERA ---

async function startCamera() {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });

    $("#camera")
      .prop("srcObject", videoStream)
      .fadeIn();
  } catch (err) {
    alert("Camera access denied or unavailable.");
  }
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  $("#camera").fadeOut();
}

// --- ORIENTATION ---

function handleOrientation(event) {
    const alpha = event.alpha;
    const beta  = event.beta;
    const gamma = event.gamma;

    if (alpha === null || beta === null || gamma === null) return;

    // --- DEBUG PANEL ---
    $("#alpha").text(alpha.toFixed(1));
    $("#beta").text(beta.toFixed(1));
    $("#gamma").text(gamma.toFixed(1));

    // Smooth angle sensor values
    alphaSmoothed = SMOOTHING * alpha + (1 - SMOOTHING) * alphaSmoothed;
    betaSmoothed = SMOOTHING * beta + (1 - SMOOTHING) * betaSmoothed;
    gammaSmoothed = SMOOTHING * gamma + (1 - SMOOTHING) * gammaSmoothed;

    // --- Convert Euler angles to quaternion (Z-X-Y order) ---
    // const q = glMatrix.quat.create();
    // glMatrix.quat.fromEuler(q, betaSmoothed, gammaSmoothed, alphaSmoothed);

    // // --- Rotate world gravity vector (0,0,-1) by quaternion ---
    // const gravity = glMatrix.vec3.fromValues(0, 0, -1);
    // const deviceGravity = glMatrix.vec3.create();
    // glMatrix.vec3.transformQuat(deviceGravity, gravity, q);

    // // --- Project onto screen plane ---
    // const gx = deviceGravity[0]; // left/right
    // const gy = deviceGravity[1]; // up/down

    // // --- Horizon angle ---
    // const angle = Math.atan2(gx, gy) * 180 / Math.PI;

    // // --- Smooth angle with EWMA ---
    // // smoothedAngle = SMOOTHING * angle + (1 - SMOOTHING) * smoothedAngle;


    let rotatedVector = rotateYZX([0, 0, -1], alphaSmoothed, betaSmoothed, gammaSmoothed);
    
    const angleRad = Math.atan2(rotatedVector[2], Math.sqrt(rotatedVector[0]*rotatedVector[0] + rotatedVector[1]*rotatedVector[1]));
    const angleDeg = angleRad * 180 / Math.PI;



    updateUI(angleDeg);
}


function updateUI(angle) {
  $("#level-line").css(
    "transform",
    `rotate(${angle}deg)`
  );

  $("#angle-display").text(
    `${angle.toFixed(1)}°`
  );

  // Visual feedback when level
  if (Math.abs(angle) < 1) {
    $("#level-line").css("background", "cyan");
    navigator.vibrate?.(20);
  } else {
    $("#level-line").css("background", "lime");
  }
}

// --- EVENTS ---

$(document).ready(function () {

  // Camera toggle
  $("#cameraToggle").on("change", function () {
    if (this.checked) {
      startCamera();
    } else {
      stopCamera();
    }
  });

  // Request motion permission (iOS)
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    const btn = $("<button class='btn btn-outline-light btn-sm mt-2'>Enable Sensors</button>");
    $("footer").append("<br>").append(btn);

    btn.on("click", async () => {
      const response = await DeviceOrientationEvent.requestPermission();
      if (response === "granted") {
        window.addEventListener("deviceorientation", handleOrientation);
        btn.remove();
      }
    });
  } else {
    window.addEventListener("deviceorientation", handleOrientation);
  }

  $("#debugToggle").on("change", function () {
  $("#debug-panel").toggle(this.checked);
});
});


function deg2rad(d) { return d * Math.PI / 180; }

function rotateYZX(v, alpha, beta, gamma) {
    const a = deg2rad(alpha);
    const b = deg2rad(beta);
    const g = deg2rad(gamma);

    const cA = Math.cos(a), sA = Math.sin(a);
    const cB = Math.cos(b), sB = Math.sin(b);
    const cG = Math.cos(g), sG = Math.sin(g);

    // Y rotation
    const x1 = cG*v[0] + sG*v[2];
    const y1 = v[1];
    const z1 = -sG*v[0] + cG*v[2];

    // Z rotation
    const x2 = cA*x1 - sA*y1;
    const y2 = sA*x1 + cA*y1;
    const z2 = z1;

    // X rotation
    const x3 = x2;
    const y3 = cB*y2 - sB*z2;
    const z3 = sB*y2 + cB*z2;



    // // Z rotation
    // const x1 = cA*v[0] - sA*v[1];
    // const y1 = sA*v[0] + cA*v[1];
    // const z1 = v[2];

    // // X rotation
    // const x2 = x1;
    // const y2 = cB*y1 - sB*z1;
    // const z2 = sB*y1 + cB*z1;

    // // Y rotation
    // const x3 = cG*x2 + sG*z2;
    // const y3 = y2;
    // const z3 = -sG*x2 + cG*z2;

    return [x3, y3, z3];
}


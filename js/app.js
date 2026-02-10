
let videoStream = null;

// Smoothed gravity vector
let alphaSmoothed = 0;
let betaSmoothed = 0;
let gammaSmoothed = 0;
const SMOOTHING = 0.9; // 0.1 = very stable, 0.8 = more responsive

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
    const q = glMatrix.quat.create();
    glMatrix.quat.fromEuler(q, betaSmoothed, gammaSmoothed, alphaSmoothed);

    // --- Rotate world gravity vector (0,0,-1) by quaternion ---
    const gravity = glMatrix.vec3.fromValues(0, 0, -1);
    const deviceGravity = glMatrix.vec3.create();
    glMatrix.vec3.transformQuat(deviceGravity, gravity, q);

    // --- Project onto screen plane ---
    const gx = deviceGravity[0]; // left/right
    const gy = deviceGravity[1]; // up/down

    // --- Horizon angle ---
    const angle = Math.atan2(gx, gy) * 180 / Math.PI;

    // --- Smooth angle with EWMA ---
    // smoothedAngle = SMOOTHING * angle + (1 - SMOOTHING) * smoothedAngle;

    updateUI(angle);
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


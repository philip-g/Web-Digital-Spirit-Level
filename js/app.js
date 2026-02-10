
let videoStream = null;
let currentAngle = 0;

// Smoothed gravity vector
let gBeta = 0;
let gGamma = 0;
const SMOOTHING = 1; // 0.05 = very stable, 0.2 = more responsive

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

  if (beta === null || gamma === null) return;

  // --- DEBUG DISPLAY ---
  $("#alpha").text(alpha?.toFixed(1) ?? "–");
  $("#beta").text(beta.toFixed(1));
  $("#gamma").text(gamma.toFixed(1));

  // --- SMOOTH THE GRAVITY VECTOR ---
  gBeta  = SMOOTHING * beta  + (1 - SMOOTHING) * gBeta;
  gGamma = SMOOTHING * gamma + (1 - SMOOTHING) * gGamma;

  // --- COMPUTE PERFECTLY CONTINUOUS HORIZON ANGLE ---
  const angle =
    Math.atan2(gGamma, gBeta) * (180 / Math.PI);

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
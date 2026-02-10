
let videoStream = null;
let currentAngle = 0;

let smoothedAngle = 0;
const SMOOTHING = 0.15;


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
  const beta = event.beta;   // front-back
  const gamma = event.gamma; // left-right

  if (beta === null || gamma === null) return;

  // Compute stable horizon angle
  let rawAngle =
    Math.atan2(gamma, beta) * (180 / Math.PI);

  // Exponential smoothing
  smoothedAngle =
    SMOOTHING * rawAngle +
    (1 - SMOOTHING) * smoothedAngle;

  updateUI(smoothedAngle);
}

function updateUI() {
  $("#level-line").css(
    "transform",
    `rotate(${currentAngle}deg)`
  );

  $("#angle-display").text(
    `${currentAngle.toFixed(1)}°`
  );

  // Change color when close to level
  if (Math.abs(currentAngle) < 1) {
    $("#level-line").css("background", "cyan");
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
});
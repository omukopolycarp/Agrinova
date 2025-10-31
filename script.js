// Handle contact form submission
document.getElementById("contactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Sending...';

  const data = {
    name: form[0].value,
    email: form[1].value,
    message: form[2].value,
  };

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const msg = document.getElementById("responseMsg");

    if (res.ok) {
      // Success response
      msg.innerHTML = `
        <div class="alert alert-success d-flex align-items-center" role="alert">
          <i class="fas fa-check-circle me-2"></i>
          <div>
            <strong>Message sent successfully!</strong>
            <br>
            <small class="text-muted">Thank you for contacting DIPLO AGRINOVA. We'll get back to you soon.</small>
          </div>
        </div>
      `;
      msg.classList.remove("text-danger");
      form.reset();

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        msg.innerHTML = "";
      }, 5000);
    } else {
      // Error response
      const errorData = await res.json().catch(() => ({}));
      msg.innerHTML = `
        <div class="alert alert-danger d-flex align-items-center" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <div>
            <strong>Failed to send message</strong>
            <br>
            <small class="text-muted">${errorData.message || 'Please try again later or contact us directly.'}</small>
          </div>
        </div>
      `;
      msg.classList.remove("text-success");
    }
  } catch (error) {
    console.error('Contact form error:', error);
    const msg = document.getElementById("responseMsg");
    msg.innerHTML = `
      <div class="alert alert-danger d-flex align-items-center" role="alert">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <div>
          <strong>Network error</strong>
          <br>
          <small class="text-muted">Please check your internet connection and try again.</small>
        </div>
      </div>
    `;
    msg.classList.remove("text-success");
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}







function openSustainabilityPopup() {
  const popup = document.getElementById("sustainabilityPopup");
  const content = document.querySelector(".popup-content");

  popup.style.display = "block";

  // Trigger slide-up animation
  setTimeout(() => {
    content.classList.add("show");
  }, 10);
}

function closeSustainabilityPopup() {
  const popup = document.getElementById("sustainabilityPopup");
  const content = document.querySelector(".popup-content");

  content.classList.remove("show");

  // Hide popup after animation completes
  setTimeout(() => {
    popup.style.display = "none";
  }, 600);
}

// Optional: close popup when clicking outside the content
window.onclick = function(event) {
  const popup = document.getElementById("sustainabilityPopup");
  if (event.target === popup) {
    closeSustainabilityPopup();
  }
}


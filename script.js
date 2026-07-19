document.getElementById("year").textContent = new Date().getFullYear();

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// TODO(payment-provider): replace with real Stripe Checkout (Stripe Tax enabled).
// Stripe: redirect to a Checkout Session URL created server-side, e.g.
//   window.location = "https://checkout.stripe.com/pay/cs_..."
// Until a provider is wired in, buy buttons explain what's next instead of
// linking nowhere.
document.querySelectorAll(".faq-item").forEach((item) => {
  const trigger = item.querySelector(".faq-trigger");
  trigger.addEventListener("click", () => {
    const wasOpen = item.getAttribute("data-state") === "open";
    document.querySelectorAll(".faq-item").forEach((other) => {
      other.setAttribute("data-state", "closed");
      other.querySelector(".faq-trigger").setAttribute("aria-expanded", "false");
    });
    if (!wasOpen) {
      item.setAttribute("data-state", "open");
      trigger.setAttribute("aria-expanded", "true");
    }
  });
});

document.querySelectorAll(".buy-link").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Checkout isn't wired up yet — this button will open purchase once payment processing is connected.");
  });
});

document.querySelectorAll(".download-link").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Download link goes here once a release build is published.");
  });
});

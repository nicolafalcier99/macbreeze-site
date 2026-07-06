document.getElementById("year").textContent = new Date().getFullYear();

// TODO(payment-provider): replace with real Paddle or Lemon Squeezy checkout.
// Paddle: Paddle.Checkout.open({ items: [{ priceId: "..." }] })
// Lemon Squeezy: link directly to your product's checkout URL.
// Until a provider is wired in, buy buttons explain what's next instead of
// linking nowhere.
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

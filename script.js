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

// Stripe Payment Links, one per product. Stripe hosts the checkout page, collects the
// buyer's email, and fires checkout.session.completed at the license server, which is what
// actually issues and emails the key.
const PAYMENT_LINKS = {
  single: "https://buy.stripe.com/28E9AM6MP0543mt5XrdnW00",
  pack4: "https://buy.stripe.com/3cI6oA9Z12dc3mt4TndnW01",
};

document.querySelectorAll(".buy-link").forEach((el) => {
  el.addEventListener("click", (e) => {
    const url = PAYMENT_LINKS[el.dataset.product];
    if (!url) return; // Unknown product: leave the link alone rather than sending someone nowhere.
    e.preventDefault();
    window.location.href = url;
  });
});

// Served from this site rather than from the GitHub release. The release's own
// /releases/latest/download/ URL depends on the asset being named exactly right, and a release
// published with a versioned filename silently turned the download button into a 404 while the
// release page itself looked perfectly fine. This path is a plain file in this repo: if it is
// wrong, it is wrong visibly, and it is fixed by pushing a commit.
const DOWNLOAD_URL = "https://macbreeze.app/latest/MacBreeze.dmg";

document.querySelectorAll(".download-link").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = DOWNLOAD_URL;
  });
});

document.querySelectorAll(".tour-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tour;
    document.querySelectorAll(".tour-tab").forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    // On phones the tabs are a horizontal strip; keep the chosen one in view.
    tab.scrollIntoView({ block: "nearest", inline: "nearest" });
    document.querySelectorAll(".tour-image").forEach((img) => {
      img.hidden = img.dataset.tourImage !== target;
    });
  });
});

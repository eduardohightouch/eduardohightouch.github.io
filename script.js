// Hightouch Browser SDK demo — event collection page (index.html)
// Uses the global window.htevents object created by the snippet in <head>.

(function () {
  "use strict";

  var logPanel = document.getElementById("event-log");

  function clearLogPlaceholder() {
    var empty = logPanel.querySelector(".log-empty");
    if (empty) {
      empty.remove();
    }
  }

  function logEvent(label, payload) {
    clearLogPlaceholder();

    var entry = document.createElement("div");
    entry.className = "log-entry";

    var meta = document.createElement("div");
    meta.className = "log-meta";
    meta.textContent = new Date().toLocaleTimeString() + " — " + label;

    var body = document.createElement("pre");
    body.textContent = JSON.stringify(payload, null, 2);
    body.style.margin = "0.35rem 0 0";

    entry.appendChild(meta);
    entry.appendChild(body);
    logPanel.insertBefore(entry, logPanel.firstChild);
  }

  function track(event, properties, context) {
    properties = properties || {};
    context = context || {};

    window.htevents.track(event, properties, context, function () {
      logEvent("track(\"" + event + "\") — callback fired", {
        event: event,
        properties: properties,
        context: context,
        timestamp: new Date().toISOString()
      });
    });
  }

  document.getElementById("btn-signup").addEventListener("click", function () {
    track("Sign Up Clicked", { plan: "pro", location: "hero" });
  });

  document.getElementById("btn-cart").addEventListener("click", function () {
    track("Add to Cart", { product_id: "SKU-123", price: 49.99 });
  });

  document.getElementById("btn-video").addEventListener("click", function () {
    track("Video Played", { title: "Product Overview" });
  });

  document.getElementById("btn-download").addEventListener("click", function () {
    track("Download Guide", { format: "pdf" });
  });

  document.getElementById("btn-identify").addEventListener("click", function () {
    var userId = document.getElementById("input-userid").value.trim();
    var email = document.getElementById("input-email").value.trim();

    if (!userId) {
      logEvent("identify() skipped — no User ID entered", { userId: userId, email: email });
      return;
    }

    var traits = { email: email };

    window.htevents.identify(userId, traits, {}, function () {
      logEvent("identify(\"" + userId + "\") — callback fired", {
        userId: userId,
        traits: traits,
        timestamp: new Date().toISOString()
      });
    });
  });

  document.getElementById("btn-reset").addEventListener("click", function () {
    window.htevents.reset();
    logEvent("reset()", {
      note: "Cleared identified user and anonymous ID.",
      timestamp: new Date().toISOString()
    });
  });

  document.getElementById("btn-clear-log").addEventListener("click", function () {
    logPanel.innerHTML = "<span class=\"log-empty\">No events yet — click a button above.</span>";
  });
})();

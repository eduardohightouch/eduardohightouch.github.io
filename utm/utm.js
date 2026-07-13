// Hightouch Browser SDK demo — Campaign Attribution / UTM page (utm/index.html)
// Uses the global window.htevents object created by the snippet in <head>.

(function () {
  "use strict";

  var UTM_FIELDS = [
    { param: "utm_campaign", campaignField: "campaign.name" },
    { param: "utm_source", campaignField: "campaign.source" },
    { param: "utm_medium", campaignField: "campaign.medium" },
    { param: "utm_content", campaignField: "campaign.content" },
    { param: "utm_term", campaignField: "campaign.term" }
  ];

  var EXAMPLE_LINK_SETS = [
    {
      label: "Newsletter campaign",
      params: {
        utm_campaign: "summer_sale",
        utm_source: "newsletter",
        utm_medium: "email"
      }
    },
    {
      label: "Paid search campaign",
      params: {
        utm_campaign: "spring_launch",
        utm_source: "google",
        utm_medium: "cpc",
        utm_term: "browser+sdk",
        utm_content: "headline_a"
      }
    },
    {
      label: "Social campaign",
      params: {
        utm_campaign: "product_hunt_launch",
        utm_source: "twitter",
        utm_medium: "social",
        utm_content: "launch_thread"
      }
    }
  ];

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

  function getUtmParamsFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var found = {};
    UTM_FIELDS.forEach(function (field) {
      var value = params.get(field.param);
      if (value) {
        found[field.param] = value;
      }
    });
    return found;
  }

  function renderUtmTable(found) {
    var tbody = document.getElementById("utm-table-body");
    tbody.innerHTML = "";

    var hasAny = Object.keys(found).length > 0;

    UTM_FIELDS.forEach(function (field) {
      var value = found[field.param];
      var row = document.createElement("tr");

      var paramCell = document.createElement("td");
      paramCell.innerHTML = "<code>" + field.param + "</code>";

      var valueCell = document.createElement("td");
      valueCell.textContent = value ? value : "—";

      var mappingCell = document.createElement("td");
      mappingCell.innerHTML = "<code>" + field.campaignField + "</code>";

      row.appendChild(paramCell);
      row.appendChild(valueCell);
      row.appendChild(mappingCell);
      tbody.appendChild(row);
    });

    return hasAny;
  }

  function buildExampleLinks() {
    var container = document.getElementById("example-links");
    container.innerHTML = "";

    EXAMPLE_LINK_SETS.forEach(function (set) {
      var query = new URLSearchParams(set.params).toString();
      var href = window.location.pathname + "?" + query;

      var link = document.createElement("a");
      link.href = href;
      link.textContent = set.label + " → ?" + query;
      container.appendChild(link);
    });
  }

  function init() {
    var found = getUtmParamsFromUrl();
    var hasAny = renderUtmTable(found);
    buildExampleLinks();

    if (hasAny) {
      logEvent("Automatic page() call — UTM params auto-captured into context.campaign", {
        note: "The snippet's automatic page() call (fired in <head> before this script ran) " +
          "carried these UTM params mapped into context.campaign.",
        detectedParams: found
      });
    } else {
      logEvent("Automatic page() call — no UTM params in URL", {
        note: "No utm_* query params were present on load, so context.campaign was not " +
          "populated by auto-capture this time. Try one of the example links below."
      });
    }

    document.getElementById("btn-manual-campaign").addEventListener("click", function () {
      var campaign = {
        name: "TPS Innovation Newsletter",
        source: "Newsletter",
        medium: "email",
        term: "tps reports",
        content: "image link"
      };

      window.htevents.page("UTM Demo", {}, { campaign: campaign }, function () {
        logEvent("page(\"UTM Demo\") — explicit context.campaign — callback fired", {
          page: "UTM Demo",
          properties: {},
          context: { campaign: campaign },
          timestamp: new Date().toISOString()
        });
      });
    });

    document.getElementById("btn-clear-log").addEventListener("click", function () {
      logPanel.innerHTML = "<span class=\"log-empty\">No events yet.</span>";
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();

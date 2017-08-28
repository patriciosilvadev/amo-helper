function hideElement(node, value=true) {
  if (value) {
    node.setAttribute("hidden", "true");
  } else {
    node.removeAttribute("hidden");
  }
}

function setupMenuClick() {
  let menu = document.getElementById("menu");
  menu.addEventListener("click", (event) => {
    if (event.target.localName != "a") {
      return;
    }

    let href = event.target.getAttribute("href");
    let promise = Promise.resolve();

    if (href.startsWith("#")) {
      promise = browser.runtime.sendMessage({ action: "popup-action-" + href.substr(1) });
    } else {
      promise = browser.tabs.create({ url: event.target.getAttribute("href") });
    }

    promise.then(() => window.close());
    event.preventDefault();
  });
}

function setupMenuState() {
  // set up switch action
  browser.tabs.query({ active: true, currentWindow: true }).then(([tab, ...rest]) => {
    let RE_ADDON_LINKS = /https:\/\/addons.mozilla.org\/([^/]*)\/(editors\/review(|-listed|-unlisted)|admin\/addon\/manage|[^/]*\/addon|developers\/feed)\/([^/#?]*)(\/edit)?/;
    hideElement(document.getElementById("page-action-gotoreview"), !tab.url.match(RE_ADDON_LINKS));
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setupMenuClick();
  setupMenuState();
});

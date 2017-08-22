const DEFAULT_DANGEROUS_PERMISSIONS = [
  "cookies",
  "history",
  "logins",
  "nativeMessaging"
].join(", ");

const DEFAULT_DANGEROUS_MESSAGES = [
  "outerHTML",
  "insertAdjacentHTML",
  "innerHTML",
  "eval"
].join(", ");

// https://davidwalsh.name/javascript-debounce-function
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    let later = () => {
      timeout = null;
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (!timeout) {
      func.apply(this, args);
    }
  };
}

function restore_options() {
  chrome.storage.local.get({
    "is-admin": false,
    "tabclose-other-queue": true,
    "tabclose-review-child": true,
    "queueinfo-use-diff": false,
    "queueinfo-show-weeklines": false,
    "queueinfo-per-page": 100,
    "omnibox-enabled": true,
    "browseraction-queue-refresh-period": 60,
    "browseraction-count-moderator": false,
    "canned-use-stock": true,
    "canned-include-body": true,
    "reviewinfo-dangerous-permissions": DEFAULT_DANGEROUS_PERMISSIONS,
    "reviewinfo-dangerous-messages": DEFAULT_DANGEROUS_MESSAGES,
    "reviewinfo-show-permissions": false,
    "reviewinfo-show-validator": false,
    "reviewtimer-display": true,
    "reviewtimer-notify-interval": 10,
    "translation-secret-key": "",
    "tinderbar-show": false,
    "tinderbar-approve-text": "Thank you for your contribution. This version has been approved using a streamlined review process.",
    "tinderbar-preload-tabs": 3,
    "filewindow-enabled": false
  }, (prefs) => {
    document.documentElement.classList.toggle("is-admin", prefs["is-admin"]);
    document.getElementById("tabclose-other-queue").checked = prefs["tabclose-other-queue"];
    document.getElementById("tabclose-review-child").checked = prefs["tabclose-review-child"];
    document.getElementById("queueinfo-use-diff").checked = prefs["queueinfo-use-diff"];
    document.getElementById("queueinfo-show-weeklines").checked = prefs["queueinfo-show-weeklines"];
    document.getElementById("queueinfo-per-page").value = prefs["queueinfo-per-page"];
    document.getElementById("omnibox-enabled").checked = prefs["omnibox-enabled"];
    document.getElementById("browseraction-count-moderator").value = prefs["browseraction-count-moderator"];
    document.getElementById("browseraction-queue-refresh-period").value = prefs["browseraction-queue-refresh-period"];
    document.getElementById("canned-use-stock").checked = prefs["canned-use-stock"];
    document.getElementById("canned-include-body").checked = prefs["canned-include-body"];
    document.getElementById("reviewinfo-dangerous-permissions").value = prefs["reviewinfo-dangerous-permissions"];
    document.getElementById("reviewinfo-dangerous-messages").value = prefs["reviewinfo-dangerous-messages"];
    document.getElementById("reviewinfo-show-permissions").checked = prefs["reviewinfo-show-permissions"];
    document.getElementById("reviewinfo-show-validator").checked = prefs["reviewinfo-show-validator"];
    document.getElementById("reviewtimer-display").checked = prefs["reviewtimer-display"];
    document.getElementById("reviewtimer-notify-interval").value = prefs["reviewtimer-notify-interval"];
    document.getElementById("translation-secret-key").value = prefs["translation-secret-key"];
    document.getElementById("tinderbar-show").checked = prefs["tinderbar-show"];
    document.getElementById("tinderbar-approve-text").value = prefs["tinderbar-approve-text"];
    document.getElementById("tinderbar-preload-tabs").value = prefs["tinderbar-preload-tabs"];
    document.getElementById("filewindow-enabled").checked = prefs["filewindow-enabled"];
  });
}

function change_options(event) {
  let node = event.target;
  if (!node.id) {
    return;
  }

  if (node.getAttribute("type") == "checkbox") {
    chrome.storage.local.set({ [node.id]: node.checked });
  } else if (node.getAttribute("type") == "number") {
    chrome.storage.local.set({ [node.id]: parseInt(node.value, 10) });
  } else if (node.localName == "input") {
    chrome.storage.local.set({ [node.id]: node.value });
  }
}

var save_canned_responses = debounce(() => {
  let select = document.getElementById("canned-select");

  let options = [...select.options];
  options.pop();

  let canned = options.map((option) => ({ label: option.textContent, value: option.value }));
  chrome.storage.local.set({ "canned-responses": canned });
}, 500);


function setup_canned_listeners() {
  function copyNewOption() {
    let newOption = document.querySelector("#canned .canned-option-new");
    let clone = newOption.cloneNode(true);
    newOption.className = "";
    select.appendChild(clone);
  }

  function updateState() {
    let selectedItem = select.options[select.selectedIndex];
    let isNewItem = selectedItem.className == "canned-option-new";

    button.disabled = isNewItem;

    if (isNewItem) {
      value.value = "";
      label.value = "";
      label.setAttribute("placeholder", selectedItem.textContent);
    } else {
      value.value = selectedItem.value;
      label.value = selectedItem.textContent;
      label.removeAttribute("placeholder");
    }
  }

  let select = document.getElementById("canned-select");
  let label = document.getElementById("canned-label");
  let value = document.getElementById("canned-value");
  let button = document.getElementById("canned-delete");

  select.addEventListener("change", updateState);

  label.addEventListener("keyup", (event) => {
    let selectedItem = select.options[select.selectedIndex];
    if (selectedItem.className == "canned-option-new") {
      copyNewOption();
    }

    selectedItem.textContent = label.value;
    save_canned_responses();
  });

  value.addEventListener("keyup", (event) => {
    let selectedItem = select.options[select.selectedIndex];
    if (selectedItem.className == "canned-option-new") {
      copyNewOption();
    }

    selectedItem.value = value.value;
    save_canned_responses();
  });

  button.addEventListener("click", (event) => {
    let selectedItem = select.options[select.selectedIndex];
    let next = selectedItem.nextElementSibling || selectedItem.previousElementSibling;
    selectedItem.remove();
    select.value = next.value;
    updateState();
    save_canned_responses();
  });

  chrome.storage.local.get({ "canned-responses": [] }, (prefs) => {
    let newOption = document.querySelector("#canned .canned-option-new");
    for (let optionData of prefs["canned-responses"]) {
      let option = document.createElement("option");
      option.textContent = optionData.label;
      option.value = optionData.value;
      select.insertBefore(option, newOption);
    }

    select.selectedIndex = 0;
    updateState();
  });
}

function setup_filewindow_listeners() {
  let resetButton = document.getElementById("filewindow-position-reset");

  resetButton.addEventListener("click", (event) => {
    browser.storage.local.set({ "filewindow-position": {} });
    resetButton.disabled = true;
  });
}

document.addEventListener("DOMContentLoaded", restore_options);
document.addEventListener("DOMContentLoaded", setup_canned_listeners);
document.addEventListener("DOMContentLoaded", setup_filewindow_listeners);
document.body.addEventListener("change", change_options);

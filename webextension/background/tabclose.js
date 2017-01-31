"use strict";

const REVIEW_RE = /https:\/\/addons.mozilla.org\/([^\/]+)\/editors\/review\/(.*)/;
const QUEUE_RE = /https:\/\/addons.mozilla.org\/([^\/]+)\/editors\/queue\/(.*)/;

// const FILEBROWSER_MATCH = "https://addons.mozilla.org/en-US/firefox/files/browse/*";
// const COMPARE_MATCH = "https://addons.mozilla.org/en-US/firefox/files/compare/*";

let tabsToClose = {};
let reviewPages = {};

function removeTabsFor(tabId, addonid, closeTabs) {
  if (tabsToClose[addonid]) {
    if (closeTabs) {
      chrome.tabs.remove(Object.keys(tabsToClose[addonid]).map(Number));
    }
    delete tabsToClose[addonid];
  }

  delete reviewPages[tabId];

  /* It would be so simple if openerTabId was supported
  // The closing tab is a review, find all opening tabs
  chrome.tabs.query({ url: [FILEBROWSER_MATCH, COMPARE_MATCH] }, (compareTabs) => {
    let tabsToClose = compareTabs.filter(tab => tab.openerTabId == tabId);
    chrome.tabs.remove(tabsToClose.map(tab => tab.id));
  });
  */
}

function copyScrollPosition(from, to) {
  return new Promise((resolve) => {
    sdk.tabs.sendMessage(from.id, { action: "getScrollPosition" }, (data) => {
      data.action = "setScrollPosition";
      sdk.tabs.sendMessage(to.id, data, resolve);
    });
  });
}

function removeOtherTabs(tabUrl, keepTab) {
  let findTabUrl = tabUrl.split(/\?|#/)[0] + "*";
  chrome.tabs.query({ url: findTabUrl }, (compareTabs) => {
    let closingActiveTab = null;
    let closeTabs = compareTabs.filter(tab => {
      let shouldClose = tab.id != keepTab.id;
      if (shouldClose && tab.active) {
        closingActiveTab = tab;
      }
      return shouldClose;
    });

    let promise = Promise.resolve();
    if (closingActiveTab) {
      promise = copyScrollPosition(closingActiveTab, keepTab).then(() => {
        chrome.tabs.update(keepTab.id, { active: true });
      });
    }
    promise.then(() => {
      chrome.tabs.remove(closeTabs.map(tab => tab.id));
    });
  });
}

sdk.runtime.onMessage.addListener((data, sender, sendReply) => {
  chrome.storage.local.get({ closeReviewChild: true }, (prefs) => {
    if (data.action == "addonid") {
      if (!(data.addonid in tabsToClose)) {
        tabsToClose[data.addonid] = {};
      }
      tabsToClose[data.addonid][sender.tab.id] = true;
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  chrome.storage.local.get({
    "tabclose-other-queue": true,
    "tabclose-review-child": true
  }, (prefs) => {
    let isReview = tab.url.match(REVIEW_RE);
    let isQueue = tab.url.match(QUEUE_RE);

    if (isReview) {
      reviewPages[tabId] = isReview[2];
    } else if (isQueue) {
      if (tabId in reviewPages) {
        removeTabsFor(tabId, reviewPages[tabId], prefs["tabclose-review-child"]);
      }

      if (changeInfo.status == "complete" && prefs["tabclose-other-queue"]) {
        removeOtherTabs(tab.url, tab);
      }
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  chrome.storage.local.get({ closeReviewChild: true }, (prefs) => {
    chrome.tabs.get(tabId, (tab) => {
      let matches = tab.url.match(REVIEW_RE);
      if (matches) {
        removeTabsFor(tabId, matches[2], prefs.closeReviewChild);
      }
    });
  });
});

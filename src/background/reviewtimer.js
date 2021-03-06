/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

let mostActiveReview = null;
let mostActiveTab = null;

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.action != "reviewtimer-notify" || data.slug != mostActiveReview) {
    return;
  }

  let minutes = (data.seconds / 60) | 0;

  browser.notifications.create("reviewtimer", {
    type: "basic",
    iconUrl: "images/addon.svg",
    title: data.name,
    message: `You have been reviewing for ${minutes} minute${minutes > 0 ? "s" : ""}`,
    isClickable: true
  });
});

browser.tabs.onActivated.addListener((activeInfo) => {
  browser.tabs.get(activeInfo.tabId, (tab) => {
    let isReview = tab.url ? tab.url.match(REVIEW_RE) : null;
    if (isReview) {
      mostActiveReview = isReview[4];
      mostActiveTab = tab;
    }
  });
});

browser.notifications.onClicked.addListener((notificationId) => {
  browser.tabs.update(mostActiveTab.id, { active: true });
  browser.windows.update(mostActiveTab.windowId, { focused: true });
});

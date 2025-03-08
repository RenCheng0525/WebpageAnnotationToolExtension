// Background script
// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // If the message is to toggle drawing mode
  if (message.action === "toggleDrawing") {
    // Forward the message to the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleDrawing" });
      }
    });
  }
  
  // Handle color change message
  if (message.action === "changeColor") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: "changeColor",
          colorIndex: message.colorIndex
        });
      }
    });
  }
  
  // Handle show highlights message
  if (message.action === "showHighlights") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "showHighlights" });
      }
    });
  }
  
  // Handle language change message
  if (message.action === "changeLanguage") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: "changeLanguage",
          language: message.language
        });
      }
    });
  }
  
  return true; // Required for async response
});
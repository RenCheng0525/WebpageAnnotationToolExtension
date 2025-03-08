// Popup script for the Webpage Annotation Tool extension

// When the popup loads, set up event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Language switching functionality
  const enButton = document.getElementById('en-lang');
  const zhButton = document.getElementById('zh-lang');
  
  // Set default language from storage or default to English
  chrome.storage.local.get(['language'], function(result) {
    const currentLanguage = result.language || 'en';
    setLanguage(currentLanguage);
  });
  
  // English button click
  enButton.addEventListener('click', function() {
    setLanguage('en');
    saveLanguagePreference('en');
  });
  
  // Chinese button click
  zhButton.addEventListener('click', function() {
    setLanguage('zh');
    saveLanguagePreference('zh');
  });
  
  // Function to set the language
  function setLanguage(lang) {
    // Update active button
    if (lang === 'en') {
      enButton.classList.add('active');
      zhButton.classList.remove('active');
    } else {
      zhButton.classList.add('active');
      enButton.classList.remove('active');
    }
    
    // Update all text elements with data-en and data-zh attributes
    document.querySelectorAll('[data-' + lang + ']').forEach(function(element) {
      element.textContent = element.getAttribute('data-' + lang);
    });
  }
  
  // Save language preference
  function saveLanguagePreference(lang) {
    chrome.storage.local.set({ language: lang }, function() {
      // Notify content script about language change
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          chrome.runtime.sendMessage({ 
            action: "changeLanguage", 
            language: lang 
          });
        }
      });
    });
  }
  
  // Get the activate drawing button
  const activateDrawingButton = document.getElementById('activate-drawing');
  
  // Add click event listener to the button
  activateDrawingButton.addEventListener('click', function() {
    // Send a message to the background script to toggle drawing mode
    chrome.runtime.sendMessage({ action: "toggleDrawing" });
    
    // Close the popup after activating
    window.close();
  });
  
  // Check if we're on a supported page
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    // If we have an active tab
    if (tabs[0]) {
      // Check if the URL is supported (all URLs except chrome:// URLs)
      const currentUrl = tabs[0].url;
      const isSupported = !currentUrl.startsWith('chrome://') && 
                         !currentUrl.startsWith('chrome-extension://') &&
                         !currentUrl.startsWith('chrome-search://');
      
      // If not supported, disable the buttons and show a message
      if (!isSupported) {
        activateDrawingButton.disabled = true;
        activateDrawingButton.style.backgroundColor = "#ccc";
        activateDrawingButton.style.cursor = "not-allowed";
        
        // Add a message explaining why it's disabled
        const messageElement = document.createElement('p');
        
        chrome.storage.local.get(['language'], function(result) {
          const currentLanguage = result.language || 'en';
          
          if (currentLanguage === 'en') {
            messageElement.textContent = "Annotation tools cannot be used on Chrome system pages.";
            activateDrawingButton.textContent = "Not available on this page";
          } else {
            messageElement.textContent = "無法在Chrome系統頁面上使用標註工具。";
            activateDrawingButton.textContent = "此頁面不可用";
          }
        });
        
        messageElement.style.color = "#d32f2f";
        messageElement.style.fontSize = "12px";
        messageElement.style.marginTop = "10px";
        
        // Add the message before the activate button
        activateDrawingButton.parentNode.insertBefore(messageElement, activateDrawingButton);
      }
    }
  });
});
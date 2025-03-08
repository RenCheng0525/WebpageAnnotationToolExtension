// Content script - this runs in the context of the web page

// Store UI text translations
const uiTranslations = {
  en: {
    pen: "Pen",
    arrow: "Arrow",
    highlight: "Highlight",
    eraser: "Eraser",
    viewHighlights: "📋",
    clear: "🧹",
    close: "❌",
    highlightsTitle: "Highlights on this page",
    textHighlighted: "Text highlighted",
    closeBtn: "Close"
  },
  zh: {
    pen: "筆",
    arrow: "箭頭",
    highlight: "標註",
    eraser: "橡皮",
    viewHighlights: "📋",
    clear: "🧹",
    close: "❌",
    highlightsTitle: "此頁面上的標註",
    textHighlighted: "文字已標註",
    closeBtn: "關閉"
  }
};

// Current language
let currentLanguage = 'en';

// Function to display all highlights in a popup
function displayHighlightsPopup() {
  chrome.storage.local.get(['highlights'], function (result) {
    const allHighlights = result.highlights || [];
    // Filter for current URL only
    const highlights = allHighlights.filter(hl => hl.url === window.location.href);

    const popup = document.createElement('div');
    popup.id = 'displayHighlightsPopUp';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.width = '600px';
    popup.style.height = '400px';
    popup.style.backgroundColor = 'white';
    popup.style.color = 'black';
    popup.style.boxShadow = '0 3px 14px rgba(0, 0, 0, 0.3)';
    popup.style.border = '1px solid #ccc';
    popup.style.borderRadius = '8px';
    popup.style.padding = '10px';
    popup.style.zIndex = '10000001';
    popup.style.overflowY = 'scroll';
    popup.style.userSelect = 'none'; // Disable text selection
    popup.style.fontFamily = 'Arial, sans-serif'; // Match drawing-box font

    popup.innerHTML = `<h3>${uiTranslations[currentLanguage].highlightsTitle}</h3><ul></ul>`;
    const list = popup.querySelector('ul');
    list.style.listStyleType = 'none';
    list.style.padding = '0';

    highlights.forEach((hl, index) => {
      const listItem = document.createElement('li');
      listItem.style.padding = '8px';
      listItem.style.margin = '5px 0';
      listItem.style.borderRadius = '4px';
      listItem.style.backgroundColor = '#f5f5f5';
      listItem.style.display = 'flex';
      listItem.style.justifyContent = 'space-between';
      listItem.style.alignItems = 'center';

      const textSpan = document.createElement('span');
      textSpan.innerHTML = `<b>${new Date(hl.timestamp).toLocaleString()}</b>: <span style="background-color:${hl.color}">${hl.text}</span>`;
      textSpan.style.flex = '1';
      textSpan.style.cursor = 'pointer';
      textSpan.onclick = () => {
        const parentElement = getElementByXPath(hl.parentPath);
        if (parentElement) {
          parentElement.scrollIntoView({ behavior: 'smooth' });
          flashingElement(parentElement, hl.color);
          document.body.removeChild(popup);
        } else {
          console.error('Element not found for XPath:', hl.parentPath);
        }
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.innerText = 'X';
      deleteBtn.style.border = 'none';
      deleteBtn.style.background = '#ff4d4d';
      deleteBtn.style.color = 'white';
      deleteBtn.style.borderRadius = '50%';
      deleteBtn.style.width = '24px';
      deleteBtn.style.height = '24px';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.onclick = (event) => {
        event.stopPropagation();
        deleteHighlight(index);
        document.body.removeChild(popup);
      };

      listItem.appendChild(textSpan);
      listItem.appendChild(deleteBtn);
      list.appendChild(listItem);
    });

    // Add button container for the controls
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.marginTop = '15px';

    // Close button
    const closeButton = document.createElement('button');
    closeButton.innerText = uiTranslations[currentLanguage].closeBtn;
    closeButton.style.padding = '5px 15px';
    closeButton.style.backgroundColor = '#4285f4';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => {
      document.body.removeChild(popup);
    };

    // Clear all highlights button
    const clearAllButton = document.createElement('button');
    clearAllButton.innerText = currentLanguage === 'en' ? 'Clear All Highlights' : '清除所有標註';
    clearAllButton.style.padding = '5px 15px';
    clearAllButton.style.backgroundColor = '#f44336';
    clearAllButton.style.color = 'white';
    clearAllButton.style.border = 'none';
    clearAllButton.style.borderRadius = '4px';
    clearAllButton.style.cursor = 'pointer';
    clearAllButton.onclick = () => {
      if (confirm(currentLanguage === 'en' ?
        'Are you sure you want to clear all highlights on this page?' :
        '您確定要清除此頁面上的所有標註嗎？')) {

        // Remove all highlights from DOM
        document.querySelectorAll('.highlighted').forEach(el => {
          const parent = el.parentNode;
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
        });

        // Remove highlights from storage
        chrome.storage.local.get(['highlights'], function (result) {
          let highlights = result.highlights || [];

          // Remove highlights for current URL
          highlights = highlights.filter(hl => hl.url !== window.location.href);

          // Save updated highlights list
          chrome.storage.local.set({ highlights: highlights }, function () {
            console.log('All highlights cleared for this page');
          });
        });

        // Close the popup
        document.body.removeChild(popup);
      }
    };

    // Add buttons to the container
    buttonContainer.appendChild(clearAllButton);
    buttonContainer.appendChild(closeButton);

    // Add button container to popup
    popup.appendChild(buttonContainer);

    document.body.appendChild(popup);
  });
}

// Create and inject the drawing button and UI elements
function injectDrawingElements() {
  // Create the floating drawing button
  const drawingButton = document.createElement('button');
  drawingButton.id = 'start-drawing';
  drawingButton.className = 'drawing-extension-button';
  drawingButton.innerHTML = '<span></span>';

  // Create container for drawing UI
  const drawingContainer = document.createElement('div');
  drawingContainer.className = 'drawing-extension-container';

  // Create required elements for drawing
  const drawingCover = document.createElement('div');
  drawingCover.id = 'drawing-cover';

  const drawingLayer = document.createElement('div');
  drawingLayer.id = 'drawing-layer';

  // Create the drawing box with text labels for tools
  const drawingBox = document.createElement('div');
  drawingBox.id = 'drawing-box';
  drawingBox.innerHTML = `
    <div class="tools">
      <button data-tool="freeHand" data-current="true"><span>${uiTranslations[currentLanguage].pen}</span></button>
      <button data-tool="arrow"><span>${uiTranslations[currentLanguage].arrow}</span></button>
      <button data-tool="eraser"><span>${uiTranslations[currentLanguage].eraser}</span></button>
      <button data-tool="highlight"><span>${uiTranslations[currentLanguage].highlight}</span></button>
    </div>
    <div class="colors">
      <div data-color="white" data-rColor="white"></div>
      <div data-color="black" data-rColor="#544141"></div>
      <div data-color="red" data-rColor="#d83030" data-current="true"></div>
      <div data-color="green" data-rColor="#30d97d"></div>
      <div data-color="orange" data-rColor="#ff9000"></div>
      <div data-color="yellow" data-rColor="#f3f326"></div>
    </div>
    <div class="highlight-actions">
      <div class="view-highlights" title="View All Highlights">${uiTranslations[currentLanguage].viewHighlights}</div>
    </div>
    <div class="clear" title="Clear All Drawings">
      ${uiTranslations[currentLanguage].clear}
    </div>
    <div class="close" title="Close Drawing Tools">
      ${uiTranslations[currentLanguage].close}
    </div>
  `;

  // Append elements to container
  drawingContainer.appendChild(drawingButton);
  drawingContainer.appendChild(drawingCover);
  drawingContainer.appendChild(drawingLayer);
  drawingContainer.appendChild(drawingBox);

  // Inject container into the page
  document.body.appendChild(drawingContainer);

  // Get language preference from storage
  chrome.storage.local.get(['language'], function (result) {
    if (result.language) {
      currentLanguage = result.language;
      updateUILanguage();
    }
  });

  // Initialize the drawing functionality
  initializeDrawingTools();
}

// Update UI text based on language
function updateUILanguage() {
  const translations = uiTranslations[currentLanguage];

  // Update tool buttons
  document.querySelector('[data-tool="freeHand"] span').textContent = translations.pen;
  document.querySelector('[data-tool="arrow"] span').textContent = translations.arrow;
  document.querySelector('[data-tool="highlight"] span').textContent = translations.highlight;
  document.querySelector('[data-tool="eraser"] span').textContent = translations.eraser;

  // Update other controls
  document.querySelector('.view-highlights').textContent = translations.viewHighlights;
  document.querySelector('.clear').textContent = translations.clear;
  document.querySelector('.close').textContent = translations.close;
}

// Flash an element to help locate it
function flashingElement(element, color) {
  const originalBackgroundColor = element.style.backgroundColor;
  element.style.backgroundColor = color;
  setTimeout(() => {
    element.style.backgroundColor = originalBackgroundColor;
  }, 1000);
}

// Function to delete a highlight from DOM and storage
function deleteHighlight(index) {
  chrome.storage.local.get(['highlights'], function (result) {
    let highlights = result.highlights || [];
    // Filter for current URL
    const currentUrlHighlights = highlights.filter(hl => hl.url === window.location.href);

    if (index >= 0 && index < currentUrlHighlights.length) {
      // Get highlight to delete
      const deletedHighlight = currentUrlHighlights[index];

      // Remove from DOM
      removeHighlight(deletedHighlight.parentPath, deletedHighlight.text);

      // Remove from storage
      highlights = highlights.filter(hl =>
        !(hl.url === deletedHighlight.url &&
          hl.text === deletedHighlight.text &&
          hl.parentPath === deletedHighlight.parentPath)
      );

      chrome.storage.local.set({ highlights: highlights }, function () {
        console.log("Highlight deleted");
      });
    }
  });
}

// Remove highlight from DOM
function removeHighlight(parentPath, text) {
  const parentElement = getElementByXPath(parentPath);
  if (parentElement) {
    const highlights = Array.from(parentElement.querySelectorAll('.highlighted'));
    const span = highlights.find(span => span.textContent.includes(text));
    if (span) {
      while (span.firstChild) {
        parentElement.insertBefore(span.firstChild, span);
      }
      parentElement.removeChild(span);
    }
  }
}

// Get element by XPath
function getElementByXPath(xpath) {
  try {
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  } catch (e) {
    console.error("Error evaluating XPath:", xpath, e);
    return null;
  }
}

// Get element XPath
function getElementXPath(element) {
  const paths = [];
  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = element.previousSibling;
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    const tagName = element.nodeName.toLowerCase();
    const pathIndex = index ? `[${index + 1}]` : '';
    paths.unshift(`${tagName}${pathIndex}`);
    element = element.parentNode;
  }
  return paths.length ? `/${paths.join('/')}` : null;
}

// Initialize the drawing functionality
function initializeDrawingTools() {
  // Ensure drawing layer is at root
  document.body.appendChild(document.getElementById('drawing-layer'));

  // Configuration object for drawing
  let config = {
    drawing: false,         // Set to true if we are drawing, false if we aren't
    tool: 'freeHand',       // The currently selected tool
    color: '#d83030',       // The currently selected colour (red as default)
    strokeWidth: 4,         // The width of the lines we draw
    configNormalisation: 4, // The average normalisation for pencil drawing
  };

  // Arrow tool configuration
  let arrow = {
    // topX, Y, and bottomX, Y store information on the arrows top and bottom ends
    topX: 0,
    topY: 0,
    bottomX: 0,
    bottomY: 0,
    activeDirection: 'se',                    // This is the current direction of the arrow, i.e. south-east
    arrowClasses: ['nw', 'ne', 'sw', 'se'], // These are possible arrow directions
    lineAngle: 0,                             // This is the angle the arrow point at about the starting point
  };

  // Free hand tool configuration
  let freeHand = {
    currentPathText: 'M0 0 ',      // This is the current path of the pencil line, in text
    topX: 0,                       // The starting X coordinate
    topY: 0,                       // The starting Y coordinate
    lastMousePoints: [[0, 0]],   // This is the current path of the pencil line, in array
  };

  // SVG element creation templates
  let svgEl = {
    arrowPath: (start, dimensions, path, dummy, direction, end, angle, hyp, id) =>
      `<div class="arrow drawing-el static current-item" data-id="${id}" data-direction="${direction}" 
        style="left: ${start[0]}px; top: ${start[1]}px; height: ${dimensions[1]}px; width: ${dimensions[0]}px;">
        <svg viewbox="0 0 ${dimensions[0]} ${dimensions[1]}">
            <defs>
                <marker id="arrow-head-${id}" class="arrow-resizer" markerWidth="10" markerHeight="10" refX="0" refY="3" 
                orient="auto" markerUnits="strokeWidth" viewBox="0 0 20 20">
                    <path d="M0 0 L0 6 L9 3 z" fill="${config.color}" />
                </marker>
            </defs>
            <path marker-start="url(#bottom-marker)" style="stroke: ${config.color}; stroke-width: ${config.strokeWidth}" marker-end="url(#arrow-head-${id})" class="arrow-line" d="${path}"></path>
        </svg>
    </div>`,
    drawPath: (start, dimensions, path, id) =>
      `<div class="free-hand drawing-el static current-item" data-id="${id}" style="left: ${start[0]}px; top: ${start[1]}px; height: ${dimensions[1]}px; width: ${dimensions[0]}px;">
        <svg viewbox="0 0 ${dimensions[0]} ${dimensions[1]}">			
            <path d="${path}" style="stroke: ${config.color}; stroke-width: ${config.strokeWidth}"></path>
        </svg>
    </div>`
  };

  // Setup highlight actions
  document.querySelector('.view-highlights').addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    displayHighlightsPopup();
  });

  // Helper functions
  let helper = {
    // This averages out a certain number of mouse movements for free hand drawing
    // To give our lines a smoother effect
    getAveragePoint: function (offset) {
      let len = freeHand.lastMousePoints.length;
      if (len % 2 === 1 || len >= 8) {
        let totalX = 0;
        let totalY = 0;
        let pt, i;
        let count = 0;
        for (i = offset; i < len; i++) {
          count++;
          pt = freeHand.lastMousePoints[i];
          totalX += pt[0];
          totalY += pt[1];
        }

        return {
          x: totalX / count,
          y: totalY / count
        };
      }
      return null;
    },
    // This calculates the angle and direction of a moving arrow
    calculateArrowLineAngle: function (lineEndX, lineEndY) {
      var calcLineEndX = lineEndX;
      var calcLineEndY = lineEndY;
      var angleStart = 90;
      var angle = 0;
      var a = calcLineEndX;
      var b = calcLineEndY;
      var c = Math.sqrt(Math.pow(lineEndX, 2) + Math.pow(lineEndY, 2));

      if (calcLineEndX <= 0 && calcLineEndY >= 0) {
        // quadrant 3
        angleStart = 180;
        angle = Math.asin(a / c) * -1 * (180 / Math.PI);
        arrow.activeDirection = arrow.arrowClasses[2];
      } else if (calcLineEndY <= 0 && calcLineEndX >= 0) {
        // quadrant 1
        angleStart = 0;
        angle = Math.asin(a / c) * (180 / Math.PI);
        arrow.activeDirection = arrow.arrowClasses[1];
      } else if (calcLineEndY <= 0 && calcLineEndX <= 0) {
        // quadrant 4
        angleStart = 270;
        angle = Math.asin(b / c) * -1 * (180 / Math.PI);
        arrow.activeDirection = arrow.arrowClasses[0];
      } else {
        // quadrant 2
        angleStart = 90;
        angle = Math.asin(b / c) * (180 / Math.PI);
        arrow.activeDirection = arrow.arrowClasses[3];
      }

      arrow.lineAngle = angle + angleStart;
    },

    // This generates a UUID for our drawn elements
    generateId: function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };

  // Event listeners

  // Manage Main UI - Add a pointerdown event for each color and tool
  ['data-rColor', 'data-tool'].forEach(function (i) {
    document.querySelectorAll(`[${i}]`).forEach(function (item) {
      item.addEventListener('pointerdown', function (e) {
        document.querySelectorAll(`[${i}]`).forEach(function (i) {
          i.setAttribute('data-current', false);
        });
        item.setAttribute('data-current', true);
        if (i == 'data-rColor') {
          config.color = item.getAttribute(i);
        } else if (i == 'data-tool') {
          config.tool = item.getAttribute(i);

          // Special handling for highlight tool
          if (config.tool === 'highlight') {
            // Change cursor style
            document.body.style.cursor = 'text';

            // Turn off drawing-cover to allow text selection
            const drawingCover = document.getElementById('drawing-cover');
            if (drawingCover) {
              drawingCover._originalPointerEvents = drawingCover.style.pointerEvents;
              drawingCover.style.pointerEvents = 'none';

              drawingCover._originalBackground = drawingCover.style.background;
              drawingCover.style.background = 'transparent';
            }

            // IMPORTANT: Also disable the drawing-layer to allow text selection underneath
            const drawingLayer = document.getElementById('drawing-layer');
            if (drawingLayer) {
              drawingLayer._originalPointerEvents = drawingLayer.style.pointerEvents;
              drawingLayer.style.pointerEvents = 'none';
            }
          } else {
            // Restore default cursor
            document.body.style.cursor = '';

            // Restore drawing-cover
            const drawingCover = document.getElementById('drawing-cover');
            if (drawingCover && drawingCover._originalPointerEvents !== undefined) {
              drawingCover.style.pointerEvents = drawingCover._originalPointerEvents;

              if (drawingCover._originalBackground !== undefined) {
                drawingCover.style.background = drawingCover._originalBackground;
              }
            }

            // Restore drawing-layer pointer events
            const drawingLayer = document.getElementById('drawing-layer');
            if (drawingLayer && drawingLayer._originalPointerEvents !== undefined) {
              drawingLayer.style.pointerEvents = drawingLayer._originalPointerEvents;
            } else if (drawingLayer) {
              // If we don't have a saved value, ensure it's enabled for drawing
              drawingLayer.style.pointerEvents = 'all';
            }
          }
        }
      });
    });
  });

  // Start/stop drawing button
  document.getElementById('start-drawing').addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    if (config.drawing === true) {
      config.drawing = false;
      document.body.setAttribute('data-drawing', false);
    } else {
      document.body.setAttribute('data-drawing', true);
      config.drawing = true;

      // Fix for problem #2: Make sure drawing-box is visible when we activate drawing
      const drawingBox = document.getElementById('drawing-box');
      if (drawingBox) {
        drawingBox.style.display = 'flex'; // Make it visible again
      }
    }
  });

  // Close drawing box button
  document.querySelector('#drawing-box .close').addEventListener('click', function (e) {
    document.body.setAttribute('data-drawing', false);
    config.drawing = false;

    // Hide the drawing-box without removing it
    const drawingBox = document.getElementById('drawing-box');
    if (drawingBox) {
      drawingBox.style.display = 'none';  // Hide it instead of removing
    }
  });

  // Add event listener to clear button
  document.querySelector('#drawing-box .clear').addEventListener('click', function () {
    // Clear all drawings
    document.getElementById('drawing-layer').innerHTML = '';

    // Also clear from storage
    chrome.storage.local.remove(window.location.href, function () {
      console.log('Cleared drawings for: ' + window.location.href);
    });
  });

  // Add drag functionality to drawing box
  makeDraggable(document.getElementById('drawing-box'));

  // Create an overlay function for drag operations
  function createOverlay() {
    // Create overlay if it doesn't exist
    if (!document.getElementById('drag-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'drag-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.zIndex = '99999999';
      overlay.style.cursor = 'move';
      document.body.appendChild(overlay);
    }
  }

  // Remove overlay function
  function removeOverlay() {
    const overlay = document.getElementById('drag-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let isDragging = false;

    // Get initial size to maintain during dragging
    const initialWidth = element.offsetWidth;
    const initialHeight = element.offsetHeight;

    element.addEventListener('mousedown', dragMouseDown);
    element.addEventListener('touchstart', touchDragStart, { passive: false });

    function dragMouseDown(e) {
      // Ensure only blank areas can be dragged, not tool buttons
      if (e.target.tagName === 'BUTTON' ||
        e.target.parentElement.tagName === 'BUTTON' ||
        e.target.classList.contains('close') ||
        e.target.classList.contains('clear') ||
        e.target.classList.contains('colors') ||
        e.target.classList.contains('view-highlights') ||
        e.target.parentElement.classList.contains('colors')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation(); // Prevent event propagation to drawing layer

      // Get mouse starting position
      pos3 = e.clientX;
      pos4 = e.clientY;
      isDragging = true;

      // Create full-screen overlay to capture all events
      createOverlay();

      // Mark as dragging
      document.body.setAttribute('data-dragging', 'true');
      element.classList.add('is-dragging');

      // Listen to global mouse events
      document.addEventListener('mouseup', closeDragElement);
      document.addEventListener('mousemove', elementDrag);
    }

    function touchDragStart(e) {
      // Check if we're touching tool buttons
      if (e.target.tagName === 'BUTTON' ||
        e.target.parentElement.tagName === 'BUTTON' ||
        e.target.classList.contains('close') ||
        e.target.classList.contains('clear') ||
        e.target.classList.contains('colors') ||
        e.target.classList.contains('view-highlights') ||
        e.target.parentElement.classList.contains('colors')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Get touch starting position
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
      isDragging = true;

      // Create overlay
      createOverlay();

      // Mark as dragging
      document.body.setAttribute('data-dragging', 'true');
      element.classList.add('is-dragging');

      // Add touch event listeners
      document.addEventListener('touchend', closeTouchDrag);
      document.addEventListener('touchmove', touchElementDrag, { passive: false });
    }

    function elementDrag(e) {
      if (!isDragging) return;

      e.preventDefault();
      e.stopPropagation();

      // Calculate new position
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;

      // Set new position
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";

      // Clear bottom position if it exists
      if (element.style.bottom) {
        element.style.bottom = '';
      }

      // Maintain fixed size
      element.style.width = initialWidth + 'px';
      element.style.height = initialHeight + 'px';
    }

    function touchElementDrag(e) {
      if (!isDragging) return;

      e.preventDefault();
      e.stopPropagation();

      // Calculate new position
      pos1 = pos3 - e.touches[0].clientX;
      pos2 = pos4 - e.touches[0].clientY;
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;

      // Set new position
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";

      // Clear bottom position
      if (element.style.bottom) {
        element.style.bottom = '';
      }

      // Maintain fixed size
      element.style.width = initialWidth + 'px';
      element.style.height = initialHeight + 'px';
    }

    function closeDragElement(e) {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Remove overlay
      removeOverlay();

      // Reset dragging state
      isDragging = false;
      document.body.removeAttribute('data-dragging');
      element.classList.remove('is-dragging');

      // Ensure size doesn't change
      element.style.width = initialWidth + 'px';
      element.style.height = initialHeight + 'px';

      // Remove event listeners
      document.removeEventListener('mouseup', closeDragElement);
      document.removeEventListener('mousemove', elementDrag);
    }

    function closeTouchDrag(e) {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Remove overlay
      removeOverlay();

      // Reset dragging state
      isDragging = false;
      document.body.removeAttribute('data-dragging');
      element.classList.remove('is-dragging');

      // Ensure size remains fixed
      element.style.width = initialWidth + 'px';
      element.style.height = initialHeight + 'px';

      // Remove event listeners
      document.removeEventListener('touchend', closeTouchDrag);
      document.removeEventListener('touchmove', touchElementDrag);
    }
  }

  document.body.addEventListener('pointerdown', function (e) {
    // Skip if we're dragging the drawing-box
    if (document.getElementById('drawing-box').classList.contains('is-dragging') ||
      document.body.hasAttribute('data-dragging')) {
      return false;
    }

    if (e.target.closest('#drawing-box')) {
      return false;
    }

    // Generate id for each element
    let id = helper.generateId();

    if (config.tool == 'arrow' && config.drawing == true) {
      // Set arrow start point
      arrow.topX = e.clientX;
      arrow.topY = e.clientY;

      // Add element to drawing layer
      document.getElementById('drawing-layer').innerHTML = document.getElementById('drawing-layer').innerHTML +
        svgEl.arrowPath(
          [arrow.topX + window.scrollX, arrow.topY + window.scrollY],
          [e.clientX, e.clientX],
          `M0 0 L0 0`,
          'arrow-item',
          arrow.arrowClasses[3],
          [0, 0],
          0,
          [0, 0, 0],
          id
        );
    }
    else if (config.tool == 'freeHand' && config.drawing == true) {
      // Set the drawing starting point
      freeHand.topX = e.clientX;
      freeHand.topY = e.clientY;

      // Set the current path and most recent mouse points
      freeHand.currentPathText = `M${window.scrollX} ${window.scrollY} `;
      freeHand.lastMousePoints = [[window.scrollX, window.scrollY]];

      // Add element to the drawing layer
      document.getElementById('drawing-layer').innerHTML = document.getElementById('drawing-layer').innerHTML +
        svgEl.drawPath([e.clientX, e.clientY], [e.clientX, e.clientY], ``, id);
    }
    else if (config.tool == 'eraser' && config.drawing == true) {
      // Find all drawing elements at the current position
      const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);

      // Filter for drawing elements only
      const drawingElements = elementsAtPoint.filter(el => {
        return el.classList && (
          el.classList.contains('drawing-el') ||
          el.closest('.drawing-el')
        );
      });

      // Remove the found drawing element
      if (drawingElements.length > 0) {
        // Either remove the element itself or its parent if it's inside a drawing element
        const elementToRemove = drawingElements[0].classList.contains('drawing-el') ?
          drawingElements[0] : drawingElements[0].closest('.drawing-el');

        if (elementToRemove) {
          elementToRemove.remove();
        }
      }
    }
  });

  // Pointer move event for drawing
  document.body.addEventListener('pointermove', function (e) {
    // Assuming there is a current item in the drawing layer
    if (document.querySelector('#drawing-layer .current-item') !== null) {
      // If we are using the arrow tool
      if (config.drawing == true && config.tool == 'arrow') {
        // Get the original start position
        let startX = arrow.topX;
        let startY = arrow.topY;
        // Set a default angle of 90
        let angleStart = 90;

        // Calculate how far the user has moved their mouse
        let endX = e.pageX - startX - window.scrollX;
        let endY = e.pageY - startY - window.scrollY;

        // Calculate the arrow's angle
        helper.calculateArrowLineAngle(endX, endY);
        // Update the config to this new end position
        arrow.bottomX = endX;
        arrow.bottomY = endY;

        // Update the HTML to show the new arrow
        document.querySelector('#drawing-layer .arrow.current-item').classList.remove('static');
        document.querySelector('#drawing-layer .arrow.current-item').setAttribute('data-direction', arrow.activeDirection);
        document.querySelector('#drawing-layer .arrow.current-item svg').setAttribute('viewbox', `0 ${endX} 0 ${endY}`);
        document.querySelector('#drawing-layer .arrow.current-item path.arrow-line').setAttribute('d', `M0 0 L${endX} ${endY}`);
      }
      else if (config.drawing == true && config.tool == 'freeHand') {
        // Calculate the user's end position
        let endX = e.pageX - freeHand.topX;
        let endY = e.pageY - freeHand.topY;

        // Push new coordinates to our config
        let newCoordinates = [endX, endY];
        freeHand.lastMousePoints.push([endX, endY]);
        if (freeHand.lastMousePoints.length >= config.configNormalisation) {
          freeHand.lastMousePoints.shift();
        }

        // Calculate the average points to display a smooth line
        let avgPoint = helper.getAveragePoint(0);
        if (avgPoint) {
          freeHand.currentPathText += " L" + avgPoint.x + " " + avgPoint.y;

          let tmpPath = '';
          for (let offset = 2; offset < freeHand.lastMousePoints.length; offset += 2) {
            avgPoint = helper.getAveragePoint(offset);
            tmpPath += " L" + avgPoint.x + " " + avgPoint.y;
          }

          // Set the complete current path coordinates
          document.querySelector('#drawing-layer .free-hand.current-item').classList.remove('static');
          document.querySelector('#drawing-layer .free-hand.current-item svg path').setAttribute('d', freeHand.currentPathText + tmpPath);
        }
      }
    }
  });

  // Mouse leave and pointer up events
  ['mouseleave', 'pointerup'].forEach(function (item) {
    document.body.addEventListener(item, function (e) {
      // Remove current-item class from all elements
      document.querySelectorAll('#drawing-layer > div').forEach(function (item) {
        item.style.pointerEvent = 'all';
        item.classList.remove('current-item');
        // Delete any 'static' elements
        if (item.classList.contains('static')) {
          item.remove();
        }
      });
      // Reset freeHand variables
      freeHand.currentPathText = 'M0 0 ';
      freeHand.lastMousePoints = [[0, 0]];
    });
  });

  // Text highlighting functionality
  document.addEventListener('mouseup', function (e) {
    // Only process when in drawing mode and highlight tool is selected
    if (config.drawing && config.tool === 'highlight') {
      const selection = window.getSelection();
      if (!e.target.closest('#drawing-box') && !e.target.closest('#displayHighlightsPopUp')) {
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectedText = selection.toString().trim();
          if (selectedText.length > 0) {
            try {
              // Create highlight span
              const span = document.createElement('span');
              span.style.backgroundColor = config.color;
              span.classList.add('highlighted');

              range.surroundContents(span);
              // Save highlights
              saveHighlights();

              // Create a brief notification that text was highlighted
              const notification = document.createElement('div');
              notification.textContent = uiTranslations[currentLanguage].textHighlighted;
              notification.style.position = 'fixed';
              notification.style.bottom = '20px';
              notification.style.left = '50%';
              notification.style.transform = 'translateX(-50%)';
              notification.style.padding = '8px 16px';
              notification.style.backgroundColor = 'rgba(0,0,0,0.7)';
              notification.style.color = 'white';
              notification.style.borderRadius = '4px';
              notification.style.fontSize = '14px';
              notification.style.zIndex = '10000000';

              document.body.appendChild(notification);

              // Remove notification after 2 seconds
              setTimeout(() => {
                document.body.removeChild(notification);
              }, 2000);
            } catch (error) {
              console.error("Cannot highlight complex selection:", error);
            }

            selection.removeAllRanges();
          }
        }
      }
    }
  });

  // Save highlights to chrome.storage
  function saveHighlights() {
    chrome.storage.local.get(['highlights'], function (result) {
      let allHighlights = result.highlights || [];

      // Remove old highlights for current URL
      allHighlights = allHighlights.filter(hl => hl.url !== window.location.href);

      // Add current page highlights
      const currentHighlights = Array.from(document.querySelectorAll('.highlighted')).map(el => ({
        text: el.innerText,
        color: el.style.backgroundColor,
        parentPath: getElementXPath(el.parentElement),
        url: window.location.href,
        timestamp: new Date().toISOString()
      }));

      allHighlights = [...allHighlights, ...currentHighlights];

      chrome.storage.local.set({ highlights: allHighlights }, function () {
        console.log("Highlights saved:", currentHighlights);
      });
    });
  }
} // End of initializeDrawingTools function

// Function to save drawings for current page
function saveDrawings() {
  // Get all drawing elements
  const drawingElements = document.querySelectorAll('#drawing-layer .drawing-el:not(.static)');

  if (drawingElements.length === 0) {
    return; // No drawings to save
  }

  // Create an array to store drawing data
  const drawings = Array.from(drawingElements).map(element => {
    // Get the HTML of the drawing element
    return {
      html: element.outerHTML,
      type: element.classList.contains('free-hand') ? 'freeHand' : 'arrow'
    };
  });

  // Get the current URL as the key
  const pageUrl = window.location.href;

  // Save the drawings to Chrome storage
  chrome.storage.local.set({
    [pageUrl]: drawings
  }, function () {
    console.log('Drawings saved for: ' + pageUrl);
  });
}

// Function to load saved drawings for current page
function loadSavedDrawings() {
  // Get the current URL as the key
  const pageUrl = window.location.href;

  // Load the drawings from Chrome storage
  chrome.storage.local.get([pageUrl], function (result) {
    const savedDrawings = result[pageUrl];

    if (savedDrawings && savedDrawings.length > 0) {
      // Create a document fragment to hold all the drawings
      const fragment = document.createDocumentFragment();
      const tempDiv = document.createElement('div');

      // Create each drawing element
      savedDrawings.forEach(drawing => {
        tempDiv.innerHTML = drawing.html;
        const drawingElement = tempDiv.firstChild;

        // Remove 'current-item' class if present
        drawingElement.classList.remove('current-item');

        // Append to the fragment
        fragment.appendChild(drawingElement.cloneNode(true));
        tempDiv.innerHTML = ''; // Clear for next iteration
      });

      // Add all saved drawings to the drawing layer
      document.getElementById('drawing-layer').appendChild(fragment);

      console.log('Loaded ' + savedDrawings.length + ' drawings for: ' + pageUrl);
    }
  });
}

// Set up auto-save timer
function setupAutoSave() {
  // Save drawings every 5 seconds if there are changes
  setInterval(() => {
    if (document.querySelectorAll('#drawing-layer .drawing-el:not(.static)').length > 0) {
      saveDrawings();
    }
  }, 5000);

  // Also save when user leaves the page
  window.addEventListener('beforeunload', saveDrawings);
}

// Function to load and apply saved highlights for current page
function loadSavedHighlights() {
  chrome.storage.local.get(['highlights'], function (result) {
    const highlights = result.highlights || [];
    console.log("Loading highlights:", highlights);

    highlights.forEach(hl => {
      if (hl.url === window.location.href) {
        console.log("Restoring highlight:", hl);
        restoreHighlight(hl);
      }
    });
  });
}

// Function to restore a highlight
function restoreHighlight({ text, color, parentPath }) {
  const parentElement = getElementByXPath(parentPath);
  if (parentElement) {
    const nodes = Array.from(parentElement.childNodes);
    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.includes(text)) {
        const range = document.createRange();
        range.setStart(node, node.nodeValue.indexOf(text));
        range.setEnd(node, node.nodeValue.indexOf(text) + text.length);

        // Create highlight span
        const span = document.createElement('span');
        span.style.backgroundColor = color;
        span.classList.add('highlighted');

        try {
          range.surroundContents(span);
          console.log("Restored highlight text:", text);
        } catch (e) {
          console.error("Could not restore highlight:", e);
        }
      }
    });
  } else {
    console.error("Parent element not found for XPath:", parentPath);
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleDrawing") {
    const drawingButton = document.getElementById('start-drawing');
    if (drawingButton) {
      drawingButton.click();
    }
  } else if (message.action === "showHighlights") {
    displayHighlightsPopup();
    sendResponse({ success: true });
  } else if (message.action === "changeColor") {
    // Change the selected color
    const colorBtns = document.querySelectorAll('[data-rColor]');
    if (message.colorIndex >= 0 && message.colorIndex < colorBtns.length) {
      colorBtns[message.colorIndex].click();
      sendResponse({ success: true });
    }
  } else if (message.action === "changeLanguage") {
    // Update UI language
    currentLanguage = message.language;
    updateUILanguage();
    sendResponse({ success: true });
  }
  return true;
});

// Inject the drawing elements when the page is fully loaded
window.addEventListener('load', () => {
  // Wait a moment to ensure the page is fully rendered
  setTimeout(() => {
    injectDrawingElements();
    // Load saved drawings after drawing elements are injected
    loadSavedDrawings();
    // Load saved highlights
    loadSavedHighlights();
    // Set up auto-save
    setupAutoSave();
  }, 500);
});
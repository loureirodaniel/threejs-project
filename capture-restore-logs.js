const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Set to true if you don't want to see the browser
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Enable console log capture
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({
      type: msg.type(),
      text: text,
      timestamp: new Date().toISOString()
    });
  });

  console.log('📱 Navigating to http://localhost:3002...');
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle2' });

  console.log('⏳ Step 1: Waiting for page to fully load (5 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🖱️  Step 2: Looking for timeline images to click...');
  
  // Try to find and click a timeline image
  try {
    // Wait for canvas or timeline images to be present
    await page.waitForSelector('canvas, img, [data-timeline-image], .timeline-image', { timeout: 10000 });
    
    // Try multiple selectors to find clickable timeline elements
    const imageClicked = await page.evaluate(() => {
      // Look for clickable elements in the timeline
      const possibleSelectors = [
        'canvas',
        '[data-timeline-image]',
        '.timeline-image',
        'img[src*="timeline"]',
        '.image-plane',
        '[data-event-id]'
      ];

      for (const selector of possibleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          element.click();
          return selector;
        }
      }
      
      // If no specific selector works, click on canvas
      const canvas = document.querySelector('canvas');
      if (canvas) {
        // Click in the center of the canvas
        const rect = canvas.getBoundingClientRect();
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        });
        canvas.dispatchEvent(event);
        return 'canvas (center click)';
      }
      
      return null;
    });

    if (imageClicked) {
      console.log(`✅ Clicked on: ${imageClicked}`);
    } else {
      console.log('❌ No clickable timeline element found');
    }

    console.log('⏳ Waiting for detail view to open (3 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔴 Step 3: Attempting to close detail view...');
    
    // Try multiple methods to close the detail view
    const closeMethod = await page.evaluate(() => {
      // Method 1: Click close button
      const closeButtons = [
        '[data-close]',
        '.close-button',
        'button[aria-label*="close"]',
        'button[aria-label*="Close"]',
        '.detail-close',
        '[data-action="close"]'
      ];

      for (const selector of closeButtons) {
        const button = document.querySelector(selector);
        if (button) {
          button.click();
          return `Clicked close button: ${selector}`;
        }
      }

      return null;
    });

    if (closeMethod) {
      console.log(`✅ ${closeMethod}`);
    } else {
      console.log('⌨️  No close button found, trying Escape key...');
      await page.keyboard.press('Escape');
      console.log('✅ Pressed Escape key');
    }

    console.log('⏳ Waiting for close animation to complete (4 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    console.log('\n📋 CAPTURED CONSOLE LOGS:\n');
    console.log('=' .repeat(80));
    
    // Filter logs for restoration markers (more permissive)
    const restoreLogs = consoleLogs.filter(log => {
      const text = log.text;
      // Look for exact emoji markers OR related restoration keywords
      return text.includes('🔍 BEFORE restoration') ||
             text.includes('🔍 AFTER restoration') ||
             text.includes('🔍 EXPECTED state') ||
             text.includes('🔄 Restoring complete timeline state') ||
             text.includes('📷 Camera restored to:') ||
             text.includes('⚙️ Physics offset restored to:') ||
             text.includes('✅ Timeline state fully restored') ||
             text.includes('✅ Reverse animation complete') ||
             text.includes('🎨 Forced render of restored state');
    });

    if (restoreLogs.length > 0) {
      restoreLogs.forEach(log => {
        console.log(`[${log.type.toUpperCase()}] ${log.text}`);
      });
    } else {
      console.log('⚠️  No restoration logs found with the specified markers.');
      console.log('\n📋 ALL CONSOLE LOGS (for debugging):\n');
      consoleLogs.slice(-20).forEach(log => {
        console.log(`[${log.type.toUpperCase()}] ${log.text}`);
      });
    }

    console.log('=' .repeat(80));
    console.log(`\n✅ Close flow completed successfully. Captured ${consoleLogs.length} total console messages.`);

  } catch (error) {
    console.error('❌ Error during automation:', error.message);
  }

  console.log('\n🔄 Keeping browser open for 5 seconds before closing...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  await browser.close();
  console.log('✅ Browser closed. Script complete.');
})();

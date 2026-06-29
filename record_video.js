// Resolve playwright from the omnichat workspace
  const { chromium } = require('/home/runner/workspace/artifacts/omnichat/node_modules/playwright');

  (async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: '/home/runner/workspace/omnichat_video_export',
        size: { width: 1280, height: 720 }
      }
    });
    const page = await context.newPage();
    
    console.log('Navigating to video page...');
    await page.goto('http://localhost:80/video', { waitUntil: 'networkidle' });
    
    // Wait for the full video loop (47 seconds total)
    const recordTime = 47000;
    console.log('Recording video for ' + recordTime + 'ms...');
    await page.waitForTimeout(recordTime);
    
    await context.close();
    await browser.close();
    console.log('Recording complete.');
    
    // Find and rename the recorded video
    const videoDir = '/home/runner/workspace/omnichat_video_export';
    const files = require('fs').readdirSync(videoDir);
    const videoFile = files.find(f => f.endsWith('.webm'));
    if (videoFile) {
      const src = require('path').join(videoDir, videoFile);
      const dest = '/home/runner/workspace/omnichat_video_export/omnichat_demo.webm';
      require('fs').renameSync(src, dest);
      console.log('Video saved to: ' + dest);
    }
  })();
  
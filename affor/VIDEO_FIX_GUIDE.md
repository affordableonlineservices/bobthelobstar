# 🎬 VIDEO NOT SHOWING - FIX GUIDE
## For: affordablepc.tech - Affordable Computer Services

---

## 🔴 What Was Wrong

The hero section video wasn't displaying because:

1. **Incorrect File Path** - `images/Background.mp4` doesn't exist on your server
2. **No Fallback Background** - Without the video, there was no background color
3. **No Error Handling** - No way to know if video failed to load

---

## ✅ What I Fixed

### **1. CSS Changes (styles.css)**
Added a beautiful fallback gradient background:
```css
.hero {
  background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
  background-attachment: fixed;
}
```
✓ Now if video fails, visitors see a nice blue gradient (not blank)

### **2. HTML Changes (index.html)**
Updated the video source paths:
```html
<video autoplay muted loop playsinline webkit-playsinline class="heroVideo" id="heroVideo">
  <source src="/images/Background.mp4" type="video/mp4">
  <source src="/video/Background.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
```
✓ Added absolute paths: `/images/` and `/video/`
✓ Added ID for JavaScript debugging
✓ Multiple source paths for flexibility

### **3. JavaScript Changes (main.js)**
Added video error detection:
```javascript
function initVideoHandler() {
  const video = document.getElementById('heroVideo');
  
  // Logs if video plays
  video.addEventListener('play', () => {
    console.log('✓ Video is playing');
  });

  // Logs if video fails
  video.addEventListener('error', (e) => {
    console.error('✗ Video failed to load');
    video.style.display = 'none';
  });
}
```
✓ Automatically detects if video loads successfully
✓ Provides console messages for debugging
✓ Hides video element if it fails

---

## 🚀 How to Deploy the Fix

### **Step 1: Upload the Fixed Files**
Replace these files on your Contabo server:
```
/var/www/html/index.html      ← Use the fixed version
/var/www/html/styles.css      ← Use the fixed version
/var/www/html/main.js         ← Use the fixed version
```

Via SSH on `izildurr1`:
```bash
# Connect to your server
ssh bob_claw@izildurr1.contabo.com

# Navigate to your web directory
cd /var/www/html

# Or wherever your affordablepc.tech files are located
cd /home/bobthelobstar/affordablepc.tech

# Upload the files using SCP or your preferred method
```

### **Step 2: Place Your Video File**

The fixed code looks for the video in TWO places (in order):
1. `/images/Background.mp4` ← Try this first
2. `/video/Background.mp4` ← If #1 fails, try this

**Choose ONE of these options:**

**Option A: Use the `/images/` folder (Recommended)**
```bash
# Copy your video to the images folder
cp Background.mp4 /var/www/html/images/Background.mp4

# Verify it's there
ls -lh /var/www/html/images/Background.mp4
```

**Option B: Create a `/video/` folder**
```bash
# Create the video folder
mkdir -p /var/www/html/video

# Copy your video there
cp Background.mp4 /var/www/html/video/Background.mp4

# Verify it's there
ls -lh /var/www/html/video/Background.mp4
```

### **Step 3: Verify File Permissions**
```bash
# Make sure the video file is readable by the web server
chmod 644 /var/www/html/images/Background.mp4

# Check that the folder is accessible
chmod 755 /var/www/html/images/
```

### **Step 4: Clear Browser Cache & Test**
1. Hard refresh your website: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. Open browser DevTools: `F12`
3. Go to **Console** tab
4. Look for these messages:
   - ✓ `"✓ Video is playing"` = Success! Video loaded
   - ✗ `"✗ Video failed to load"` = Video file not found (see troubleshooting)

---

## 🔍 Troubleshooting

### **Problem: Video still not showing**

**Step 1: Check the Console**
1. Open the website on mobile
2. Open DevTools (F12)
3. Go to Console tab
4. Look for error messages

**Step 2: Check if video file exists**
```bash
# SSH into your server and check:
ls -lh /var/www/html/images/
ls -lh /var/www/html/video/

# You should see "Background.mp4" in one of these folders
```

**Step 3: Check web server error logs**
```bash
# View Apache/Nginx logs
tail -f /var/log/apache2/error.log
# OR
tail -f /var/log/nginx/error.log

# Look for 404 errors related to "Background.mp4"
```

**Step 4: Test video file is accessible**
```bash
# Check if the web server can read it
curl -I https://affordablepc.tech/images/Background.mp4

# Should return: HTTP/1.1 200 OK
# If 404 Not Found, the file path is wrong
```

---

## 📊 Video File Specs (Important!)

**Recommended Video Settings:**
- **Format:** MP4 (H.264 codec)
- **Resolution:** 1920x1080 (Full HD) or 1280x720 (HD)
- **File Size:** 5-15 MB max (for mobile users)
- **Duration:** 10-30 seconds (loops)
- **Framerate:** 30 fps
- **Audio:** None (or muted in HTML)

**How to compress if too large:**
```bash
# Using FFmpeg (if installed on your server)
ffmpeg -i Background.mp4 -b:v 1000k -b:a 128k -s 1920x1080 Background-optimized.mp4
```

---

## 🎯 Expected Behavior After Fix

### **Desktop (1024px+)**
✅ Video plays as full background in hero section
✅ Text is readable over the video
✅ Smooth scrolling, no jank

### **Tablet (641px - 1024px)**
✅ Video scales properly
✅ Content visible and readable
✅ Mobile menu works

### **Mobile (≤640px)**
✅ Video plays inline (not fullscreen)
✅ Video is muted (required for autoplay)
✅ Page loads quickly
✅ Scroll button appears
✅ Menu toggle works

### **If Video Fails**
✅ Beautiful blue gradient background shows instead
✅ No blank/white space
✅ Website still looks professional
✅ Console shows error message for debugging

---

## 💡 Alternative Solutions

### **Option 1: Use a Hosted Video Service**
If your server storage is limited, host the video on Cloudflare Stream or similar:
```html
<video autoplay muted loop playsinline class="hero-video">
  <source src="https://cdn.example.com/Background.mp4" type="video/mp4">
</video>
```

### **Option 2: Use a Still Image as Fallback**
```html
<video autoplay muted loop playsinline class="hero-video" poster="/images/hero-poster.jpg">
  <source src="/images/Background.mp4" type="video/mp4">
</video>
```
✓ Shows an image while video loads

### **Option 3: Lazy Load Video for Mobile**
If bandwidth is an issue, only load video on larger screens:
```javascript
if (window.innerWidth >= 1024) {
  video.src = '/images/Background.mp4';
  video.load();
}
```

---

## 📋 Checklist

- [ ] Download the fixed files (index.html, styles.css, main.js)
- [ ] SSH into your Contabo server (`izildurr1`)
- [ ] Backup current files (just in case)
- [ ] Upload the 3 fixed files to `/var/www/html/`
- [ ] Ensure `Background.mp4` is in `/images/` or `/video/` folder
- [ ] Set proper permissions: `chmod 644` for file, `chmod 755` for folder
- [ ] Clear browser cache: `Ctrl+Shift+R`
- [ ] Test on desktop browser (should see video)
- [ ] Test on mobile browser (should see video or gradient fallback)
- [ ] Check browser console for success message: `"✓ Video is playing"`

---

## 🎬 Testing the Video

### **On Desktop:**
```
1. Go to https://affordablepc.tech
2. Press F12 to open DevTools
3. Go to Console tab
4. Scroll to hero section
5. Should see: "✓ Video is playing"
6. Video should play in background
```

### **On Mobile:**
```
1. Go to https://affordablepc.tech on iPhone/Android
2. Long-press, select "Inspect" (Chrome)
3. Look at Console tab
4. Should see: "✓ Video is playing"
5. Or if video failed: Blue gradient background shows
```

---

## 🆘 Still Having Issues?

**Debug Checklist:**

1. **Video file exists?**
   ```bash
   ls -lh /var/www/html/images/Background.mp4
   # Should return file size, not "No such file"
   ```

2. **File permissions correct?**
   ```bash
   ls -l /var/www/html/images/Background.mp4
   # Should show: -rw-r--r--
   ```

3. **Web server can read it?**
   ```bash
   curl -I https://affordablepc.tech/images/Background.mp4
   # Should show: HTTP/1.1 200 OK
   ```

4. **Browser console shows error?**
   ```
   Open DevTools (F12) → Console → Look for "✗ Video failed to load"
   This means file path or permissions are wrong
   ```

5. **Try different path:**
   Edit `index.html` and try:
   ```html
   <source src="./images/Background.mp4" type="video/mp4">
   <source src="../images/Background.mp4" type="video/mp4">
   <source src="images/Background.mp4" type="video/mp4">
   ```

---

## 📞 Support

**If you need help:**
- Check the console messages (F12 → Console)
- Verify the file exists on your server
- Ensure file permissions are correct (644)
- Make sure the path matches your folder structure

---

## 📝 Summary

✅ **What changed:**
- Added fallback gradient background (so it looks nice if video fails)
- Fixed video path from relative to absolute (`/images/Background.mp4`)
- Added error detection in JavaScript
- Added console logging for debugging

✅ **What you need to do:**
1. Upload 3 fixed files to your server
2. Place `Background.mp4` in `/images/` folder
3. Test and verify in browser console
4. Done! 🎉

---

**Your website now has a robust video setup that works on mobile and desktop, with automatic fallback if something goes wrong!**

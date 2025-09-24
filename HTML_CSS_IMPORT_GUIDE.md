# HTML/CSS Import Guide

## 📋 Overview
This guide explains how to import your HTML/CSS designs into the Menu Board Editor to get the **exact same appearance** as your original design.

## 🎯 Best Practices for Perfect Import

### 1. **HTML Structure Requirements**

#### ✅ **Recommended HTML Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1920, height=1080">
    <title>Menu Design</title>
</head>
<body style="width: 1920px; height: 1080px; margin: 0; padding: 0;">
    <!-- Your content here -->
    <div class="header">
        <h1>Restaurant Name</h1>
    </div>
    <div class="menu-items">
        <div class="item">
            <img src="burger.jpg" alt="Burger">
            <h3>Burger Name</h3>
            <p>Description</p>
            <span class="price">$12.99</span>
        </div>
    </div>
</body>
</html>
```

#### ❌ **Avoid These Issues:**
- Don't use `<div>` elements without content or styling
- Avoid deeply nested structures without purpose
- Don't use JavaScript-dependent layouts
- Avoid absolute positioning with `position: fixed`

### 2. **CSS Styling Guidelines**

#### ✅ **Recommended CSS Properties:**
```css
/* Set explicit dimensions */
body {
    width: 1920px;
    height: 1080px;
    margin: 0;
    padding: 0;
    background-color: #ffffff;
    font-family: Arial, sans-serif;
}

/* Use explicit positioning for elements */
.menu-item {
    position: absolute;
    left: 100px;
    top: 200px;
    width: 300px;
    height: 150px;
    background-color: #f0f0f0;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

/* Text styling */
.title {
    font-size: 32px;
    font-weight: bold;
    color: #333333;
    text-align: center;
}

.price {
    font-size: 24px;
    font-weight: bold;
    color: #ff6b35;
}

/* Image styling */
.food-image {
    width: 200px;
    height: 150px;
    border-radius: 8px;
    object-fit: cover;
}
```

#### ❌ **Avoid These CSS Issues:**
- Don't use `display: none` for elements you want to import
- Avoid `visibility: hidden` on important elements
- Don't use CSS Grid or Flexbox without explicit dimensions
- Avoid relative units like `em`, `rem`, `%` without context

### 3. **Image Requirements**

#### ✅ **Best Practices for Images:**
```html
<!-- Use absolute URLs -->
<img src="https://example.com/images/burger.jpg" alt="Burger">

<!-- Or relative paths from your server -->
<img src="/images/menu/burger.jpg" alt="Burger">

<!-- Specify dimensions -->
<img src="burger.jpg" alt="Burger" style="width: 200px; height: 150px;">
```

#### ❌ **Image Issues to Avoid:**
- Don't use broken or missing image URLs
- Avoid very large images (>2MB)
- Don't use base64 encoded images (they're too large)
- Avoid images with complex CSS transforms

### 4. **Canvas Size Recommendations**

#### **Supported Canvas Sizes:**
- **1920×1080** (Full HD Landscape) - Most common
- **1080×1920** (Full HD Portrait) - For vertical displays
- **1280×720** (HD Landscape)
- **720×1280** (HD Portrait)
- **1366×768** (Wide Screen)

#### **How to Set Canvas Size:**
```html
<!-- Method 1: Viewport meta tag -->
<meta name="viewport" content="width=1920, height=1080">

<!-- Method 2: Body styles -->
<body style="width: 1920px; height: 1080px;">

<!-- Method 3: CSS -->
body {
    width: 1920px;
    height: 1080px;
}
```

### 5. **Element Type Detection**

The import automatically detects element types based on content:

#### **Text Elements:**
```html
<h1>Restaurant Name</h1>          <!-- Regular text -->
<p>Fresh ingredients daily</p>     <!-- Regular text -->
```

#### **Price Elements:**
```html
<span class="price">$12.99</span>  <!-- Detected as price -->
<div>$8.99</div>                   <!-- Detected as price -->
```

#### **Promotion Elements:**
```html
<div>SPECIAL OFFER!</div>          <!-- Detected as promotion -->
<h2>50% OFF Today!</h2>            <!-- Detected as promotion -->
```

#### **Image Elements:**
```html
<img src="burger.jpg" alt="Burger"> <!-- Detected as image -->
```

### 6. **Step-by-Step Import Process**

1. **Prepare Your Files:**
   - Create your HTML file with proper structure
   - **Option A:** Embed CSS in HTML with `<style>` tags
   - **Option B:** Create separate CSS file with explicit styling
   - Ensure all images are accessible

2. **Upload HTML:**
   - Click the upload button (📤) in the editor toolbar
   - Select your HTML file
   - **If HTML has embedded CSS:** Processing starts immediately
   - **If no embedded CSS:** Wait for the CSS upload prompt

3. **Upload CSS (Only if needed):**
   - Select your CSS file when prompted
   - Or click "Cancel" to skip CSS (HTML-only import)
   - Wait up to 15 seconds for processing

4. **Monitor Progress:**
   - Watch the loading modal with progress updates
   - See real-time processing status
   - Wait for completion (usually 5-15 seconds)

5. **Review Results:**
   - Check the detailed success message
   - Verify element count and canvas size
   - Review the imported design

### 7. **Troubleshooting Common Issues**

#### **Issue: Elements appear in wrong positions**
**Solution:** Use explicit `position: absolute` with `left` and `top` values

#### **Issue: Images not loading**
**Solution:** Use absolute URLs or ensure relative paths are correct

#### **Issue: Text styling not preserved**
**Solution:** Use explicit CSS properties instead of inheritance

#### **Issue: Canvas size is wrong**
**Solution:** Set explicit `width` and `height` on the `<body>` element

#### **Issue: Some elements missing**
**Solution:** Avoid `display: none` and ensure elements have content

### 8. **Advanced Tips**

#### **For Complex Layouts:**
- Use absolute positioning for precise control
- Set explicit dimensions for all containers
- Avoid CSS Grid and Flexbox for import

#### **For Better Performance:**
- Optimize images (compress to <500KB each)
- Use web-safe fonts (Arial, Helvetica, etc.)
- Avoid complex CSS animations

#### **For Multiple Elements:**
- Give each element unique classes or IDs
- Use consistent naming conventions
- Group related elements logically

### 9. **Example Complete HTML/CSS Files**

#### **HTML File (menu.html):**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1920, height=1080">
    <title>Restaurant Menu</title>
</head>
<body style="width: 1920px; height: 1080px; margin: 0; padding: 0; background: linear-gradient(to bottom, #f8f9fa, #e9ecef);">
    
    <!-- Header -->
    <div class="header" style="position: absolute; left: 0; top: 0; width: 1920px; height: 120px; background: #2c3e50;">
        <h1 style="position: absolute; left: 100px; top: 20px; color: white; font-size: 48px; font-family: Arial; margin: 0;">RESTAURANT NAME</h1>
    </div>

    <!-- Menu Item 1 -->
    <div class="menu-item" style="position: absolute; left: 100px; top: 160px; width: 800px; height: 200px; background: white; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <img src="https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200&h=150&fit=crop" 
             style="position: absolute; left: 20px; top: 25px; width: 200px; height: 150px; border-radius: 8px; object-fit: cover;">
        <h3 style="position: absolute; left: 240px; top: 25px; font-size: 24px; font-family: Arial; margin: 0; color: #333;">CLASSIC BURGER</h3>
        <p style="position: absolute; left: 240px; top: 60px; font-size: 16px; font-family: Arial; margin: 0; color: #666; width: 400px;">Juicy beef patty with lettuce, tomato, and our special sauce</p>
        <span class="price" style="position: absolute; right: 20px; top: 25px; font-size: 28px; font-family: Arial; font-weight: bold; color: #ff6b35;">$12.99</span>
    </div>

    <!-- Menu Item 2 -->
    <div class="menu-item" style="position: absolute; left: 100px; top: 380px; width: 800px; height: 200px; background: white; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=150&fit=crop" 
             style="position: absolute; left: 20px; top: 25px; width: 200px; height: 150px; border-radius: 8px; object-fit: cover;">
        <h3 style="position: absolute; left: 240px; top: 25px; font-size: 24px; font-family: Arial; margin: 0; color: #333;">BACON CHEESEBURGER</h3>
        <p style="position: absolute; left: 240px; top: 60px; font-size: 16px; font-family: Arial; margin: 0; color: #666; width: 400px;">Double beef patty with crispy bacon and melted cheese</p>
        <span class="price" style="position: absolute; right: 20px; top: 25px; font-size: 28px; font-family: Arial; font-weight: bold; color: #ff6b35;">$15.99</span>
    </div>

    <!-- Special Offer -->
    <div style="position: absolute; left: 100px; top: 600px; width: 1720px; height: 80px; background: #ff6b35; border-radius: 10px; text-align: center;">
        <h2 style="color: white; font-size: 32px; font-family: Arial; margin: 0; line-height: 80px;">COMBO DEAL: Any burger + fries + drink for $18.99!</h2>
    </div>

</body>
</html>
```

#### **CSS File (menu.css):**
```css
/* Additional styling can go here if needed */
/* Most styling is inline in the HTML for better import compatibility */

body {
    font-family: Arial, sans-serif;
    overflow: hidden; /* Prevent scrolling */
}

.menu-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
}

.price {
    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}
```

### 10. **New Features & Improvements**

#### **🎯 Smart CSS Detection:**
- **Automatic Detection:** If your HTML contains `<style>` tags or `<link>` tags, CSS is automatically used
- **Single File Import:** Upload just your HTML file with embedded CSS - no separate CSS file needed
- **Fallback Support:** Still supports separate CSS files for external stylesheets

#### **📊 Progress Tracking:**
- **Real-time Updates:** See exactly what's happening during import
- **Progress Indicators:** Loading modal with step-by-step progress
- **Time Estimates:** Usually completes in 5-15 seconds

#### **🔧 Enhanced Error Handling:**
- **Detailed Error Messages:** Clear explanations of what went wrong
- **Validation Checks:** Ensures elements are found before completing import
- **Helpful Tips:** Automatic suggestions for common issues

#### **💾 Improved PNG Export:**
- **Better Reliability:** Fixed issues with PNG download failures
- **Loading States:** Visual feedback during image generation
- **Error Recovery:** Clear error messages if export fails

### 11. **Import Success Checklist**

After importing, verify:
- [ ] Canvas size matches your design
- [ ] All text elements are visible and styled correctly
- [ ] Images are loading properly
- [ ] Colors and fonts match your original design
- [ ] Element positions are accurate
- [ ] Background colors/images are preserved
- [ ] Element count matches your expectations

---

## 🆘 **Need Help?**

If you're having issues with the import:
1. Check the browser console for error messages
2. Verify your HTML/CSS files are valid
3. Ensure all image URLs are accessible
4. Try simplifying your design first
5. Use the troubleshooting section above

**Happy Designing!** 🎨✨

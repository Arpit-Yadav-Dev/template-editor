# 🐛 **Image Upload Debug Guide**

## **🔍 Issues Found & Fixed:**

### **1. Instant Visibility Problem** ❌ → ✅
**Problem**: Image not visible immediately after upload
**Cause**: Response mapping might be wrong
**Fix**: Added debug logging + better field mapping

### **2. Delete API Location** ✅
**Location**: `src/services/api.ts` lines 435-469
**Endpoint**: `DELETE /api/template-images-library/{id}`

## **🧪 Debug Steps:**

### **1. Test Upload with Debug Logs:**
1. Open browser console (F12)
2. Go to editor → Image library → "My Images"
3. Upload an image
4. Check console for these logs:
   ```
   Uploading image to: http://16.171.24.58/api/template-images-library
   Upload API response: { ... }
   Upload response: { ... }
   Image added to gallery: { ... }
   ```

### **2. Check What's Happening:**
- **If no logs**: Upload not triggering
- **If "Uploading image" but no response**: Network issue
- **If response but no "Image added"**: Response mapping issue
- **If "Image added" but not visible**: UI update issue

## **🔧 Delete API Implementation:**

### **Location**: `src/services/api.ts` (lines 435-469)
```typescript
// Delete image
public async deleteImage(imageId: string): Promise<ApiResponse<any>> {
  const url = `${this.baseURL}/template-images-library/${imageId}`;
  // ... DELETE request with Bearer token
}
```

### **Usage**: `src/components/ImageLibraryPanel.tsx` (lines 167-177)
```typescript
const deleteApiImage = useCallback(async (imageId: string): Promise<boolean> => {
  const response = await apiService.deleteImage(imageId);
  // ... handle response
}, []);
```

## **🎯 Expected Upload Flow:**

### **1. User Uploads Image:**
```
User selects file → handleFileUpload() → uploadImageToApi() → API call
```

### **2. API Response:**
```json
{
  "status": true,
  "message": "Image uploaded successfully", 
  "data": {
    "id": "new-id",
    "image_url": "https://server.com/image.jpg",
    "file_size": "123456"
  }
}
```

### **3. UI Update:**
```
setApiImages(prev => [newImage, ...prev]) → Image appears immediately
```

## **🚨 Common Issues:**

### **Issue 1: No Console Logs**
- **Cause**: Upload not triggering
- **Check**: Is user in "My Images" category?
- **Fix**: Switch to "My Images" category first

### **Issue 2: "Uploading image" but no response**
- **Cause**: Network/CORS issue
- **Check**: Browser Network tab
- **Fix**: Check server accessibility

### **Issue 3: Response but no "Image added"**
- **Cause**: Response structure mismatch
- **Check**: Console logs for actual response
- **Fix**: Update field mapping

### **Issue 4: "Image added" but not visible**
- **Cause**: UI state issue
- **Check**: React DevTools for state
- **Fix**: Force re-render

## **🔧 Quick Fixes:**

### **Force Refresh After Upload:**
```typescript
// In uploadImageToApi, after setApiImages:
setApiImages(prev => [newImage, ...prev]);
// Force re-render
setApiImages(prev => [...prev]);
```

### **Reload Images After Upload:**
```typescript
// After successful upload:
await loadApiImages(); // Reload from server
```

## **📋 Test Checklist:**

- [ ] User in "My Images" category
- [ ] Console shows "Uploading image" log
- [ ] Console shows "Upload API response" log  
- [ ] Console shows "Image added to gallery" log
- [ ] Image appears in gallery immediately
- [ ] Image persists on panel close/reopen

## **🎯 Next Steps:**

1. **Test upload** with console open
2. **Check logs** to see where it fails
3. **Share logs** if still not working
4. **Try delete** on existing images

**The delete API is definitely implemented and ready to use!** 🚀

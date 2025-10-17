/**
 * Preview Generator Utility
 * Generates PNG previews for templates using the same logic as canvas download
 */

import * as domToImage from 'dom-to-image';
import { MenuBoardTemplate } from '../types/MenuBoard';

export interface PreviewGenerationResult {
  success: boolean;
  previewUrl?: string;
  error?: string;
}

/**
 * Generate a PNG blob for API upload
 * This function generates a PNG blob that can be sent to the API
 */
export async function generateTemplateThumbnailBlob(
  template: MenuBoardTemplate,
  canvasElement: HTMLElement
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  try {
    console.log('🎨 Generating thumbnail blob for template:', template.name);
    
    // Wait for any pending renders and images to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Pre-process images to handle broken URLs (same as download function)
    const images = canvasElement.querySelectorAll('img');
    console.log('Found', images.length, 'images to check');
    
    for (const img of images) {
      if (!img.complete || img.naturalWidth === 0) {
        console.log('Broken image detected:', img.src);
        // Replace broken images with a placeholder
        img.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.style.width = img.style.width || img.width + 'px';
        placeholder.style.height = img.style.height || img.height + 'px';
        placeholder.style.backgroundColor = '#f0f0f0';
        placeholder.style.border = '2px dashed #ccc';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.fontSize = '12px';
        placeholder.style.color = '#666';
        placeholder.textContent = 'Image';
        img.parentNode?.insertBefore(placeholder, img);
      }
    }

    // Try multiple export methods (same as download function)
    let dataUrl: string;
    
    try {
      // Method 1: Try with explicit options and skip broken images
      dataUrl = await domToImage.toPng(canvasElement, {
        width: template.canvasSize.width,
        height: template.canvasSize.height,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
        quality: 1.0,
        pixelRatio: 1,
        bgcolor: '#ffffff',
        filter: (node) => {
          // Skip broken images
          if (node.nodeType === 1 && (node as Element).tagName === 'IMG') {
            const img = node as HTMLImageElement;
            return img.complete && img.naturalWidth > 0;
          }
          return true;
        }
      });
      console.log('✅ Thumbnail blob generation successful (Method 1)');
    } catch (method1Error) {
      console.log('⚠️ Method 1 failed, trying method 2:', method1Error);
      
      try {
        // Method 2: Try with minimal options and skip broken images
        dataUrl = await domToImage.toPng(canvasElement, {
          bgcolor: '#ffffff',
          filter: (node) => {
            // Skip broken images
            if (node.nodeType === 1 && (node as Element).tagName === 'IMG') {
              const img = node as HTMLImageElement;
              return img.complete && img.naturalWidth > 0;
            }
            return true;
          }
        });
        console.log('✅ Thumbnail blob generation successful (Method 2)');
      } catch (method2Error) {
        console.log('⚠️ Method 2 failed, trying method 3:', method2Error);
        
        // Method 3: Basic fallback
        dataUrl = await domToImage.toPng(canvasElement);
        console.log('✅ Thumbnail blob generation successful (Method 3)');
      }
    }

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    return {
      success: true,
      blob
    };
    
  } catch (error) {
    console.error('❌ Thumbnail blob generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate a PNG preview for a template
 * Uses the same logic as the canvas download function
 */
export async function generateTemplatePreview(
  template: MenuBoardTemplate,
  canvasElement: HTMLElement
): Promise<PreviewGenerationResult> {
  try {
    console.log('🎨 Generating preview for template:', template.name);
    
    // Wait for any pending renders and images to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Pre-process images to handle broken URLs (same as download function)
    const images = canvasElement.querySelectorAll('img');
    console.log('Found', images.length, 'images to check');
    
    for (const img of images) {
      if (!img.complete || img.naturalWidth === 0) {
        console.log('Broken image detected:', img.src);
        // Replace broken images with a placeholder
        img.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.style.width = img.style.width || img.width + 'px';
        placeholder.style.height = img.style.height || img.height + 'px';
        placeholder.style.backgroundColor = '#f0f0f0';
        placeholder.style.border = '2px dashed #ccc';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.fontSize = '12px';
        placeholder.style.color = '#666';
        placeholder.textContent = 'Image';
        img.parentNode?.insertBefore(placeholder, img);
      }
    }

    // Try multiple export methods (same as download function)
    let dataUrl: string;
    
    try {
      // Method 1: Try with explicit options and skip broken images
      dataUrl = await domToImage.toPng(canvasElement, {
        width: template.canvasSize.width,
        height: template.canvasSize.height,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
        quality: 1.0,
        pixelRatio: 1,
        bgcolor: '#ffffff',
        filter: (node) => {
          // Skip broken images
          if (node.nodeType === 1 && (node as Element).tagName === 'IMG') {
            const img = node as HTMLImageElement;
            return img.complete && img.naturalWidth > 0;
          }
          return true;
        }
      });
      console.log('✅ Preview generation successful (Method 1)');
    } catch (method1Error) {
      console.log('⚠️ Method 1 failed, trying method 2:', method1Error);
      
      try {
        // Method 2: Try with minimal options and skip broken images
        dataUrl = await domToImage.toPng(canvasElement, {
          bgcolor: '#ffffff',
          filter: (node) => {
            // Skip broken images
            if (node.nodeType === 1 && (node as Element).tagName === 'IMG') {
              const img = node as HTMLImageElement;
              return img.complete && img.naturalWidth > 0;
            }
            return true;
          }
        });
        console.log('✅ Preview generation successful (Method 2)');
      } catch (method2Error) {
        console.log('⚠️ Method 2 failed, trying method 3:', method2Error);
        
        // Method 3: Basic fallback
        dataUrl = await domToImage.toPng(canvasElement);
        console.log('✅ Preview generation successful (Method 3)');
      }
    }

    // Save preview locally (for now)
    const previewUrl = await savePreviewLocally(dataUrl, template.id);
    
    return {
      success: true,
      previewUrl
    };
    
  } catch (error) {
    console.error('❌ Preview generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Save preview locally (for development)
 * In production, this would upload to a cloud service
 */
async function savePreviewLocally(dataUrl: string, templateId: string): Promise<string> {
  // For now, return the data URL directly
  // In production, you would:
  // 1. Convert dataUrl to blob
  // 2. Upload to AWS S3, Cloudinary, etc.
  // 3. Return the public URL
  
  console.log('💾 Saving preview locally for template:', templateId);
  
  // Create a blob from the data URL
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  
  // For development, we'll use the data URL directly
  // In production, you would upload the blob and return the URL
  return dataUrl;
}

/**
 * Generate previews for all templates
 * This would typically be run during template creation/update
 */
export async function generateAllTemplatePreviews(
  templates: MenuBoardTemplate[]
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  
  console.log('🎨 Generating previews for', templates.length, 'templates');
  
  for (const template of templates) {
    try {
      // Create a temporary canvas element for rendering
      const tempCanvas = createTempCanvas(template);
      
      // Generate preview
      const result = await generateTemplatePreview(template, tempCanvas);
      
      if (result.success && result.previewUrl) {
        results[template.id] = result.previewUrl;
        console.log('✅ Generated preview for:', template.name);
      } else {
        console.log('❌ Failed to generate preview for:', template.name, result.error);
      }
      
      // Clean up
      tempCanvas.remove();
      
    } catch (error) {
      console.error('❌ Error generating preview for', template.name, error);
    }
  }
  
  console.log('🎨 Preview generation complete. Generated:', Object.keys(results).length, 'previews');
  return results;
}

/**
 * Create a temporary canvas element for rendering
 * This simulates the actual canvas rendering
 */
function createTempCanvas(template: MenuBoardTemplate): HTMLElement {
  const canvas = document.createElement('div');
  canvas.style.width = template.canvasSize.width + 'px';
  canvas.style.height = template.canvasSize.height + 'px';
  canvas.style.backgroundColor = template.backgroundColor || '#ffffff';
  canvas.style.position = 'absolute';
  canvas.style.top = '-9999px';
  canvas.style.left = '-9999px';
  
  // Add background image if exists
  if (template.backgroundImage) {
    canvas.style.backgroundImage = `url(${template.backgroundImage})`;
    canvas.style.backgroundSize = 'cover';
    canvas.style.backgroundPosition = 'center';
  }
  
  // Add elements (simplified rendering)
  template.elements.forEach(element => {
    const elementDiv = document.createElement('div');
    elementDiv.style.position = 'absolute';
    elementDiv.style.left = element.x + 'px';
    elementDiv.style.top = element.y + 'px';
    elementDiv.style.width = element.width + 'px';
    elementDiv.style.height = element.height + 'px';
    elementDiv.style.zIndex = (element.zIndex || 1).toString();
    
    if (element.type === 'text' || element.type === 'price' || element.type === 'promotion') {
      elementDiv.textContent = element.content || '';
      elementDiv.style.color = element.color || '#000';
      elementDiv.style.fontSize = (element.fontSize || 16) + 'px';
      elementDiv.style.fontFamily = element.fontFamily || 'Arial';
      elementDiv.style.fontWeight = element.fontWeight || 'normal';
      elementDiv.style.textAlign = element.textAlign || 'left';
      elementDiv.style.backgroundColor = element.backgroundColor || 'transparent';
    } else if (element.type === 'image' && element.imageUrl) {
      const img = document.createElement('img');
      img.src = element.imageUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      elementDiv.appendChild(img);
    } else if (element.type === 'shape') {
      elementDiv.style.backgroundColor = element.backgroundColor || '#3B82F6';
      if (element.shapeType === 'circle') {
        elementDiv.style.borderRadius = '50%';
      }
    }
    
    canvas.appendChild(elementDiv);
  });
  
  document.body.appendChild(canvas);
  return canvas;
}

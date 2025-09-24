# Template Structure Guide

This guide provides a comprehensive structure for creating professional menu board templates that can be easily shared and reused.

## 📋 Template Structure Overview

A template consists of:
- **Canvas Size**: Dimensions and orientation
- **Background**: Color and/or image
- **Elements**: Text, images, shapes, prices, promotions
- **Groups**: Logical groupings of elements
- **Metadata**: Name, description, category

## 🎨 Canvas Sizes

### TV Display Sizes (Recommended)
```typescript
const canvasSizes = [
  { id: '1920x1080', width: 1920, height: 1080, name: 'Full HD (16:9)' },
  { id: '1366x768', width: 1366, height: 768, name: 'HD (16:9)' },
  { id: '1080x1920', width: 1080, height: 1920, name: 'Full HD Portrait (9:16)' },
  { id: '768x1366', width: 768, height: 1366, name: 'HD Portrait (9:16)' }
];
```

## 🎯 Element Types

### 1. Text Elements
```typescript
{
  id: "text_001",
  type: "text",
  content: "Menu Title",
  x: 100,
  y: 50,
  width: 400,
  height: 80,
  fontSize: 48,
  fontWeight: "bold",
  color: "#ffffff",
  fontFamily: "Arial",
  textAlign: "center",
  backgroundColor: "#ff6b35",
  borderRadius: 10,
  textStrokeWidth: 2,
  textStrokeColor: "#000000",
  zIndex: 10
}
```

### 2. Price Elements
```typescript
{
  id: "price_001",
  type: "price",
  content: "$12.99",
  x: 300,
  y: 200,
  width: 120,
  height: 40,
  fontSize: 24,
  fontWeight: "bold",
  color: "#ff6b35",
  backgroundColor: "#ffffff",
  borderRadius: 20,
  border: "2px solid #ff6b35",
  zIndex: 15
}
```

### 3. Image Elements
```typescript
{
  id: "image_001",
  type: "image",
  imageUrl: "https://example.com/burger.jpg",
  x: 50,
  y: 100,
  width: 200,
  height: 150,
  borderRadius: 15,
  shadow: "0 4px 8px rgba(0,0,0,0.2)",
  zIndex: 5
}
```

### 4. Shape Elements
```typescript
{
  id: "shape_001",
  type: "shape",
  shapeType: "rectangle", // rectangle, circle, triangle, diamond, hexagon, star, heart
  x: 100,
  y: 100,
  width: 300,
  height: 200,
  backgroundColor: "#ff6b35",
  borderRadius: 20,
  strokeWidth: 3,
  strokeColor: "#ffffff",
  zIndex: 1
}
```

## 📐 Layout Guidelines

### Grid System
- **Base Unit**: 20px
- **Margins**: 40px from edges
- **Spacing**: 20px between elements
- **Alignment**: Use multiples of 20px for clean positioning

### Typography Scale
```typescript
const typography = {
  title: { fontSize: 48, fontWeight: "bold" },
  subtitle: { fontSize: 36, fontWeight: "bold" },
  heading: { fontSize: 24, fontWeight: "bold" },
  body: { fontSize: 18, fontWeight: "normal" },
  caption: { fontSize: 14, fontWeight: "normal" },
  price: { fontSize: 24, fontWeight: "bold" }
};
```

### Color Palette
```typescript
const colors = {
  primary: "#ff6b35",    // Orange
  secondary: "#2c3e50",  // Dark Blue
  accent: "#f39c12",     // Yellow
  success: "#27ae60",    // Green
  danger: "#e74c3c",     // Red
  light: "#ecf0f1",      // Light Gray
  dark: "#2c3e50",       // Dark Gray
  white: "#ffffff",
  black: "#000000"
};
```

## 🏗️ Template Categories

### 1. Restaurant Menus
- **Burger Joint**: Bold, casual fonts, warm colors
- **Fine Dining**: Elegant fonts, muted colors
- **Fast Food**: Bright colors, friendly fonts
- **Cafe**: Cozy, organic feel

### 2. Food Types
- **Breakfast**: Morning colors, fresh imagery
- **Lunch**: Balanced, professional
- **Dinner**: Sophisticated, premium feel
- **Desserts**: Sweet, indulgent colors

### 3. Promotional
- **Daily Specials**: Eye-catching, urgent
- **Happy Hour**: Social, energetic
- **Seasonal**: Themed colors and imagery
- **Combo Deals**: Value-focused, clear pricing

## 📋 Template Checklist

### ✅ Design Requirements
- [ ] Canvas size matches target display
- [ ] Background color/image is appropriate
- [ ] Typography hierarchy is clear
- [ ] Color scheme is consistent
- [ ] Spacing follows grid system
- [ ] Images are high quality
- [ ] Text is readable at distance
- [ ] Prices are prominent
- [ ] Layout is balanced

### ✅ Technical Requirements
- [ ] All elements have unique IDs
- [ ] Z-index values are logical
- [ ] Images have fallback URLs
- [ ] Text content is editable
- [ ] Elements are properly positioned
- [ ] Groups are logical
- [ ] Template has metadata

## 🎨 Design Best Practices

### Visual Hierarchy
1. **Primary**: Main title (largest, boldest)
2. **Secondary**: Section headers
3. **Tertiary**: Item names
4. **Quaternary**: Prices and descriptions

### Spacing Rules
- **Title to Content**: 40px
- **Section to Section**: 60px
- **Item to Item**: 30px
- **Text to Price**: 20px

### Readability
- **Minimum Font Size**: 16px for body text
- **Contrast Ratio**: 4.5:1 minimum
- **Line Height**: 1.2-1.5
- **Character Spacing**: 0.5-1px for large text

## 📁 File Organization

### Template Structure
```
templates/
├── categories/
│   ├── restaurant/
│   ├── cafe/
│   ├── fast-food/
│   └── fine-dining/
├── sizes/
│   ├── landscape/
│   └── portrait/
└── shared/
    ├── backgrounds/
    ├── images/
    └── fonts/
```

### Naming Convention
```
[category]-[type]-[size]-[orientation].json
Example: burger-menu-1920x1080-landscape.json
```

## 🔧 Export Format

### Complete Template JSON
```typescript
{
  "id": "template_001",
  "name": "Burger Menu Template",
  "category": "restaurant",
  "preview": "Professional burger menu with bold typography",
  "backgroundColor": "#1a0b2e",
  "backgroundImage": "https://example.com/background.jpg",
  "canvasSize": {
    "id": "1920x1080",
    "width": 1920,
    "height": 1080,
    "name": "Full HD (16:9)"
  },
  "isHorizontal": true,
  "elements": [
    // ... element definitions
  ],
  "groups": [
    // ... group definitions
  ],
  "metadata": {
    "created": "2024-01-01",
    "version": "1.0",
    "author": "Template Creator",
    "tags": ["burger", "menu", "restaurant"]
  }
}
```

## 🚀 Quick Start Template

### Minimal Template Structure
```typescript
const quickStartTemplate = {
  id: `template_${Date.now()}`,
  name: "New Template",
  category: "custom",
  preview: "A new template ready for customization",
  backgroundColor: "#ffffff",
  canvasSize: { id: "1920x1080", width: 1920, height: 1080, name: "Full HD" },
  isHorizontal: true,
  elements: [
    {
      id: "title_001",
      type: "text",
      content: "Your Title Here",
      x: 100,
      y: 100,
      width: 800,
      height: 100,
      fontSize: 48,
      fontWeight: "bold",
      color: "#000000",
      textAlign: "center",
      zIndex: 10
    }
  ],
  groups: []
};
```

## 📖 Usage Instructions

1. **Create Template**: Use the structure above as a starting point
2. **Customize Elements**: Modify positions, colors, and content
3. **Test Layout**: Ensure readability and visual balance
4. **Export JSON**: Save in the correct format
5. **Share**: Provide with usage instructions

## 🔄 Version Control

### Template Versions
- **v1.0**: Initial release
- **v1.1**: Bug fixes, minor improvements
- **v2.0**: Major redesign, new features

### Changelog Format
```markdown
## Version 2.0.0
- Added new element types
- Improved color palette
- Enhanced typography scale
- Fixed positioning issues
```

---

**Note**: This guide is a living document. Update it as new features and best practices are discovered.


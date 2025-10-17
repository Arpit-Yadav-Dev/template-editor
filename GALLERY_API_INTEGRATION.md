# Gallery API Integration Guide

## Overview
This document describes the integration of the Gallery APIs into the MenuBoardGallery component, allowing users to view both default templates (available to all users) and their custom templates.

## APIs Integrated

### 1. Default Templates API
**Endpoint:** `GET /api/templates/default`
- **Purpose:** Fetch public templates available to all users
- **Authentication:** Required (Bearer token)
- **Response Structure:**
```json
{
  "status": true,
  "message": "Default templates fetched successfully",
  "data": {
    "templates": [
      {
        "id": "uuid",
        "name": "Template Name",
        "description": "Template description",
        "thumbnail_url": "https://cdn-url/image.png",
        "is_public": true,
        "created_at": "ISO date string"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 7,
      "itemsPerPage": 10,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

### 2. User Templates API
**Endpoint:** `GET /api/templates`
- **Purpose:** Fetch user's custom templates
- **Authentication:** Required (Bearer token)
- **Response Structure:** Same as default templates, but with `is_public: false`

## Implementation Details

### API Service Updates (`src/services/api.ts`)

Added two new methods:
```typescript
// Get default templates (public templates available to all users)
public async getDefaultTemplates(page: number = 1, limit: number = 10): Promise<ApiResponse<any>>

// Get user's custom templates
public async getUserTemplates(page: number = 1, limit: number = 10): Promise<ApiResponse<any>>
```

### Gallery Component Updates (`src/components/MenuBoardGallery.tsx`)

#### New State Variables
```typescript
const [defaultTemplates, setDefaultTemplates] = useState<MenuBoardTemplate[]>([]);
const [userTemplates, setUserTemplates] = useState<MenuBoardTemplate[]>([]);
const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
const [templatesError, setTemplatesError] = useState<string | null>(null);
```

#### Template Transformation
The `transformApiTemplate` function converts API responses to `MenuBoardTemplate` format:
- Parses `template_json` if it exists
- Maps API fields to MenuBoardTemplate fields
- Handles thumbnail URLs from the API
- Falls back to basic template structure if full data isn't available

#### Template Fetching
The `fetchTemplates` function:
- Fetches default templates (always)
- Fetches user templates (only if authenticated and not in guest mode)
- Handles errors gracefully
- Updates loading states

#### Template Display
Templates are combined and displayed with visual indicators:
- **Local Templates**: From hardcoded data
- **Default Templates**: Blue "Default" badge
- **User Templates**: Green "My Template" badge

## Features

### 1. Separate Template Sections
Templates are now displayed in **two distinct sections**:

#### a) My Custom Templates Section (User Templates)
- **Only visible** when user is authenticated and not in guest mode
- **Only shows** if user has saved templates
- Displayed **first** (at the top)
- Green color theme (emerald)
- Shows "My Template" badge
- Border styling: emerald border
- Button color: emerald "Edit" button
- Section heading: "My Custom Templates"
- Count badge: Green background

#### b) Default Templates Section
- **Always visible** to all users
- Blue color theme
- Shows "Default" badge
- Standard border styling
- Button color: blue "Use" button
- Section heading: "Default Templates"
- Count badge: Blue background
- Includes the "Blank Template" card

### 2. Loading States
- Shows a loading spinner while fetching templates
- Displays "..." in template counts during loading
- Separate counts for Default and My Templates in header
- Refresh button shows spinning animation during load

### 3. Error Handling
- Displays error message banner if templates fail to load
- Provides "Retry" button to re-fetch templates
- Console logs detailed error information

### 4. Refresh Functionality
- Refresh button in the header to reload templates
- Disabled during loading to prevent duplicate requests
- Visual feedback with spinning icon

### 5. Template Source Indicators
Visual badges show template origin:
- **Default Templates**: Blue "Default" badge + category badge
- **My Templates**: Green "My Template" badge only

### 6. Thumbnail Support
- API templates display their `thumbnail_url` as preview
- Falls back to "No Preview" message if thumbnail is missing
- Maintains aspect ratio and proper sizing

### 7. Empty State
- Shows friendly message when no templates are available
- Provides refresh button to retry loading
- Only shows blank template option

## User Experience Flow

1. **User enters Gallery**
   - Loading spinner appears
   - Default templates are fetched
   - User templates are fetched (if authenticated)

2. **Templates Display - Two Sections**
   
   **For Authenticated Users:**
   - **Section 1: "My Custom Templates"** (if user has templates)
     - Green themed cards with emerald borders
     - "Edit" button (emerald)
     - Shows user's saved templates only
   - **Section 2: "Default Templates"**
     - Blue themed cards
     - Includes "Blank Template" card
     - "Use" button (blue)
     - Shows public templates from API
   
   **For Guest Users:**
   - Only shows "Default Templates" section
   - Blank template + public templates

3. **Header Statistics**
   - Shows separate counts:
     - "Default Templates: X" (blue)
     - "My Templates: Y" (green) - only if authenticated
   - Refresh button to reload both

4. **Template Actions**
   - **Preview**: Opens full-size modal preview
   - **Edit** (My Templates): Opens template in editor
   - **Use** (Default Templates): Opens template in editor
   - **Refresh**: Reloads templates from API

5. **Error Recovery**
   - If fetch fails, error banner appears
   - User can retry fetching
   - Templates from successful API calls remain visible

## Template Structure

### API Template Response
```typescript
{
  id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  is_public: boolean;
  created_at: string;
  template_json?: string | object; // Full template data
}
```

### MenuBoardTemplate (Internal)
```typescript
{
  id: string;
  name: string;
  category: string;
  preview: string; // from description
  backgroundColor: string;
  canvasSize: CanvasSize;
  isHorizontal: boolean;
  elements: MenuBoardElement[];
  groups: MenuBoardGroup[];
  previewImageUrl?: string; // from thumbnail_url
}
```

## Configuration

### Pagination
Current settings:
- Default templates: 50 per page
- User templates: 50 per page
- Can be adjusted in `fetchTemplates()` function

### Refresh Behavior
- Manual refresh via button
- No auto-refresh (to conserve API calls)
- Re-fetches on authentication state change

## Testing Checklist

**Section Display:**
- [ ] Default templates section always shows
- [ ] User templates section only shows when authenticated
- [ ] User templates section only shows if user has templates
- [ ] User templates section appears ABOVE default templates
- [ ] Blank template appears in default templates section

**Data Loading:**
- [ ] Default templates load from API on page open
- [ ] User templates load from API when authenticated
- [ ] No static/hardcoded templates are displayed (only API data)
- [ ] Loading spinner appears during fetch
- [ ] Template counts update correctly in header

**Visual Styling:**
- [ ] User templates have green/emerald theme
- [ ] Default templates have blue theme
- [ ] User templates show "My Template" badge
- [ ] Default templates show "Default" badge
- [ ] Separate counts in header (Default: X, My: Y)

**Functionality:**
- [ ] Error message shows on fetch failure
- [ ] Retry button works after error
- [ ] Refresh button reloads both template types
- [ ] Thumbnail images display correctly
- [ ] Thumbnail fallback shows "No Preview" message
- [ ] Preview modal works for all templates
- [ ] Template selection works for both types
- [ ] Guest mode shows only default templates section
- [ ] Empty state shows when no templates available

## Future Enhancements

1. **Infinite Scroll**: Load more templates as user scrolls
2. **Search & Filter**: Search templates by name or filter by category
3. **Template Sorting**: Sort by date, name, or popularity
4. **Template Categories**: Filter by template type
5. **Delete Templates**: Allow users to delete their custom templates
6. **Template Sharing**: Share custom templates with other users
7. **Favorites**: Mark and filter favorite templates
8. **Template Preview Cache**: Cache template previews locally

## Important Notes

### Data Source Changes
- **NO static/hardcoded templates are shown** - the gallery now displays ONLY API data
- Local templates parameter (`templates`) is kept for backward compatibility but **not used**
- All templates come from either `/api/templates/default` or `/api/templates`

### Template Organization
- **User templates** are shown in a **separate section** at the top
- **Default templates** are shown in a **separate section** below user templates
- Each section has its own heading, styling, and count badge

### Authentication
- Templates are fetched on component mount
- Both APIs require authentication (Bearer token)
- Guest mode only shows default templates
- Authenticated users see both sections

### Rendering
- API responses are transformed to match internal template structure
- Thumbnail URLs from CDN are displayed as preview images
- If thumbnail is missing, shows "No Preview" fallback
- Error handling is graceful with user-friendly messages


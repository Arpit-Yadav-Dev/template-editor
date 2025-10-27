import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Search, 
  Image as ImageIcon, 
  FolderOpen, 
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye
} from 'lucide-react';
import { apiService } from '../services/api';

export interface ImageItem {
  id: string;
  name: string;
  url: string;
  category: 'my-uploads' | 'stock-food' | 'stock-backgrounds' | 'stock-decorative';
  size?: number;
  uploadedAt?: Date;
  isLocal?: boolean; // true for local images, false for API-uploaded
}

interface ImageLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string, context?: 'new-element' | 'existing-element' | 'shape-image') => void;
  context?: 'new-element' | 'existing-element' | 'shape-image';
}

const ImageLibraryPanel: React.FC<ImageLibraryPanelProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  context = 'new-element'
}) => {
  const [activeCategory, setActiveCategory] = useState<'my-uploads' | 'stock-food' | 'stock-backgrounds' | 'stock-decorative'>('my-uploads');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayCount, setDisplayCount] = useState(12); // For infinite scrolling - reduced for better performance
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // API Images state
  const [apiImages, setApiImages] = useState<ImageItem[]>([]);
  const [isLoadingApiImages, setIsLoadingApiImages] = useState(false);
  const [apiImagesError, setApiImagesError] = useState<string | null>(null);

  // Enhanced stock images with more variety
  const stockImages: ImageItem[] = [
    // Stock Food Images - More variety
    { id: 'food-1', name: 'Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-2', name: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-3', name: 'Tacos', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-4', name: 'Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-5', name: 'Pasta', url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-6', name: 'Sandwich', url: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-7', name: 'Sushi', url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-8', name: 'Steak', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-9', name: 'Chicken', url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-10', name: 'Fish', url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-11', name: 'Soup', url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-12', name: 'Dessert', url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-13', name: 'Coffee', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-14', name: 'Tea', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-15', name: 'Juice', url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-16', name: 'Wine', url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-17', name: 'Beer', url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&h=300&fit=crop', category: 'stock-food' },
    { id: 'food-18', name: 'Cocktail', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&h=300&fit=crop', category: 'stock-food' },
    
    // Stock Background Images - More textures
    { id: 'bg-1', name: 'Wood Texture', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop', category: 'stock-backgrounds' },
    { id: 'bg-2', name: 'Marble Texture', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop', category: 'stock-backgrounds' },
    { id: 'bg-3', name: 'Paper Texture', url: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=300&fit=crop', category: 'stock-backgrounds' },
    { id: 'bg-4', name: 'Stone Texture', url: 'https://images.unsplash.com/photo-1544966503-7cc7c2b7c0b3?w=300&h=300&fit=crop', category: 'stock-backgrounds' },
    { id: 'bg-5', name: 'Fabric Texture', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop', category: 'stock-backgrounds' },
    { id: 'bg-6', name: 'Metal Texture', url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=300&fit=crop', category: 'stock-backgrounds' },
    { id: 'bg-7', name: 'Brick Texture', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop', category: 'stock-backgrounds' },
    { id: 'bg-8', name: 'Concrete Texture', url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=300&h=300&fit=crop', category: 'stock-backgrounds' },
    
    // Stock Decorative Images - More variety
    { id: 'dec-1', name: 'Coffee Beans', url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&h=300&fit=crop', category: 'stock-decorative' },
    { id: 'dec-2', name: 'Spices', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&h=300&fit=crop', category: 'stock-decorative' },
    { id: 'dec-3', name: 'Chef Hat', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop', category: 'stock-decorative' },
    { id: 'dec-4', name: 'Utensils', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop', category: 'stock-decorative' },
    { id: 'dec-5', name: 'Plate', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop', category: 'stock-decorative' },
    { id: 'dec-6', name: 'Bowl', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop', category: 'stock-decorative' },
    { id: 'dec-7', name: 'Glass', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop', category: 'stock-decorative' },
    { id: 'dec-8', name: 'Napkin', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop', category: 'stock-decorative' },
  ];

  // Get local images from localStorage
  const getLocalImages = useCallback((): ImageItem[] => {
    try {
      const stored = localStorage.getItem('imageLibrary');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Load API images
  const loadApiImages = useCallback(async () => {
    if (activeCategory !== 'my-uploads') return;
    
    setIsLoadingApiImages(true);
    setApiImagesError(null);
    
    try {
      const response = await apiService.getUserImages(1, 100);
      if (response.success && response.data) {
        const images: ImageItem[] = response.data.images.map((img: any) => ({
          id: img.id,
          name: img.filename || img.name || `image-${img.id.slice(0, 8)}`,
          url: img.image_url, // Your API uses 'image_url' field
          category: 'my-uploads' as const,
          size: parseInt(img.file_size) || 0,
          uploadedAt: new Date(img.created_at),
          isLocal: false
        }));
        setApiImages(images);
      } else {
        setApiImagesError(response.error || 'Failed to load images');
      }
    } catch (error) {
      setApiImagesError('Network error loading images');
    } finally {
      setIsLoadingApiImages(false);
    }
  }, [activeCategory]);

  // Upload image to API
  const uploadImageToApi = useCallback(async (file: File): Promise<boolean> => {
    try {
      const response = await apiService.uploadImage(file, 'menu-editor');
      console.log('Upload response:', response); // Debug log
      
      if (response.success && response.data) {
        // Add to local state immediately - map based on your API response structure
        const newImage: ImageItem = {
          id: response.data.id,
          name: response.data.filename || file.name,
          url: response.data.url || response.data.image_url, // Try both possible field names
          category: 'my-uploads',
          isLocal: false,
          size: file.size,
          uploadedAt: new Date()
        };
        setApiImages(prev => [newImage, ...prev]);
        console.log('Image added to gallery:', newImage); // Debug log
        return true;
      } else {
        console.error('Upload failed:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Upload error:', error);
      return false;
    }
  }, []);

  // Delete image from API
  const deleteApiImage = useCallback(async (imageId: string): Promise<boolean> => {
    try {
      console.log('Calling delete API for image:', imageId);
      const response = await apiService.deleteImage(imageId);
      console.log('Delete API response:', response);
      
      if (response.success) {
        setApiImages(prev => prev.filter(img => img.id !== imageId));
        console.log('Image removed from local state');
        return true;
      } else {
        console.error('Delete failed:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }, []);

  const [localImages, setLocalImages] = useState<ImageItem[]>(getLocalImages);

  // Save local images to localStorage
  const saveLocalImages = useCallback((images: ImageItem[]) => {
    try {
      localStorage.setItem('imageLibrary', JSON.stringify(images));
      setLocalImages(images);
    } catch (error) {
      console.error('Failed to save images to localStorage:', error);
    }
  }, []);

  // Get current images based on active category
  const getCurrentImages = useCallback(() => {
    if (activeCategory === 'my-uploads') {
      // Combine API images and local images
      return [...apiImages, ...localImages];
    }
    return stockImages.filter(img => img.category === activeCategory);
  }, [activeCategory, localImages, apiImages]);

  // Filter images based on search query (search by name and category)
  const filteredImages = getCurrentImages().filter(img => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = img.name.toLowerCase().includes(searchLower);
    const categoryMatch = img.category.replace('-', ' ').includes(searchLower);
    return nameMatch || categoryMatch;
  });

  // Get images to display (for infinite scrolling)
  const displayedImages = filteredImages.slice(0, displayCount);

  // Reset display count when category or search changes
  useEffect(() => {
    setDisplayCount(12);
  }, [activeCategory, searchQuery]);

  // Load API images when component mounts or category changes
  useEffect(() => {
    if (isOpen && activeCategory === 'my-uploads') {
      loadApiImages();
    }
  }, [isOpen, activeCategory, loadApiImages]);

  // Infinite scroll handler - optimized for better performance
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Load more when user is 200px from bottom for smoother experience
    if (scrollHeight - scrollTop <= clientHeight + 200 && displayedImages.length < filteredImages.length) {
      setDisplayCount(prev => Math.min(prev + 12, filteredImages.length)); // Load 12 at a time
    }
  }, [displayedImages.length, filteredImages.length]);

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) continue;
      
      const imageId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setUploadingImages(prev => [...prev, imageId]);
      setUploadProgress(prev => ({ ...prev, [imageId]: 0 }));
      
      try {
        // Simulate upload progress - faster and smoother
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 30));
          setUploadProgress(prev => ({ ...prev, [imageId]: progress }));
        }
        
        // Upload to API if in my-uploads category
        if (activeCategory === 'my-uploads') {
          const success = await uploadImageToApi(file);
          if (success) {
            setUploadingImages(prev => prev.filter(id => id !== imageId));
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[imageId];
              return newProgress;
            });
            continue;
          } else {
            // Fallback to local storage if API fails
            console.warn('API upload failed, saving locally');
          }
        }
        
        // Convert to data URL for local storage (fallback or non-API category)
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          
          const newImage: ImageItem = {
            id: imageId,
            name: file.name,
            url: dataUrl,
            category: 'my-uploads',
            size: file.size,
            uploadedAt: new Date(),
            isLocal: true
          };
          
          const updatedImages = [...localImages, newImage];
          saveLocalImages(updatedImages);
          
          setUploadingImages(prev => prev.filter(id => id !== imageId));
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[imageId];
            return newProgress;
          });
        };
        
        reader.readAsDataURL(file);
        
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadingImages(prev => prev.filter(id => id !== imageId));
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[imageId];
          return newProgress;
        });
      }
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // Delete image (API or local)
  const handleDeleteImage = async (imageId: string) => {
    console.log('Delete button clicked for image:', imageId);
    const image = getCurrentImages().find(img => img.id === imageId);
    console.log('Found image:', image);
    
    if (!image) {
      console.log('Image not found');
      return;
    }

    if (image.isLocal === false) {
      console.log('Deleting from API...');
      // Delete from API
      const success = await deleteApiImage(imageId);
      if (!success) {
        alert('Failed to delete image from server');
        return;
      }
      console.log('API delete successful');
    } else {
      console.log('Deleting from local storage...');
      // Delete from local storage
      const updatedImages = localImages.filter(img => img.id !== imageId);
      saveLocalImages(updatedImages);
      console.log('Local delete successful');
    }
  };

  // Upload to API when image is selected (placeholder for future API integration)
  const handleImageSelect = async (image: ImageItem) => {
    if (image.isLocal) {
      // TODO: Upload to API when user provides the endpoint
      // For now, use the local data URL
      onSelectImage(image.url, context);
    } else {
      onSelectImage(image.url, context);
    }
  };

  const categories = [
    { id: 'my-uploads', name: 'My Images', icon: Upload, count: apiImages.length + localImages.length },
    { id: 'stock-food', name: 'Food', icon: ImageIcon, count: stockImages.filter(img => img.category === 'stock-food').length },
    { id: 'stock-backgrounds', name: 'Bg', icon: FolderOpen, count: stockImages.filter(img => img.category === 'stock-backgrounds').length },
    { id: 'stock-decorative', name: 'Decor', icon: Plus, count: stockImages.filter(img => img.category === 'stock-decorative').length },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Images</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Upload Area - Fixed Height */}
        <div className="p-4 border-b border-gray-100">
          <div 
            className={`flex items-center justify-center p-6 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer h-24 ${
              isDragOver 
                ? 'border-blue-500 bg-blue-100 scale-105 shadow-lg' 
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <Upload className={`w-5 h-5 mx-auto mb-1 transition-colors ${
                isDragOver ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-medium transition-colors ${
                isDragOver ? 'text-blue-700' : 'text-gray-600'
              }`}>
                {isDragOver ? 'Drop Images Here!' : 'Upload Images'}
              </p>
              <p className={`text-xs transition-colors ${
                isDragOver ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {isDragOver ? 'Release to upload' : 'Drag & drop or click'}
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex space-x-0.5 overflow-x-auto pb-1">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id as any)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeCategory === category.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{category.name}</span>
                  <span className={`px-1 py-0.5 rounded text-xs ${
                    activeCategory === category.id
                      ? 'bg-blue-400 text-white'
                      : 'bg-white text-gray-500'
                  }`}>
                    {category.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Images Grid with Infinite Scrolling */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4"
          onScroll={handleScroll}
        >
          {/* Upload Progress - Fixed Height Container */}
          {uploadingImages.length > 0 && (
            <div className="mb-4 max-h-32 overflow-hidden">
              <div className="space-y-2">
                {uploadingImages.map((imageId) => (
                  <div key={imageId} className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[imageId] || 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 font-medium flex-shrink-0">{uploadProgress[imageId] || 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Loading State */}
          {isLoadingApiImages && activeCategory === 'my-uploads' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <span className="ml-2 text-gray-600">Loading your images...</span>
            </div>
          )}

          {/* API Error State */}
          {apiImagesError && activeCategory === 'my-uploads' && (
            <div className="flex items-center justify-center py-8">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <span className="ml-2 text-red-600">{apiImagesError}</span>
              <button 
                onClick={loadApiImages}
                className="ml-4 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          )}

          {displayedImages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {searchQuery ? 'No images found' : 'No images yet'}
              </h3>
              <p className="text-xs text-gray-500">
                {searchQuery ? 'Try a different search term' : 'Upload some images to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {displayedImages.map((image) => (
                <div
                  key={image.id}
                  className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200"
                  onClick={() => handleImageSelect(image)}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  
                  {/* Image name */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                    <p className="text-white text-xs font-medium truncate">{image.name}</p>
                  </div>
                  
                  {/* Delete button for all images in My Images category */}
                  {activeCategory === 'my-uploads' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(image.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  )}
                  
                  {/* Selection indicator */}
                  <div className="absolute top-2 left-2 w-5 h-5 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Indicator */}
          {displayedImages.length < filteredImages.length && displayedImages.length > 0 && (
            <div className="text-center py-4">
              <div className="inline-flex items-center space-x-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading more images...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ImageLibraryPanel;

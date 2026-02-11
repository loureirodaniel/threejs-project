/**
 * DataService - Abstraction layer for timeline data
 *
 * Architecture:
 * - Static mode: Uses mock data from mockImages.js
 * - Supabase mode: Fetches from Supabase (ready when photographer delivers)
 * - Seamless switching via DATA_SOURCE.type
 */

import { mockImageData } from '../data/mockImages.js';

/**
 * Data source configuration
 *
 * Switch between data sources by changing 'type':
 * - 'static': Use mock data (development)
 * - 'supabase': Use Supabase (production with real photos)
 */
const DATA_SOURCE = {
  type: 'static', // Back to mocks
  config: {
    // Supabase config (will be used when type = 'supabase')
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    tableName: 'timeline_images',
    storageBucket: 'timeline-photos'
  }
};

/**
 * Timeline image data interface
 * @typedef {Object} TimelineImage
 * @property {number} id - Unique identifier
 * @property {number} year - Year (2010-2019+)
 * @property {string} url - Image URL (local, CDN, or Supabase storage)
 * @property {string} title - Image title
 * @property {string} description - Image description
 * @property {string} photographer - Photographer name
 * @property {number} order - Display order (for multiple images per year)
 * @property {Object} metadata - Additional metadata (tags, location, event, etc.)
 */

class DataService {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = 0;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    this.supabaseClient = null;
  }

  /**
   * Initialize Supabase client (lazy loading)
   */
  async initSupabase() {
    if (this.supabaseClient) return this.supabaseClient;

    if (!DATA_SOURCE.config.supabaseUrl || !DATA_SOURCE.config.supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    // Dynamic import to avoid loading Supabase in static mode
    const { createClient } = await import('@supabase/supabase-js');

    this.supabaseClient = createClient(
      DATA_SOURCE.config.supabaseUrl,
      DATA_SOURCE.config.supabaseKey
    );

    return this.supabaseClient;
  }

  /**
   * Get all timeline images
   * @param {boolean} forceRefresh - Force refresh from source
   * @returns {Promise<TimelineImage[]>}
   */
  async getTimelineImages(forceRefresh = false) {
    // Check cache
    if (
      !forceRefresh &&
      this.cache &&
      Date.now() - this.cacheTimestamp < this.cacheDuration
    ) {
      console.log('📦 DataService: Returning cached data');
      return this.cache;
    }

    console.log(`🔄 DataService: Fetching from ${DATA_SOURCE.type}...`);

    let images;

    try {
      switch (DATA_SOURCE.type) {
        case 'static':
          images = await this.getStaticImages();
          break;

        case 'supabase':
          images = await this.getSupabaseImages();
          break;

        default:
          console.warn(
            `⚠️ Unknown data source '${DATA_SOURCE.type}', falling back to static`
          );
          images = await this.getStaticImages();
      }

      // Normalize data (ensure consistent format)
      images = this.normalizeImages(images);

      // Cache results
      this.cache = images;
      this.cacheTimestamp = Date.now();

      console.log(
        `✅ DataService: Loaded ${images.length} images from ${DATA_SOURCE.type}`
      );

      return images;
    } catch (error) {
      console.error('❌ DataService error:', error);

      // Fallback to static data on error
      if (DATA_SOURCE.type !== 'static') {
        console.warn('⚠️ Falling back to static data');
        return this.getStaticImages();
      }

      throw error;
    }
  }

  /**
   * Get images from static mock data
   * @returns {Promise<TimelineImage[]>}
   */
  async getStaticImages() {
    // Simulate async (for consistent API)
    return Promise.resolve([...mockImageData]);
  }

  /**
   * Get images from Supabase
   * @returns {Promise<TimelineImage[]>}
   */
  async getSupabaseImages() {
    const supabase = await this.initSupabase();

    const { data, error } = await supabase
      .from(DATA_SOURCE.config.tableName)
      .select('*')
      .order('year', { ascending: true })
      .order('order', { ascending: true });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Normalize images to consistent format
   * Handles different data sources returning different schemas
   * @param {any[]} images - Raw images from data source
   * @returns {TimelineImage[]}
   */
  normalizeImages(images) {
    return images.map((img, index) => ({
      id: img.id || index,
      year: img.year,
      url: img.url || img.image_url || img.src,
      title: img.title || `Venezuela ${img.year}`,
      description: img.description || '',
      photographer: img.photographer || 'Unknown',
      order: img.order || 0,
      metadata: img.metadata || {}
    }));
  }

  /**
   * Get images for specific year
   * @param {number} year - Year to filter by
   * @returns {Promise<TimelineImage[]>}
   */
  async getImagesByYear(year) {
    const images = await this.getTimelineImages();
    return images.filter((img) => img.year === year);
  }

  /**
   * Get year range covered by timeline
   * @returns {Promise<{minYear: number, maxYear: number, totalYears: number}>}
   */
  async getYearRange() {
    const images = await this.getTimelineImages();
    const years = [...new Set(images.map((img) => img.year))];

    return {
      minYear: Math.min(...years),
      maxYear: Math.max(...years),
      totalYears: years.length
    };
  }

  /**
   * Clear cache (useful after data updates)
   */
  clearCache() {
    console.log('🗑️ DataService: Cache cleared');
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Preload images for better UX
   * @returns {Promise<void>}
   */
  async preloadImages() {
    const images = await this.getTimelineImages();

    console.log('🖼️ DataService: Preloading images...');

    const promises = images.map((img) => {
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
          console.log(`  ✅ Loaded: ${img.year}`);
          resolve();
        };
        image.onerror = () => {
          console.warn(`  ⚠️ Failed: ${img.year}`);
          resolve(); // Don't block on errors
        };
        image.src = img.url;
      });
    });

    await Promise.all(promises);
    console.log('✅ DataService: All images preloaded');
  }

  /**
   * Upload image to Supabase (admin/photographer use)
   * @param {File} file - Image file
   * @param {Object} metadata - Image metadata
   * @returns {Promise<TimelineImage>}
   */
  async uploadImage(file, metadata) {
    if (DATA_SOURCE.type !== 'supabase') {
      throw new Error('Image upload only available in Supabase mode');
    }

    const supabase = await this.initSupabase();

    // Generate unique filename
    const filename = `${metadata.year}/${Date.now()}-${file.name}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(DATA_SOURCE.config.storageBucket)
      .upload(filename, file);

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const {
      data: { publicUrl }
    } = supabase.storage
      .from(DATA_SOURCE.config.storageBucket)
      .getPublicUrl(filename);

    // Insert record into database
    const { data: imageData, error: dbError } = await supabase
      .from(DATA_SOURCE.config.tableName)
      .insert({
        year: metadata.year,
        url: publicUrl,
        title: metadata.title,
        description: metadata.description,
        photographer: metadata.photographer,
        order: metadata.order || 0,
        metadata: metadata.metadata || {}
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw dbError;
    }

    // Clear cache to force refresh
    this.clearCache();

    console.log('✅ Image uploaded:', imageData);
    return imageData;
  }
}

// Export singleton instance
export const dataService = new DataService();

// Export class for testing
export { DataService };

// Export current data source type for debugging
export const getCurrentDataSource = () => DATA_SOURCE.type;

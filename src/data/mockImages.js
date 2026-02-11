/**
 * Mock timeline images for development
 *
 * This simulates the data structure that will come from Supabase
 * When photographer delivers real photos, we'll upload to Supabase
 * and switch DATA_SOURCE.type = 'supabase'
 */

/**
 * Generate mock image data for timeline
 * Uses placeholder image service for development
 */
export const mockImageData = [
  {
    id: 1,
    year: 2010,
    url: 'https://picsum.photos/seed/venezuela-2010/800/600',
    title: 'Venezuela 2010',
    description: 'Political landscape of Venezuela in 2010',
    photographer: 'Professional Photographer',
    order: 0,
    metadata: {
      location: 'Caracas',
      event: 'Elections',
      tags: ['politics', 'democracy']
    }
  },
  {
    id: 2,
    year: 2011,
    url: 'https://picsum.photos/seed/venezuela-2011/800/600',
    title: 'Venezuela 2011',
    description: 'Economic changes in 2011',
    photographer: 'Professional Photographer',
    order: 0,
    metadata: {
      location: 'Caracas',
      event: 'Economic Policy',
      tags: ['economy']
    }
  },
  {
    id: 3,
    year: 2012,
    url: 'https://picsum.photos/seed/venezuela-2012/800/600',
    title: 'Venezuela 2012',
    description: 'Elections year 2012',
    photographer: 'Professional Photographer',
    order: 0,
    metadata: {
      location: 'Caracas',
      event: 'Presidential Elections',
      tags: ['elections', 'democracy']
    }
  },
  {
    id: 4,
    year: 2013,
    url: 'https://picsum.photos/seed/venezuela-2013/800/600',
    title: 'Venezuela 2013',
    description: 'Political transition',
    photographer: 'Professional Photographer',
    order: 0,
    metadata: {
      location: 'Caracas',
      event: 'Transition',
      tags: ['politics']
    }
  },
  {
    id: 5,
    year: 2014,
    url: 'https://picsum.photos/seed/venezuela-2014/800/600',
    title: 'Venezuela 2014',
    description: 'Protests and demonstrations',
    photographer: 'Professional Photographer',
    order: 0,
    metadata: {
      location: 'Caracas',
      event: 'Protests',
      tags: ['protests', 'civil rights']
    }
  },
  {
    id: 6,
    year: 2015,
    url: 'https://picsum.photos/seed/venezuela-2015/800/600',
    title: 'Venezuela 2015',
    description: 'Economic crisis begins',
    photographer: 'Professional Photographer',
    order: 0,
    metadata: {
      location: 'Caracas',
      event: 'Economic Crisis',
      tags: ['economy', 'crisis']
    }
  },
  {
    id: 7,
    year: 2016,
    url: 'https://picsum.photos/seed/venezuela-2016/800/600',
    title: 'Venezuela 2016',
    description: 'Political tensions rise',
    photographer: 'Professional Photographer',
    order: 0,
    metadata: {
      location: 'Caracas',
      event: 'Political Crisis',
      tags: ['politics', 'crisis']
    }
  },
  {
    id: 8,
    year: 2017,
    url: 'https://picsum.photos/seed/venezuela-2017/800/600',
    title: 'Venezuela 2017',
    description: 'Constitutional assembly',
    photographer: 'Professional Photographer',
    order: 0,
    metadata: {
      location: 'Caracas',
      event: 'Constitutional Assembly',
      tags: ['constitution', 'politics']
    }
  },
  {
    id: 9,
    year: 2018,
    url: 'https://picsum.photos/seed/venezuela-2018/800/600',
    title: 'Venezuela 2018',
    description: 'Presidential elections',
    photographer: 'Professional Photographer',
    order: 0,
    metadata: {
      location: 'Caracas',
      event: 'Presidential Elections',
      tags: ['elections']
    }
  },
  {
    id: 10,
    year: 2019,
    url: 'https://picsum.photos/seed/venezuela-2019/800/600',
    title: 'Venezuela 2019',
    description: 'Political crisis escalates',
    photographer: 'Professional Photographer',
    order: 0,
    metadata: {
      location: 'Caracas',
      event: 'Political Crisis',
      tags: ['politics', 'crisis', 'international']
    }
  }
];

/**
 * Simulate multiple images per year (for testing)
 * This will be useful when photographer provides multiple photos per year
 */
export const mockImageDataWithMultiples = [
  // 2010 - Two images
  {
    id: 1,
    year: 2010,
    url: 'https://picsum.photos/seed/venezuela-2010-a/800/600',
    title: 'Venezuela 2010 - Event A',
    description: 'First major event of 2010',
    photographer: 'Photographer A',
    order: 0,
    metadata: { event: 'Event A' }
  },
  {
    id: 2,
    year: 2010,
    url: 'https://picsum.photos/seed/venezuela-2010-b/800/600',
    title: 'Venezuela 2010 - Event B',
    description: 'Second major event of 2010',
    photographer: 'Photographer B',
    order: 1,
    metadata: { event: 'Event B' }
  },
  // 2011 - Single image
  {
    id: 3,
    year: 2011,
    url: 'https://picsum.photos/seed/venezuela-2011/800/600',
    title: 'Venezuela 2011',
    description: 'Key moment of 2011',
    photographer: 'Photographer A',
    order: 0,
    metadata: {}
  },
  // ... more as needed
];

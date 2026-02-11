# Supabase Setup Guide

## When Photographer Delivers Real Photos

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Save your project URL and anon key

### Step 2: Run Database Migration

In Supabase SQL Editor, run:

```sql
-- Create timeline_images table
CREATE TABLE timeline_images (
  id BIGSERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  photographer TEXT,
  "order" INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_timeline_images_year ON timeline_images(year);
CREATE INDEX idx_timeline_images_order ON timeline_images("order");

-- Enable Row Level Security
ALTER TABLE timeline_images ENABLE ROW LEVEL SECURITY;

-- Public read access (timeline is public)
CREATE POLICY "Public read access" ON timeline_images
  FOR SELECT USING (true);

-- Admin write access (only authenticated users)
CREATE POLICY "Authenticated users can modify" ON timeline_images
  FOR ALL USING (auth.role() = 'authenticated');
```

### Step 3: Create Storage Bucket and Policies

In Supabase SQL Editor, run:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('timeline-photos', 'timeline-photos', true);

-- Public read access
CREATE POLICY "Public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'timeline-photos');

-- Authenticated upload access
CREATE POLICY "Authenticated upload" ON storage.objects
  FOR INSERT USING (
    bucket_id = 'timeline-photos' AND
    auth.role() = 'authenticated'
  );
```

### Step 4: Configure Environment Variables

Create or update your `.env` file:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

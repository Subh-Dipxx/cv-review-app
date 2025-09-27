# Supabase File Storage Setup

This guide will help you set up Supabase for storing CV/PDF files.

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up/Sign in to your account
3. Create a new project
4. Note down your project URL and service role key

## 2. Create Storage Bucket

1. In your Supabase dashboard, go to **Storage**
2. Click **New Bucket**
3. Bucket name: `cv-files`
4. Public bucket: **Yes** (for easier access)
5. Click **Create bucket**

## 3. Set Up Bucket Policies

Go to **Storage > Policies** and create these policies for the `cv-files` bucket:

### Policy 1: Allow Upload
```sql
CREATE POLICY "Allow authenticated upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'cv-files');
```

### Policy 2: Allow Download
```sql
CREATE POLICY "Allow public download" ON storage.objects
FOR SELECT USING (bucket_id = 'cv-files');
```

### Policy 3: Allow Delete
```sql
CREATE POLICY "Allow authenticated delete" ON storage.objects
FOR DELETE USING (bucket_id = 'cv-files');
```

## 4. Update Environment Variables

Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## 5. Update Database

Run this SQL command in your MySQL database:

```sql
ALTER TABLE cvs ADD COLUMN supabase_file_path VARCHAR(500) AFTER summary;
CREATE INDEX idx_cvs_supabase_file_path ON cvs(supabase_file_path);
```

## 6. Test the Setup

1. Restart your Next.js application
2. Upload a new CV through the upload page
3. Check if the file appears in your Supabase storage bucket
4. Try downloading the CV from the resume list

## Features

✅ **Automatic Upload**: CVs are automatically uploaded to Supabase during processing
✅ **Secure Storage**: Files are stored in organized folders by user ID
✅ **Download Support**: Individual download buttons for each resume
✅ **Error Handling**: Clear error messages for missing files or configuration issues

## Troubleshooting

- **Environment Variables**: Make sure Supabase URL and service key are correctly set
- **Storage Policies**: Ensure bucket policies allow the required operations
- **Database Column**: Verify the `supabase_file_path` column exists in the `cvs` table
- **File Upload**: Check Supabase dashboard to see if files are being uploaded
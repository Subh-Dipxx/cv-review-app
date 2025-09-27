-- Add supabase_file_path column to cvs table for storing Supabase file references
-- Run this SQL command in your MySQL database

ALTER TABLE cvs ADD COLUMN supabase_file_path VARCHAR(500) AFTER summary;

-- Add index for better performance
CREATE INDEX idx_cvs_supabase_file_path ON cvs(supabase_file_path);

-- Verify the column was added
DESCRIBE cvs;
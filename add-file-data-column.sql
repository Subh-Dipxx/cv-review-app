-- Add file_data column to store original CV files for download functionality
ALTER TABLE cvs ADD COLUMN file_data LONGBLOB AFTER summary;
-- Add password_hash field to users table
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '';

-- Update the column to remove default after adding (for new rows it should be required)
ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT;

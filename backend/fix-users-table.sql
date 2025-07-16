-- Fix users table to add AUTO_INCREMENT to user_id field
-- This will solve the "Field 'user_id' doesn't have a default value" error

-- First, check if we need to add PRIMARY KEY (if not already exists)
ALTER TABLE users MODIFY COLUMN user_id INT AUTO_INCREMENT PRIMARY KEY;

-- If the above fails because PRIMARY KEY already exists, use this instead:
-- ALTER TABLE users MODIFY COLUMN user_id INT AUTO_INCREMENT;

-- Verify the change
DESCRIBE users; 
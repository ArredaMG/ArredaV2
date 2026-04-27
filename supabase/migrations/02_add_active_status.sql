-- Migration to add is_active column to cost_groups
ALTER TABLE cost_groups ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

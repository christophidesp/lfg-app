-- Migration: Add email notification support
-- Run this in Supabase SQL Editor

-- 1. Soft-cancel column on workouts (allows webhook to fan-out emails on UPDATE)
ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- 2. Per-user email notification preferences on profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_notifications JSONB DEFAULT '{
  "request_received": true,
  "request_accepted": true,
  "request_declined": true,
  "workout_cancelled": true
}'::jsonb;

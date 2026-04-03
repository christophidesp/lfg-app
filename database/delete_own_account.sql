-- Allow authenticated users to delete their own account.
-- All related data (profiles, workouts, participants, comments, notifications)
-- is removed automatically via ON DELETE CASCADE.

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM auth.users WHERE id = auth.uid();
$$;

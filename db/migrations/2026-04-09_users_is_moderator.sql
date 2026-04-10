ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_moderator BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_moderator
  ON public.users (is_moderator)
  WHERE is_moderator = true;

NOTIFY pgrst, 'reload schema';

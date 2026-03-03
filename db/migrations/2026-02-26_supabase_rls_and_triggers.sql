-- Supabase hardening migration:
-- - updated_at triggers
-- - helper auth functions
-- - row level security policies

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_users_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_profiles_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_media_collections_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_media_collections_set_updated_at
    BEFORE UPDATE ON public.media_collections
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_media_items_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_media_items_set_updated_at
    BEFORE UPDATE ON public.media_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_media_comments_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_media_comments_set_updated_at
    BEFORE UPDATE ON public.media_comments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_track_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_events ENABLE ROW LEVEL SECURITY;

-- Users: users can read/update their own row.
DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self
ON public.users
FOR SELECT
TO authenticated
USING (id = public.current_app_user_id());

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self
ON public.users
FOR UPDATE
TO authenticated
USING (id = public.current_app_user_id())
WITH CHECK (id = public.current_app_user_id());

-- Profiles: public read for discovery, self edit.
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_all
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = public.current_app_user_id())
WITH CHECK (user_id = public.current_app_user_id());

-- Profile categories: readable by authenticated users, editable by owner only.
DROP POLICY IF EXISTS profile_categories_select_all ON public.profile_categories;
CREATE POLICY profile_categories_select_all
ON public.profile_categories
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS profile_categories_modify_self ON public.profile_categories;
CREATE POLICY profile_categories_modify_self
ON public.profile_categories
FOR ALL
TO authenticated
USING (user_id = public.current_app_user_id())
WITH CHECK (user_id = public.current_app_user_id());

-- Invite requests: anyone can create request (anon + authenticated).
DROP POLICY IF EXISTS invite_requests_insert_anyone ON public.invite_requests;
CREATE POLICY invite_requests_insert_anyone
ON public.invite_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Invites: authenticated users can only view invite tied to their email.
DROP POLICY IF EXISTS invites_select_matching_email ON public.invites;
CREATE POLICY invites_select_matching_email
ON public.invites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = public.current_app_user_id()
      AND u.email = invites.email
  )
);

-- Follows: authenticated users can read all follows, modify only their follows.
DROP POLICY IF EXISTS follows_select_all ON public.follows;
CREATE POLICY follows_select_all
ON public.follows
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS follows_modify_self ON public.follows;
CREATE POLICY follows_modify_self
ON public.follows
FOR ALL
TO authenticated
USING (follower_user_id = public.current_app_user_id())
WITH CHECK (follower_user_id = public.current_app_user_id());

-- Collections and items: discovery + owner management.
DROP POLICY IF EXISTS media_collections_select_discoverable ON public.media_collections;
CREATE POLICY media_collections_select_discoverable
ON public.media_collections
FOR SELECT
TO authenticated
USING (
  visibility IN ('public', 'invite_only')
  OR owner_user_id = public.current_app_user_id()
);

DROP POLICY IF EXISTS media_collections_insert_self ON public.media_collections;
CREATE POLICY media_collections_insert_self
ON public.media_collections
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = public.current_app_user_id());

DROP POLICY IF EXISTS media_collections_update_self ON public.media_collections;
CREATE POLICY media_collections_update_self
ON public.media_collections
FOR UPDATE
TO authenticated
USING (owner_user_id = public.current_app_user_id())
WITH CHECK (owner_user_id = public.current_app_user_id());

DROP POLICY IF EXISTS media_collections_delete_self ON public.media_collections;
CREATE POLICY media_collections_delete_self
ON public.media_collections
FOR DELETE
TO authenticated
USING (owner_user_id = public.current_app_user_id());

DROP POLICY IF EXISTS media_items_select_discoverable ON public.media_items;
CREATE POLICY media_items_select_discoverable
ON public.media_items
FOR SELECT
TO authenticated
USING (
  visibility IN ('public', 'invite_only')
  OR owner_user_id = public.current_app_user_id()
);

DROP POLICY IF EXISTS media_items_insert_self ON public.media_items;
CREATE POLICY media_items_insert_self
ON public.media_items
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = public.current_app_user_id());

DROP POLICY IF EXISTS media_items_update_self ON public.media_items;
CREATE POLICY media_items_update_self
ON public.media_items
FOR UPDATE
TO authenticated
USING (owner_user_id = public.current_app_user_id())
WITH CHECK (owner_user_id = public.current_app_user_id());

DROP POLICY IF EXISTS media_items_delete_self ON public.media_items;
CREATE POLICY media_items_delete_self
ON public.media_items
FOR DELETE
TO authenticated
USING (owner_user_id = public.current_app_user_id());

-- Track details are tied to media_items ownership.
DROP POLICY IF EXISTS music_track_details_select_discoverable ON public.music_track_details;
CREATE POLICY music_track_details_select_discoverable
ON public.music_track_details
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.media_items mi
    WHERE mi.id = music_track_details.media_item_id
      AND (mi.visibility IN ('public', 'invite_only') OR mi.owner_user_id = public.current_app_user_id())
  )
);

DROP POLICY IF EXISTS music_track_details_modify_owner ON public.music_track_details;
CREATE POLICY music_track_details_modify_owner
ON public.music_track_details
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.media_items mi
    WHERE mi.id = music_track_details.media_item_id
      AND mi.owner_user_id = public.current_app_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.media_items mi
    WHERE mi.id = music_track_details.media_item_id
      AND mi.owner_user_id = public.current_app_user_id()
  )
);

-- Media assets: visible if parent media item/collection is visible or owned by current user.
DROP POLICY IF EXISTS media_assets_select_allowed ON public.media_assets;
CREATE POLICY media_assets_select_allowed
ON public.media_assets
FOR SELECT
TO authenticated
USING (
  owner_user_id = public.current_app_user_id()
  OR EXISTS (
    SELECT 1
    FROM public.media_items mi
    WHERE mi.id = media_assets.media_item_id
      AND mi.visibility IN ('public', 'invite_only')
  )
  OR EXISTS (
    SELECT 1
    FROM public.media_collections mc
    WHERE mc.id = media_assets.collection_id
      AND mc.visibility IN ('public', 'invite_only')
  )
);

DROP POLICY IF EXISTS media_assets_modify_owner ON public.media_assets;
CREATE POLICY media_assets_modify_owner
ON public.media_assets
FOR ALL
TO authenticated
USING (owner_user_id = public.current_app_user_id())
WITH CHECK (owner_user_id = public.current_app_user_id());

-- Likes/comments/events: authenticated read/write with ownership controls.
DROP POLICY IF EXISTS media_likes_select_all ON public.media_likes;
CREATE POLICY media_likes_select_all
ON public.media_likes
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS media_likes_modify_self ON public.media_likes;
CREATE POLICY media_likes_modify_self
ON public.media_likes
FOR ALL
TO authenticated
USING (user_id = public.current_app_user_id())
WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS media_comments_select_all ON public.media_comments;
CREATE POLICY media_comments_select_all
ON public.media_comments
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS media_comments_insert_self ON public.media_comments;
CREATE POLICY media_comments_insert_self
ON public.media_comments
FOR INSERT
TO authenticated
WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS media_comments_update_self ON public.media_comments;
CREATE POLICY media_comments_update_self
ON public.media_comments
FOR UPDATE
TO authenticated
USING (user_id = public.current_app_user_id())
WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS play_events_insert_self_or_anon ON public.play_events;
CREATE POLICY play_events_insert_self_or_anon
ON public.play_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL
  OR user_id = public.current_app_user_id()
);

DROP POLICY IF EXISTS play_events_select_self ON public.play_events;
CREATE POLICY play_events_select_self
ON public.play_events
FOR SELECT
TO authenticated
USING (user_id = public.current_app_user_id());

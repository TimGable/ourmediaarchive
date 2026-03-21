DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'music_release_type') THEN
    CREATE TYPE music_release_type AS ENUM ('single', 'ep', 'album');
  END IF;
END$$;

ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS music_release_type music_release_type;

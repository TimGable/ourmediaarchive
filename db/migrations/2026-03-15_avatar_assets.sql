DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum enum_values
    JOIN pg_type enum_types ON enum_types.oid = enum_values.enumtypid
    WHERE enum_types.typname = 'asset_role'
      AND enum_values.enumlabel = 'avatar'
  ) THEN
    ALTER TYPE asset_role ADD VALUE 'avatar';
  END IF;
END$$;

ALTER TABLE media_assets
  DROP CONSTRAINT IF EXISTS belongs_to_item_or_collection;

ALTER TABLE media_assets
  ADD CONSTRAINT belongs_to_item_or_collection CHECK (
    media_item_id IS NOT NULL OR collection_id IS NOT NULL OR role = 'avatar'
  );

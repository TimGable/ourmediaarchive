# Data Architecture (Public-Ready)

This project currently has frontend-only data placeholders and no backend schema yet.  
These components already imply core data models:

- `app/components/sign-in.jsx`: email/password auth
- `app/components/request-invite.jsx`: invite request flow (email + message)
- `app/components/my-profile.jsx`: username, display name, bio, avatar, categories
- `app/components/browse-*.jsx`: artist cards with counts and featured media
- `app/components/artist-profile.jsx`: followers, releases, tracks, waveform/audio
- `app/components/feed.jsx`: feed items, likes, comments, share metadata
- `app/components/global-audio-player.jsx`: track URL + release cover + artist name

## Recommended Setup

1. One PostgreSQL database for app/auth/social/media metadata
2. Object storage for all binary files (audio/image/video/thumbnails/waveforms/subtitles)
3. CDN in front of object storage for delivery
4. Async processing workers for transcodes and derivative assets

## Database Schema

SQL is in [`db/schema.sql`](/s:/ourmediaarchive/ourmediaarchive/db/schema.sql).

Highlights:

- Identity and profile: `users`, `profiles`, `profile_categories`
- Invite onboarding: `invite_requests`, `invites`
- Social graph: `follows`, `media_likes`, `media_comments`
- Media model:
  - `media_collections` for albums/galleries/series
  - `media_items` for tracks/images/videos
  - `music_track_details` for music-specific fields
  - `media_assets` for object-storage references and technical metadata
- Playback analytics: `play_events`

## Storage Key Convention

Use immutable keys and never overwrite existing objects in-place.

Suggested buckets:

- `oma-private`: originals + private derivatives
- `oma-public`: only explicitly public derivatives

Suggested key pattern:

`u/{owner_user_id}/m/{media_item_id}/a/{asset_id}/v{version}/{variant}/{filename}`

Examples:

- Original lossless audio:
  - `u/USER_UUID/m/ITEM_UUID/a/ASSET_UUID/v1/original/master.flac`
- HLS master playlist:
  - `u/USER_UUID/m/ITEM_UUID/a/ASSET_UUID/v1/stream/hls/master.m3u8`
- HLS segment:
  - `u/USER_UUID/m/ITEM_UUID/a/ASSET_UUID/v1/stream/hls/1080p/seg_00001.ts`
- Thumbnail:
  - `u/USER_UUID/m/ITEM_UUID/a/ASSET_UUID/v1/thumbnail/1200x1200.jpg`
- Waveform JSON:
  - `u/USER_UUID/m/ITEM_UUID/a/ASSET_UUID/v1/waveform/peaks.json`
- Subtitles:
  - `u/USER_UUID/m/ITEM_UUID/a/ASSET_UUID/v1/subtitle/en.vtt`

Rules:

- `asset_id` maps to one row in `media_assets`
- `version` increments on replacement/re-encode
- Serve private assets via signed URLs/tokens
- Keep originals private even if a derivative is public

## Migration/Build Order

1. Apply `db/schema.sql` in Supabase SQL Editor
2. Apply `db/migrations/2026-02-26_supabase_rls_and_triggers.sql`
3. Wire auth provider user IDs into `users.auth_user_id`
4. Build API routes for:
   - invite request submit/review
   - profile read/update
   - media upload init/complete
   - feed/listing/detail
   - follow/like/comment
5. Add worker jobs:
   - metadata extraction
   - waveform generation
   - image/video derivatives
   - audio/video streaming derivatives

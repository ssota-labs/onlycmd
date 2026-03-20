# X (Twitter) Plugin — Comprehensive API Wrapper

onlycmd virtual CLI plugin for X (Twitter) operations via [Twitter API v2](https://developer.twitter.com/en/docs/twitter-api).

This plugin provides comprehensive coverage of X/Twitter API v2, matching the functionality of [x-cli](https://github.com/INFATOSHI/x-cli).

## Overview

| Item | Description |
|------|-------------|
| Module name | `x` |
| API base | Twitter API v2 (`https://api.x.com/2`) |
| Authentication | Bearer Token (read-only) + OAuth 1.0a (write operations) |

## Authentication

### Bearer Token (Read-Only)

For read operations (get tweets, search, get users, timelines, followers):

- **config**: `x({ token: "..." })` — Pass token when setting up plugin
- **runtime**: `context.auth.x` — Pass token at runtime

### OAuth 1.0a (Write Operations)

For write operations (post, delete, like, retweet, bookmarks, mentions, metrics):

You need **5 credentials** from the [X Developer Portal](https://developer.x.com/en/portal/dashboard):

1. **Consumer Key** (API Key)
2. **Consumer Secret** (API Secret)
3. **Access Token**
4. **Access Token Secret**
5. **Bearer Token** (also needed for read operations)

**Config**:
```typescript
x({
  token: "bearer_token",
  apiKey: "consumer_key",
  apiSecret: "consumer_secret",
  accessToken: "access_token",
  accessTokenSecret: "access_token_secret",
})
```

**Runtime** (`context.auth`):
```typescript
{
  x: "bearer_token",
  x_api_key: "consumer_key",
  x_api_secret: "consumer_secret",
  x_access_token: "access_token",
  x_access_token_secret: "access_token_secret",
}
```

### Multi-tenant / Serverless (requires_auth)

For Next.js + Supabase (or similar): store API keys in server `.env`, and user OAuth credentials in a DB (e.g. Supabase `user_oauth`). Pass per-request creds via `context.auth` when calling `runtime.run()`.

When OAuth is **not** provided for a command that needs it, the handler returns `ok: true` with:

```json
{
  "requires_auth": {
    "provider": "twitter",
    "action": "login",
    "reason": "OAuth credentials required. Provide apiKey, apiSecret, accessToken, and accessTokenSecret via config or context.auth."
  }
}
```

Use this in the client to render OAuth login UI (e.g. `app:twitter login`). After the user completes OAuth, save credentials to your DB and retry the command.

### Getting Credentials

1. Go to the [X Developer Portal](https://developer.x.com/en/portal/dashboard)
2. Create an app (or use an existing one)
3. Save your **Consumer Key**, **Consumer Secret**, and **Bearer Token**
4. Under **User authentication settings**, set permissions to **Read and write**
5. Generate (or regenerate) **Access Token** and **Access Token Secret**

## Commands

### Tweet Commands

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `x tweet post --text "..." [--poll "Option1,Option2"] [--poll_duration 1440] [--media_ids "id1,id2"]` | Post a tweet (with optional poll and media) | OAuth |
| `x tweet get --id_or_url <tweet> [--tweet_fields ...] [--expansions ...]` | Get a tweet by ID or URL | Bearer |
| `x tweet delete --id_or_url <tweet>` | Delete a tweet | OAuth |
| `x tweet reply --id_or_url <tweet> --text "..."` | Reply to a tweet | OAuth |
| `x tweet quote --id_or_url <tweet> --text "..."` | Quote tweet | OAuth |
| `x tweet search --query "..." [--max 10]` | Search recent tweets (max 10-100) | Bearer |
| `x tweet metrics --id_or_url <tweet>` | Get tweet engagement metrics | OAuth |

**Backward Compatibility**:
- `x tweet list --user_id <id> [--max_results 10] ...` — list user's tweets
- `x tweet view --id <id> ...` — get a tweet
- `x tweet create --text "..."` — post a tweet

### User Commands

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `x user get --username <name>` | Get user by username (strips leading @) | Bearer |
| `x user timeline --username <name> [--max 10]` | Get user's timeline (max 5-100) | Bearer |
| `x user followers --username <name> [--max 100]` | List followers (max 1-1000) | Bearer |
| `x user following --username <name> [--max 100]` | List following (max 1-1000) | Bearer |

**Backward Compatibility**:
- `x user view --username <name> | --id <id> [--user_fields ...]` — get user info

### Me Commands (Authenticated User)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `x me mentions [--max 10]` | Get your mentions (max 5-100) | OAuth |
| `x me bookmarks [--max 10]` | Get your bookmarks (max 1-100) | OAuth |
| `x me bookmark --id_or_url <tweet>` | Bookmark a tweet | OAuth |
| `x me unbookmark --id_or_url <tweet>` | Remove bookmark | OAuth |
| `x me view` | Get your own user info | OAuth |

### Engagement (Top-Level)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `x like --id_or_url <tweet>` | Like a tweet | OAuth |
| `x retweet --id_or_url <tweet>` | Retweet | OAuth |

### Media Upload

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `x media upload --url <url> [--media_category <category>] [--additional_owners <ids>] [--filename <name>]` | Upload media file from URL (images/videos) and get media_id | OAuth |

**Note**: Media upload uses Twitter API v1.1 (`upload.twitter.com/1.1/media/upload.json`). Upload media first, then use the returned `media_id_string` in `x tweet post --media_ids`. The URL must be accessible from the server where onlycmd is running.

### Spaces (Live Audio)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `x spaces search --query "..." [--state live\|scheduled\|all] [--max 100]` | Search live or scheduled Spaces by keyword | Bearer |
| `x spaces get --id <space_id>` | Get a Space by ID (e.g. 1SLjjRYNejbKM) | Bearer |
| `x spaces by_creator --user_ids <ids_or_usernames>` | Get Spaces created by user(s). Comma-separated IDs or @usernames | Bearer |
| `x spaces posts --id <space_id> [--max 100]` | Get posts shared in a Space | Bearer |

Spaces have a lifecycle: they can be scheduled up to 14 days ahead and become unavailable after they end. Use `--state live` for currently live Spaces, `--state scheduled` for upcoming ones.

### Lists

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `x list get --list_id <id>` | Get List by ID | Bearer |
| `x list owned --username <name> [--max 100]` | Get Lists owned by user | Bearer |
| `x list tweets --list_id <id> [--max 100]` | Get tweets in a List | Bearer |
| `x list members --list_id <id> [--max 100]` | Get members of a List | Bearer |
| `x list memberships --username <name> [--max 100]` | Get Lists a user is a member of | Bearer |
| `x list create --name "..." [--description "..."] [--private true\|false]` | Create a List | OAuth |
| `x list update --list_id <id> [--name "..."] [--description "..."] [--private true\|false]` | Update a List | OAuth |
| `x list delete --list_id <id>` | Delete a List | OAuth |
| `x list add_member --list_id <id> --user_id <id_or_username>` | Add member to List | OAuth |
| `x list remove_member --list_id <id> --user_id <id_or_username>` | Remove member from List | OAuth |
| `x list pinned [--username <name>]` | Get pinned Lists (omit for your own) | OAuth |
| `x list pin --list_id <id>` | Pin a List | OAuth |
| `x list unpin --list_id <id>` | Unpin a List | OAuth |

## Tweet ID Parsing

All commands that accept `--id_or_url` can handle:
- Full URLs: `https://x.com/user/status/1234567890` or `https://twitter.com/user/status/1234567890`
- Numeric IDs: `1234567890`

## Fields and Expansions

Twitter API v2 returns minimal fields by default. Use `--tweet_fields`, `--user_fields`, and `--expansions` to request more:

### tweet.fields
`created_at`, `public_metrics`, `author_id`, `conversation_id`, `entities`, `lang`, `note_tweet`, `referenced_tweets`, `attachments`, etc.

### user.fields
`created_at`, `description`, `public_metrics`, `verified`, `profile_image_url`, `url`, `location`, etc.

### expansions
`author_id`, `referenced_tweets.id`, `attachments.media_keys`, etc.

## Usage Examples

```bash
# Post a tweet
x tweet post --text "Hello, world!"

# Post with poll
x tweet post --text "Do you like polls?" --poll "Yes,No" --poll_duration 1440

# Upload media and post tweet with image
x media upload --url "https://example.com/image.jpg"
# Returns: { media_id_string: "1234567890", ... }
x tweet post --text "Check out this image!" --media_ids "1234567890"

# Post tweet with multiple images
x media upload --url "https://example.com/image1.jpg"
x media upload --url "https://example.com/image2.jpg"
x tweet post --text "Multiple images" --media_ids "1234567890,1234567891"

# Get a tweet
x tweet get --id_or_url "https://x.com/user/status/1234567890"

# Search tweets
x tweet search --query "from:elonmusk" --max 20

# Reply to a tweet (NOTE: X restricts programmatic replies)
x tweet reply --id_or_url "1234567890" --text "Nice post!"

# Quote tweet (workaround for restricted replies)
x tweet quote --id_or_url "1234567890" --text "This is important"

# Delete a tweet
x tweet delete --id_or_url "1234567890"

# Get user info
x user get --username elonmusk

# Get user timeline
x user timeline --username elonmusk --max 20

# Search live Spaces
x spaces search --query "AI" --state live --max 10

# Get Space by ID
x spaces get --id 1SLjjRYNejbKM

# Spaces by creator (username or user IDs)
x spaces by_creator --user_ids @elonmusk

# Space posts
x spaces posts --id 1SLjjRYNejbKM --max 25

# Lists
x list get --list_id 1234567890
x list owned --username elonmusk
x list tweets --list_id 1234567890
x list create --name "Tech News" --description "My feed"
x list add_member --list_id 123 --user_id @elonmusk

# Get followers
x user followers --username elonmusk --max 100

# Like a tweet
x like --id_or_url "https://x.com/user/status/1234567890"

# Retweet
x retweet --id_or_url "1234567890"

# Get your mentions
x me mentions --max 20

# Get your bookmarks
x me bookmarks --max 20

# Bookmark a tweet
x me bookmark --id_or_url "1234567890"

# Remove bookmark
x me unbookmark --id_or_url "1234567890"

# Get your own user info
x me view
```

## Notes

### Rate Limits
The API enforces rate limits. Errors include reset time in headers. The plugin handles 429 responses with clear error messages.

### Programmatic Replies
X restricts programmatic replies (as of Feb 2024). Replies only succeed if the original author @mentioned you or quoted your post. Use `tweet quote` as a workaround.

### Access Tiers
Some endpoints require elevated access tiers (e.g., full archive search, DM).

### Base URL
Uses `https://api.x.com/2` (matching x-cli) instead of `https://api.twitter.com/2` for consistency.

## File Structure

```
x/
├── index.ts              # defineModule, setup, commands
├── api.ts                # HTTP wrapper, OAuth/Bearer client, all API methods
├── oauth1a.ts            # OAuth 1.0a signing (HMAC-SHA1)
├── utils.ts              # parseTweetId, stripAt
├── skill.ts              # skill.summary, skill.full (CLI reference)
├── commands/
│   ├── tweet.ts          # tweet.* commands
│   ├── user.ts           # user.* commands
│   ├── me.ts             # me.* commands
│   ├── engage.ts         # like, retweet (top-level)
│   └── media.ts          # media upload
├── tests/
│   ├── oauth1a.test.ts   # OAuth signing tests
│   ├── utils.test.ts     # Utility tests
│   ├── tweet.test.ts     # Tweet command tests
│   └── user.test.ts      # User command tests
└── README.md             # This file
```

## Integration Tests

Integration tests are in `src/__tests__/x/integration.x.test.ts` and call the actual X API.

- `.env.local`: `X_BEARER_TOKEN`, (optional) `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`, `X_TEST_USERNAME`
- `X_INTEGRATION_WRITE=1`: Enables write operation tests (actual tweets, likes, etc.)

## Comparison with x-cli

This plugin matches [x-cli](https://github.com/INFATOSHI/x-cli)'s functionality:

- ✅ Same command structure (`tweet post`, `user get`, `me bookmarks`, etc.)
- ✅ Same OAuth 1.0a signing implementation
- ✅ Same base URL (`https://api.x.com/2`)
- ✅ Same error handling (rate limits, API errors)
- ✅ Same tweet ID parsing (URLs and numeric IDs)

The main difference is that this is a **virtual CLI** for use within onlycmd runtime, not a standalone CLI tool.

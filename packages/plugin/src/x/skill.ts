/**
 * Skill content for listSkills() / getFullSkill().
 * Summary: one-line for system prompt. Full: markdown CLI reference.
 */
export const skill = {
  summary: "X (Twitter) operations — comprehensive API wrapper (tweets, users, engagement, bookmarks, media, Spaces, Lists)",
  full: `# X (Twitter) (x)

Comprehensive X/Twitter API v2 wrapper via virtual CLI.

## Tweet Commands

### Post
- \`x tweet post --text "..." [--poll "Option1,Option2"] [--poll_duration 1440] [--media_ids "id1,id2"]\` — post a tweet (with optional poll and media)
- \`x tweet reply --id_or_url <tweet> --text "..."\` — reply to a tweet (NOTE: X restricts programmatic replies; only works if original author @mentioned you or quoted your post)
- \`x tweet quote --id_or_url <tweet> --text "..."\` — quote tweet
- \`x tweet delete --id_or_url <tweet>\` — delete a tweet

### Read
- \`x tweet get --id_or_url <tweet> [--tweet_fields "..."] [--user_fields "..."] [--expansions "..."]\` — get a tweet by ID or URL
- \`x tweet search --query "..." [--max 10]\` — search recent tweets (max 10-100)
- \`x tweet metrics --id_or_url <tweet>\` — get tweet engagement metrics

## User Commands

- \`x user get --username <name>\` — get user by username (strips leading @)
- \`x user timeline --username <name> [--max 10]\` — get user's timeline (max 5-100)
- \`x user followers --username <name> [--max 100]\` — list followers (max 1-1000)
- \`x user following --username <name> [--max 100]\` — list following (max 1-1000)

## Me Commands (Authenticated User)

- \`x me mentions [--max 10]\` — get your mentions (max 5-100)
- \`x me bookmarks [--max 10]\` — get your bookmarks (max 1-100)
- \`x me bookmark --id_or_url <tweet>\` — bookmark a tweet
- \`x me unbookmark --id_or_url <tweet>\` — remove bookmark
- \`x me view\` — get your own user info

## Engagement (Top-Level)

- \`x like --id_or_url <tweet>\` — like a tweet
- \`x retweet --id_or_url <tweet>\` — retweet

## Media Upload

- \`x media upload --url <url> [--media_category <category>] [--additional_owners <ids>] [--filename <name>]\` — upload media file from URL (images/videos) and get media_id

Upload media first, then use the returned \`media_id_string\` in \`x tweet post --media_ids\`. The URL must be accessible from the server where onlycmd is running.

## Spaces (Live Audio)

- \`x spaces search --query "..." [--state live|scheduled|all] [--max 100]\` — search live or scheduled Spaces by keyword
- \`x spaces get --id <space_id>\` — get a Space by ID (e.g. 1SLjjRYNejbKM)
- \`x spaces by_creator --user_ids <ids_or_usernames>\` — get Spaces created by user(s). Accepts comma-separated user IDs or @usernames
- \`x spaces posts --id <space_id> [--max 100]\` — get posts shared in a Space

Spaces have a lifecycle: they can be scheduled up to 14 days ahead and become unavailable after they end. Use \`--state live\` for currently live Spaces, \`--state scheduled\` for upcoming ones.

## Lists

### Lookup (Bearer)
- \`x list get --list_id <id>\` — get List by ID
- \`x list owned --username <name> [--max 100]\` — get Lists owned by user
- \`x list tweets --list_id <id> [--max 100]\` — get tweets in a List
- \`x list members --list_id <id> [--max 100]\` — get members of a List
- \`x list memberships --username <name> [--max 100]\` — get Lists a user is a member of

### Manage (OAuth)
- \`x list create --name "..." [--description "..."] [--private true|false]\` — create a List
- \`x list update --list_id <id> [--name "..."] [--description "..."] [--private true|false]\` — update a List
- \`x list delete --list_id <id>\` — delete a List
- \`x list add_member --list_id <id> --user_id <id_or_username>\` — add member to List
- \`x list remove_member --list_id <id> --user_id <id_or_username>\` — remove member from List

### Pinned (OAuth)
- \`x list pinned [--username <name>]\` — get pinned Lists (omit username for your own)
- \`x list pin --list_id <id>\` — pin a List for authenticated user
- \`x list unpin --list_id <id>\` — unpin a List

## Fields and Expansions

Twitter API v2 returns minimal fields by default. Use \`--tweet_fields\`, \`--user_fields\`, and \`--expansions\` to request more:

- **tweet.fields**: \`created_at,public_metrics,author_id,conversation_id,entities,lang,note_tweet,referenced_tweets,attachments\`
- **user.fields**: \`created_at,description,public_metrics,verified,profile_image_url,url,location\`
- **expansions**: \`author_id,referenced_tweets.id,attachments.media_keys\`

## Tweet ID Parsing

All commands that accept \`--id_or_url\` can handle:
- Full URLs: \`https://x.com/user/status/1234567890\` or \`https://twitter.com/user/status/1234567890\`
- Numeric IDs: \`1234567890\`

## Examples

\`\`\`bash
# Post a tweet
x tweet post --text "Hello, world!"

# Search tweets
x tweet search --query "from:elonmusk" --max 20

# Get user info
x user get --username elonmusk

# Like a tweet
x like --id_or_url "https://x.com/user/status/1234567890"

# Get your bookmarks
x me bookmarks --max 20

# Search live Spaces
x spaces search --query "AI" --state live --max 10

# Get Space by ID
x spaces get --id 1SLjjRYNejbKM

# Spaces by creator
x spaces by_creator --user_ids @elonmusk

# Space posts
x spaces posts --id 1SLjjRYNejbKM --max 25

# Lists
x list get --list_id 1234567890
x list owned --username elonmusk
x list tweets --list_id 1234567890 --max 20
x list create --name "Tech News" --description "My feed"
x list add_member --list_id 123 --user_id @elonmusk

# Upload media and post tweet with image
x media upload --url "https://example.com/image.jpg"
x tweet post --text "Check out this image!" --media_ids "1234567890"
\`\`\`

## Notes

- **Rate Limits**: The API enforces rate limits. Errors include reset time in headers.
- **Programmatic Replies**: X restricts programmatic replies. Use \`tweet quote\` as a workaround.
- **Access Tiers**: Some endpoints require elevated access tiers (e.g., full archive search, DM).
- **Multi-tenant / OAuth login**: When OAuth credentials are missing for write operations, the result includes \`requires_auth: { provider: "twitter", action: "login", reason: "..." }\`. Use this to render OAuth login UI on the client; after the user completes OAuth, save credentials and retry.
`,
};

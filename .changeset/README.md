# Changesets

We use [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

- Run `pnpm changeset` to add a new changeset (describe your change and choose packages/version bump).
- When a PR that contains changesets is merged to `main`, the Release workflow will create a Version PR; merging that PR will publish to npm.

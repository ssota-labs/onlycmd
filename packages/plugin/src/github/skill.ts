/**
 * Skill content for listSkills() / getFullSkill().
 * Summary: one-line for system prompt. Full: markdown CLI reference.
 */
export const skill = {
  summary: "GitHub operations — issues, PRs, repos",
  full: `# GitHub (gh)

## Issues
- \`gh issue list --repo <owner/repo> [--state open|closed|all] [--limit N] [--labels L1,L2]\`
- \`gh issue create --repo <owner/repo> --title "T" [--body "B"] [--labels L1,L2]\`
- \`gh issue view --number <n> --repo <owner/repo>\`
- \`gh issue comment --number <n> --repo <owner/repo> --body "comment"\`
- \`gh issue close --number <n> --repo <owner/repo>\`

## Pull requests
- \`gh pr list --repo <owner/repo> [--state open|closed|merged|all] [--limit N]\`
- \`gh pr view --number <n> --repo <owner/repo>\`
- \`gh pr create --repo <owner/repo> --title "T" --head <branch> [--base main] [--body "B"]\`
- \`gh pr merge --number <n> --repo <owner/repo> [--merge_method merge|squash|rebase] [--commit_title "T"]\`

## Repo
- \`gh repo view <owner/repo>\`

## Branch (Git Data API)
- \`gh branch create --repo <owner/repo> --name <branch> --message "commit message" [--base main] [--file path] [--content "file content"]\`
`,
};

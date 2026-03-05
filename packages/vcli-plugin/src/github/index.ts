import { defineModule } from "vcli";
import { createIssueHandlers } from "./commands/issue.js";
import { createPrHandlers } from "./commands/pr.js";
import { createRepoHandlers } from "./commands/repo.js";
import { skill } from "./skill.js";

export interface GitHubConfig {
  token?: string;
}

/**
 * GitHub plugin: issues, PRs, repos via virtual CLI.
 * Token: pass in config or at runtime via context.auth.gh.
 */
export const github = defineModule({
  name: "gh",
  description: "GitHub operations via virtual CLI - issues, PRs, repos",
  setup: (config?: GitHubConfig) => {
    const issueHandlers = createIssueHandlers(config ?? {});
    const prHandlers = createPrHandlers(config ?? {});
    const repoHandlers = createRepoHandlers(config ?? {});
    return {
      name: "gh",
      description: "GitHub operations via virtual CLI - issues, PRs, repos",
      commands: {
        issue: {
          list: issueHandlers.list,
          create: issueHandlers.create,
          view: issueHandlers.view,
          comment: issueHandlers.comment,
        },
        pr: {
          list: prHandlers.list,
          view: prHandlers.view,
          create: prHandlers.create,
        },
        repo: {
          view: repoHandlers.view,
        },
      },
      skill,
    };
  },
});

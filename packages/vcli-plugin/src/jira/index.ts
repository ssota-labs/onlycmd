import { defineModule } from "vcli";

/**
 * Jira plugin (stub). Full implementation coming later.
 */
export const jira = defineModule({
  name: "jira",
  description: "Jira operations via virtual CLI (stub)",
  setup: (config?: { host?: string; token?: string }) => ({
    name: "jira",
    description: "Jira operations via virtual CLI (stub)",
    commands: {
      issue: {
        list: {
          args: { project: { type: "string", required: true } },
          handler: async () => ({
            message: "Jira plugin is a stub; implement in a later release",
            config: config ? { host: config.host } : undefined,
          }),
        },
      },
    },
  }),
});

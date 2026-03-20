import type { RunContext } from "../../../../core/dist/index.js";
import type { XAdapter, XConfig } from "../adapter.js";
import { stripAt } from "../utils.js";

export function createListHandlers(config: XConfig, adapter: XAdapter) {
  return {
    get: {
      args: { list_id: { type: "string" as const, required: true } },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        return adapter.getListById(String(args.list_id).trim(), creds);
      },
    },
    owned: {
      args: {
        username: { type: "string" as const, required: true },
        max: { type: "number" as const, required: false, default: 100 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const username = stripAt(String(args.username));
        const userData = (await adapter.getUser(username, creds)) as { data?: { id?: string } };
        if (!userData.data?.id) {
          throw new Error(`User not found: ${username}`);
        }
        const max = args.max != null ? Number(args.max) : 100;
        return adapter.getOwnedLists(userData.data.id, creds, max);
      },
    },
    tweets: {
      args: {
        list_id: { type: "string" as const, required: true },
        max: { type: "number" as const, required: false, default: 100 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const listId = String(args.list_id).trim();
        const max = args.max != null ? Number(args.max) : 100;
        return adapter.getListTweets(listId, creds, max);
      },
    },
    create: {
      args: {
        name: { type: "string" as const, required: true },
        description: { type: "string" as const, required: false },
        private: { type: "string" as const, required: false },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const name = String(args.name).trim();
        if (!name) throw new Error("List name cannot be empty.");
        const options: { description?: string; private?: boolean } = {};
        if (args.description != null) options.description = String(args.description);
        if (args.private != null) {
          const p = String(args.private).toLowerCase();
          options.private = p === "true" || p === "1" || p === "yes";
        }
        return adapter.createList(name, creds, options);
      },
    },
    update: {
      args: {
        list_id: { type: "string" as const, required: true },
        name: { type: "string" as const, required: false },
        description: { type: "string" as const, required: false },
        private: { type: "string" as const, required: false },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const listId = String(args.list_id).trim();
        const updates: { name?: string; description?: string; private?: boolean } = {};
        if (args.name != null) updates.name = String(args.name);
        if (args.description != null) updates.description = String(args.description);
        if (args.private != null) {
          const p = String(args.private).toLowerCase();
          updates.private = p === "true" || p === "1" || p === "yes";
        }
        return adapter.updateList(listId, creds, updates);
      },
    },
    delete: {
      args: { list_id: { type: "string" as const, required: true } },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        return adapter.deleteList(String(args.list_id).trim(), creds);
      },
    },
    members: {
      args: {
        list_id: { type: "string" as const, required: true },
        max: { type: "number" as const, required: false, default: 100 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const listId = String(args.list_id).trim();
        const max = args.max != null ? Number(args.max) : 100;
        return adapter.getListMembers(listId, creds, max);
      },
    },
    memberships: {
      args: {
        username: { type: "string" as const, required: true },
        max: { type: "number" as const, required: false, default: 100 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const username = stripAt(String(args.username));
        const userData = (await adapter.getUser(username, creds)) as { data?: { id?: string } };
        if (!userData.data?.id) {
          throw new Error(`User not found: ${username}`);
        }
        const max = args.max != null ? Number(args.max) : 100;
        return adapter.getListMemberships(userData.data.id, creds, max);
      },
    },
    add_member: {
      args: {
        list_id: { type: "string" as const, required: true },
        user_id: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const listId = String(args.list_id).trim();
        let userId = String(args.user_id).trim();
        if (!/^\d+$/.test(userId)) {
          const username = stripAt(userId);
          const userData = (await adapter.getUser(username, creds)) as { data?: { id?: string } };
          if (!userData.data?.id) {
            throw new Error(`User not found: ${username}. Provide @username or numeric user ID.`);
          }
          userId = userData.data.id;
        }
        return adapter.addListMember(listId, userId, creds);
      },
    },
    remove_member: {
      args: {
        list_id: { type: "string" as const, required: true },
        user_id: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const listId = String(args.list_id).trim();
        let userId = String(args.user_id).trim();
        if (!/^\d+$/.test(userId)) {
          const username = stripAt(userId);
          const userData = (await adapter.getUser(username, creds)) as { data?: { id?: string } };
          if (!userData.data?.id) {
            throw new Error(`User not found: ${username}. Provide @username or numeric user ID.`);
          }
          userId = userData.data.id;
        }
        return adapter.removeListMember(listId, userId, creds);
      },
    },
    pinned: {
      args: {
        username: { type: "string" as const, required: false },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        if (args.username != null && String(args.username).trim()) {
          const username = stripAt(String(args.username));
          const userData = (await adapter.getUser(username, creds)) as { data?: { id?: string } };
          if (!userData.data?.id) {
            throw new Error(`User not found: ${username}`);
          }
          return adapter.getPinnedLists(userData.data.id, creds);
        }
        const userId = await adapter.getAuthenticatedUserId(creds);
        return adapter.getPinnedLists(userId, creds);
      },
    },
    pin: {
      args: { list_id: { type: "string" as const, required: true } },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        return adapter.pinList(String(args.list_id).trim(), creds);
      },
    },
    unpin: {
      args: { list_id: { type: "string" as const, required: true } },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        return adapter.unpinList(String(args.list_id).trim(), creds);
      },
    },
  };
}

/**
 * Test helpers for X plugin tests.
 * Mocks both global fetch (for api adapter) and node-fetch (for xdk adapter).
 */

import { vi } from "vitest";

export type MockFetchHandler = (
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> }
) => Promise<Response>;

/**
 * Creates a mock fetch handler that matches X API endpoints.
 * Returns a Response-like object for the given URL/init.
 */
export function createMockFetch(handler: MockFetchHandler): typeof fetch {
  return vi.fn(handler) as unknown as typeof fetch;
}

/**
 * Sets up mocks for both global fetch (api adapter) and node-fetch (xdk adapter).
 * XDK uses node-fetch internally, so we need to mock the module.
 */
export function setupFetchMocks(handler: MockFetchHandler): void {
  // Mock global fetch for api adapter
  vi.stubGlobal("fetch", createMockFetch(handler));

  // Mock node-fetch for xdk adapter
  // XDK uses require("node-fetch") internally, so we mock the module
  vi.mock("node-fetch", () => ({
    default: createMockFetch(handler),
    Headers: globalThis.Headers,
  }));
}

/**
 * Common mock responses for X API endpoints.
 */
export const mockResponses = {
  emptyText: async (): Promise<string> => "",

  user: (id: string, username: string, name: string) => ({
    ok: true,
    json: async () => ({ data: { id, username, name } }),
    text: mockResponses.emptyText,
    headers: new Headers(),
  }),

  tweet: (id: string, text: string) => ({
    ok: true,
    json: async () => ({ data: { id, text } }),
    text: mockResponses.emptyText,
    headers: new Headers(),
  }),

  tweets: (tweets: Array<{ id: string; text: string }>, meta?: { next_token?: string }) => ({
    ok: true,
    json: async () => ({ data: tweets, meta: meta || {} }),
    text: mockResponses.emptyText,
    headers: new Headers(),
  }),

  created: (id: string, data?: Record<string, unknown>) => ({
    ok: true,
    json: async () => ({ data: { id, ...data } }),
    text: mockResponses.emptyText,
    headers: new Headers(),
  }),

  deleted: () => ({
    ok: true,
    json: async () => ({ data: { deleted: true } }),
    text: mockResponses.emptyText,
    headers: new Headers(),
  }),

  notFound: () => ({
    ok: false,
    status: 404,
    text: async (): Promise<string> => "Not found",
    headers: new Headers(),
  }),
};

/**
 * Test both api and xdk adapters using describe.each.
 * Usage:
 *   describe.each([["api"], ["xdk"]])("adapter: %s", (adapter) => {
 *     const cfg = () => ({ adapter: adapter as "api" | "xdk" });
 *     // tests...
 *   });
 */
export const adapters = [["api"], ["xdk"]] as const;

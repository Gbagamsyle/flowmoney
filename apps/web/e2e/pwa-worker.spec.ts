import { expect, test } from "@playwright/test";
import fs from "node:fs";
import vm from "node:vm";
const source = fs.readFileSync(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);
function worker(offline = false) {
  const handlers: Record<string, (event: any) => void> = {};
  const writes: string[] = [];
  const removed: string[] = [];
  const requests: Request[] = [];
  class WorkerRequest extends Request {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(
        typeof input === "string"
          ? new URL(input, "https://flowmoney.invalid")
          : input,
        init,
      );
    }
  }
  const caches = {
    open: async () => ({
      addAll: async (items: Request[]) => {
        writes.push(...items.map((r) => new URL(r.url).pathname));
        expect(items.every((r) => r.credentials === "omit")).toBe(true);
      },
    }),
    keys: async () => [
      "flowmoney-public-v0",
      "flowmoney-public-v1",
      "unrelated-cache",
    ],
    delete: async (key: string) => {
      removed.push(key);
      return true;
    },
    match: async () => new Response("Public offline screen"),
  };
  vm.runInNewContext(source, {
    self: {
      location: { origin: "https://flowmoney.invalid" },
      addEventListener: (type: string, fn: any) => (handlers[type] = fn),
      clients: { claim: async () => {} },
      skipWaiting: () => {},
    },
    caches,
    Request: WorkerRequest,
    Response,
    URL,
    fetch: async (request: Request) => {
      requests.push(request);
      if (offline) throw new Error("Offline");
      return new Response("PRIVATE financial response");
    },
  });
  async function dispatch(type: string, request?: Request) {
    let pending: Promise<unknown> | undefined;
    handlers[type]({
      request,
      waitUntil: (p: Promise<unknown>) => (pending = p),
      respondWith: (p: Promise<unknown>) => (pending = p),
    });
    return pending ? await pending : undefined;
  }
  return { dispatch, writes, removed, requests };
}
function navigation(path: string) {
  const request = new Request("https://flowmoney.invalid" + path, {
    headers: { Authorization: "PRIVATE token" },
  });
  Object.defineProperty(request, "mode", { value: "navigate" });
  return request;
}
test("PWA precaches only the public offline screen and brand icons", async () => {
  const w = worker();
  await w.dispatch("install");
  expect(w.writes).toEqual([
    "/offline.html",
    "/pwa/icon-192.png",
    "/pwa/icon-512.png",
    "/pwa/icon-maskable-512.png",
    "/pwa/apple-touch-icon.png",
  ]);
});
test("financial navigation stays network-only without storing its response", async () => {
  const w = worker();
  const response = (await w.dispatch(
    "fetch",
    navigation("/dashboard?private=secret"),
  )) as Response;
  expect(await response.text()).toBe("PRIVATE financial response");
  expect(w.requests[0].cache).toBe("no-store");
  expect(w.writes).toEqual([]);
});
test("offline navigation returns only a public screen; APIs, uploads and third parties are untouched", async () => {
  const w = worker(true);
  const response = (await w.dispatch(
    "fetch",
    navigation("/statements"),
  )) as Response;
  expect(await response.text()).toBe("Public offline screen");
  for (const request of [
    new Request("https://flowmoney.invalid/currencies/display"),
    new Request("https://flowmoney.invalid/statements", {
      method: "POST",
      body: "PRIVATE statement",
    }),
    new Request("https://other.invalid/users"),
  ])
    expect(await w.dispatch("fetch", request)).toBeUndefined();
  expect(w.writes).toEqual([]);
});
test("updates clean only old FlowMoney public caches", async () => {
  const w = worker();
  await w.dispatch("activate");
  expect(w.removed).toEqual(["flowmoney-public-v0"]);
});

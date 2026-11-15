// Integration tests: run against a live server.
//   BASE_URL=http://localhost:3000/api API_KEY=... pnpm test
// WARNING: calls POST /reset, which wipes all data.
import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000/api";
const KEY = process.env.API_KEY!;

const call = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  fetch(BASE + path, {
    method,
    headers: { "X-API-Key": KEY, "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const iso = (offsetMin: number) => new Date(Date.now() + offsetMin * 60_000).toISOString();
let n = 0;
const email = () => `user${++n}-${Date.now()}@Example.com`;

const reset = () =>
  call("POST", "/reset", {
    slots: [
      { id: "s1", provider: "Dr Ade", start: "2099-12-10T09:00:00Z", end: "2099-12-10T09:30:00Z" },
      { id: "s2", provider: "Dr Ade", start: "2099-12-10T08:00:00Z", end: "2099-12-10T08:30:00Z" },
      { id: "s3", provider: "Dr Bo", start: "2099-12-10T10:00:00Z", end: "2099-12-10T10:30:00Z" },
      { id: "past", provider: "Dr Bo", start: "2020-01-01T10:00:00Z", end: "2020-01-01T10:30:00Z" },
      ...Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, provider: "Dr Page", start: `2099-11-${10 + i}T09:00:00Z`, end: `2099-11-${10 + i}T09:30:00Z` })),
    ],
  });

test.beforeEach(async () => { assert.equal((await reset()).status, 200); });

test("L2 auth: missing/wrong key -> 401", async () => {
  assert.equal((await fetch(BASE + "/slots")).status, 401);
  assert.equal((await fetch(BASE + "/slots", { headers: { "X-API-Key": "nope" } })).status, 401);
  assert.equal((await fetch(BASE + "/reset", { method: "POST" })).status, 401);
});

test("L1 list slots sorted, filter, exact timestamps", async () => {
  const { slots } = await (await call("GET", "/slots")).json();
  assert.equal(slots[0].id, "past");
  assert.equal(slots.find((s: any) => s.id === "s1").start, "2099-12-10T09:00:00Z");
  const ade = (await (await call("GET", "/slots?provider=Dr%20Ade")).json()).slots;
  assert.deepEqual(ade.map((s: any) => s.id), ["s2", "s1"]);
});

test("L1 book, get, availability", async () => {
  const e = email();
  const r = await call("POST", "/bookings", { slot_id: "s1", name: "  Ada Obi ", email: `  ${e}  ` });
  assert.equal(r.status, 201);
  const b = await r.json();
  assert.equal(b.status, "confirmed");
  assert.equal(b.name, "Ada Obi");
  assert.equal(b.email, e.toLowerCase());
  assert.deepEqual(await (await call("GET", `/bookings/${b.id}`)).json(), b);
  assert.equal((await call("GET", "/bookings/nope")).status, 404);
  const s1 = (await (await call("GET", "/slots")).json()).slots.find((s: any) => s.id === "s1");
  assert.equal(s1.available, false);
});

test("L2 validation", async () => {
  const bad = () => [
    {}, { slot_id: "s1", name: "A" }, { slot_id: "s1", email: email() },
    { slot_id: "", name: "A", email: email() }, { slot_id: "s1", name: "  ", email: email() },
    { slot_id: "s1", name: "A", email: "not-an-email" }, { slot_id: "s1", name: 5, email: email() },
  ];
  for (const b of bad()) {
    const r = await call("POST", "/bookings", b);
    assert.equal(r.status, 400, JSON.stringify(b));
    assert.equal(typeof (await r.json()).error, "string");
  }
  assert.equal((await call("POST", "/bookings", { slot_id: "zzz", name: "A", email: email() })).status, 404);
  assert.equal((await call("POST", "/bookings", { slot_id: "past", name: "A", email: email() })).status, 400);
  const r = await fetch(BASE + "/bookings", { method: "POST", headers: { "X-API-Key": KEY, "Content-Type": "application/json" }, body: "{bad" });
  assert.equal(r.status, 400);
});

test("L3 double booking -> 409, and concurrent requests produce exactly one winner", async () => {
  const res = await Promise.all(
    Array.from({ length: 25 }, (_, i) => call("POST", "/bookings", { slot_id: "s3", name: `P${i}`, email: `race${i}@x.com` })),
  );
  const codes = res.map((r) => r.status).sort();
  assert.equal(codes.filter((c) => c === 201).length, 1);
  assert.equal(codes.filter((c) => c === 409).length, 24);
});

test("L3 cancel frees the slot; cancel twice -> 409; unknown -> 404", async () => {
  const b = await (await call("POST", "/bookings", { slot_id: "s1", name: "A", email: email() })).json();
  const c = await call("DELETE", `/bookings/${b.id}`);
  assert.equal(c.status, 200);
  assert.equal((await c.json()).status, "cancelled");
  assert.equal((await call("DELETE", `/bookings/${b.id}`)).status, 409);
  assert.equal((await call("DELETE", `/bookings/nope`)).status, 404);
  assert.equal((await call("POST", "/bookings", { slot_id: "s1", name: "B", email: email() })).status, 201);
});

test("L4 idempotency: replay, conflict, concurrent same key", async () => {
  const body = { slot_id: "s1", name: "A", email: email() };
  const h = { "Idempotency-Key": "k-" + Date.now() };
  const r1 = await call("POST", "/bookings", body, h);
  const r2 = await call("POST", "/bookings", body, h);
  assert.equal(r1.status, 201);
  assert.equal(r2.status, 201);
  assert.equal((await r1.json()).id, (await r2.json()).id);
  const r3 = await call("POST", "/bookings", { ...body, name: "Different" }, h);
  assert.equal(r3.status, 422);

  const h2 = { "Idempotency-Key": "c-" + Date.now() };
  const b2 = { slot_id: "s2", name: "A", email: email() };
  const many = await Promise.all(Array.from({ length: 4 }, () => call("POST", "/bookings", b2, h2)));
  assert.deepEqual(many.map((r) => r.status), [201, 201, 201, 201]);
  assert.equal(new Set(await Promise.all(many.map(async (r) => (await r.json()).id))).size, 1);
});

test("L4 pagination", async () => {
  const e = email();
  for (let i = 0; i < 5; i++) assert.equal((await call("POST", "/bookings", { slot_id: `p${i}`, name: "A", email: e })).status, 201);
  const seen: string[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const q = `/bookings?email=${encodeURIComponent(e.toUpperCase())}&limit=2` + (cursor ? `&cursor=${cursor}` : "");
    const page: any = await (await call("GET", q)).json();
    seen.push(...page.bookings.map((b: any) => b.slot_id));
    cursor = page.next_cursor; pages++;
  } while (cursor);
  assert.deepEqual(seen, ["p0", "p1", "p2", "p3", "p4"]);
  assert.equal(pages, 3);
  // exact multiple: last page has null cursor
  const exact: any = await (await call("GET", `/bookings?email=${encodeURIComponent(e)}&limit=5`)).json();
  assert.equal(exact.next_cursor, null);
  for (const l of ["0", "51", "abc", "1.5", "-1"]) assert.equal((await call("GET", `/bookings?email=${e}&limit=${l}`)).status, 400, l);
  assert.equal((await call("GET", `/bookings`)).status, 400);
  assert.equal((await call("GET", `/bookings?email=${e}&cursor=garbage`)).status, 400);
  assert.deepEqual((await (await call("GET", `/bookings?email=nobody@x.com`)).json()), { bookings: [], next_cursor: null });
});

test("L5 rate limit: 6th attempt in a minute -> 429 with Retry-After, others unaffected", async () => {
  const e = email();
  for (let i = 0; i < 5; i++) {
    const r = await call("POST", "/bookings", { slot_id: "zzz", name: "A", email: e }); // failed attempts count
    assert.equal(r.status, 404);
  }
  const r = await call("POST", "/bookings", { slot_id: "s1", name: "A", email: e.toUpperCase() });
  assert.equal(r.status, 429);
  const ra = Number(r.headers.get("retry-after"));
  assert.ok(Number.isInteger(ra) && ra >= 1 && ra <= 60);
  assert.equal((await call("POST", "/bookings", { slot_id: "s1", name: "A", email: email() })).status, 201);
});

test("L5 rate limit holds under concurrency", async () => {
  const e = email();
  const res = await Promise.all(Array.from({ length: 20 }, () => call("POST", "/bookings", { slot_id: "zzz", name: "A", email: e })));
  const codes = res.map((r) => r.status);
  assert.equal(codes.filter((c) => c === 404).length, 5);
  assert.equal(codes.filter((c) => c === 429).length, 15);
});

import test from "node:test";
import assert from "node:assert/strict";
import { buildChainLinkSeed, deterministicCid } from "./chain";

test("deterministicCid returns stable CID for same input", () => {
  const seed = "same-input";
  const first = deterministicCid(seed);
  const second = deterministicCid(seed);
  assert.equal(first, second);
  assert.ok(first.startsWith("bafy"));
});

test("buildChainLinkSeed changes when previous head changes", () => {
  const base = buildChainLinkSeed(1, "post:create", "cid-a", null);
  const next = buildChainLinkSeed(1, "post:create", "cid-a", "prev-cid");
  assert.notEqual(base, next);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("customer router retains core marketplace flows", async () => {
  const source = await readFile(new URL("../src/app/router/AppRouter.tsx", import.meta.url), "utf8");
  for (const route of ["login", "listing", "service", "payment"]) assert.match(source.toLowerCase(), new RegExp(route));
});

test("legacy validation script is valid JavaScript", async () => {
  const source = await readFile(new URL("../src/js/custom_validation.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /<!--|-->/);
  new Function(source);
});

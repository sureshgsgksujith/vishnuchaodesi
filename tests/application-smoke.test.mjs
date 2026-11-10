import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

test("customer router retains core marketplace flows", async () => {
  const source = await readFile(new URL("../src/app/router/AppRouter.tsx", import.meta.url), "utf8");
  for (const route of ["login", "listing", "service", "payment"]) assert.match(source.toLowerCase(), new RegExp(route));
});

test("legacy validation script is valid JavaScript", async () => {
  const source = await readFile(new URL("../src/js/custom_validation.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /<!--|-->/);
  new Function(source);
});

test("shared posting validation rejects values longer than database limits", async () => {
  const source = await readFile(new URL("../src/features/dashboard/utils/postingFieldValidation.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const validation = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
  const bootSpace = { key: "boot_space", label: "Boot Space", type: "text" };

  assert.equal(validation.getPostingFieldMaxLength(bootSpace), 50);
  assert.equal(validation.getPostingFieldValidationError(bootSpace, "x".repeat(50)), "");
  assert.equal(
    validation.getPostingFieldValidationError(bootSpace, "x".repeat(51)),
    "Boot Space must be 50 characters or fewer.",
  );
});

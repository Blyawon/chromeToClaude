#!/usr/bin/env node
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);
const tsxBin = require.resolve("tsx/cli");
const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, "../src/cli.ts");

const child = spawn(process.execPath, [tsxBin, entry, ...process.argv.slice(2)], {
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));

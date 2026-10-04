import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const files = readdirSync("scripts").filter(name => name.endsWith(".test.mjs")).sort().map(name => join("scripts", name));
if (!files.length) throw new Error("No scaffold tests discovered");
const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;

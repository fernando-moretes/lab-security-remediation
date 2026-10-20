#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { selfTest, initialState, finding, propose, approve, apply } from "../lab.mjs";
import { scenarios, runScenario } from "../scenarios.mjs";
import { startServer } from "../server.mjs";
import { reviewSyntheticAsff } from "../asff.mjs";

const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const args = process.argv.slice(2);
const json = args.includes("--json");
const langIndex = args.indexOf("--lang");
const locale = langIndex < 0 ? "pt" : args[langIndex + 1];
if (langIndex >= 0) args.splice(langIndex, 2);
if (args.includes("--json")) args.splice(args.indexOf("--json"), 1);
const command = args.shift() ?? "help";
const output = (value) => console.log(JSON.stringify(value, null, 2));
try {
  if (!["pt", "en"].includes(locale)) throw new Error("--lang must be pt or en");
  if (command === "--version" && args.length === 0) console.log(version);
  else if (["help", "--help"].includes(command) && args.length === 0) {
    console.log(`Security remediation review lab ${version}
LOCAL SIMULATION / SIMULAÇÃO LOCAL • no AWS resources • no credentials

security-remediation-lab test [--json]
security-remediation-lab propose
security-remediation-lab demo
security-remediation-lab scenarios [all|${scenarios.map((s) => s.id).join("|")}]
security-remediation-lab web
security-remediation-lab asff [synthetic-fixture.json]

Options: --lang pt|en, --json, --version, --help
web: local interactive demonstration at 127.0.0.1, random port; Ctrl+C to stop.
Docs: https://github.com/fernando-moretes/lab-security-remediation`);
  } else if (command === "test" && args.length === 0) output(selfTest());
  else if (["propose", "demo"].includes(command) && args.length === 0) {
    const state = initialState(), proposal = propose(finding, state);
    output(command === "propose" ? proposal :
      apply(proposal, approve(proposal, state, "explicit-cli-review"), state, new Map()));
  } else if (command === "scenarios" && args.length <= 1) {
    const ids = !args[0] || args[0] === "all" ? scenarios.map((s) => s.id) : args;
    const results = ids.map(runScenario);
    if (json) output(results);
    else for (const r of results) {
      console.log(`\n${r.title[locale]} (${r.id})\n${r.lesson[locale]}\n`);
      for (const step of r.steps) console.log(`  ${step.action}: ${JSON.stringify(step.value)}`);
      console.log(`\n${r.outcome} | version ${r.before.version} → ${r.after.version} | cloud calls: 0`);
    }
  } else if (command === "asff" && args.length <= 1) {
    const raw = readFileSync(args[0] ?? new URL("../fixtures/asff-s3-8.json", import.meta.url));
    if (raw.length > 65536) throw new Error("Fixture exceeds 64 KiB");
    let input;
    try { input = JSON.parse(raw.toString("utf8")); }
    catch { throw new Error("Invalid fixture JSON"); }
    output(reviewSyntheticAsff(input));
  } else if (command === "web" && args.length === 0) {
    const server = await startServer();
    console.log(`Local simulation: http://127.0.0.1:${server.address().port}\nCtrl+C to stop. No AWS calls or telemetry.`);
    for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close());
  } else throw new Error("Unknown command or extra arguments. Use --help.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

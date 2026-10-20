import { readFileSync } from "node:fs";
import { DurableLab, initializeDurableLab, faultPoints } from "../durable.mjs";
import { finding, propose, approve } from "../lab.mjs";

export function durableCommand(args) {
  const [command, path, ...rest] = args;
  if (!path) throw new Error("durable requires a command and database path; see DURABILITY.md");
  if (command === "init" && rest.length === 0) return initializeDurableLab(path);
  const valid = (
    (["inspect", "plan"].includes(command) && rest.length === 0) ||
    (command === "recover" && rest.length === 1) ||
    (command === "drift" && rest.length === 1 && ["true", "false"].includes(rest[0])) ||
    (command === "run" && rest[1] === "--approve" && (
      rest.length === 2 || (rest.length === 4 && rest[2] === "--crash" && faultPoints.includes(rest[3]))
    ))
  );
  if (!valid) throw new Error("Invalid durable command or arguments; see DURABILITY.md");
  const lab = new DurableLab(path);
  try {
    if (command === "inspect") return lab.inspect();
    if (command === "plan") return propose(finding, lab.inspect().state);
    if (command === "recover") return lab.recover(rest[0]);
    if (command === "drift") return lab.simulateDrift(rest[0] === "true");
    let proposal;
    try { proposal = JSON.parse(readFileSync(rest[0], "utf8")); }
    catch { throw new Error("Unable to read proposal JSON"); }
    const approval = approve(proposal, lab.inspect().state, "explicit-cli-review");
    return lab.execute(proposal, approval, {
      fault: (point) => { if (point === rest[3]) process.exit(86); },
    });
  } finally { lab.close(); }
}

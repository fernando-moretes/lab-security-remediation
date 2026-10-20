import { DurableLab } from "../../durable.mjs";
const [path, request, crashAt = ""] = process.argv.slice(2);
const { proposal, approval } = JSON.parse(request);
const lab = new DurableLab(path);
const execute = () => {
  try {
    const result = lab.execute(proposal, approval, {
      fault: (point) => { if (point === crashAt) process.exit(86); },
    });
    console.log(JSON.stringify(result));
    lab.close();
    if (process.connected) process.disconnect();
  } catch (error) {
    console.error(error.message);
    lab.close();
    process.exit(1);
  }
};
if (process.send) {
  process.on("message", execute);
  process.send("ready");
} else execute();

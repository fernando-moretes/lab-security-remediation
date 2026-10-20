const $ = (id) => document.getElementById(id);
const copy = {
  pt: { title: "Do finding à decisão revisada", intro: "Explore os caminhos de sucesso e falha. Simulação local, sem recursos AWS, credenciais ou telemetria.", choose: "Escolha um cenário", next: "Próximo passo", reset: "Reiniciar", step: "Passo", json: "Inspecionar evidência JSON", limitsTitle: "Limites importantes", limits: "A aprovação é simulada, o ledger existe apenas em memória e o booleano não representa toda a configuração S3. Não há identidade autenticada, persistência, expiração, concorrência distribuída ou integração AWS.", hint: "Os passos exibem resultados calculados pelo código do lab. Avançar a apresentação não modifica infraestrutura.", result: "Resultado", before: "Antes", after: "Depois" },
  en: { title: "From finding to reviewed decision", intro: "Explore success and failure paths. Local simulation: no AWS resources, credentials or telemetry.", choose: "Choose a scenario", next: "Next step", reset: "Restart", step: "Step", json: "Inspect JSON evidence", limitsTitle: "Important limitations", limits: "Approval is simulated, the ledger is in memory and the boolean is not the complete S3 configuration. There is no authenticated identity, persistence, expiry, distributed concurrency or AWS integration.", hint: "Steps display results computed by the lab code. Advancing the presentation does not modify infrastructure.", result: "Outcome", before: "Before", after: "After" },
};
let data = [], current = 0, step = 0, lang = "pt";
function render() {
  const t = copy[lang], s = data[current];
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  document.querySelector("h1").textContent = t.title;
  for (const [id, value] of Object.entries({ intro: t.intro, choose: t.choose, next: t.next, reset: t.reset, "json-label": t.json, "limits-title": t.limitsTitle, limits: t.limits, hint: t.hint })) $(id).textContent = value;
  $("scenarios").replaceChildren(...data.map((item, index) => {
    const button = document.createElement("button");
    button.textContent = item.title[lang]; button.setAttribute("aria-pressed", String(index === current));
    button.onclick = () => { current = index; step = 0; render(); };
    return button;
  }));
  $("scenario-title").textContent = s.title[lang]; $("lesson").textContent = s.lesson[lang];
  $("progress").textContent = `${t.step} ${step}/${s.steps.length}`;
  $("next").disabled = step >= s.steps.length; $("reset").disabled = step === 0;
  $("steps").replaceChildren(...s.steps.slice(0, step).map((item) => {
    const li = document.createElement("li"), heading = document.createElement("strong"), pre = document.createElement("pre");
    heading.textContent = item.action; pre.textContent = JSON.stringify(item.value, null, 2);
    li.append(heading, pre); return li;
  }));
  $("result").textContent = step === s.steps.length ? `${t.result}: ${s.outcome}. ${t.before}: v${s.before.version}, blockPublicAccess=${s.before.blockPublicAccess}. ${t.after}: v${s.after.version}, blockPublicAccess=${s.after.blockPublicAccess}. AWS calls: 0.` : "";
  $("json").textContent = JSON.stringify(s, null, 2);
}
$("next").onclick = () => { step++; render(); };
$("reset").onclick = () => { step = 0; render(); };
$("language").onchange = (event) => { lang = event.target.value; render(); };
fetch("/scenarios.json").then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
  .then((items) => { data = items; render(); })
  .catch(() => { $("scenario-title").textContent = "Não foi possível carregar / Unable to load"; });

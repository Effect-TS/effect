// Self time by source line from a .cpuprofile: node cpu-lines.mjs <file> [top]
import fs from "node:fs"
const p = JSON.parse(fs.readFileSync(process.argv[2]))
const lines = new Map(); let total = 0
for (const n of p.nodes) { total += n.hitCount ?? 0; for (const pt of n.positionTicks ?? []) { const k = n.callFrame.url.split("/").slice(-2).join("/") + ":" + pt.line + " (" + n.callFrame.functionName + ")"; lines.set(k, (lines.get(k) ?? 0) + pt.ticks) } }
for (const [k, t] of [...lines].sort((a, b) => b[1] - a[1]).slice(0, Number(process.argv[3] ?? 30))) console.log((t / total * 100).toFixed(1).padStart(5) + "% " + k)

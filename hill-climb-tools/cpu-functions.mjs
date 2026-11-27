// Self time by function from a .cpuprofile: node cpu-functions.mjs <file> [top]
import fs from "node:fs"
const p = JSON.parse(fs.readFileSync(process.argv[2]))
const self = new Map(); const byId = new Map()
for (const n of p.nodes) byId.set(n.id, n)
const dt = new Map()
for (let i = 0; i < p.samples.length; i++) dt.set(p.samples[i], (dt.get(p.samples[i]) ?? 0) + (p.timeDeltas[i] ?? 0))
let total = 0
for (const [id, t] of dt) { const n = byId.get(id); const cf = n.callFrame; const k = cf.functionName + " " + cf.url.split("/").slice(-2).join("/") + ":" + cf.lineNumber; self.set(k, (self.get(k) ?? 0) + t); total += t }
const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, Number(process.argv[3] ?? 30))
for (const [k, t] of top) console.log((t / total * 100).toFixed(1).padStart(5) + "% " + k)

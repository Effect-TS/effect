const mk = (n) => Array.from({ length: n }, (_, i) => ({ i }))
const arrs = [1, 2, 3, 5, 8, 12, 16].map(mk)
const el = { i: -1 }
const variants = {
  sliceSplice: (a, idx) => { const b = a.slice(); b.splice(idx, 0, el); return b },
  toSpliced: (a, idx) => a.toSpliced(idx, 0, el),
  manual: (a, idx) => { const b = new Array(a.length + 1); let i = 0; for (; i < idx; i++) b[i] = a[i]; b[idx] = el; for (; i < a.length; i++) b[i + 1] = a[i]; return b },
  slicePush: (a, idx) => { const b = a.slice(0, idx); b.push(el); for (let i = idx; i < a.length; i++) b.push(a[i]); return b },
  spread: (a, idx) => [...a.slice(0, idx), el, ...a.slice(idx)],
  copyWithin: (a, idx) => { const b = a.slice(); b.push(el); b.copyWithin(idx + 1, idx); b[idx] = el; return b }
}
for (const [name, f] of Object.entries(variants)) {
  let sink = 0
  const run = (n) => { for (let k = 0; k < n; k++) { const a = arrs[k % arrs.length]; sink += f(a, k % (a.length + 1)).length } }
  run(3e5)
  const s = performance.now(); run(3e6)
  console.log(name.padEnd(14), ((performance.now() - s) * 1e6 / 3e6).toFixed(1), "ns", sink)
}

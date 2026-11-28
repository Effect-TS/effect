import { AsyncLocalStorage, AsyncResource, executionAsyncId } from "node:async_hooks"
console.log(AsyncLocalStorage.snapshot.toString().slice(0, 600))
console.log("---bind", AsyncLocalStorage.bind.toString().slice(0, 400))
console.log("---AR.bind", AsyncResource.bind.toString().slice(0, 300), AsyncResource.prototype.bind.toString().slice(0, 700))
console.log("---ctor", AsyncResource.toString().slice(0, 2600))
const N = 2e6
const fn = function(x) { return x }
const bench = (name, f) => { for (let i = 0; i < 2e5; i++) f(i); const s = performance.now(); let a = 0; for (let i = 0; i < N; i++) a += f(i); console.log(name.padEnd(40), ((performance.now() - s) * 1e6 / N).toFixed(1), "ns") }
bench("AsyncResource+run+destroy", (i) => { const r = new AsyncResource("effect/Fiber"); try { return r.runInAsyncScope(fn, undefined, i) } finally { r.emitDestroy() } })
bench("AsyncResource manualDestroy+run", (i) => { const r = new AsyncResource("effect/Fiber", { requireManualDestroy: true }); return r.runInAsyncScope(fn, undefined, i) })
bench("snapshot+run", (i) => { const r = AsyncLocalStorage.snapshot(); return r(fn, i) })
bench("new only", (i) => { new AsyncResource("effect/Fiber"); return i })
const r0 = new AsyncResource("effect/Fiber")
bench("run only", (i) => r0.runInAsyncScope(fn, undefined, i))
bench("emitDestroy only(new+destroy)", (i) => { new AsyncResource("effect/Fiber").emitDestroy(); return i })
bench("executionAsyncId", (i) => executionAsyncId() + i)
const als = new AsyncLocalStorage()
bench("als.getStore", (i) => (als.getStore() ?? 0) + i)
als.run(1, () => {
bench("in-store AsyncResource+run+destroy", (i) => { const r = new AsyncResource("effect/Fiber"); try { return r.runInAsyncScope(fn, undefined, i) } finally { r.emitDestroy() } })
bench("in-store snapshot+run", (i) => { const r = AsyncLocalStorage.snapshot(); return r(fn, i) })
})

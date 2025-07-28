---
"effect": patch
---

improve: Enhance Cause.pretty output with additional error fields, similar to classic throw of Error.

code:

```
class MyError extends Error {
  testValue = 1
}
console.log(Cause.pretty(Cause.die(new MyError("my message")), { renderErrorCause: true }))
```

before:

```
Error: my message
    at /pj/effect/effect/packages/effect/test/Cause.test.ts:1081:51
    at file:///pj/effect/effect/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:155:11
    at file:///pj/effect/effect/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:752:26
    at file:///pj/effect/effect/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1897:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///pj/effect/effect/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1863:10)
    at runTest (file:///pj/effect/effect/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1574:12)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Promise.all (index 0)
    at runSuite (file:///pj/effect/effect/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1718:7)
```

after:

```
"Error: my message
    at /pj/effect/effect/packages/effect/test/Cause.test.ts:1081:51
    at file:///pj/effect/effect/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:155:11
    at file:///pj/effect/effect/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:752:26
    at file:///pj/effect/effect/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1897:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///pj/effect/effect/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1863:10)
    at runTest (file:///pj/effect/effect/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1574:12)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Promise.all (index 0)
    at runSuite (file:///pj/effect/effect/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1718:7) {
      testValue: 1
    }
```

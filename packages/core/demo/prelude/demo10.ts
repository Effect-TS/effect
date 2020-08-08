import * as E from "../../src/next/Effect"

const result = E.sequenceSPar({
  a: E.fail("ok" as const),
  b: E.succeed(0),
  c: E.fail("no" as const)
})

E.runPromiseExit(result).then(console.log)

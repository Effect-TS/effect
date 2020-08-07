import { pipe } from "../../src/Function"
import * as R from "../../src/next/Prelude/Reader"
import { sequenceSF } from "../../src/next/Prelude/abstract/Applicative"

const program = sequenceSF(R.Applicative)({
  a: R.access((r: { foo: string }) => r.foo),
  b: R.access((r: { bar: number }) => r.bar)
})

const result = pipe(program, R.runEnv({ bar: 1, foo: "ok" }))

console.log(result)

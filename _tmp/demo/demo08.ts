import { pipe } from "../src/Function"
import * as R from "../src/Reader"

const program = R.sequenceS({
  a: R.access((r: { foo: string }) => r.foo),
  b: R.access((r: { bar: number }) => r.bar)
})

const result = pipe(program, R.runEnv({ bar: 1, foo: "ok" }))

console.log(result)

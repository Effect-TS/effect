import * as E from "../src/Classic/Either"
import * as R from "../src/Classic/Reader"

const a = E.struct({
  a: E.left("a" as const),
  b: E.left("b" as const),
  c: E.left("c" as const)
})

const x = E.tuple(E.left("a" as const), E.left("b" as const), E.left("c" as const))

const y = R.tuple(R.environment<{ foo: string }>(), R.environment<{ bar: string }>())

const z = R.struct({
  a: R.environment<{ foo: string }>(),
  b: R.environment<{ bar: string }>()
})

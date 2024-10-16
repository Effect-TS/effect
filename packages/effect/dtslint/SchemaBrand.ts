import { pipe } from "effect/Function"
import * as S from "effect/Schema"

const Int1 = Symbol.for("Int")
const Int2 = Symbol.for("Int")

const schema1 = pipe(S.Number, S.int(), S.brand(Int1))
const schema2 = pipe(S.Number, S.int(), S.brand(Int2))

type A1 = S.Schema.Type<typeof schema1>
type A2 = S.Schema.Type<typeof schema2>

declare const a1: A1
declare const a2: A2
declare const f: (int: A1) => void

f(a1)
// @ts-expect-error
f(a2)

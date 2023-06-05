import * as S from "@effect/schema/Schema";
import { pipe } from "@effect/data/Function";

const Int1 = Symbol.for('Int')
const Int2 = Symbol.for('Int')

const schema1 = pipe(S.number, S.int(), S.brand(Int1))
const schema2 = pipe(S.number, S.int(), S.brand(Int2))

type A1 = S.To<typeof schema1>
type A2 = S.To<typeof schema2>

declare const a1: A1
declare const a2: A2
declare const f: (int: A1) => void

f(a1)
// @ts-expect-error
f(a2)

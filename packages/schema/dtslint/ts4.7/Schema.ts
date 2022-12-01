import { pipe } from "@fp-ts/data/Function"
import * as S from "@fp-ts/schema/Schema"

// $ExpectType Schema<{ readonly a: string; readonly b: number; }>
S.struct({
  a: S.string,
  b: S.number
})

//
// withRest
//

// $ExpectType Schema<readonly [string, number]>
pipe(S.tuple(S.string, S.number))

// $ExpectType Schema<readonly [string, number, ...boolean[]]>
pipe(S.tuple(S.string, S.number), S.withRest(S.boolean))

// $ExpectType Schema<readonly [string, number, ...(number | boolean)[]]>
pipe(S.tuple(S.string, S.number), S.withRest(S.boolean), S.withRest(S.number))

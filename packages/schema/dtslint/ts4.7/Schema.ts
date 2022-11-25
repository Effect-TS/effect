import * as S from "@fp-ts/schema/Schema"

// $ExpectType Schema<{ readonly a: string; readonly b: number; }>
S.struct({
  a: S.string,
  b: S.number
})

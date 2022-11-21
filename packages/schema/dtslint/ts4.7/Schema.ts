import * as S from "@fp-ts/codec/Schema"

// $ExpectType Schema<{ readonly a: string; readonly b: number; }>
S.struct({
  a: S.string,
  b: S.number
})

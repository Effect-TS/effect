import * as _ from "@effect/schema/data/Option"
import * as S from "@effect/schema"
import { pipe } from "@effect/data/Function"

// $ExpectType Schema<{ readonly a: string; readonly b: Option<number>; }>
pipe(S.struct({ a: S.string }), _.parseOptionals({ b: S.number }))

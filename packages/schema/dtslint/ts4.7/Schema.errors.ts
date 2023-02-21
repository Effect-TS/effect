import { pipe } from "@effect/data/Function";
import * as S from "@fp-ts/schema/Schema";

// optional/ should not allow combinators afterwards
// $ExpectError
pipe(S.boolean, S.optional, S.description('...'))
// $ExpectError
pipe(S.boolean, S.optional, S.nullable)

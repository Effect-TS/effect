import { pipe } from "@effect/data/Function";
import * as S from "@effect/schema/Schema";

// optional/ should not allow combinators afterwards
// @ts-expect-error
pipe(S.boolean, S.optional, S.description('...'))
// @ts-expect-error
pipe(S.boolean, S.optional, S.nullable)

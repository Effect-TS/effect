/**
 * @since 1.0.0
 */
import type { Either } from "@fp-ts/data/Either"
import * as E from "@fp-ts/data/Either"
import { IdentifierId } from "@fp-ts/schema/annotation/AST"
import * as H from "@fp-ts/schema/annotation/Hook"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const inline = <E, A>(
  left: Schema<E>,
  right: Schema<A>
): Schema<Either<E, A>> =>
  I.union(
    I.struct({ _tag: I.literal("Left"), left }),
    I.struct({ _tag: I.literal("Right"), right })
  )

const pretty = <E, A>(
  left: P.Pretty<E>,
  right: P.Pretty<A>
): P.Pretty<Either<E, A>> =>
  P.make(
    either(left, right),
    E.match(
      (e) => `left(${left.pretty(e)})`,
      (a) => `right(${right.pretty(a)})`
    )
  )

/**
 * @since 1.0.0
 */
export const either = <E, A>(
  left: Schema<E>,
  right: Schema<A>
): Schema<Either<E, A>> =>
  I.typeAlias([left, right], inline(left, right), {
    [IdentifierId]: "Either",
    [H.PrettyHookId]: H.hook(pretty)
  })

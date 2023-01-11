/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as H from "@fp-ts/schema/annotation/HookAnnotation"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const pretty = <A>(value: P.Pretty<A>): P.Pretty<Option<A>> =>
  P.make(
    option(value),
    O.match(
      () => "none",
      (a) => `some(${value.pretty(a)})`
    )
  )

/**
 * @since 1.0.0
 */
export const inline = <A>(value: Schema<A>): Schema<Option<A>> =>
  I.union(
    I.struct({ _tag: I.literal("None") }),
    I.struct({ _tag: I.literal("Some"), value })
  )

/**
 * @since 1.0.0
 */
export const option = <A>(value: Schema<A>): Schema<Option<A>> =>
  I.typeAlias("Option", [value], inline(value), {
    [H.PrettyHookId]: H.hook(pretty)
  })

/**
 * @since 1.0.0
 */
export const fromNullable = <A>(value: Schema<A>): Schema<Option<A>> =>
  pipe(
    I.union(I._undefined, I.nullable(value)),
    I.transform(option(value), O.fromNullable, O.getOrNull)
  )

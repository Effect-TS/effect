/**
 * @since 1.0.0
 */
import type * as DE from "@fp-ts/codec/DecodeError"
import type { Meta } from "@fp-ts/codec/Meta"
import * as meta from "@fp-ts/codec/Meta"
import type * as C from "@fp-ts/data/Context"
import type { Either } from "@fp-ts/data/Either"
import * as O from "@fp-ts/data/Option"
import type { Option } from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export type Schema<P, E, A> = Meta & {
  readonly P: P
  readonly E: E
  readonly A: A
}

/**
 * @since 1.0.0
 */
export const make = <P, E, A>(meta: Meta): Schema<P, E, A> => meta as any

/**
 * @since 1.0.0
 */
export const constructor = <S, P, E, A>(
  tag: C.Tag<S>,
  type: Schema<P, E, A>
): Schema<P | S, E, never> => make(meta.constructor(tag, type))

/**
 * @since 1.0.0
 */
export const string: Schema<never, DE.NotType, string> = make(meta.string)

/**
 * @since 1.0.0
 */
export const number: Schema<never, DE.NotType, number> = make(meta.number)

/**
 * @since 1.0.0
 */
export const boolean: Schema<never, DE.NotType, boolean> = make(meta.boolean)

/**
 * @since 1.0.0
 */
export const literal = <A extends meta.LiteralValue>(
  literal: A
): Schema<never, DE.NotEqual<A>, A> => make(meta.literal(literal))

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<unknown, unknown, unknown>>>(
  ...members: Members
): Schema<Members[number]["P"], Members[number]["E"], Members[number]["A"]> =>
  make(meta.union(members))

/**
 * @since 1.0.0
 */
export const tuple = <
  B extends boolean,
  Components extends ReadonlyArray<Schema<unknown, unknown, unknown>>
>(
  readonly: B,
  ...components: Components
): Schema<
  Components[number]["P"],
  Components[number]["E"],
  B extends true ? { readonly [K in keyof Components]: Components[K]["A"] }
    : { [K in keyof Components]: Components[K]["A"] }
> => make(meta.tuple(components, O.none, readonly))

/**
 * @since 1.0.0
 */
export const nonEmptyArray = <B extends boolean, HP, HE, HA, TP, TE, TA>(
  readonly: B,
  head: Schema<HP, HE, HA>,
  tail: Schema<TP, TE, TA>
): Schema<
  HP | TP,
  HE | TE,
  B extends true ? readonly [HA, ...Array<TA>] : [HA, ...Array<TA>]
> => make(meta.tuple([head], O.some(tail), readonly))

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<unknown, unknown, unknown>>>(
  fields: Fields
): Schema<
  Fields[keyof Fields]["P"],
  Fields[keyof Fields]["E"],
  { readonly [K in keyof Fields]: Fields[K]["A"] }
> =>
  make(
    meta.struct(
      Object.keys(fields).map((name) => meta.field(name, fields[name], false, true))
    )
  )

/**
 * @since 1.0.0
 */
export const indexSignature = <P, E, A>(
  value: Schema<P, E, A>
): Schema<P, E, { readonly [_: string]: A }> => make(meta.indexSignature("string", value, true))

/**
 * @since 1.0.0
 */
export const array = <B extends boolean, P, E, A>(
  readonly: B,
  item: Schema<P, E, A>
): Schema<P, E, B extends true ? ReadonlyArray<A> : Array<A>> => make(meta.array(item, readonly))

/**
 * @since 1.0.0
 */
export const option = <P, E, A>(
  value: Schema<P, E, A>
): Schema<P, DE.NotEqual<"None"> | DE.NotEqual<"Some"> | E, Option<A>> =>
  union(
    struct({ _tag: literal("None") }),
    struct({ _tag: literal("Some"), value })
  )

/**
 * @since 1.0.0
 */
export const either = <PL, EL, L, PR, ER, R>(
  left: Schema<PL, EL, L>,
  right: Schema<PR, ER, R>
): Schema<PR | PL, EL | ER | DE.NotEqual<"Left"> | DE.NotEqual<"Right">, Either<L, R>> =>
  union(
    struct({ _tag: literal("Left"), left }),
    struct({ _tag: literal("Right"), right })
  )

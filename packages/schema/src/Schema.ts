/**
 * @since 1.0.0
 */
import type * as DE from "@fp-ts/codec/DecodeError"
import type { DSL } from "@fp-ts/codec/DSL"
import * as dsl from "@fp-ts/codec/DSL"
import type { Either } from "@fp-ts/data/Either"
import type { Option } from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface Schema<out P, out E, out A> {
  readonly P: P
  readonly E: E
  readonly A: A
  readonly dsl: DSL
}

/**
 * @since 1.0.0
 */
export const make = <P, E, A>(dsl: DSL): Schema<P, E, A> => ({ dsl }) as any

/**
 * @since 1.0.0
 */
export const constructor = <P, E, A>(
  name: string,
  type: Schema<P, E, A>
): Schema<never, never, never> => make(dsl.constructorDSL(name, type.dsl))

/**
 * @since 1.0.0
 */
export const string: Schema<never, DE.NotType, string> = make(dsl.stringDSL)

/**
 * @since 1.0.0
 */
export const number: Schema<never, DE.NotType, number> = make(dsl.numberDSL)

/**
 * @since 1.0.0
 */
export const boolean: Schema<never, DE.NotType, boolean> = make(dsl.booleanDSL)

/**
 * @since 1.0.0
 */
export const literal = <A extends dsl.Literal>(
  literal: A
): Schema<never, DE.NotEqual<A>, A> => make(dsl.literalDSL(literal))

/**
 * @since 1.0.0
 */
export const array = <P, E, A, B extends boolean>(
  item: Schema<P, E, A>,
  readonly: B
): Schema<P, E, B extends true ? ReadonlyArray<A> : Array<A>> =>
  make(dsl.arrayDSL(item.dsl, readonly))

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<any, any, any>>>(
  fields: Fields
): Schema<
  Fields[keyof Fields]["P"],
  Fields[keyof Fields]["E"],
  { readonly [K in keyof Fields]: Fields[K]["A"] }
> =>
  make(
    dsl.structDSL(
      Object.keys(fields).map((name) => dsl.fieldDSL(name, fields[name].dsl, false, true))
    )
  )

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<any, any, any>>>(
  ...members: Members
): Schema<Members[number]["P"], Members[number]["E"], Members[number]["A"]> =>
  make(dsl.unionDSL(members.map((m) => m.dsl)))

/**
 * @since 1.0.0
 */
export const indexSignature = <P, E, A>(
  value: Schema<P, E, A>
): Schema<P, E, { readonly [_: string]: A }> =>
  make(dsl.indexSignatureDSL("string", value.dsl, true))

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

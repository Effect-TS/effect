/**
 * @since 2.0.0
 */
import type * as Channel from "./Channel"
import * as Effect from "./Effect"
import * as Effectable from "./Effectable"
import type * as Equal from "./Equal"
import * as internal from "./internal/Data"
import { type Pipeable } from "./Pipeable"
import type * as Sink from "./Sink"
import type * as Types from "./Types"

/**
 * @category models
 * @since 2.0.0
 */
export type Data<A extends Record<string, any> | ReadonlyArray<any>> =
  & { readonly [P in keyof A]: A[P] }
  & Equal.Equal

/**
 * `Case` represents a datatype similar to a case class in Scala. Namely, a
 * datatype created using `Case` will, by default, provide an implementation
 * for a constructor, `Hash`, and `Equal`.
 *
 * @since 2.0.0
 * @category models
 */
export interface Case extends Equal.Equal {}

/**
 * @since 2.0.0
 */
export declare namespace Case {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Constructor<A extends Case, Tag extends keyof A = never> {
    (
      args: Types.Equals<Omit<A, Tag | keyof Equal.Equal>, {}> extends true ? void
        : { readonly [P in Exclude<keyof A, Tag | keyof Equal.Equal>]: A[P] }
    ): A
  }
}

/**
 * @example
 * import * as Data from "effect/Data"
 * import * as Equal from "effect/Equal"
 *
 * const alice = Data.struct({ name: "Alice", age: 30 })
 *
 * const bob = Data.struct({ name: "Bob", age: 40 })
 *
 * assert.deepStrictEqual(Equal.equals(alice, alice), true)
 * assert.deepStrictEqual(Equal.equals(alice, Data.struct({ name: "Alice", age: 30 })), true)
 *
 * assert.deepStrictEqual(Equal.equals(alice, { name: "Alice", age: 30 }), false)
 * assert.deepStrictEqual(Equal.equals(alice, bob), false)
 *
 * @category constructors
 * @since 2.0.0
 */
export const struct: <A extends Record<string, any>>(a: A) => Data<{ readonly [P in keyof A]: A[P] }> = internal.struct

/**
 * @category constructors
 * @since 2.0.0
 */
export const unsafeStruct = <A extends Record<string, any>>(as: A): Data<{ readonly [P in keyof A]: A[P] }> =>
  Object.setPrototypeOf(as, internal.StructProto)

/**
 * @example
 * import * as Data from "effect/Data"
 * import * as Equal from "effect/Equal"
 *
 * const alice = Data.tuple("Alice", 30)
 *
 * const bob = Data.tuple("Bob", 40)
 *
 * assert.deepStrictEqual(Equal.equals(alice, alice), true)
 * assert.deepStrictEqual(Equal.equals(alice, Data.tuple("Alice", 30)), true)
 *
 * assert.deepStrictEqual(Equal.equals(alice, ["Alice", 30]), false)
 * assert.deepStrictEqual(Equal.equals(alice, bob), false)
 *
 * @category constructors
 * @since 2.0.0
 */
export const tuple = <As extends ReadonlyArray<any>>(...as: As): Data<Readonly<As>> => unsafeArray(as)

/**
 * @example
 * import * as Data from "effect/Data"
 * import * as Equal from "effect/Equal"
 *
 * const alice = Data.struct({ name: "Alice", age: 30 })
 * const bob = Data.struct({ name: "Bob", age: 40 })
 *
 * const persons = Data.array([alice, bob])
 *
 * assert.deepStrictEqual(
 *   Equal.equals(
 *     persons,
 *     Data.array([
 *       Data.struct({ name: "Alice", age: 30 }),
 *       Data.struct({ name: "Bob", age: 40 })
 *     ])
 *   ),
 *   true
 * )
 *
 * @category constructors
 * @since 2.0.0
 */
export const array = <As extends ReadonlyArray<any>>(as: As): Data<Readonly<As>> =>
  unsafeArray(as.slice(0) as unknown as As)

/**
 * @category constructors
 * @since 2.0.0
 */
export const unsafeArray = <As extends ReadonlyArray<any>>(as: As): Data<Readonly<As>> =>
  Object.setPrototypeOf(as, internal.ArrayProto)

const _case = <A extends Case>(): Case.Constructor<A> => (args) =>
  (args === undefined ? Object.create(internal.StructProto) : struct(args)) as any

export {
  /**
   * Provides a constructor for the specified `Case`.
   *
   * @example
   * import * as Data from "effect/Data"
   * import * as Equal from "effect/Equal"
   *
   * // Extending Data.Case to implement Equal
   * interface Person extends Data.Case {
   *   readonly name: string
   * }
   *
   * // Creating a constructor for the specified Case
   * const Person = Data.case<Person>()
   *
   * // Creating instances of Person
   * const mike1 = Person({ name: "Mike" })
   * const mike2 = Person({ name: "Mike" })
   * const john = Person({ name: "John" })
   *
   * // Checking equality
   * assert.deepStrictEqual(Equal.equals(mike1, mike2), true)
   * assert.deepStrictEqual(Equal.equals(mike1, john), false)
   *
   * @since 2.0.0
   * @category constructors
   */
  _case as case
}

/**
 * Provides a tagged constructor for the specified `Case`.
 *
 * @example
 * import * as Data from "effect/Data"
 *
 * interface Person extends Data.Case {
 *   readonly _tag: "Person" // the tag
 *   readonly name: string
 * }
 *
 * const Person = Data.tagged<Person>("Person")
 *
 * const mike = Person({ name: "Mike" })
 *
 * assert.deepEqual(mike, { _tag: "Person", name: "Mike" })
 *
 * @since 2.0.0
 * @category constructors
 */
export const tagged = <A extends Case & { readonly _tag: string }>(
  tag: A["_tag"]
): Case.Constructor<A, "_tag"> =>
(args) => {
  const value = args === undefined ? Object.create(internal.StructProto) : struct(args)
  value._tag = tag
  return value
}

/**
 * Provides a constructor for a Case Class.
 *
 * @example
 * import * as Data from "effect/Data"
 * import * as Equal from "effect/Equal"
 *
 * class Person extends Data.Class<{ readonly name: string }> {}
 *
 * // Creating instances of Person
 * const mike1 = new Person({ name: "Mike" })
 * const mike2 = new Person({ name: "Mike" })
 * const john = new Person({ name: "John" })
 *
 * // Checking equality
 * assert.deepStrictEqual(Equal.equals(mike1, mike2), true)
 * assert.deepStrictEqual(Equal.equals(mike1, john), false)
 *
 * @since 2.0.0
 * @category constructors
 */
export const Class: new<A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void
    : { readonly [P in Exclude<keyof A, keyof Equal.Equal>]: A[P] }
) => Data<Readonly<A>> = internal.Structural as any

/**
 * Provides a Tagged constructor for a Case Class.
 *
 * @example
 * import * as Data from "effect/Data"
 * import * as Equal from "effect/Equal"
 *
 * class Person extends Data.TaggedClass("Person")<{ readonly name: string }> {}
 *
 * // Creating instances of Person
 * const mike1 = new Person({ name: "Mike" })
 * const mike2 = new Person({ name: "Mike" })
 * const john = new Person({ name: "John" })
 *
 * // Checking equality
 * assert.deepStrictEqual(Equal.equals(mike1, mike2), true)
 * assert.deepStrictEqual(Equal.equals(mike1, john), false)
 *
 * assert.deepStrictEqual(mike1._tag, "Person")
 *
 * @since 2.0.0
 * @category constructors
 */
export const TaggedClass = <Tag extends string>(
  tag: Tag
): new<A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void
    : { readonly [P in Exclude<keyof A, keyof Equal.Equal>]: A[P] }
) => Data<Readonly<A> & { readonly _tag: Tag }> => {
  class Base extends Class<any> {
    readonly _tag = tag
  }
  return Base as any
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const Structural: new<A>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void : Omit<A, keyof Equal.Equal>
) => Case = internal.Structural

/**
 * Create a tagged enum data type, which is a union of `Data` structs.
 *
 * ```ts
 * import * as Data from "effect/Data"
 *
 * type HttpError = Data.TaggedEnum<{
 *   BadRequest: { readonly status: 400, readonly message: string }
 *   NotFound: { readonly status: 404, readonly message: string }
 * }>
 *
 * // Equivalent to:
 * type HttpErrorPlain =
 *   | Data.Data<{
 *     readonly _tag: "BadRequest"
 *     readonly status: 400
 *     readonly message: string
 *   }>
 *   | Data.Data<{
 *     readonly _tag: "NotFound"
 *     readonly status: 404
 *     readonly message: string
 *   }>
 * ```
 *
 * @since 2.0.0
 * @category models
 */
export type TaggedEnum<
  A extends Record<string, Record<string, any>> & UntaggedChildren<A>
> = keyof A extends infer Tag ? Tag extends keyof A ? Data<
      {
        readonly [K in keyof ({ readonly _tag: Tag } & A[Tag])]: K extends "_tag" ? Tag : A[Tag][K]
      }
    >
  : never
  : never

type ChildrenAreTagged<A> = keyof A extends infer K ? K extends keyof A ? "_tag" extends keyof A[K] ? true
    : false
  : never
  : never

type UntaggedChildren<A> = true extends ChildrenAreTagged<A>
  ? "It looks like you're trying to create a tagged enum, but one or more of its members already has a `_tag` property."
  : unknown

/**
 * @since 2.0.0
 */
export declare namespace TaggedEnum {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface WithGenerics<Count extends number> {
    readonly taggedEnum: Data<{ readonly _tag: string }>
    readonly numberOfGenerics: Count

    readonly A: unknown
    readonly B: unknown
    readonly C: unknown
    readonly D: unknown
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export type Kind<
    Z extends WithGenerics<number>,
    A = unknown,
    B = unknown,
    C = unknown,
    D = unknown
  > = (Z & {
    readonly A: A
    readonly B: B
    readonly C: C
    readonly D: D
  })["taggedEnum"]

  /**
   * @since 2.0.0
   */
  export type Args<
    A extends Data<{ readonly _tag: string }>,
    K extends A["_tag"]
  > = Omit<Extract<A, { readonly _tag: K }>, "_tag" | keyof Case> extends infer T ? {} extends T ? void : T
    : never

  /**
   * @since 2.0.0
   */
  export type Value<
    A extends Data<{ readonly _tag: string }>,
    K extends A["_tag"]
  > = Extract<A, { readonly _tag: K }>
}

/**
 * Create a constructor for a tagged union of `Data` structs.
 *
 * You can also pass a `TaggedEnum.WithGenerics` if you want to add generics to
 * the constructor.
 *
 * @example
 * import * as Data from "effect/Data"
 *
 * const HttpError = Data.taggedEnum<
 *   | Data.Data<{ readonly _tag: "BadRequest"; readonly status: 400; readonly message: string }>
 *   | Data.Data<{ readonly _tag: "NotFound"; readonly status: 404; readonly message: string }>
 * >()
 *
 * const notFound = HttpError("NotFound")({ status: 404, message: "Not Found" })
 *
 * @example
 * import * as Data from "effect/Data"
 *
 * type MyResult<E, A> = Data.TaggedEnum<{
 *   Failure: { readonly error: E }
 *   Success: { readonly value: A }
 * }>
 * interface MyResultDefinition extends Data.TaggedEnum.WithGenerics<2> {
 *   readonly taggedEnum: MyResult<this["A"], this["B"]>
 * }
 * const MyResult = Data.taggedEnum<MyResultDefinition>()
 *
 * const success = MyResult("Success")({ value: 1 })
 *
 * @category constructors
 * @since 2.0.0
 */
export const taggedEnum: {
  <Z extends TaggedEnum.WithGenerics<1>>(): <
    K extends Z["taggedEnum"]["_tag"]
  >(
    tag: K
  ) => <A>(
    args: TaggedEnum.Args<TaggedEnum.Kind<Z, A>, K>
  ) => TaggedEnum.Value<TaggedEnum.Kind<Z, A>, K>

  <Z extends TaggedEnum.WithGenerics<2>>(): <
    K extends Z["taggedEnum"]["_tag"]
  >(
    tag: K
  ) => <A, B>(
    args: TaggedEnum.Args<TaggedEnum.Kind<Z, A, B>, K>
  ) => TaggedEnum.Value<TaggedEnum.Kind<Z, A, B>, K>

  <Z extends TaggedEnum.WithGenerics<3>>(): <
    K extends Z["taggedEnum"]["_tag"]
  >(
    tag: K
  ) => <A, B, C>(
    args: TaggedEnum.Args<TaggedEnum.Kind<Z, A, B, C>, K>
  ) => TaggedEnum.Value<TaggedEnum.Kind<Z, A, B, C>, K>

  <Z extends TaggedEnum.WithGenerics<4>>(): <
    K extends Z["taggedEnum"]["_tag"]
  >(
    tag: K
  ) => <A, B, C, D>(
    args: TaggedEnum.Args<TaggedEnum.Kind<Z, A, B, C, D>, K>
  ) => TaggedEnum.Value<TaggedEnum.Kind<Z, A, B, C, D>, K>

  <A extends Data<{ readonly _tag: string }>>(): <K extends A["_tag"]>(
    tag: K
  ) => Case.Constructor<Extract<A, { readonly _tag: K }>, "_tag">
} = () => tagged as any

/**
 * @since 2.0.0
 * @category models
 */
export interface YieldableError extends Case, Pipeable, Readonly<Error> {
  readonly [Effectable.EffectTypeId]: Effect.Effect.VarianceStruct<never, this, never>
  readonly [Effectable.StreamTypeId]: Effect.Effect.VarianceStruct<never, this, never>
  readonly [Effectable.SinkTypeId]: Sink.Sink.VarianceStruct<never, this, unknown, never, never>
  readonly [Effectable.ChannelTypeId]: Channel.Channel.VarianceStruct<
    never,
    unknown,
    unknown,
    unknown,
    this,
    never,
    never
  >
}

const YieldableErrorMessage = Symbol.for("effect/Data/YieldableError/message")
const YieldableErrorProto = {
  ...Effectable.StructuralCommitPrototype,
  __proto__: globalThis.Error.prototype,
  commit() {
    return Effect.fail(this)
  },
  toString(this: globalThis.Error) {
    return `${this.name}: ${this.message}`
  },
  get message() {
    return (this as any)[YieldableErrorMessage] ?? JSON.stringify(this)
  },
  set message(value) {
    ;(this as any)[YieldableErrorMessage] = value
  }
}

/**
 * Provides a constructor for a Case Class.
 *
 * @since 2.0.0
 * @category constructors
 */
export const Error: new<A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void
    : { readonly [P in Exclude<keyof A, keyof Equal.Equal>]: A[P] }
) => YieldableError & Readonly<A> = (function() {
  function Base(this: any, args: any) {
    if (args) {
      Object.assign(this, args)
    }
    globalThis.Error.captureStackTrace(this, this.constructor)
  }
  Base.prototype = YieldableErrorProto
  return Base as any
})()

/**
 * @since 2.0.0
 * @category constructors
 */
export const TaggedError = <Tag extends string>(tag: Tag): new<A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void
    : { readonly [P in Exclude<keyof A, keyof Equal.Equal>]: A[P] }
) => YieldableError & { readonly _tag: Tag } & Readonly<A> => {
  class Base extends Error<{}> {
    readonly _tag = tag
  }
  ;(Base.prototype as any).name = tag
  return Base as any
}

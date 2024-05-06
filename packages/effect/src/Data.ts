/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import * as core from "./internal/core.js"
import * as internal from "./internal/data.js"
import { StructuralPrototype } from "./internal/effectable.js"
import * as Predicate from "./Predicate.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 */
export declare namespace Case {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Constructor<A, Tag extends keyof A = never> {
    (
      args: Types.Equals<Omit<A, Tag>, {}> extends true ? void
        : { readonly [P in keyof A as P extends Tag ? never : P]: A[P] }
    ): A
  }
}

/**
 * @example
 * import { Data, Equal } from "effect"
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
export const struct: <A extends Record<string, any>>(a: A) => { readonly [P in keyof A]: A[P] } = internal.struct

/**
 * @category constructors
 * @since 2.0.0
 */
export const unsafeStruct = <A extends Record<string, any>>(as: A): { readonly [P in keyof A]: A[P] } =>
  Object.setPrototypeOf(as, StructuralPrototype)

/**
 * @example
 * import { Data, Equal } from "effect"
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
export const tuple = <As extends ReadonlyArray<any>>(...as: As): Readonly<As> => unsafeArray(as)

/**
 * @example
 * import { Data, Equal } from "effect"
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
export const array = <As extends ReadonlyArray<any>>(as: As): Readonly<As> => unsafeArray(as.slice(0) as unknown as As)

/**
 * @category constructors
 * @since 2.0.0
 */
export const unsafeArray = <As extends ReadonlyArray<any>>(as: As): Readonly<As> =>
  Object.setPrototypeOf(as, internal.ArrayProto)

const _case = <A>(): Case.Constructor<A> => (args) =>
  (args === undefined ? Object.create(StructuralPrototype) : struct(args)) as any

export {
  /**
   * Provides a constructor for the specified `Case`.
   *
   * @example
   * import { Data, Equal } from "effect"
   *
   * interface Person {
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
 * import { Data } from "effect"
 *
 * interface Person {
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
export const tagged = <A extends { readonly _tag: string }>(
  tag: A["_tag"]
): Case.Constructor<A, "_tag"> =>
(args) => {
  const value = args === undefined ? Object.create(StructuralPrototype) : struct(args)
  value._tag = tag
  return value
}

/**
 * Provides a constructor for a Case Class.
 *
 * @example
 * import { Data, Equal } from "effect"
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
export const Class: new<A extends Record<string, any> = {}>(
  args: Types.Equals<A, {}> extends true ? void
    : { readonly [P in keyof A]: A[P] }
) => Readonly<A> = internal.Structural as any

/**
 * Provides a Tagged constructor for a Case Class.
 *
 * @example
 * import { Data, Equal } from "effect"
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
): new<A extends Record<string, any> = {}>(
  args: Types.Equals<A, {}> extends true ? void
    : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }
) => Readonly<A> & { readonly _tag: Tag } => {
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
  args: Types.Equals<A, {}> extends true ? void
    : { readonly [P in keyof A]: A[P] }
) => {} = internal.Structural as any

/**
 * Create a tagged enum data type, which is a union of `Data` structs.
 *
 * ```ts
 * import { Data } from "effect"
 *
 * type HttpError = Data.TaggedEnum<{
 *   BadRequest: { readonly status: 400, readonly message: string }
 *   NotFound: { readonly status: 404, readonly message: string }
 * }>
 *
 * // Equivalent to:
 * type HttpErrorPlain =
 *   | {
 *     readonly _tag: "BadRequest"
 *     readonly status: 400
 *     readonly message: string
 *   }
 *   | {
 *     readonly _tag: "NotFound"
 *     readonly status: 404
 *     readonly message: string
 *   }
 * ```
 *
 * @since 2.0.0
 * @category models
 */
export type TaggedEnum<
  A extends Record<string, Record<string, any>> & UntaggedChildren<A>
> = keyof A extends infer Tag ?
  Tag extends keyof A ? Types.Simplify<{ readonly _tag: Tag } & { readonly [K in keyof A[Tag]]: A[Tag][K] }>
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
    readonly taggedEnum: { readonly _tag: string }
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
    A extends { readonly _tag: string },
    K extends A["_tag"],
    E = Extract<A, { readonly _tag: K }>
  > = { readonly [K in keyof E as K extends "_tag" ? never : K]: E[K] } extends infer T ? {} extends T ? void : T
    : never

  /**
   * @since 2.0.0
   */
  export type Value<
    A extends { readonly _tag: string },
    K extends A["_tag"]
  > = Extract<A, { readonly _tag: K }>

  /**
   * @since 3.1.0
   */
  export type Constructor<A extends { readonly _tag: string }> = Types.Simplify<
    & {
      readonly [Tag in A["_tag"]]: Case.Constructor<Extract<A, { readonly _tag: Tag }>, "_tag">
    }
    & {
      readonly $is: <Tag extends A["_tag"]>(tag: Tag) => (u: unknown) => u is Extract<A, { readonly _tag: Tag }>
      readonly $match: <
        Cases extends {
          readonly [Tag in A["_tag"]]: (args: Extract<A, { readonly _tag: Tag }>) => any
        }
      >(cases: Cases) => (value: A) => ReturnType<Cases[A["_tag"]]>
    }
  >
}

/**
 * Create a constructor for a tagged union of `Data` structs.
 *
 * You can also pass a `TaggedEnum.WithGenerics` if you want to add generics to
 * the constructor.
 *
 * @example
 * import { Data } from "effect"
 *
 * const { BadRequest, NotFound } = Data.taggedEnum<
 *   | { readonly _tag: "BadRequest"; readonly status: 400; readonly message: string }
 *   | { readonly _tag: "NotFound"; readonly status: 404; readonly message: string }
 * >()
 *
 * const notFound = NotFound({ status: 404, message: "Not Found" })
 *
 * @example
 * import { Data } from "effect"
 *
 * type MyResult<E, A> = Data.TaggedEnum<{
 *   Failure: { readonly error: E }
 *   Success: { readonly value: A }
 * }>
 * interface MyResultDefinition extends Data.TaggedEnum.WithGenerics<2> {
 *   readonly taggedEnum: MyResult<this["A"], this["B"]>
 * }
 * const { Failure, Success } = Data.taggedEnum<MyResultDefinition>()
 *
 * const success = Success({ value: 1 })
 *
 * @category constructors
 * @since 2.0.0
 */
export const taggedEnum: {
  <Z extends TaggedEnum.WithGenerics<1>>(): {
    readonly [Tag in Z["taggedEnum"]["_tag"]]: <A>(
      args: TaggedEnum.Args<
        TaggedEnum.Kind<Z, A>,
        Tag,
        Extract<TaggedEnum.Kind<Z, A>, { readonly _tag: Tag }>
      >
    ) => TaggedEnum.Value<TaggedEnum.Kind<Z, A>, Tag>
  }

  <Z extends TaggedEnum.WithGenerics<2>>(): {
    readonly [Tag in Z["taggedEnum"]["_tag"]]: <A, B>(
      args: TaggedEnum.Args<
        TaggedEnum.Kind<Z, A, B>,
        Tag,
        Extract<TaggedEnum.Kind<Z, A, B>, { readonly _tag: Tag }>
      >
    ) => TaggedEnum.Value<TaggedEnum.Kind<Z, A, B>, Tag>
  }

  <Z extends TaggedEnum.WithGenerics<3>>(): {
    readonly [Tag in Z["taggedEnum"]["_tag"]]: <A, B, C>(
      args: TaggedEnum.Args<
        TaggedEnum.Kind<Z, A, B, C>,
        Tag,
        Extract<TaggedEnum.Kind<Z, A, B, C>, { readonly _tag: Tag }>
      >
    ) => TaggedEnum.Value<TaggedEnum.Kind<Z, A, B, C>, Tag>
  }

  <Z extends TaggedEnum.WithGenerics<4>>(): {
    readonly [Tag in Z["taggedEnum"]["_tag"]]: <A, B, C, D>(
      args: TaggedEnum.Args<
        TaggedEnum.Kind<Z, A, B, C, D>,
        Tag,
        Extract<TaggedEnum.Kind<Z, A, B, C, D>, { readonly _tag: Tag }>
      >
    ) => TaggedEnum.Value<TaggedEnum.Kind<Z, A, B, C, D>, Tag>
  }

  <A extends { readonly _tag: string }>(): TaggedEnum.Constructor<A>
} = () =>
  new Proxy({}, {
    get(_target, tag, _receiver) {
      if (tag === "$is") {
        return taggedIs
      } else if (tag === "$match") {
        return taggedMatch
      }
      return tagged(tag as string)
    }
  }) as any

function taggedIs<A extends { readonly _tag: string }, Tag extends A["_tag"]>(tag: Tag) {
  return Predicate.isTagged(tag)
}

function taggedMatch<
  A extends { readonly _tag: string },
  Cases extends {
    readonly [K in A["_tag"]]: (args: Extract<A, { readonly _tag: K }>) => any
  }
>(cases: Cases) {
  return function(value: A): ReturnType<Cases[A["_tag"]]> {
    return cases[value._tag as A["_tag"]](value as any)
  }
}

/**
 * Provides a constructor for a Case Class.
 *
 * @since 2.0.0
 * @category constructors
 */
export const Error: new<A extends Record<string, any> = {}>(
  args: Types.Equals<A, {}> extends true ? void
    : { readonly [P in keyof A]: A[P] }
) => Cause.YieldableError & Readonly<A> = (function() {
  return class Base extends core.YieldableError {
    constructor(args: any) {
      super()
      if (args) {
        Object.assign(this, args)
      }
    }
  } as any
})()

/**
 * @since 2.0.0
 * @category constructors
 */
export const TaggedError = <Tag extends string>(tag: Tag): new<A extends Record<string, any> = {}>(
  args: Types.Equals<A, {}> extends true ? void
    : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }
) => Cause.YieldableError & { readonly _tag: Tag } & Readonly<A> => {
  class Base extends Error<{}> {
    readonly _tag = tag
  }
  ;(Base.prototype as any).name = tag
  return Base as any
}

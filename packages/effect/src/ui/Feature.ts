/**
 * Features are components a parent refers to by service instead of by value,
 * so the implementation can be swapped with a Layer.
 *
 * A feature service holds the contract: the Props and Emits Schemas. Model and
 * Message belong to the implementation. The app provides an implementation
 * with `Todos.layer(TodoList)`, and a test or storybook provides a fake with
 * `Todos.layer(FakeTodos)`. A parent renders it with `h.child(Todos, ...)` and
 * requires `Todos` only: the implementation's requirements are closed where
 * the feature's Layer is built.
 *
 * **Example** (Declaring a feature and providing an implementation)
 *
 * ```ts import.meta.vitest
 * import { Component, Feature } from "effect/ui"
 * import { Schema } from "effect"
 *
 * const TodosProps = Schema.Struct({ filter: Schema.Literals(["all", "open"]) })
 * const TodosEmits = Schema.TaggedUnion({ Counted: { open: Schema.Number } })
 *
 * class Todos extends Feature.Service<Todos>()("Todos", { props: TodosProps, emits: TodosEmits }) {}
 *
 * const TodoList = Component.make({
 *   name: "TodoList",
 *   props: TodosProps,
 *   model: Schema.Struct({}),
 *   message: Schema.Never,
 *   emits: TodosEmits,
 *   init: () => ({}),
 *   update: (model) => model,
 *   view: (_, h) => h.el("ul")
 * })
 *
 * // The app picks the implementation. A test provides a fake the same way.
 * const TodosLive = Todos.layer(TodoList)
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Predicate from "../Predicate.ts"
import * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"
import type * as Component from "./Component.ts"

/**
 * Identifies a feature service.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.3
 */
export const TypeId = "~effect/ui/Feature" as const

/**
 * Identifies a feature service.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.3
 */
export type TypeId = typeof TypeId

/**
 * The value behind a feature service: a closed component.
 *
 * **Details**
 *
 * `context` is the Context the feature's Layer was built with, minus `Scope`,
 * which closes the implementation's requirements. It isn't an instance, so
 * Layer memoisation is harmless and every slot still gets its own instance,
 * Model and Scope.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Implementation<in out Props, out Emits> {
  readonly component: Component.Mountable<Props, Emits, never>
  readonly context: Context.Context<never>
}

/**
 * A feature service class, as returned by `Service`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Service<in out Self, in out Props, in out Emits>
  extends Context.Key<Self, Implementation<Props, Emits>>
{
  readonly [TypeId]: { readonly name: string }
  /** The Props Schema. The log encodes a feature's props with it, whatever the implementation. */
  readonly props: Schema.Codec<Props, any>
  /** The Emits Schema. */
  readonly emits: Schema.Codec<Emits, any>
  /**
   * Provides this feature with `component`. The Layer requires whatever the
   * component requires, and closes it where the Layer is built.
   */
  readonly layer: <R>(component: Component.Mountable<Props, Emits, R>) => Layer.Layer<Self, never, R>
}

/**
 * Any feature service.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Any = Service<any, any, any>

/**
 * Returns `true` if `u` is a feature service.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.3
 */
export const isService = (u: unknown): u is Any => Predicate.hasProperty(u, TypeId)

/**
 * Declares a feature service from its Props and Emits Schemas.
 *
 * **When to use**
 *
 * Use when a piece of UI should be swappable: the app provides the live
 * implementation, a test provides a fake, and code splitting provides it from
 * an async Layer.
 *
 * **Details**
 *
 * The class is a `Context.Service` with `props`, `emits` and `layer`. `name`
 * is also the path segment of every instance of the feature, so paths don't
 * change when the implementation does. `layer(C)` doesn't compile if `C`'s
 * props or emits don't fit the contract.
 *
 * **Example** (A feature with a fake for tests)
 *
 * ```ts import.meta.vitest
 * import { Component, Feature } from "effect/ui"
 * import { Schema } from "effect"
 *
 * class Todos extends Feature.Service<Todos>()("Todos", {
 *   props: Schema.Struct({ filter: Schema.Literals(["all", "open"]) })
 * }) {}
 *
 * const FakeTodos = Component.make({
 *   name: "FakeTodos",
 *   props: Todos.props,
 *   model: Schema.Struct({}),
 *   message: Schema.Never,
 *   init: () => ({}),
 *   update: (model) => model,
 *   view: (_, h) => h.el("p", "no todos")
 * })
 *
 * const TodosFake = Todos.layer(FakeTodos)
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const Service: <Self>() => <
  const Name extends string,
  Props extends Schema.Codec<any, any>,
  Emits extends Schema.Codec<any, any> = Schema.Never
>(
  name: Name,
  schemas: {
    readonly props: Props
    readonly emits?: Emits | undefined
  }
) =>
  & Context.ServiceClass<Self, `feature/${Name}`, Implementation<Props["Type"], Emits["Type"]>>
  & Service<Self, Props["Type"], Emits["Type"]>
  & {
    readonly props: Props
    readonly emits: Emits
  } = () =>
  (
    name: string,
    schemas: {
      readonly props: Schema.Codec<any, any>
      readonly emits?: Schema.Codec<any, any> | undefined
    }
  ): any => {
    const Base = Context.Service<any, Implementation<any, any>>()(`feature/${name}`)
    class FeatureService extends Base {
      static readonly [TypeId] = { name }
      static readonly props = schemas.props
      static readonly emits = schemas.emits ?? Schema.Never
      static layer<R>(component: Component.Mountable<any, any, R>): Layer.Layer<any, never, R> {
        return Layer.effect(
          Base,
          Effect.map(Effect.context<R>(), (context) => ({
            component: component as Component.Mountable<any, any, never>,
            // The implementation's requirements are closed with the build site's
            // Context. The Layer's own Scope isn't part of that contract: the
            // runtime gives every instance its own.
            context: Context.omit(Scope.Scope)(context) as Context.Context<never>
          }))
        )
      }
    }
    return FeatureService
  }

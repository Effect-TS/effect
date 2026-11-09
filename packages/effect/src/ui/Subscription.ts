/**
 * Subscriptions are keyed Streams an instance runs while it asks for them.
 *
 * A component's `subscriptions: (model, props) => [...]` is re-run on mount,
 * after each `update` and on a props change. The result is diffed by key: a
 * key that disappears has its Scope closed first, then a new key starts in a
 * child Scope of the instance. Each element the Stream emits is dispatched to
 * the instance as a message.
 *
 * Rule of thumb: if the lifetime is an event (an upload, one long poll), use a
 * Command. If you can say "while ...", use a Subscription. A Subscription's
 * source is a service or the clock, never a captured global, which is what
 * makes it testable.
 *
 * **Example** (A timer while running, and a room keyed on a prop)
 *
 * ```ts import.meta.vitest
 * import { Subscription } from "effect/ui"
 * import { Schema, Stream } from "effect"
 *
 * const Message = Schema.TaggedUnion({ Tick: {}, Received: { text: Schema.String } })
 *
 * const roomMessages = (roomId: string) => Stream.make(`hello from ${roomId}`)
 *
 * const subscriptions = (model: { readonly running: boolean }, props: { readonly roomId: string }) => [
 *   model.running && Subscription.make("tick", Stream.tick("1 second").pipe(Stream.as(Message.make({ _tag: "Tick" })))),
 *   Subscription.make("room", props.roomId, (roomId) =>
 *     roomMessages(roomId).pipe(Stream.map((text) => Message.make({ _tag: "Received", text }))))
 * ]
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */
import type * as Stream from "../Stream.ts"

/**
 * Identifies a Subscription.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.3
 */
export const TypeId = "~effect/ui/Subscription" as const

/**
 * Identifies a Subscription.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.3
 */
export type TypeId = typeof TypeId

/**
 * A keyed Stream declaration.
 *
 * **Details**
 *
 * `key` identifies the Subscription across renders. `stream` has `E = never`:
 * a defect fails the instance, and a Stream that ends stays stopped until its
 * key leaves and comes back. Reconnect logic lives in the Stream. `R` joins the
 * component's requirements.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Subscription<out Msg, out R = never> {
  readonly [TypeId]: TypeId
  readonly key: string
  readonly stream: Stream.Stream<Msg, never, R>
}

/**
 * The primitives a Subscription may depend on. They're joined into the key.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Dep = string | number | boolean | null

/**
 * One dependency or a tuple of them.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Deps = Dep | ReadonlyArray<Dep>

/**
 * The requirements of a Subscription, or of a union of them.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type Requirements<S> = S extends Subscription<infer _Msg, infer R> ? R : never

const encodeDep = (dep: Dep): string => JSON.stringify(dep)

/**
 * The key of a Subscription with deps: the name, a colon, and the deps encoded
 * as JSON and joined with commas. `1` and `"1"`, or `["a,b", "c"]` and
 * `["a", "b,c"]`, never share a key.
 *
 * **Example** (Reading a key)
 *
 * ```ts import.meta.vitest
 * import { Subscription } from "effect/ui"
 *
 * Subscription.keyOf("room", "42") // => 'room:"42"'
 * Subscription.keyOf("cell", [1, true]) // => "cell:1,true"
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const keyOf = (name: string, deps: Deps): string =>
  `${name}:${(Array.isArray(deps) ? deps : [deps as Dep]).map(encodeDep).join(",")}`

/**
 * Declares a keyed Subscription.
 *
 * **When to use**
 *
 * Use to run a Stream for as long as the Model and props ask for it: a clock
 * tick while a timer runs, a chat room's messages while a room is shown.
 *
 * **Details**
 *
 * With deps, the builder sees only its deps, never the Model, so a Stream
 * can't hold stale Model values. The deps are joined into the key
 * (`room:"42"`, see `keyOf`), so `room:"1"` and `room:"2"` are never both
 * connected: the old key closes before the new one starts.
 *
 * **Example** (Keying a Subscription on a prop)
 *
 * ```ts import.meta.vitest
 * import { Subscription } from "effect/ui"
 * import { Schema, Stream } from "effect"
 *
 * const Message = Schema.TaggedUnion({ Received: { text: Schema.String } })
 *
 * const roomMessages = (roomId: string) => Stream.make(`hello from ${roomId}`)
 *
 * const room = Subscription.make("room", "42", (roomId) =>
 *   roomMessages(roomId).pipe(Stream.map((text) => Message.make({ _tag: "Received", text }))))
 *
 * room.key // => 'room:"42"'
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const make: {
  <Msg, R = never>(name: string, stream: Stream.Stream<Msg, never, R>): Subscription<Msg, R>
  <const D extends Deps, Msg, R = never>(
    name: string,
    deps: D,
    build: (deps: D) => Stream.Stream<Msg, never, R>
  ): Subscription<Msg, R>
} = (
  name: string,
  depsOrStream: any,
  build?: (deps: any) => Stream.Stream<any, never, any>
): Subscription<any, any> =>
  build === undefined
    ? { [TypeId]: TypeId, key: name, stream: depsOrStream }
    : { [TypeId]: TypeId, key: keyOf(name, depsOrStream), stream: build(depsOrStream) }

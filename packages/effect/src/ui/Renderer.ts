/**
 * The renderer: mounts a component tree on a `Host` and keeps it in step with
 * each instance's Model.
 *
 * Rendering is a virtual DOM bounded by components. A message re-runs only the
 * view of the instance that received it, and the diff against its last view
 * stops at `h.child`: a child's nodes belong to the child, and the parent only
 * places, moves or removes them. A child re-renders only when its props change,
 * compared shallowly. Dirty instances render in one flush, parents before
 * children.
 *
 * The renderer only talks to a `Host`, which the `Renderer` service provides,
 * so switching target is a Layer swap. `Host` is public so third parties can
 * implement one.
 *
 * @stability experimental
 * @since 4.1.3
 */
import type * as Cause from "../Cause.ts"
import type * as Context from "../Context.ts"
import type * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import type * as Option from "../Option.ts"
import type * as AsyncResult from "../reactivity/AsyncResult.ts"
import type * as Scope from "../Scope.ts"
import type * as Component from "./Component.ts"
import type * as Head from "./Head.ts"
import * as runtime from "./internal/runtime.ts"
import * as services from "./internal/services.ts"
import type * as View from "./View.ts"

/**
 * An element's handlers, by event name, as the view declared them.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Handlers = Readonly<Record<string, View.Handler<unknown, any>>>

/**
 * How a host reports an event: the event's name, the handler it found on the
 * innermost element with one, and the payload it built.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Dispatch = (event: string, handler: View.Handler<unknown, any>, payload: unknown) => void

/**
 * What a target must provide to show views: node operations plus a few
 * capabilities.
 *
 * **Details**
 *
 * The renderer never inserts by index and never relies on comment nodes: a
 * child's node range is computed from its rendered tree. Property values are
 * `unknown`, so a host decides what a property means. Hosts own events: an
 * element's handlers are stored as data with `setEvents`, and the host turns
 * its own events into plain payloads and calls `dispatch` for the innermost
 * element with a handler, so re-rendering never touches listeners.
 *
 * `elements` lists the vocabularies the host shows, by name, or is `"any"`.
 * `controlled` lists the properties re-applied after every patch, since the
 * user may have changed them; the host skips a no-op. `runsMounts` is `false`
 * on hosts that never run `onMount` work. `commit` is called once at the end
 * of each flush and after mounting, for hosts that apply changes in a batch.
 *
 * `head` receives the tree's merged document head after the commit, on every
 * flush where an instance with a `head` option rendered or an instance went
 * away. The host diffs it against what it applied last. A host without a
 * document, such as a native one, leaves it out and head entries are ignored.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Host<Node> {
  createElement(tag: string): Node
  createText(text: string): Node
  setText(node: Node, text: string): void
  setAttr(node: Node, name: string, value: string | undefined): void
  setProp(node: Node, name: string, value: unknown): void
  insertBefore(parent: Node, node: Node, ref: Node | undefined): void
  remove(node: Node): void
  parentOf(node: Node): Node | undefined
  nextOf(node: Node): Node | undefined
  setEvents(node: Node, handlers: Handlers, dispatch: Dispatch): void
  readonly elements: ReadonlyArray<string> | "any"
  readonly controlled: ReadonlySet<string>
  readonly runsMounts: boolean
  readonly commit?: (() => void) | undefined
  readonly head?: ((head: Head.Head) => void) | undefined
}

/**
 * The `Renderer` service: the `Host` a tree is mounted on.
 *
 * @stability experimental
 * @category services
 * @since 4.1.3
 */
export interface Renderer {
  readonly host: Host<any>
}

/**
 * The `Renderer` service.
 *
 * @stability experimental
 * @category services
 * @since 4.1.3
 */
export const Renderer: Context.Service<Renderer, Renderer> = services.Renderer

/**
 * Provides a `Host` to mount on.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.3
 */
export const layer = <Node>(host: Host<Node>): Layer.Layer<Renderer> => Layer.succeed(Renderer, { host })

/**
 * A name for an element, so a Command can reach its host node.
 *
 * **Details**
 *
 * Refs are declared at module level and typed by the node they reach, so a
 * vocabulary types them by tag. A ref resolves within the instance that issued
 * the Command, so two instances never collide. `at` derives a ref for one row
 * of a list.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Ref<in out Node> {
  readonly name: string
  /** The name plus any `at` keys: what the element stores. */
  readonly key: string
  /** A ref for one row: `Row.at(id)`. */
  readonly at: (key: string | number) => Ref<Node>
  readonly "~Node"?: (_: Node) => Node
}

/**
 * Declares a ref. A vocabulary wraps this to type the node by tag.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const ref = <Node = unknown>(name: string): Ref<Node> => {
  const make = (key: string): Ref<Node> => ({ name, key, at: (row) => make(`${key}[${row}]`) })
  return make(name)
}

/**
 * How a Command reaches an element of the instance that issued it.
 *
 * **Details**
 *
 * `lookup` waits until the render the issuing `update` caused has been
 * committed, and returns `Option.none()` for a ref that isn't rendered. The
 * runtime gives every Command run one, so it's a framework service and never
 * part of a component's requirements.
 *
 * @stability experimental
 * @category services
 * @since 4.1.3
 */
export interface Refs {
  readonly lookup: <Node>(ref: Ref<Node>) => Effect.Effect<Option.Option<Node>>
}

/**
 * The `Refs` service.
 *
 * @stability experimental
 * @category services
 * @since 4.1.3
 */
export const Refs: Context.Service<Refs, Refs> = services.Refs

/**
 * A mounted tree.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Root<out Model, in Msg> {
  /** The root instance's path, `/<name>`. */
  readonly path: string
  /** The session the message log groups this mount's entries under. */
  readonly session: string
  /** The root's current Model, or `undefined` before `init` or after a crash. */
  readonly model: () => Model | undefined
  /** Sends a message to the root, as if from outside the tree. */
  readonly send: (message: Msg) => void
}

/**
 * What `mount` requires for a root with vocabulary `V`: the vocabulary's host
 * marker, or nothing for a host-neutral root.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type HostOf<V> = [V] extends [never] ? never : V extends View.Elements ? V["Host"] : never

/**
 * Mounts a component tree in `container` on the `Renderer`'s host, for the
 * life of the current Scope.
 *
 * **Details**
 *
 * Every instance gets its own child Scope. Commands, Subscriptions and
 * provided Layers run in it, and closing the Scope unmounts the tree. Every
 * child slot is a failure boundary: a failed child shows its `fallback` until
 * its key changes. When the root itself fails, `fallback` is shown in its place
 * and the log records `Crashed`.
 *
 * Mounting requires the root vocabulary's host marker, so mounting a root on
 * the wrong host is a type error. Nested components are checked when they
 * mount, and a mismatch fails their slot.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const mount: <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements, RF = never>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V>,
  props: Props,
  container: unknown,
  options?: {
    readonly fallback?:
      | ((
        failure: AsyncResult.Failure<never, unknown>,
        h: View.Helper<never, {}> & View.Tags<V, never>
      ) => View.Node<never, RF>)
      | undefined
  }
) => Effect.Effect<Root<Model, Msg>, never, R | RF | HostOf<V> | Renderer | Scope.Scope> = runtime.mount as any

/**
 * A failure as `mount`'s `fallback` and a slot's `onFailure` see it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Failure = AsyncResult.Failure<never, unknown> & { readonly cause: Cause.Cause<unknown> }

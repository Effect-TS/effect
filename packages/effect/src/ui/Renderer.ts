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
import type * as Duration from "../Duration.ts"
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
 * `hydration` lets the renderer read nodes a server rendered, so `mount` with
 * a server `state` adopts them. A host without it builds every node fresh.
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
  readonly hydration?: Hydration<Node> | undefined
}

/**
 * How a host reads the nodes a server rendered, so hydration can adopt them.
 *
 * **Details**
 *
 * The server brackets each instance's nodes with two markers carrying its
 * path, `<!--[path-->` and `<!--]path-->` in HTML. `inspect` tells the
 * renderer what a node is: an element by tag, a text node, one of those
 * markers, or anything else, which never matches. Siblings are read with the
 * host's `nextOf`. An element whose content the host parses as text only,
 * such as an HTML `textarea`, is marked `textOnly`: the server writes only
 * its text, and hydration adopts the element but builds its children fresh.
 *
 * `adopted`, if given, is called once every slot has adopted, with the head
 * the tree had at adoption: each instance's entries and child instances as
 * they were when it mounted (a waiting slot's when it adopted), merged in
 * tree order. An instance that failed in the flush it mounted in, a title
 * template that throws included, contributes nothing, as on the server.
 * Updates since then, including removed instances, don't count. Title
 * templates reuse the results the client's live merges computed. A template
 * no live merge ever applied to that title, because an ancestor rendered
 * again while the slot holding the title waited, is called once for the
 * report; with `head` pure, as it must be, that gives the adoption-time
 * result. Because `head` is pure and the Model is adopted, the head equals
 * the server's merged head, so a host or a test can check one against the
 * other.
 *
 * It's called after the live head merge of the flush that finished adoption
 * and before that flush commits, so the document head may not show it yet.
 * `root.adopted` completes after it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Hydration<Node> {
  firstChild(node: Node): Node | undefined
  inspect(node: Node):
    | { readonly _tag: "Element"; readonly tag: string; readonly textOnly?: boolean | undefined }
    | { readonly _tag: "Text"; readonly text: string }
    | { readonly _tag: "Open"; readonly path: string }
    | { readonly _tag: "Close"; readonly path: string }
    | { readonly _tag: "Other" }
  getAttr(node: Node, name: string): string | undefined
  readonly adopted?: ((head: Head.Head) => void) | undefined
}

/**
 * What a server render hands the client: each instance's Schema-encoded
 * Model by path, plus the paths to build fresh.
 *
 * **Details**
 *
 * `~deferred` lists instances the client builds fresh instead of adopting:
 * a provided Layer that missed the budget or was kept off the server, and a
 * slot that failed. A deferred path covers its subtree.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface State {
  readonly [path: string]: unknown
  readonly "~deferred"?: ReadonlyArray<string> | undefined
}

/**
 * A node of a server-rendered tree. A `Range` is one instance's nodes, or
 * the `fallback` of a slot, under its path.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type ServerNode =
  | {
    readonly _tag: "Element"
    readonly tag: string
    readonly attrs: Readonly<Record<string, string>>
    readonly props: Readonly<Record<string, unknown>>
    readonly children: ReadonlyArray<ServerNode>
  }
  | { readonly _tag: "Text"; readonly text: string }
  | { readonly _tag: "Range"; readonly path: string; readonly children: ReadonlyArray<ServerNode> }

/**
 * The result of `prerender`: the tree to serialise, the state the client
 * adopts, the root's Model and the merged head.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Prerendered<out Model> {
  readonly nodes: ReadonlyArray<ServerNode>
  readonly state: State
  /** The root's Model after the server run, or `undefined` if the root failed. */
  readonly model: Model | undefined
  readonly head: Head.Head
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
  /**
   * Completes once every slot has adopted the server's nodes, at once
   * without hydration. Head sync and the router's announcements start with
   * the commit of the flush that finished adoption, which may still be
   * running when this completes, so don't expect the document head to show
   * the adopted head yet.
   */
  readonly adopted: Effect.Effect<void>
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
 * With `state` from a server render, the tree hydrates: each instance adopts
 * its server Model instead of running `init` and, on a host with
 * `hydration`, adopts the server's nodes inside `container`. `init` is
 * replayed only for its Commands. Server Commands the Model already holds the
 * result of are skipped, unless the state lists them as pending. An instance
 * whose view doesn't match its nodes is rebuilt on its own, and a deferred
 * one is built fresh. An instance whose provided Layer is still building
 * keeps the server's nodes, inert, until the Layer is ready; `adopted`
 * completes when none is left waiting.
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
    readonly state?: State | undefined
  }
) => Effect.Effect<Root<Model, Msg>, never, R | RF | HostOf<V> | Renderer | Scope.Scope> = runtime.mount as any

/**
 * Runs a component tree the way a server renders it, and returns the tree to
 * serialise. Server renderers such as `HtmlServer.renderToHtml` build on it.
 *
 * **Details**
 *
 * The tree renders synchronously. Provided Layers are built. No Command runs:
 * each is logged as `CommandDropped` with reason `"server"`, and one issued
 * by `update` also warns. Events are applied, so a child can
 * change its parent. Subscriptions and `onMount` work never run.
 *
 * Rendering waits until nothing is in flight or `budget` (default 500 ms) is
 * spent, whichever comes first. The budget limits waiting on Layers, not the
 * render itself. A Layer that missed it, or that a `provide` kept off the
 * server with `{ server: false }`, defers its instance, which renders its
 * current Model.
 * The tree is serialised once, in document order, and its Scopes are closed.
 *
 * `elements` lists the vocabularies the server renders, by name, as a host's
 * `elements` does.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const prerender: <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V>,
  props: Props,
  options?: {
    readonly budget?: Duration.Input | undefined
    readonly elements?: ReadonlyArray<string> | "any" | undefined
  }
) => Effect.Effect<Prerendered<Model>, never, R> = (component, props, options) =>
  runtime.prerender(component as any, props, {
    budget: options?.budget ?? "500 millis",
    elements: options?.elements ?? "any"
  })

/**
 * A failure as `mount`'s `fallback` and a slot's `onFailure` see it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Failure = AsyncResult.Failure<never, unknown> & { readonly cause: Cause.Cause<unknown> }

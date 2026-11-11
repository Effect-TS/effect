/**
 * Service keys shared by the public modules and the runtime.
 *
 * @internal
 */
import * as Context from "../../Context.ts"
import type * as Head from "../Head.ts"
import type { Refs as RefsShape, Renderer as RendererShape } from "../Renderer.ts"

/** @internal */
export const Renderer = Context.Service<RendererShape, RendererShape>("effect/ui/Renderer")

/** @internal */
export const Refs = Context.Service<RefsShape, RefsShape>("effect/ui/Renderer/Refs")

/**
 * What a mounted root offers the router: its flush counter and its instances' state.
 *
 * @internal
 */
export interface RootHandle {
  /** Whether the root actually adopted a server Model, including after a deferred Layer resolves. */
  readonly hydrated: boolean
  readonly container: unknown
  /** The current flush: 0 for the first render, then one more per flush. */
  readonly flush: () => number
  /** The JSON-encoded Model of every mounted instance, by path. Models that don't encode are left out. */
  readonly snapshot: () => Record<string, unknown>
  /**
   * The Router navigated. It closes the cache's fetch-free window after hydration, if adoption
   * hasn't yet. The Router calls it first in `set`, before the route changes.
   */
  readonly navigated: () => void
  /** The runtime's problems sink. */
  readonly report: (problem: { readonly _tag: string; readonly message: string }) => void
}

/**
 * What the runtime tells the router after each flush.
 *
 * @internal
 */
export interface FlushInfo {
  readonly flush: number
  /** The merged head, as last given to the host. */
  readonly head: Head.Head
  /** Provided Layer builds that began in `flush` or later and are still pending, tree-wide. */
  readonly buildsPendingSince: (flush: number) => number
}

/**
 * The router's side of the runtime: one post-flush hook, called after the
 * nodes commit and head sync, and the history restore of a new instance's
 * Model. Router Layers provide it; without one the runtime skips both.
 *
 * @internal
 */
export interface RootHooks {
  /** Registers a mounted root. The returned function unregisters it. */
  readonly attach: (root: RootHandle) => () => void
  readonly afterFlush: (root: RootHandle, info: FlushInfo) => void
  /** The encoded Model a new instance at `path` adopts, if the router is restoring one. */
  readonly restore: (path: string) => unknown
}

/** @internal */
export const RootHooks = Context.Service<RootHooks, RootHooks>("effect/ui/internal/RootHooks")

/**
 * A Subscription may carry a function under this key. The runtime calls it with
 * each message right before dispatching it, in the same synchronous step.
 *
 * @internal
 */
export const onDeliver: unique symbol = Symbol.for("effect/ui/Subscription/onDeliver") as any

/** @internal */
export const CurrentRoot = Context.Reference<() => RootHandle | undefined>("effect/ui/internal/CurrentRoot", {
  defaultValue: () => () => undefined
})

/**
 * A Subscription may carry a function under this key. No Stream runs on the
 * server, so there the runtime calls it once per render, for the root's
 * Subscriptions only, with the root's context and the problems sink.
 *
 * @internal
 */
export const onServer: unique symbol = Symbol.for("effect/ui/Subscription/onServer") as any

/** @internal */
export interface OnServer {
  readonly [onServer]?: (context: Context.Context<never>, report: RootHandle["report"]) => void
}

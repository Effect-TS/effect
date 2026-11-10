/**
 * Service keys shared by the public modules and the runtime.
 *
 * @internal
 */
import * as Context from "../../Context.ts"
import type * as Exit from "../../Exit.ts"
import type * as Command from "../Command.ts"
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
  readonly container: unknown
  /** The current flush: 0 for the first render, then one more per flush. */
  readonly flush: () => number
  /** The JSON-encoded Model of every mounted instance, by path. Models that don't encode are left out. */
  readonly snapshot: () => Record<string, unknown>
  /** The Router navigated: the cache's fetch-free window after hydration ends here at the latest. */
  readonly navigated: () => void
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

/**
 * A `Loaded` watch's Subscription carries its marker (read, label, args) under
 * this key. The runtime registers a cache watcher from it instead of running a Stream.
 *
 * @internal
 */
export const loadedMarker: unique symbol = Symbol.for("effect/ui/Loaded/marker") as any

/**
 * Told about the cache each `runtime.start` builds. For `ssr()` and tests, which
 * read fetch triggers on the server side too.
 *
 * @internal
 */
export const CacheObserver = Context.Reference<(cache: unknown, side: "client" | "server") => void>(
  "effect/ui/internal/CacheObserver",
  { defaultValue: () => () => {} }
)

/**
 * One run of an issued Command, as `MutationHooks` sees it. The same object is
 * passed to every hook call about that run, so a hook can key on its identity.
 *
 * @internal
 */
export interface MutationRun {
  /** The issued Command: `invalidates`, `optimistic` and `writes` are data on it. */
  readonly command: Command.Effectful<any, any, never> | Command.Streaming<any, any, never>
  /** The arguments it was issued with: `command.args`. */
  readonly args: ReadonlyArray<unknown>
  /** The path of the instance that issued it. */
  readonly path: string
}

/**
 * Where the cache hooks into a Command run. TODO(loader): the runtime only calls
 * these; applying patches, invalidation and writes is the cache's.
 *
 * @internal
 */
export interface MutationHooks {
  /**
   * (a) The Command was issued and will run: called synchronously inside the
   * issuing `update` (or `init`), before the run is queued or started. Not
   * called for a Command its `drop` mode dropped. Under `switch` it's called
   * before the earlier runs are asked to stop, so their fibers still run. If it
   * throws, the run doesn't start and the issuing instance fails as if
   * `update` had thrown.
   */
  readonly onIssue: (run: MutationRun) => void
  /**
   * (b) A started run's fiber exited: with the body's success, a typed
   * failure, an interrupt or a defect. Called when the fiber exits, not when a
   * stop is requested, and before the result message is dispatched. For a
   * Stream Command the success is `void`.
   */
  readonly onExit: (run: MutationRun, exit: Exit.Exit<unknown, unknown>) => void
  /**
   * (c) The run was stopped before its work began: while queued, while waiting
   * for its instance's Layer, or before its fiber's first step.
   */
  readonly onCancel: (run: MutationRun) => void
}

/** @internal */
export const MutationHooks = Context.Reference<MutationHooks>("effect/ui/internal/MutationHooks", {
  defaultValue: () => ({ onIssue() {}, onExit() {}, onCancel() {} })
})

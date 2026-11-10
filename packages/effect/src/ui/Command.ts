/**
 * Commands are the side effects a component asks the runtime to run.
 *
 * `update` and `init` return Commands as data. The runtime runs each one in
 * the instance's `Scope` and feeds its result back to the instance as a
 * message, so `update` stays pure and a story test can read what was issued
 * without running anything.
 *
 * There are two ways to define a Command, and they don't overlap:
 *
 * - `Command.make(name, fn, options?)` for Commands that need nothing beyond
 *   the framework services. It returns a factory: `RollDie(6)`.
 * - `Command.Service<Self>()(key, implementation, options?)` for Commands that
 *   reach any other service. The implementation runs once per Layer build and
 *   captures the services it uses, so a component's requirements name the
 *   Command service, never what its implementation uses. Issue one with
 *   `DeleteTodo.make(id)` and fake it with `Layer.succeed(DeleteTodo, ...)`.
 *
 * A `Command.make` Command's result is `Effect<Msg, never>` or, with
 * `stream: true`, `Stream<Msg, never>`. A `Command.Service` body may fail
 * with a typed `E`; the issue site maps both channels to messages with
 * `Command.match({ onSuccess, onFailure })`.
 *
 * **Example** (A Command service with a captured dependency)
 *
 * ```ts import.meta.vitest
 * import { Command } from "effect/ui"
 * import { Effect, Schema } from "effect"
 * import { KeyValueStore } from "effect/persistence"
 *
 * const Message = Schema.TaggedUnion({ Delete: {}, Deleted: {} })
 *
 * class DeleteTodo extends Command.Service<DeleteTodo>()(
 *   "todos/DeleteTodo",
 *   Effect.gen(function*() {
 *     const kv = yield* KeyValueStore.KeyValueStore
 *     return (id: string) =>
 *       kv.remove(`todo/${id}`).pipe(
 *         Effect.as(Message.make({ _tag: "Deleted" })),
 *         Effect.catchTag("KeyValueStoreError", () => Effect.succeed(Message.make({ _tag: "Deleted" })))
 *       )
 *   }),
 *   { invalidates: () => [] }
 * ) {}
 *
 * // In a component: `$.run(DeleteTodo.make("t1"))`. The component requires `DeleteTodo`.
 * // The live wiring provides `DeleteTodo.layer`, which requires `KeyValueStore`.
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import { dual } from "../Function.ts"
import * as Layer from "../Layer.ts"
import * as Pipeable from "../Pipeable.ts"
import * as Predicate from "../Predicate.ts"
import type * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import type * as Types from "../Types.ts"
import type * as Renderer from "./Renderer.ts"

// ---------------------------------------------------------------------------
// TODO(loader): placeholders. The real `Target`, `Patch` and `Write` types
// come from the Loader core (`effect/reactivity/Loader`). Until it lands they
// are opaque data: the Command only carries them, and the runtime hands them
// to its `MutationHooks`.
// ---------------------------------------------------------------------------

/**
 * TODO(loader): what a Command invalidates: a whole read, one entry or a tag.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Target {}

/**
 * TODO(loader): an optimistic patch over one entry, or every entry of a read.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Patch {}

/**
 * TODO(loader): a write of a Command's success into one entry.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Write {}

/**
 * Identifies a Command value.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.3
 */
export const TypeId = "~effect/ui/Command" as const

/**
 * Identifies a Command value.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.3
 */
export type TypeId = typeof TypeId

/**
 * Identifies a Command definition: a factory from `make` or a `Service` class.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.3
 */
export const DefinitionTypeId = "~effect/ui/Command/Definition" as const

/**
 * Identifies a Command definition: a factory from `make` or a `Service` class.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.3
 */
export type DefinitionTypeId = typeof DefinitionTypeId

/**
 * Identifies a Command issued by a `Service` whose body can fail, before
 * `match` has mapped its two channels to messages.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.3
 */
export const UnmatchedTypeId = "~effect/ui/Command/Unmatched" as const

/**
 * Identifies an unmatched Command.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.3
 */
export type UnmatchedTypeId = typeof UnmatchedTypeId

/**
 * How runs of one Command relate to each other when a new one is issued while
 * an earlier one is still running.
 *
 * **Details**
 *
 * Runs are grouped by instance, Command name and the `key` option. Within a
 * group, `concurrent` runs everything at once, `switch` interrupts the earlier
 * runs, `drop` ignores the new one, and `queue` starts it once the earlier runs
 * have ended.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Mode = "concurrent" | "switch" | "drop" | "queue"

/**
 * The options accepted by `make` and `Service`.
 *
 * **Details**
 *
 * `stream: true` declares a Stream Command, so a story test knows the kind
 * without building a Layer. `mode` defaults to `"concurrent"`. `key` derives a
 * concurrency key from the arguments, so runs with different keys don't
 * interfere.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Options<in Args extends ReadonlyArray<any>> {
  readonly stream?: boolean | undefined
  readonly mode?: Mode | undefined
  readonly key?: ((...args: Args) => string) | undefined
}

/**
 * The services every mounted app is guaranteed to have, which a Command may use
 * without them appearing in its component's requirements.
 *
 * **Details**
 *
 * Host packages widen this interface by module augmentation, the same way an
 * app registers its element vocabulary. The runtime provides these services
 * when a Command runs, so they're removed from `R`. The core lists `Scope`
 * and `Renderer.Refs`, and host packages add their host marker.
 *
 * **Example** (Registering a host's framework service)
 *
 * ```ts
 * declare module "effect/ui/Command" {
 *   interface FrameworkServices {
 *     readonly MyHost: MyHost
 *   }
 * }
 *
 * declare class MyHost {
 *   readonly _: unique symbol
 * }
 * ```
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface FrameworkServices {
  readonly Scope: Scope.Scope
  readonly Refs: Renderer.Refs
}

/**
 * The union of the registered framework services.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type FrameworkService = FrameworkServices[keyof FrameworkServices]

/**
 * Passes when `R` holds only framework services, and otherwise names the
 * services a `Service` would be needed for.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type OnlyFrameworkServices<R> = [Exclude<R, FrameworkService>] extends [never] ? unknown
  : {
    readonly "Command.make can only require framework services. Define a Command.Service instead; it needs": Exclude<
      R,
      FrameworkService
    >
  }

/**
 * Passes when a `Service` implementation's function holds only framework
 * services, and otherwise names what it should have captured when its Layer
 * was built.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type CapturesServices<R> = [Exclude<R, FrameworkService>] extends [never] ? unknown
  : {
    readonly "A Command.Service captures its services when its Layer is built. Its function may only require framework services; it needs":
      Exclude<R, FrameworkService>
  }

/**
 * The shared fields of an issued Command.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Proto<out Msg, in Source = Msg, in SourceE = never> extends Pipeable.Pipeable, Declared {
  readonly [TypeId]: Variance<Msg, Source, SourceE>
  /** The Command's name: the factory's name or the service's key. */
  readonly name: string
  /** The arguments the Command was issued with. Data a test asserts on without running the Effect. */
  readonly args: ReadonlyArray<unknown>
  readonly mode: Mode
  /** The concurrency key derived from the arguments, if the definition has a `key` option. */
  readonly key: string | undefined
  /**
   * Maps the result of the underlying definition to the message this Command
   * produces, composing every `map` applied since it was issued. `Story`
   * uses it to resolve a Command with the definition's own message type.
   *
   * @internal
   */
  readonly resolve: (result: Source) => Msg
  /**
   * Maps a typed failure of the underlying definition to the message this
   * Command produces. `undefined` when the definition can't fail (`make`, or
   * a `Service` with `E = never`), and on an unmatched Command; a typed
   * failure is then a defect.
   *
   * @internal
   */
  readonly reject: ((error: SourceE) => Msg) | undefined
}

/**
 * What a Command declares about the cache, as plain data computed from its
 * arguments when it's issued. A story test reads these off the issued Command
 * without a cache. `make` Commands declare nothing.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Declared {
  /** What the run invalidates when its fiber exits, however it exits. */
  readonly invalidates: ReadonlyArray<Target>
  /** The optimistic patches registered when the Command is issued. */
  readonly optimistic: ReadonlyArray<Patch>
  /** The writes a success stores, or `undefined` if the definition has no `writes`. Takes the definition's own result. */
  readonly writes: ((success: any) => ReadonlyArray<Write>) | undefined
}

/**
 * Phantom variance for a Command's message type and the result of its definition.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Variance<out Msg, in Source, in SourceE = never> {
  readonly _Msg: Types.Covariant<Msg>
  readonly _Source: Types.Contravariant<Source>
  readonly _SourceE: Types.Contravariant<SourceE>
}

/**
 * The kind of an issued Command: `"Effect"` for one message, `"Stream"` for a
 * Stream of them.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Kind = "Effect" | "Stream"

/**
 * An issued Command: what a definition's factory or `make` returns.
 *
 * **Details**
 *
 * `Msg` is the message it produces and `R` what it requires. `Source` is the
 * result of the Command's definition before any `map`; it's what
 * a story's `resolve` step takes when given an issued Command. `K` is the kind, which
 * decides whether `effect` or `stream` holds the work; the other field is
 * `undefined`. Use the `Effectful` and `Streaming` aliases rather than naming
 * `K` yourself, and narrow a `Command` on `_tag` before reading the work.
 *
 * One interface for both kinds, rather than two, is what lets
 * `command.pipe(Command.map((result) => ...))` infer `result`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Issued<out Msg, out R, in Source, out K extends Kind, in SourceE = never>
  extends Proto<Msg, Source, SourceE>
{
  readonly _tag: K
  /** The work of an `"Effect"` Command, with `map` and `match` applied. `undefined` on a `"Stream"` one. */
  readonly effect: K extends "Effect" ? Effect.Effect<Msg, never, R> : undefined
  /** The work of a `"Stream"` Command, with `map` and `match` applied. `undefined` on an `"Effect"` one. */
  readonly stream: K extends "Stream" ? Stream.Stream<Msg, never, R> : undefined
  /**
   * The definition's own work, before `map` and `match`: it succeeds with (or
   * emits) the `Source` and fails with the `SourceE`, which `resolve` and
   * `reject` turn into messages. The runtime runs this one, so the exit of a
   * run tells a success from a typed failure.
   *
   * @internal
   */
  readonly work: K extends "Effect" ? Effect.Effect<unknown, unknown, R> : Stream.Stream<unknown, unknown, R>
}

/**
 * What a `Service` whose body can fail issues: a Command whose success `A`
 * and typed failure `E` haven't been mapped to messages yet.
 *
 * **Details**
 *
 * It isn't a `Command`, so `$.run` rejects it until `match` maps both
 * channels. It already carries the Command's data: its name, arguments and
 * what it declares about the cache.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Unmatched<out A, out E, out R, out K extends Kind> extends Pipeable.Pipeable, Declared {
  readonly [UnmatchedTypeId]: {
    readonly _A: Types.Covariant<A>
    readonly _E: Types.Covariant<E>
    readonly _R: Types.Covariant<R>
  }
  readonly _tag: K
  readonly name: string
  readonly args: ReadonlyArray<unknown>
  readonly mode: Mode
  readonly key: string | undefined
  /** The body's work of an `"Effect"` Command, with its typed failure. `undefined` on a `"Stream"` one. */
  readonly effect: K extends "Effect" ? Effect.Effect<A, E, R> : undefined
  /** The body's work of a `"Stream"` Command, with its typed failure. `undefined` on an `"Effect"` one. */
  readonly stream: K extends "Stream" ? Stream.Stream<A, E, R> : undefined
}

/**
 * A Command whose result is one message.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Effectful<Msg, R = never, Source = Msg, SourceE = never> = Issued<Msg, R, Source, "Effect", SourceE>

/**
 * A Command declared with `stream: true`, whose result is a Stream of messages.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Streaming<Msg, R = never, Source = Msg, SourceE = never> = Issued<Msg, R, Source, "Stream", SourceE>

/**
 * A Command that interrupts the running and queued runs of another Command.
 *
 * **Details**
 *
 * It produces no message. With a `key`, only the runs with that concurrency
 * key are interrupted.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Interrupt extends Pipeable.Pipeable {
  readonly [TypeId]: Variance<never, unknown>
  readonly _tag: "Interrupt"
  /** The name of the Command to interrupt. */
  readonly name: string
  readonly key: string | undefined
}

/**
 * What `update` returns inside a step and a story test sees as pending.
 *
 * **Details**
 *
 * `Msg` is the message the Command produces, which `$.run` checks against the
 * component's message type. `R` is what the Command requires: the `Service`
 * for a service Command, `never` for one made with `make`. A Command whose
 * result is `never` (`Effect.never`, `Effect.die`, `Stream.never`) produces
 * no message, so any component can run it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Command<Msg, R = never> = Effectful<Msg, R, never> | Streaming<Msg, R, never> | Interrupt

/**
 * The requirements of a Command, or of a union of them.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type Requirements<C> = C extends Issued<infer _Msg, infer R, infer _S, infer _K, infer _SE> ? R : never

/**
 * The message type of a Command, or of a union of them.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type Message<C> = C extends Proto<infer Msg, infer _Source, infer _SourceE> ? Msg
  : C extends Definition<infer _Args, infer Msg, infer _S, infer _E> ? Msg
  : never

/**
 * What resolves a Command in a story: the definition's own result, for a
 * definition or an issued Command, before any `map`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type Result<C> = C extends Proto<infer _Msg, infer Source, infer _SourceE> ? Source
  : C extends Unmatched<infer A, infer _E, infer _R, infer _K> ? A
  : C extends Definition<infer _Args, infer Msg, infer _S, infer _E> ? Msg
  : never

/**
 * What fails a Command in a story: the definition's own typed failure, for a
 * definition or an issued Command, before `match`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type Failure<C> = C extends Proto<infer _Msg, infer _Source, infer SourceE> ? SourceE
  : C extends Unmatched<infer _A, infer E, infer _R, infer _K> ? E
  : C extends Definition<infer _Args, infer _Msg, infer _S, infer E> ? E
  : never

/**
 * `C` with its message mapped to `B`. An `Interrupt` stays an `Interrupt`, and
 * a Command whose kind is `"Effect" | "Stream"` becomes a union of the two kinds,
 * so it still fits `Command<B>`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type Mapped<C, B> = C extends Issued<infer _Msg, infer R, infer Source, infer K, infer SourceE> ?
  (K extends Kind ? Issued<B, R, Source, K, SourceE> : never)
  : C extends Interrupt ? Interrupt
  : never

/**
 * What `make` and `Service` have in common: the data about a Command that's
 * known before it's issued.
 *
 * **Details**
 *
 * `Args` are the arguments a Command is issued with, `Msg` the message it
 * produces, and `IsStream` whether it was declared with `stream: true`. Story
 * steps such as `resolve` take a definition and are typed by it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Definition<
  in Args extends ReadonlyArray<any>,
  out Msg,
  out IsStream extends boolean,
  out E = never
> {
  readonly [DefinitionTypeId]: Definition.Variance<Args, Msg, IsStream, E>
  /** Whether the Command was declared with `stream: true`. */
  readonly stream: IsStream
  readonly mode: Mode
}

/**
 * Helper types for `Definition`.
 *
 * @stability experimental
 * @since 4.1.3
 */
export declare namespace Definition {
  /**
   * Phantom variance for a definition's arguments, message and kind.
   *
   * @category models
   * @since 4.1.3
   */
  export interface Variance<in Args extends ReadonlyArray<any>, out Msg, out IsStream extends boolean, out E = never> {
    readonly _Args: Types.Contravariant<Args>
    readonly _Msg: Types.Covariant<Msg>
    readonly _IsStream: Types.Covariant<IsStream>
    readonly _E: Types.Covariant<E>
  }

  /**
   * Any Command definition.
   *
   * @category models
   * @since 4.1.3
   */
  export type Any = Definition<any, any, boolean, any>

  /**
   * The arguments a definition is issued with.
   *
   * @category utility types
   * @since 4.1.3
   */
  export type Args<D> = D extends Definition<infer A, infer _Msg, infer _S, infer _E> ? A : never

  /**
   * Whether a definition was declared with `stream: true`.
   *
   * @category utility types
   * @since 4.1.3
   */
  export type IsStream<D> = D extends Definition<infer _Args, infer _Msg, infer S, infer _E> ? S : never
}

/**
 * What `make` returns: call it with the Command's arguments to issue it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Factory<in Args extends ReadonlyArray<any>, in out Msg, out IsStream extends boolean = false>
  extends Definition<Args, Msg, IsStream>
{
  (...args: Args): IsStream extends true ? Streaming<Msg> : Effectful<Msg>
  readonly name: string
}

/**
 * A Command service class, as returned by `Service`.
 *
 * **Details**
 *
 * It's a `Context.Service` whose value is the Command's implementation: a
 * function of the arguments returning an `Effect` (or a `Stream`) of the
 * message. `layer` builds that implementation, and `make` issues a Command
 * that requires the service. A fake is `Layer.succeed(X, (...args) => ...)`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Service<
  in out Self,
  in out Key extends string,
  in Args extends ReadonlyArray<any>,
  in out Msg,
  out IsStream extends boolean,
  out E,
  out R,
  in out Err = never
> extends
  Context.ServiceClass<Self, Key, Service.Implementation<Args, Msg, IsStream, Err>>,
  Definition<Args, Msg, IsStream, Err>
{
  /** The implementation's Layer. It requires what the implementation captured. */
  readonly layer: Layer.Layer<Self, E, R>
  /**
   * Issues the Command. The component requires `Self`. When the body can
   * fail (`Err` isn't `never`) the result is `Unmatched`: map both channels
   * with `Command.match` before running it.
   */
  make(...args: Args): [Err] extends [never] ? (IsStream extends true ? Streaming<Msg, Self> : Effectful<Msg, Self>)
    : Unmatched<Msg, Err, Self, IsStream extends true ? "Stream" : "Effect">
}

/**
 * Helper types for `Service`.
 *
 * @stability experimental
 * @since 4.1.3
 */
export declare namespace Service {
  /**
   * The value behind a Command service: a function of the arguments that
   * returns the Command's result. It may use framework services on each call.
   *
   * @category models
   * @since 4.1.3
   */
  export type Implementation<Args extends ReadonlyArray<any>, Msg, IsStream extends boolean, Err = never> =
    IsStream extends true ? (...args: Args) => Stream.Stream<Msg, Err, FrameworkService>
      : (...args: Args) => Effect.Effect<Msg, Err, FrameworkService>

  /**
   * The options accepted by `Service`.
   *
   * @category models
   * @since 4.1.3
   */
  export interface Options<in Args extends ReadonlyArray<any>, in A = never> {
    readonly stream?: boolean | undefined
    readonly mode?: Mode | undefined
    readonly key?: ((...args: Args) => string) | undefined
    /**
     * What a run invalidates, from the arguments only, so it's known when the
     * Command is issued. Applied on every exit of a started run. A Command
     * that invalidates nothing writes `() => []`.
     */
    readonly invalidates: (...args: Args) => ReadonlyArray<Target>
    /** The optimistic patches, from the arguments only, registered when the Command is issued. */
    readonly optimistic?: ((...args: Args) => ReadonlyArray<Patch>) | undefined
    /** The entries a success writes. Not available with `stream: true`. */
    readonly writes?: ((success: A, ...args: Args) => ReadonlyArray<Write>) | undefined
  }
}

const identity = (result: any) => result

const Proto = {
  [TypeId]: { _Msg: (_: never) => _, _Source: (_: never) => _, _SourceE: (_: never) => _ },
  [UnmatchedTypeId]: { _A: (_: never) => _, _E: (_: never) => _, _R: (_: never) => _ },
  pipe() {
    return Pipeable.pipeArguments(this, arguments)
  }
}

interface Fields extends Declared {
  readonly _tag: Kind
  readonly name: string
  readonly args: ReadonlyArray<unknown>
  readonly mode: Mode
  readonly key: string | undefined
  readonly work: Effect.Effect<any, any, any> | Stream.Stream<any, any, any>
  readonly resolve: (result: any) => any
  readonly reject: ((error: any) => any) | undefined
}

/** `effect` and `stream` are the work with `resolve` and `reject` applied. An unmatched Command keeps its failure. */
const makeIssued = (fields: Fields): any => {
  const { reject, resolve, work } = fields
  const plain = resolve === identity && reject === undefined
  let effect: Effect.Effect<any, any, any> | undefined
  let stream: Stream.Stream<any, any, any> | undefined
  if (fields._tag === "Effect") {
    const mapped = plain
      ? work as Effect.Effect<any, any, any>
      : Effect.map(work as Effect.Effect<any, any, any>, resolve)
    effect = reject === undefined ? mapped : Effect.catch(mapped, (error) => Effect.sync(() => reject(error)))
  } else {
    const mapped = plain
      ? work as Stream.Stream<any, any, any>
      : Stream.map(work as Stream.Stream<any, any, any>, resolve)
    stream = reject === undefined ? mapped : Stream.catch(mapped, (error) => Stream.sync(() => reject(error)))
  }
  return Object.assign(Object.create(Proto), fields, { effect, stream })
}

const noTargets: ReadonlyArray<never> = []

/**
 * Returns `true` if `u` is a Command.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.3
 */
export const isCommand = (u: unknown): u is Command<unknown, unknown> => Predicate.hasProperty(u, TypeId)

/**
 * Returns `true` if `u` is a Command definition: a factory from `make` or a
 * `Service` class.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.3
 */
export const isDefinition = (u: unknown): u is Definition.Any => Predicate.hasProperty(u, DefinitionTypeId)

/**
 * The name of a Command definition: the factory's name, or the service's key.
 *
 * @stability experimental
 * @category accessors
 * @since 4.1.3
 */
export const nameOf = (definition: Definition.Any): string =>
  Context.isKey(definition) ? definition.key : (definition as Factory<any, any, any>).name

/**
 * Defines a Command that needs nothing beyond the framework services.
 *
 * **When to use**
 *
 * Use to wrap an Effect that only needs the runtime's own services (`Scope`, a
 * host's refs) or none at all, such as a random roll or focusing an element.
 * Anything that reaches another service is a `Service`.
 *
 * **Details**
 *
 * The result is a factory: calling it with the arguments issues a Command whose
 * `args` are those arguments, so a story test sees them without running the
 * Effect. The function's requirements may only be framework services, which
 * are removed from `R`; anything else is a compile error that names the
 * service. With `stream: true` the function returns a `Stream` instead.
 *
 * **Gotchas**
 *
 * `Effect.tryPromise(() => fetch(...))` compiles with `R = never`, but a
 * Command written that way can't be faked. Put I/O behind a `Service`.
 *
 * **Example** (A Command that only needs the runtime)
 *
 * ```ts import.meta.vitest
 * import { Command } from "effect/ui"
 * import { Effect, Random, Schema } from "effect"
 *
 * const DieMessage = Schema.TaggedUnion({ Roll: {}, Rolled: { n: Schema.Number } })
 *
 * const RollDie = Command.make("RollDie", (sides: number) =>
 *   Random.nextIntBetween(1, sides).pipe(Effect.map((n) => DieMessage.make({ _tag: "Rolled", n }))))
 *
 * // In a component: `$.run(RollDie(6))`, pending in a story as { name: "RollDie", args: [6] }
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const make: {
  <const Name extends string, Args extends ReadonlyArray<any>, Msg, R>(
    name: Name,
    run: ((...args: Args) => Effect.Effect<Msg, never, R>) & OnlyFrameworkServices<R>,
    options?: Options<Args> & { readonly stream?: false | undefined }
  ): Factory<Args, Msg, false>
  <const Name extends string, Args extends ReadonlyArray<any>, Msg, R>(
    name: Name,
    run: ((...args: Args) => Stream.Stream<Msg, never, R>) & OnlyFrameworkServices<R>,
    options: Options<Args> & { readonly stream: true }
  ): Factory<Args, Msg, true>
} = (
  name: string,
  run: (...args: ReadonlyArray<unknown>) => any,
  options?: Options<ReadonlyArray<any>>
): any => {
  const stream = options?.stream === true
  const mode = options?.mode ?? "concurrent"
  const keyOf = options?.key
  const factory = (...args: ReadonlyArray<unknown>) => {
    const key = keyOf === undefined ? undefined : keyOf(...args)
    const work = run(...args)
    return makeIssued({
      _tag: stream ? "Stream" : "Effect",
      name,
      args,
      mode,
      key,
      work,
      resolve: identity,
      reject: undefined,
      invalidates: noTargets,
      optimistic: noTargets,
      writes: undefined
    })
  }
  Object.defineProperty(factory, "name", { value: name })
  return Object.assign(factory, {
    [DefinitionTypeId]: DefinitionTypeId,
    stream,
    mode
  })
}

/**
 * Defines a Command whose implementation is a service.
 *
 * **When to use**
 *
 * Use as the only way for a Command to reach a service other than the
 * framework's: a store, an HTTP client, the page's current workspace.
 *
 * **Details**
 *
 * `Service` is a thin wrapper over `Context.Service`. The implementation is an
 * Effect that runs once per Layer build and returns the Command's function, so
 * it captures the services it uses then. The resulting class has `layer`, the
 * implementation's Layer, and `make(...args)`, which issues a Command that
 * requires the class. A component's requirements therefore name the Command
 * service, never what its implementation uses, and a fake is
 * `Layer.succeed(X, (...args) => ...)`. The key is the Command's name in the
 * log and in story tests.
 *
 * The function may use framework services on each call without them appearing
 * in `layer`'s requirements. State that changes over time is read on each call
 * through a captured service; anything that varies per call is an argument.
 *
 * The body may fail with a typed `E`. `make` then issues an `Unmatched`
 * Command, and the issue site maps both channels to messages with
 * `Command.match({ onSuccess, onFailure })`. A body with `E = never` issues a
 * Command directly, mapped with `Command.map` if needed.
 *
 * The third parameter is required and carries `invalidates`, plus the
 * optional `optimistic` and `writes`. They're computed when the Command is
 * issued and carried on it as data.
 *
 * **Example** (Defining, issuing and faking a Command service)
 *
 * ```ts import.meta.vitest
 * import { Command } from "effect/ui"
 * import { Effect, Layer, Schema } from "effect"
 * import { KeyValueStore } from "effect/persistence"
 *
 * const Message = Schema.TaggedUnion({ Save: {}, Saved: {}, SaveFailed: { reason: Schema.String } })
 *
 * class SaveTodo extends Command.Service<SaveTodo>()(
 *   "todos/SaveTodo",
 *   Effect.gen(function*() {
 *     const kv = yield* KeyValueStore.KeyValueStore
 *     return (id: string, title: string) => kv.set(`todo/${id}`, title)
 *   }),
 *   { invalidates: () => [] }
 * ) {}
 *
 * // Issue it from `update`, mapping both channels to messages
 * const save = SaveTodo.make("t1", "milk").pipe(Command.match({
 *   onSuccess: () => Message.make({ _tag: "Saved" }),
 *   onFailure: (e) => Message.make({ _tag: "SaveFailed", reason: e.message })
 * }))
 * // Live: provide `SaveTodo.layer`, which requires `KeyValueStore`
 * // Test: a fake that needs nothing
 * const Fake = Layer.succeed(SaveTodo, () => Effect.void)
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
// The options are their own type parameter, `O`, so that their callbacks are typed from `Args` without
// being an inference site for it. Written as `options: Service.Options<Args, A>`, a body with an
// optional parameter and `invalidates: (id) => ...` infers `Args` as `[id]`, dropping the parameter.
export const Service: <Self>() => {
  <
    const Key extends string,
    Args extends ReadonlyArray<any>,
    A,
    Err,
    RInner,
    E,
    R,
    O extends Service.Options<Args, A> & { readonly stream?: false | undefined }
  >(
    key: Key,
    implementation:
      & Effect.Effect<(...args: Args) => Effect.Effect<A, Err, RInner>, E, R>
      & CapturesServices<RInner>,
    options: O
  ): Service<Self, Key, Args, A, false, E, Exclude<R, Scope.Scope>, Err>
  <
    const Key extends string,
    Args extends ReadonlyArray<any>,
    A,
    Err,
    RInner,
    E,
    R,
    O extends Service.Options<Args> & { readonly stream: true; readonly writes?: undefined }
  >(
    key: Key,
    implementation:
      & Effect.Effect<(...args: Args) => Stream.Stream<A, Err, RInner>, E, R>
      & CapturesServices<RInner>,
    options: O
  ): Service<Self, Key, Args, A, true, E, Exclude<R, Scope.Scope>, Err>
} = () =>
(
  key: string,
  implementation: Effect.Effect<(...args: ReadonlyArray<unknown>) => any, any, any>,
  options: Service.Options<ReadonlyArray<any>, any>
): any => {
  const Base = Context.Service<any, any>()(key)
  const stream = options.stream === true
  const mode = options.mode ?? "concurrent"
  const keyOf = options.key
  const writesOf = options.writes
  const service = Base as Effect.Effect<(...args: ReadonlyArray<unknown>) => any, never, any>
  class CommandService extends Base {
    static readonly [DefinitionTypeId] = DefinitionTypeId
    static readonly stream = stream
    static readonly mode = mode
    static readonly layer = Layer.effect(Base, implementation)
    static make(...args: ReadonlyArray<unknown>) {
      return makeIssued({
        _tag: stream ? "Stream" : "Effect",
        name: key,
        args,
        mode,
        key: keyOf === undefined ? undefined : keyOf(...args),
        work: stream
          ? Stream.unwrap(Effect.map(service, (run) => run(...args)))
          : Effect.flatMap(service, (run) => run(...args)),
        resolve: identity,
        reject: undefined,
        invalidates: options.invalidates(...args),
        optimistic: options.optimistic === undefined ? noTargets : options.optimistic(...args),
        writes: writesOf === undefined ? undefined : (success) => writesOf(success, ...args)
      })
    }
  }
  return CommandService
}

/**
 * Maps the two channels of a `Service` Command to messages.
 *
 * **When to use**
 *
 * Use when issuing a `Command.Service` whose body can fail: its `make`
 * returns an `Unmatched` Command, which `$.run` doesn't accept.
 *
 * **Details**
 *
 * `onSuccess` takes the body's result and `onFailure` its typed failure.
 * For a Stream Command `onSuccess` maps each element and `onFailure` the
 * failure that ends the Stream. A story resolves the result with the
 * definition's own success (`resolve`) or failure (`fail`).
 *
 * @stability experimental
 * @category mapping
 * @since 4.1.3
 */
export const match: {
  <A, E, M1, M2>(
    options: { readonly onSuccess: (a: A) => M1; readonly onFailure: (e: E) => M2 }
  ): <R, K extends Kind>(self: Unmatched<A, E, R, K>) => Issued<M1 | M2, R, A, K, E>
  <A, E, R, K extends Kind, M1, M2>(
    self: Unmatched<A, E, R, K>,
    options: { readonly onSuccess: (a: A) => M1; readonly onFailure: (e: E) => M2 }
  ): Issued<M1 | M2, R, A, K, E>
} = dual(2, (
  self: Unmatched<any, any, any, Kind>,
  options: { readonly onSuccess: (a: any) => any; readonly onFailure: (e: any) => any }
): any => makeIssued({ ...(self as any as Fields), resolve: options.onSuccess, reject: options.onFailure }))

/**
 * Maps the message a Command produces.
 *
 * **When to use**
 *
 * Use to reuse a Command whose result isn't the component's own message, such
 * as a shared `UploadFile` Command that returns a URL.
 *
 * **Details**
 *
 * The name, arguments and options are kept, so the log and story tests still
 * see the original Command, and a story's `resolve` step still takes the definition's
 * own result (the `Source` type parameter). The data-first form returns an
 * `Interrupt` unchanged; the pipeable form only takes issued Commands.
 *
 * **Gotchas**
 *
 * The pipeable form infers one `Source` and one `R` for its input, so it maps
 * one Command, or a union whose branches share them, and keeps them exact.
 * For a union of Commands with different sources or requirements, use the
 * data-first form, `Command.map(input, f)`, which keeps each branch's own.
 *
 * **Example** (Mapping a shared Command into a component's message)
 *
 * ```ts import.meta.vitest
 * import { Command } from "effect/ui"
 * import { Effect, Schema } from "effect"
 *
 * const Message = Schema.TaggedUnion({ Uploaded: { url: Schema.String } })
 *
 * const UploadFile = Command.make("UploadFile", (name: string) => Effect.succeed(`https://cdn/${name}`))
 *
 * const upload = UploadFile("photo.png").pipe(
 *   Command.map((url) => Message.make({ _tag: "Uploaded", url }))
 * )
 * ```
 *
 * @stability experimental
 * @category mapping
 * @since 4.1.3
 */
export const map: {
  <A, B>(
    f: (a: A) => B
  ): <R, Source, K extends Kind, SourceE = never>(
    self: Issued<A, R, Source, K, SourceE>
  ) => Mapped<Issued<A, R, Source, K, SourceE>, B>
  <C extends Command<any, any>, B>(self: C, f: (a: Message<C>) => B): Mapped<C, B>
} = dual(2, <A, R, B>(self: Command<A, R>, f: (a: A) => B): Command<B, R> => {
  if (self._tag === "Interrupt") return self
  const reject = self.reject
  return makeIssued({
    ...(self as any as Fields),
    resolve: (result) => f(self.resolve(result as never)),
    reject: reject === undefined ? undefined : (error) => f(reject(error as never))
  })
})

/**
 * Issues a Command that interrupts the running and queued runs of another one.
 *
 * **When to use**
 *
 * Use to handle a user-driven cancel, such as a "Cancel upload" button, from
 * `update`.
 *
 * **Details**
 *
 * It produces no message. An interrupted run dispatches nothing and is logged
 * as `CommandInterrupted`. With `key`, only the runs whose concurrency key
 * matches are interrupted.
 *
 * **Example** (Cancelling an upload)
 *
 * ```ts import.meta.vitest
 * import { Command } from "effect/ui"
 * import { Effect } from "effect"
 *
 * const UploadFile = Command.make("UploadFile", (name: string) => Effect.succeed(`https://cdn/${name}`), {
 *   key: (name) => name
 * })
 *
 * // In `update`: `$.run(Command.interrupt(UploadFile, "photo.png"))`
 * const cancel = Command.interrupt(UploadFile, "photo.png")
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const interrupt = (definition: Definition.Any, key?: string): Interrupt =>
  Object.assign(Object.create(Proto), {
    _tag: "Interrupt",
    name: nameOf(definition),
    key
  })

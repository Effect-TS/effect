/**
 * Commands are the side effects a component asks the runtime to run.
 *
 * `update` and `init` return Commands as data. The runtime runs each one and
 * feeds its result back to the instance as a message, so `update` stays pure
 * and a story test can read what was issued without running anything.
 *
 * Both constructors take a name, options with a required `args` Schema, and
 * a body that receives the args as one struct:
 *
 * - `Command.make(name, { args }, body)` for Commands that need nothing beyond
 *   the framework services. It returns a factory: `RollDie({ sides: 6 })`.
 *   Its body can't fail.
 * - `Command.Service<Self>()(key, { args, invalidates }, implementation)` for
 *   Commands that reach any other service. The implementation runs once per
 *   Layer build and captures the services it uses, so a component's
 *   requirements name the Command service, never what its implementation
 *   uses. Issue one with `DeleteTodo.make({ id })` and fake it with
 *   `Layer.succeed(DeleteTodo, ({ id }) => ...)`. Its body may fail with a
 *   typed error, which the issue site maps to a message with `Command.match`.
 *
 * A `Command.Service` declares what it does to the loader cache:
 * `invalidates`, `optimistic` and `writes` are optional. Omitting
 * `invalidates` means the run invalidates nothing.
 *
 * **Example** (A Command service with a captured dependency)
 *
 * ```ts import.meta.vitest
 * import { Command } from "effect/ui"
 * import { Effect, Schema } from "effect"
 * import { KeyValueStore } from "effect/persistence"
 *
 * const Message = Schema.TaggedUnion({ Delete: {}, Deleted: {}, DeleteFailed: {} })
 *
 * class DeleteTodo extends Command.Service<DeleteTodo>()("todos/DeleteTodo", {
 *   args: { id: Schema.String },
 * }, Effect.gen(function*() {
 *   const kv = yield* KeyValueStore.KeyValueStore
 *   return ({ id }) => kv.remove(`todo/${id}`)
 * })) {}
 *
 * // In a component, mapping both channels to messages. The component requires `DeleteTodo`.
 * const remove = DeleteTodo.make({ id: "t1" }).pipe(Command.match({
 *   onSuccess: () => Message.make({ _tag: "Deleted" }),
 *   onFailure: () => Message.make({ _tag: "DeleteFailed" })
 * }))
 * // The live wiring provides `DeleteTodo.layer`, which requires `KeyValueStore`.
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Context from "../Context.ts"
import { TaggedClass } from "../Data.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import { dual } from "../Function.ts"
import * as Layer from "../Layer.ts"
import * as Pipeable from "../Pipeable.ts"
import * as Predicate from "../Predicate.ts"
import * as Loader from "../reactivity/Loader.ts"
import * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import type * as Types from "../Types.ts"
import type * as Renderer from "./Renderer.ts"

/**
 * Identifies a Command value.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.5
 */
export const TypeId = "~effect/ui/Command" as const

/**
 * Identifies a Command value.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.5
 */
export type TypeId = typeof TypeId

/**
 * Identifies a Command definition: a factory from `make` or a `Service` class.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.5
 */
export const DefinitionTypeId = "~effect/ui/Command/Definition" as const

/**
 * Identifies a Command definition: a factory from `make` or a `Service` class.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.5
 */
export type DefinitionTypeId = typeof DefinitionTypeId

/**
 * Identifies a Command issued by a `Service` whose body can fail, before
 * `match` has mapped its two channels to messages.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.5
 */
export const UnmatchedTypeId = "~effect/ui/Command/Unmatched" as const

/**
 * Identifies an unmatched Command.
 *
 * @stability experimental
 * @category type ids
 * @since 4.1.5
 */
export type UnmatchedTypeId = typeof UnmatchedTypeId

/**
 * How runs of one Command relate to each other when a new one is issued while
 * an earlier one is still running.
 *
 * **Details**
 *
 * Runs are grouped by instance, Command name and the `group` key. Within a
 * group, `concurrent` runs everything at once, `switch` interrupts the earlier
 * runs, `drop` ignores the new one, and `queue` starts it once the earlier runs
 * have ended.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Mode = "concurrent" | "switch" | "drop" | "queue"

/**
 * What `args` accepts: a fields record or a `Schema.Struct`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type ArgsInput = Schema.Struct.Fields | Schema.Struct<Schema.Struct.Fields>

/**
 * The fields of an `args` input.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type ArgsFields<In> = In extends Schema.Struct<infer Fields> ? Fields
  : In extends Schema.Struct.Fields ? In
  : never

/**
 * The decoded args struct of an `args` input: what the body, `invalidates`,
 * `optimistic` and `writes` get.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type ArgsOf<In> = Schema.Struct<ArgsFields<In>>["Type"]

type Json = string | number | boolean | null | undefined | ReadonlyArray<Json> | { readonly [key: string]: Json }

/**
 * The args fields a `group` may name: those whose encoded form is JSON.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type GroupField<In> =
  & {
    [K in keyof ArgsFields<In>]: ArgsFields<In>[K] extends { readonly Encoded: infer E } ?
      [E] extends [Json] ? K : never
      : never
  }[keyof ArgsFields<In>]
  & string

/**
 * The optional group argument of `Command.interrupt` and `h.isRunning`: the
 * `group` fields of the Command's args, or none for a Command without a
 * `group`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type GroupArg<Args, G extends string> = [G] extends [never] ? [] : [group?: Pick<Args, G & keyof Args>]

/**
 * The arguments of `make`: optional when every field of the args is.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type MakeArgs<Args> = {} extends Args ? [args?: Args] : [args: Args]

/**
 * The options shared by `make` and `Service`.
 *
 * **Details**
 *
 * - `args` is required: a fields record or a `Schema.Struct`. The body gets
 *   one decoded struct. A Command with no args writes `args: {}`. The log
 *   encodes a run's args through it, redacting `Schema.Redacted` fields.
 * - `stream: true` declares a Stream Command, so a story test knows the kind
 *   without building a Layer.
 * - `mode` defaults to `"concurrent"`.
 * - `group` lists args fields whose values split runs into groups, so runs of
 *   different groups don't interfere. The group key is the canonical JSON of
 *   those fields, encoded. Without it, all runs of a Command in one instance
 *   are one group.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Options<In extends ArgsInput, G extends string> {
  readonly args: In
  readonly stream?: boolean | undefined
  readonly mode?: Mode | undefined
  readonly group?: ReadonlyArray<G> | undefined
}

/**
 * The services every mounted app is guaranteed to have, which a Command may use
 * without them appearing in its component's requirements.
 *
 * **Details**
 *
 * Host packages widen this interface by module augmentation, the same way an
 * app registers its element vocabulary. The runtime provides these services
 * when a Command runs, so they're removed from `R`. The core lists `Scope`,
 * `Renderer.Refs` and the loader cache, and host packages add their host
 * marker.
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
 * @since 4.1.5
 */
export interface FrameworkServices {
  readonly Scope: Scope.Scope
  readonly Refs: Renderer.Refs
  readonly Cache: Loader.Cache
}

/**
 * The union of the registered framework services.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type FrameworkService = FrameworkServices[keyof FrameworkServices]

/**
 * Passes when a `Service` implementation's function holds only framework
 * services, and otherwise names what it should have captured when its Layer
 * was built.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type CapturesServices<R> = [Exclude<R, FrameworkService>] extends [never] ? unknown
  : {
    readonly "A Command.Service captures its services when its Layer is built. Its function may only require framework services; it needs":
      Exclude<R, FrameworkService>
  }

/**
 * What a Command declares about the loader cache, computed from its args when
 * it's issued. A story test reads these off the issued Command without a
 * cache. `make` Commands declare nothing.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Declared {
  /** What the run invalidates when its fiber exits, however it exits. */
  readonly invalidates: ReadonlyArray<Loader.Target>
  /** The optimistic patches, registered when the Command is issued. */
  readonly optimistic: ReadonlyArray<Loader.Patch>
  /**
   * The writes a success stores, or `undefined` without `writes`. Takes the
   * body's own success.
   */
  readonly writes: ((success: any) => ReadonlyArray<Loader.Write>) | undefined
  /**
   * The budget given to `Command.afterRefetch`, or `undefined` when a success
   * is delivered without waiting for refetches.
   */
  readonly afterRefetch: Duration.Duration | undefined
}

/**
 * The data every issued Command carries, matched or not.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Data extends Declared {
  /** The Command's name: the factory's name or the service's key. */
  readonly name: string
  /** The decoded args struct the Command was issued with. Data a test asserts on without running the Effect. */
  readonly args: unknown
  readonly mode: Mode
  /** The group key: canonical JSON of the encoded `group` fields, or `undefined` without `group`. */
  readonly groupKey: string | undefined
  /**
   * The args Schema, for the log.
   *
   * @internal
   */
  readonly argsSchema: Schema.Top
  /**
   * The `Service` class the Command was issued by, `undefined` for a `make`
   * Command. The runtime finds the Layer build that owns a detached run
   * through it.
   *
   * @internal
   */
  readonly service: Context.Key<any, any> | undefined
}

/**
 * The shared fields of an issued Command.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Proto<out Msg, in Source = Msg, in SourceE = never> extends Pipeable.Pipeable, Data {
  readonly [TypeId]: Variance<Msg, Source, SourceE>
  /**
   * Maps the success of the underlying definition to the message this Command
   * produces, composing every `map` and `match` applied since it was issued.
   * `Story` uses it to resolve a Command with the definition's own success.
   *
   * @internal
   */
  readonly resolve: (result: Source) => Msg
  /**
   * Maps a typed failure of the underlying definition to the message this
   * Command produces. `undefined` when the definition can't fail.
   *
   * @internal
   */
  readonly reject: ((error: SourceE) => Msg) | undefined
}

/**
 * Phantom variance for a Command's message type and the success and failure
 * of its definition.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
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
 * @since 4.1.5
 */
export type Kind = "Effect" | "Stream"

/**
 * An issued Command: what a definition's factory or `make` returns, or what
 * `match` makes of an `Unmatched` one.
 *
 * **Details**
 *
 * `Msg` is the message it produces and `R` what it requires. `Source` is
 * the success of the Command's definition before any `map`, and `SourceE`
 * its typed failure before `match`; they're what a story's `resolve` and
 * `fail` steps take. `K` is the kind, which decides whether `effect` or
 * `stream` holds the work; the other field is `undefined`: `"Effect"` for a
 * Command whose result is one message, `"Stream"` for one declared with
 * `stream: true`. Narrow a `Command` on `_tag` before reading the work.
 *
 * One interface for both kinds, rather than two, is what lets
 * `command.pipe(Command.map((result) => ...))` infer `result`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
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
   * The definition's own work, before `map` and `match`. The runtime runs
   * this one, so the exit of a run tells a success from a typed failure.
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
 * It isn't a `Command`, so `$.run` and `Command.map` reject it until
 * `match` maps both channels. It already carries the Command's data: its
 * name, args and what it declares about the cache.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Unmatched<out A, out E, out R, out K extends Kind> extends Pipeable.Pipeable, Data {
  readonly [UnmatchedTypeId]: {
    readonly _A: Types.Covariant<A>
    readonly _E: Types.Covariant<E>
    readonly _R: Types.Covariant<R>
  }
  readonly _tag: K
  /** The body's work of an `"Effect"` Command, with its typed failure. `undefined` on a `"Stream"` one. */
  readonly effect: K extends "Effect" ? Effect.Effect<A, E, R> : undefined
  /** The body's work of a `"Stream"` Command, with its typed failure. `undefined` on an `"Effect"` one. */
  readonly stream: K extends "Stream" ? Stream.Stream<A, E, R> : undefined
}

/**
 * A Command that interrupts the running and queued runs of another Command.
 *
 * **Details**
 *
 * It produces no message. With a group key, only the runs of that group are
 * interrupted.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Interrupt extends Pipeable.Pipeable {
  readonly [TypeId]: Variance<never, unknown>
  readonly _tag: "Interrupt"
  /** The name of the Command to interrupt. */
  readonly name: string
  /** The group key to interrupt, or `undefined` for every run of the Command. */
  readonly groupKey: string | undefined
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
 * @since 4.1.5
 */
export type Command<Msg, R = never> = Issued<Msg, R, never, "Effect"> | Issued<Msg, R, never, "Stream"> | Interrupt

/**
 * The requirements of a Command, or of a union of them.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Requirements<C> = C extends Issued<infer _Msg, infer R, infer _S, infer _K, infer _SE> ? R : never

/**
 * The message type of a Command, or of a union of them.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Message<C> = C extends Proto<infer Msg, infer _Source, infer _SourceE> ? Msg
  : C extends Definition<infer _Args, infer Msg, infer _S, infer _E, infer _G> ? Msg
  : never

/**
 * What resolves a Command in a story: the definition's own success, for a
 * definition or an issued Command, before any `map` or `match`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Result<C> = C extends Proto<infer _Msg, infer Source, infer _SourceE> ? Source
  : C extends Unmatched<infer A, infer _E, infer _R, infer _K> ? A
  : C extends Definition<infer _Args, infer A, infer _S, infer _E, infer _G> ? A
  : never

/**
 * What fails a Command in a story: the definition's own typed failure, for a
 * definition or an issued Command, before `match`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type Failure<C> = C extends Proto<infer _Msg, infer _Source, infer SourceE> ? SourceE
  : C extends Unmatched<infer _A, infer E, infer _R, infer _K> ? E
  : C extends Definition<infer _Args, infer _A, infer _S, infer E, infer _G> ? E
  : never

/**
 * `C` with its message mapped to `B`. An `Interrupt` stays an `Interrupt`, and
 * a Command whose kind is `"Effect" | "Stream"` becomes a union of the two kinds,
 * so it still fits `Command<B>`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
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
 * `Args` is the decoded args struct a Command is issued with, `A` the
 * body's success, `IsStream` whether it was declared with `stream: true`,
 * `E` the body's typed failure and `G` its `group` fields. Story steps
 * such as `resolve` take a definition and are typed by it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Definition<in Args, out A, out IsStream extends boolean, out E = never, out G extends string = never> {
  readonly [DefinitionTypeId]: Definition.Variance<Args, A, IsStream, E, G>
  /** Whether the Command was declared with `stream: true`. */
  readonly stream: IsStream
  readonly mode: Mode
  /** The `group` fields. Empty without `group`. */
  readonly group: ReadonlyArray<G>
  /**
   * The group key of an args struct, or of a pick of its `group` fields.
   *
   * @internal
   */
  readonly "~group": (args: unknown) => GroupSource | undefined
}

/**
 * Helper types for `Definition`.
 *
 * @stability experimental
 * @since 4.1.5
 */
export declare namespace Definition {
  /**
   * Phantom variance for a definition's args, success, kind, failure and group.
   *
   * @category models
   * @since 4.1.5
   */
  export interface Variance<in Args, out A, out IsStream extends boolean, out E, out G extends string> {
    readonly _Args: Types.Contravariant<Args>
    readonly _A: Types.Covariant<A>
    readonly _IsStream: Types.Covariant<IsStream>
    readonly _E: Types.Covariant<E>
    readonly _G: Types.Covariant<G>
  }

  /**
   * Any Command definition.
   *
   * @category models
   * @since 4.1.5
   */
  export type Any = Definition<any, any, boolean, any, any>

  /**
   * The args struct a definition is issued with.
   *
   * @category utility types
   * @since 4.1.5
   */
  export type Args<D> = D extends Definition<infer A, infer _A, infer _S, infer _E, infer _G> ? A : never

  /**
   * Whether a definition was declared with `stream: true`.
   *
   * @category utility types
   * @since 4.1.5
   */
  export type IsStream<D> = D extends Definition<infer _Args, infer _A, infer S, infer _E, infer _G> ? S : never
}

/**
 * What `make` returns: call it with the Command's args struct to issue it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Factory<in out Args, in out Msg, out IsStream extends boolean = false, out G extends string = never>
  extends Definition<Args, Msg, IsStream, never, G>
{
  (
    ...args: MakeArgs<Args>
  ): IsStream extends true ? Issued<Msg, never, Msg, "Stream"> : Issued<Msg, never, Msg, "Effect">
  readonly name: string
  /** The args Schema. */
  readonly args: Schema.Top
}

/**
 * A Command service class, as returned by `Service`.
 *
 * **Details**
 *
 * It's a `Context.Service` whose value is the Command's implementation: a
 * function of the args struct returning an `Effect` (or a `Stream`).
 * `layer` builds that implementation, and `make` issues a Command that
 * requires the service. A fake is `Layer.succeed(X, (args) => ...)`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Service<
  in out Self,
  in out Key extends string,
  in out Args,
  in out A,
  out IsStream extends boolean,
  out E,
  out R,
  in out Err = never,
  out G extends string = never
> extends
  Context.ServiceClass<Self, Key, Service.Implementation<Args, A, IsStream, Err>>,
  Definition<Args, A, IsStream, Err, G>
{
  /** The implementation's Layer. It requires what the implementation captured. */
  readonly layer: Layer.Layer<Self, E, R>
  /** The args Schema. */
  readonly args: Schema.Top
  /**
   * Issues the Command. The component requires `Self`. When the body can
   * fail (`Err` isn't `never`) the result is `Unmatched`: map both channels
   * with `Command.match` before running it.
   */
  make(
    ...args: MakeArgs<Args>
  ): [Err] extends [never] ? (IsStream extends true ? Issued<A, Self, A, "Stream"> : Issued<A, Self, A, "Effect">)
    : Unmatched<A, Err, Self, IsStream extends true ? "Stream" : "Effect">
}

/**
 * Helper types for `Service`.
 *
 * @stability experimental
 * @since 4.1.5
 */
export declare namespace Service {
  /**
   * The value behind a Command service: a function of the args struct that
   * returns the body's result. It may use framework services on each call.
   *
   * @category models
   * @since 4.1.5
   */
  export type Implementation<Args, A, IsStream extends boolean, Err = never> = IsStream extends true ?
    (args: Args) => Stream.Stream<A, Err, FrameworkService>
    : (args: Args) => Effect.Effect<A, Err, FrameworkService>

  /**
   * The options accepted by `Service`.
   *
   * **Details**
   *
   * On top of `Options`:
   *
   * - `invalidates` is optional: what a run invalidates, from the args
   *   only, so it's known at issue. It's applied on every exit of a started
   *   run. Omitting it invalidates nothing.
   * - `optimistic` lists patches, from the args only, registered at issue.
   * - `writes` lists the entries a success writes. A Stream Command has none.
   *
   * @category models
   * @since 4.1.5
   */
  export interface Options<In extends ArgsInput, A, G extends string> extends CommandOptions<In, G> {
    readonly invalidates?: ((args: ArgsOf<In>) => ReadonlyArray<Loader.Target>) | undefined
    readonly optimistic?: ((args: ArgsOf<In>) => ReadonlyArray<Loader.Patch>) | undefined
    readonly writes?: ((success: A, args: ArgsOf<In>) => ReadonlyArray<Loader.Write>) | undefined
  }
}

type CommandOptions<In extends ArgsInput, G extends string> = Options<In, G>

const identity = (result: any) => result

const Proto = {
  [TypeId]: { _Msg: (_: never) => _, _Source: (_: never) => _, _SourceE: (_: never) => _ },
  pipe() {
    return Pipeable.pipeArguments(this, arguments)
  }
}

const UnmatchedProto = {
  ...Proto,
  [UnmatchedTypeId]: { _A: (_: never) => _, _E: (_: never) => _, _R: (_: never) => _ }
}

interface Fields extends Data {
  readonly _tag: Kind
  readonly "~group": GroupSource | undefined
  readonly work: Effect.Effect<any, any, any> | Stream.Stream<any, any, any>
  readonly resolve: (result: any) => any
  readonly reject: ((error: any) => any) | undefined
}

/** `effect` and `stream` are the work with `resolve` and `reject` applied. An unmatched Command keeps its failure. */
const makeIssued = (fields: Fields, unmatched = false): any => {
  const { reject, resolve, work } = fields
  let effect: Effect.Effect<any, any, any> | undefined
  let stream: Stream.Stream<any, any, any> | undefined
  if (fields._tag === "Effect") {
    const mapped = resolve === identity
      ? work as Effect.Effect<any, any, any>
      : Effect.map(work as Effect.Effect<any, any, any>, resolve)
    effect = reject === undefined ? mapped : Effect.catch(mapped, (error) => Effect.sync(() => reject(error)))
  } else {
    const mapped = resolve === identity
      ? work as Stream.Stream<any, any, any>
      : Stream.map(work as Stream.Stream<any, any, any>, resolve)
    stream = reject === undefined ? mapped : Stream.catch(mapped, (error) => Stream.sync(() => reject(error)))
  }
  return Object.assign(Object.create(unmatched ? UnmatchedProto : Proto), fields, { effect, stream })
}

const noTargets: ReadonlyArray<never> = []

/**
 * One build of a `Service`'s Layer: the owner of the detached runs issued
 * against it. A fake provided with `Layer.succeed` has none, and its runs are
 * owned by the root alone.
 *
 * @internal
 */
export interface Build {
  closed: boolean
  /**
   * Called once, when the build's Scope closes. Every listener is called before any returned Effect
   * runs, and the close waits for those Effects. The returned function removes the listener.
   */
  readonly onClose: (listener: () => Effect.Effect<void>) => () => void
}

const builds = new WeakMap<object, Build>()

/**
 * The build an implementation came from, or `undefined` for a fake.
 *
 * @internal
 */
export const buildOf = (implementation: unknown): Build | undefined =>
  typeof implementation === "function" ? builds.get(implementation) : undefined

const argsSchemaOf = (args: ArgsInput): Schema.Struct<Schema.Struct.Fields> =>
  Schema.isSchema(args) ? args as Schema.Struct<Schema.Struct.Fields> : Schema.Struct(args as Schema.Struct.Fields)

/**
 * A Command's group: its key, and the `group` fields it was made from, so the
 * message log can encode them with redaction instead of logging the key.
 *
 * @internal
 */
export interface GroupSource {
  /** Canonical JSON of the encoded `group` fields. */
  readonly key: string
  /** A struct of the `group` fields. */
  readonly schema: Schema.Top
  /** The `group` fields picked from the args. */
  readonly picked: Record<string, unknown>
}

/** The group of an args struct, or of a pick of its `group` fields. The codec is built on first use. */
const makeGroup = (
  name: string,
  schema: Schema.Struct<Schema.Struct.Fields>,
  group: ReadonlyArray<string>
): (args: unknown) => GroupSource | undefined => {
  if (group.length === 0) return () => undefined
  const fields: Record<string, Schema.Top> = {}
  for (const field of group) {
    if (!Object.hasOwn(schema.fields, field)) {
      throw new Error(`${name}: the group field "${field}" isn't one of its args`)
    }
    fields[field] = schema.fields[field] as Schema.Top
  }
  const pickSchema = Schema.Struct(fields)
  let encode: ((u: unknown) => unknown) | undefined
  return (args) => {
    if (encode === undefined) {
      encode = Schema.encodeUnknownSync(
        Schema.toCodecJson(pickSchema) as unknown as Schema.Codec<unknown, unknown>
      )
    }
    const picked: Record<string, unknown> = {}
    const source = (args ?? {}) as Record<string, unknown>
    for (const field of group) if (Object.hasOwn(source, field)) picked[field] = source[field]
    return { key: Loader.canonical(encode(picked)), schema: pickSchema, picked }
  }
}

/**
 * Returns `true` if `u` is a Command.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isCommand = (u: unknown): u is Command<unknown, unknown> => Predicate.hasProperty(u, TypeId)

/**
 * Returns `true` if `u` is a Command issued by a `Service` whose body can
 * fail, before `match`.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isUnmatched = (u: unknown): u is Unmatched<unknown, unknown, unknown, Kind> =>
  Predicate.hasProperty(u, UnmatchedTypeId)

/**
 * Returns `true` if `u` is a Command definition: a factory from `make` or a
 * `Service` class.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isDefinition = (u: unknown): u is Definition.Any => Predicate.hasProperty(u, DefinitionTypeId)

/**
 * The name of a Command definition: the factory's name, or the service's key.
 *
 * @stability experimental
 * @category accessors
 * @since 4.1.5
 */
export const nameOf = (definition: Definition.Any): string =>
  Context.isKey(definition) ? definition.key : (definition as Factory<any, any, any>).name

/**
 * The group key a definition's `group` pick addresses, or `undefined` for
 * every run of it.
 *
 * @internal
 */
export const groupKeyOf = (definition: Definition.Any, group: unknown): string | undefined =>
  group === undefined ? undefined : definition["~group"](group)?.key

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
 * Requires an `args` Schema and returns a factory that takes the args struct
 * and issues a Command. Story tests can inspect its `args` without running
 * the Effect. The body can't fail. Its requirements may only be framework
 * services, which are removed from `R`. A body that requires anything else
 * doesn't compile, and the error names `FrameworkService` rather than the
 * missing service. With `stream: true` the body returns a `Stream` instead.
 * A `make` Command declares nothing about the loader cache, and its runs end
 * with the issuing instance.
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
 * const RollDie = Command.make("RollDie", { args: { sides: Schema.Number } }, ({ sides }) =>
 *   Random.nextIntBetween(1, sides).pipe(Effect.map((n) => DieMessage.make({ _tag: "Rolled", n }))))
 *
 * // In a component: `$.run(RollDie({ sides: 6 }))`, pending in a story as { name: "RollDie", args: { sides: 6 } }
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const make: {
  <
    const Name extends string,
    const In extends ArgsInput,
    Msg,
    R extends FrameworkService = never,
    const G extends GroupField<In> = never
  >(
    name: Name,
    options: Options<In, G> & { readonly stream?: false | undefined },
    run: (args: ArgsOf<In>) => Effect.Effect<Msg, never, R>
  ): Factory<ArgsOf<In>, Msg, false, G>
  <
    const Name extends string,
    const In extends ArgsInput,
    Msg,
    R extends FrameworkService = never,
    const G extends GroupField<In> = never
  >(
    name: Name,
    options: Options<In, G> & { readonly stream: true },
    run: (args: ArgsOf<In>) => Stream.Stream<Msg, never, R>
  ): Factory<ArgsOf<In>, Msg, true, G>
} = (
  name: string,
  options: Options<ArgsInput, string>,
  run: (args: any) => any
): any => {
  const stream = options.stream === true
  const mode = options.mode ?? "concurrent"
  const group = options.group ?? []
  const argsSchema = argsSchemaOf(options.args)
  const groupOf = makeGroup(name, argsSchema, group)
  const factory = (args: unknown = {}) => {
    const source = groupOf(args)
    return makeIssued({
      _tag: stream ? "Stream" : "Effect",
      name,
      args,
      mode,
      groupKey: source?.key,
      "~group": source,
      argsSchema,
      service: undefined,
      invalidates: noTargets,
      optimistic: noTargets,
      writes: undefined,
      afterRefetch: undefined,
      work: run(args),
      resolve: identity,
      reject: undefined
    })
  }
  Object.defineProperty(factory, "name", { value: name })
  return Object.assign(factory, {
    [DefinitionTypeId]: DefinitionTypeId,
    stream,
    mode,
    group,
    args: argsSchema,
    "~group": groupOf
  })
}

/**
 * Defines a Command whose implementation is a service.
 *
 * **When to use**
 *
 * Use when a Command needs a non-framework service, such as a store or HTTP
 * client, including mutations of data a loader reads.
 *
 * **Details**
 *
 * The arguments are the key, the options and the implementation. The
 * implementation is an Effect that runs once per Layer build and returns the
 * body, a function of the args struct, so it captures the services it uses
 * then. The resulting class has `layer`, the implementation's Layer, and
 * `make(args)`, which issues a Command that requires the class. A
 * component's requirements therefore name the Command service, never what its
 * implementation uses, and a fake is `Layer.succeed(X, (args) => ...)`. The
 * key is the Command's name in the log and in story tests.
 *
 * The body may use framework services on each call without them appearing in
 * `layer`'s requirements, and it may fail with a typed error. `make` then
 * issues an `Unmatched` Command, and the issue site maps both channels to
 * messages with `Command.match({ onSuccess, onFailure })`. A body that can't
 * fail issues a Command directly, mapped with `Command.map`.
 *
 * The options declare what a run does to the loader cache, from the args:
 * `invalidates` (optional), `optimistic` patches, live from issue, and
 * `writes` of the success. The runtime applies them when the run's fiber
 * exits, before its message is sent.
 *
 * An Effect-shaped run outside `switch` is detached: it's owned by the Layer
 * build that provides the service and by the root, not by the issuing
 * instance, and it gets a Scope of its own. A save completes after its
 * instance unmounts, and its message is then dropped.
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
 * class SaveTodo extends Command.Service<SaveTodo>()("todos/SaveTodo", {
 *   args: { id: Schema.String, title: Schema.String },
 *   mode: "queue",
 *   group: ["id"],
 * }, Effect.gen(function*() {
 *   const kv = yield* KeyValueStore.KeyValueStore
 *   return ({ id, title }) => kv.set(`todo/${id}`, title)
 * })) {}
 *
 * // Issue it from `update`, mapping both channels to messages
 * const save = SaveTodo.make({ id: "t1", title: "milk" }).pipe(Command.match({
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
 * @since 4.1.5
 */
export const Service: <Self>() => {
  <
    const Key extends string,
    const In extends ArgsInput,
    A,
    Err,
    RInner,
    E,
    R,
    const G extends GroupField<In> = never
  >(
    key: Key,
    options: Service.Options<In, A, G> & { readonly stream?: false | undefined },
    implementation:
      & Effect.Effect<(args: ArgsOf<In>) => Effect.Effect<A, Err, RInner>, E, R>
      & CapturesServices<RInner>
  ): Service<Self, Key, ArgsOf<In>, A, false, E, Exclude<R, Scope.Scope>, Err, G>
  <
    const Key extends string,
    const In extends ArgsInput,
    A,
    Err,
    RInner,
    E,
    R,
    const G extends GroupField<In> = never
  >(
    key: Key,
    options: Service.Options<In, A, G> & {
      readonly stream: true
      readonly writes?: undefined
    },
    implementation:
      & Effect.Effect<(args: ArgsOf<In>) => Stream.Stream<A, Err, RInner>, E, R>
      & CapturesServices<RInner>
  ): Service<Self, Key, ArgsOf<In>, A, true, E, Exclude<R, Scope.Scope>, Err, G>
} = () =>
(
  key: string,
  options: Service.Options<ArgsInput, any, string>,
  implementation: Effect.Effect<(args: any) => any, any, any>
): any => {
  const Base = Context.Service<any, any>()(key)
  const stream = options.stream === true
  const mode = options.mode ?? "concurrent"
  const group = options.group ?? []
  const argsSchema = argsSchemaOf(options.args)
  const groupOf = makeGroup(key, argsSchema, group)
  const { invalidates, optimistic, writes } = options
  const service = Base as Effect.Effect<(args: unknown) => any, never, any>
  class CommandService extends Base {
    static readonly [DefinitionTypeId] = DefinitionTypeId
    static readonly stream = stream
    static readonly mode = mode
    static readonly group = group
    static readonly args = argsSchema
    static readonly "~group" = groupOf
    static readonly layer = Layer.effect(
      Base,
      Effect.gen(function*() {
        const scope = yield* Effect.scope
        const run = yield* implementation
        // A new function per build, so two builds never share an identity.
        const wrapped = (args: unknown) => run(args)
        const listeners = new Set<() => Effect.Effect<void>>()
        const build: Build = {
          closed: false,
          onClose: (listener) => {
            listeners.add(listener)
            return () => {
              listeners.delete(listener)
            }
          }
        }
        builds.set(wrapped, build)
        // Its runs stop before the implementation's own finalizers run, and the close waits for them.
        yield* Scope.addFinalizer(
          scope,
          Effect.suspend(() => {
            build.closed = true
            const waits = Array.from(listeners, (listener) => listener())
            listeners.clear()
            return Effect.all(waits, { concurrency: "unbounded", discard: true })
          })
        )
        return wrapped
      })
    )
    static make(args: any = {}) {
      const source = groupOf(args)
      return makeIssued({
        _tag: stream ? "Stream" : "Effect",
        name: key,
        args,
        mode,
        groupKey: source?.key,
        "~group": source,
        argsSchema,
        service: Base,
        invalidates: invalidates?.(args) ?? noTargets,
        optimistic: optimistic?.(args) ?? noTargets,
        writes: writes === undefined ? undefined : (success) => writes(success, args),
        afterRefetch: undefined,
        work: stream
          ? Stream.unwrap(Effect.map(service, (run) => run(args)))
          : Effect.flatMap(service, (run) => run(args)),
        resolve: identity,
        reject: undefined
      }, true)
    }
  }
  return CommandService
}

/**
 * Maps the message a Command produces.
 *
 * **When to use**
 *
 * Use to reuse a Command whose result isn't the component's own message, such
 * as a shared `UploadFile` Command that returns a URL. A Command whose body
 * can fail takes `match` instead.
 *
 * **Details**
 *
 * The name, args and options are kept, so the log and story tests still see
 * the original Command, and a story's `resolve` step still takes the
 * definition's own success (the `Source` type parameter). The data-first form
 * returns an `Interrupt` unchanged; the pipeable form only takes issued
 * Commands.
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
 * const UploadFile = Command.make("UploadFile", { args: { name: Schema.String } }, ({ name }) =>
 *   Effect.succeed(`https://cdn/${name}`))
 *
 * const upload = UploadFile({ name: "photo.png" }).pipe(
 *   Command.map((url) => Message.make({ _tag: "Uploaded", url }))
 * )
 * ```
 *
 * @stability experimental
 * @category mapping
 * @since 4.1.5
 */
export const map: {
  <A, B>(
    f: (a: A) => B
  ): <R, Source, K extends Kind, SourceE>(
    self: Issued<A, R, Source, K, SourceE>
  ) => Mapped<Issued<A, R, Source, K, SourceE>, B>
  <C extends Command<any, any>, B>(self: C, f: (a: Message<C>) => B): Mapped<C, B>
} = dual(2, <A, R, B>(self: Command<A, R>, f: (a: A) => B): Command<B, R> => {
  if (self._tag === "Interrupt") return self
  const { reject, resolve } = self as unknown as Fields
  return makeIssued({
    ...(self as unknown as Fields),
    resolve: (result) => f(resolve(result)),
    reject: reject === undefined ? undefined : (error) => f(reject(error))
  })
})

/**
 * Replaces each message a Command produces with the supplied value.
 *
 * **When to use**
 *
 * Use when the component needs a fixed message rather than the Command's
 * result: `command.pipe(Command.as(message))` is shorthand for
 * `command.pipe(Command.map(() => message))`.
 *
 * **Details**
 *
 * Keeps the original name, args, options, source type and requirements, just
 * like `map`. Stream Commands emit the same supplied value for each element.
 * Apply `match` first to a Command whose body can fail. After `match`, both
 * mapped channels are replaced. The data-first form leaves an `Interrupt`
 * unchanged; the pipeable form only accepts issued Commands.
 *
 * **Gotchas**
 *
 * For a union with different source types or requirements, use the data-first
 * form, `Command.as(input, message)`, to preserve each branch's types.
 *
 * @see map
 * @stability experimental
 * @category mapping
 * @since 4.1.5
 */
export const as: {
  <B>(message: B): <A, R, Source, K extends Kind, SourceE>(
    self: Issued<A, R, Source, K, SourceE>
  ) => Mapped<Issued<A, R, Source, K, SourceE>, B>
  <C extends Command<any, any>, B>(self: C, message: B): Mapped<C, B>
} = dual(2, <A, R, B>(self: Command<A, R>, message: B): Command<B, R> => map(self, () => message))

/**
 * Maps both channels of a Command whose body can fail to messages.
 *
 * **When to use**
 *
 * Use when issuing a `Command.Service` whose body has a typed error:
 * `$.run` doesn't take the `Unmatched` Command its `make` returns.
 *
 * **Details**
 *
 * `onSuccess` maps the body's success, or each element of a Stream Command,
 * and `onFailure` the typed failure, which ends a Stream Command. A defect or
 * an interrupt isn't mapped. A Command whose body can't fail takes `map`, and
 * `match` on it doesn't compile.
 *
 * **Example** (Mapping a save that can fail)
 *
 * ```ts import.meta.vitest
 * import { Command } from "effect/ui"
 * import { Data, Effect, Schema } from "effect"
 *
 * class SaveFailed extends Data.TaggedError("SaveFailed")<{ readonly reason: string }> {}
 *
 * const Message = Schema.TaggedUnion({ Saved: {}, Failed: { reason: Schema.String } })
 *
 * class Save extends Command.Service<Save>()("Save", {
 *   args: { title: Schema.String },
 * }, Effect.succeed(({ title }: { readonly title: string }) =>
 *   title === "" ? Effect.fail(new SaveFailed({ reason: "empty" })) : Effect.void
 * )) {}
 *
 * const save = Save.make({ title: "milk" }).pipe(Command.match({
 *   onSuccess: () => Message.make({ _tag: "Saved" }),
 *   onFailure: (error) => Message.make({ _tag: "Failed", reason: error.reason })
 * }))
 * ```
 *
 * @stability experimental
 * @category mapping
 * @since 4.1.5
 */
export const match: {
  <A, E, B, C>(options: {
    readonly onSuccess: (a: A) => B
    readonly onFailure: (e: E) => C
  }): <R, K extends Kind>(self: Unmatched<A, E, R, K>) => Issued<B | C, R, A, K, E>
  <A, E, R, K extends Kind, B, C>(self: Unmatched<A, E, R, K>, options: {
    readonly onSuccess: (a: A) => B
    readonly onFailure: (e: E) => C
  }): Issued<B | C, R, A, K, E>
} = dual(2, (self: Unmatched<any, any, any, Kind>, options: {
  readonly onSuccess: (a: any) => any
  readonly onFailure: (e: any) => any
}): any =>
  makeIssued({
    ...(self as unknown as Fields),
    resolve: options.onSuccess,
    reject: options.onFailure
  }))

/**
 * Passes when `C` is an issued or unmatched Effect-kind `Service` Command,
 * and otherwise says why `Command.afterRefetch` doesn't take it.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type AwaitsRefetch<C> = C extends Unmatched<infer _A, infer _E, infer R, infer K> ? AwaitsRefetchOf<R, K>
  : C extends Issued<infer _Msg, infer R, infer _S, infer K, infer _SE> ? AwaitsRefetchOf<R, K>
  : never

// `SourceE` is contravariant: `never` admits every issued Command.
type Awaitable = Issued<any, any, any, Kind, never> | Unmatched<any, any, any, Kind>

type AwaitsRefetchOf<R, K> = [K] extends ["Effect"] ? [R] extends [never] ? {
      readonly "Command.afterRefetch takes a Command.Service Command. A Command.make Command invalidates nothing": never
    }
  : unknown
  : { readonly "Command.afterRefetch takes an Effect Command. A Stream Command has no final message to hold": never }

/**
 * Holds a Command's success message until the entries its run invalidated
 * have refetched, or until `budget` runs out.
 *
 * **When to use**
 *
 * Use when `update` needs the refetched data with the success: a "save, then
 * show the saved row" flow whose refetch would otherwise land a render after
 * the message.
 *
 * **Details**
 *
 * It applies to an issued or unmatched Effect-kind `Service` Command, on
 * either side of `match` and `map`. A Stream Command or a `make` Command
 * doesn't compile. A second application replaces the first.
 *
 * - The wait covers everything the run invalidated: declared targets plus
 *   those implied by patches, minus the entries its own `writes` stored
 *   fresh. Of those, it waits for the entries that have a watcher, from any
 *   instance, when the success applies its invalidation. A watcher that
 *   comes later doesn't join.
 * - An entry's wait ends when it has no refetch in flight and none owed,
 *   whether the refetch succeeds, fails or dies. The wait ends on the
 *   slowest entry, and the budget is the upper bound.
 * - `budget` is a `Duration.Input`: `"Infinity"` waits with no bound, zero
 *   doesn't wait, and a bare number is milliseconds. The clock is the
 *   Effect `Clock`, started when invalidation is applied. A run cut by the
 *   budget, by `switch` or by `Command.interrupt` delivers its success at
 *   once, and its refetches run on.
 * - A typed failure is delivered at once. An interrupt before the body
 *   succeeds sends nothing. If the issuing instance closes during the wait,
 *   the message is dropped.
 * - `h.isRunning` stays true through the wait. Under `queue` the next run
 *   starts when the body exits, and messages keep issue order; under
 *   `drop` a waiting run still counts as running.
 * - Each awaited entry emits when it settles, so its loader's slot is
 *   written before the success, in one render, for the last entry to
 *   settle. Two entries settling apart can briefly show a patched row next
 *   to the refetched one.
 *
 * **Example** (Waiting for a rename's refetch)
 *
 * ```ts import.meta.vitest
 * import { Command } from "effect/ui"
 * import { Effect, Schema } from "effect"
 *
 * const Message = Schema.TaggedUnion({ Renamed: {} })
 *
 * class RenameUser extends Command.Service<RenameUser>()("RenameUser", {
 *   args: { id: Schema.String, name: Schema.String },
 * }, Effect.succeed(() => Effect.void)) {}
 *
 * const rename = RenameUser.make({ id: "1", name: "Ada" }).pipe(
 *   Command.map(() => Message.make({ _tag: "Renamed" })),
 *   Command.afterRefetch("5 seconds")
 * )
 * ```
 *
 * @stability experimental
 * @category mapping
 * @since 4.1.5
 */
export const afterRefetch: {
  (budget: Duration.Input): <C extends Awaitable>(self: C & AwaitsRefetch<C>) => C
  <C extends Awaitable>(self: C & AwaitsRefetch<C>, budget: Duration.Input): C
} = dual(2, (self: Awaitable, budget: Duration.Input): any =>
  makeIssued(
    { ...(self as unknown as Fields), afterRefetch: Duration.fromInputUnsafe(budget) },
    UnmatchedTypeId in self
  ))

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
 * as `CommandInterrupted`. With a pick of the Command's `group` fields, only
 * the runs of that group are interrupted. Without one, every run of the
 * Command the instance has is.
 *
 * **Example** (Cancelling an upload)
 *
 * ```ts import.meta.vitest
 * import { Command } from "effect/ui"
 * import { Effect, Schema } from "effect"
 *
 * const UploadFile = Command.make("UploadFile", {
 *   args: { name: Schema.String },
 *   group: ["name"]
 * }, ({ name }) => Effect.succeed(`https://cdn/${name}`))
 *
 * // In `update`: `$.run(Command.interrupt(UploadFile, { name: "photo.png" }))`
 * const cancel = Command.interrupt(UploadFile, { name: "photo.png" })
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const interrupt = <Args, G extends string>(
  definition: Definition<Args, any, boolean, any, G>,
  ...group: GroupArg<Args, G>
): Interrupt => {
  const source = group[0] === undefined ? undefined : definition["~group"](group[0])
  return Object.assign(Object.create(Proto), {
    _tag: "Interrupt",
    name: nameOf(definition),
    groupKey: source?.key,
    "~group": source
  })
}

/**
 * A server-side `update` issued a Command. No Command runs on the server, so
 * it was dropped, and the log has a `CommandDropped` entry with reason
 * `"server"` for the same `path`. It is reported every time.
 *
 * **Details**
 *
 * Data the server renders comes from a loader: a read fetched by the
 * server's per-request cache. `init`'s Commands are dropped silently, since
 * the client runs them when it adopts the Model.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.5
 */
export class ServerCommandIssued extends TaggedClass("ServerCommandIssued")<{
  readonly message: string
  /** The path of the instance whose `update` issued it. */
  readonly path: string
  /** The Command's name. */
  readonly command: string
}> {}

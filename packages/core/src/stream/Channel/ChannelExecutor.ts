import { List, MutableList } from "../../collection/immutable/List"
import { Tuple } from "../../collection/immutable/Tuple"
import type { Lazy, LazyArg } from "../../data/Function"
import { identity } from "../../data/Function"
import type { Option } from "../../data/Option"
import { Stack } from "../../data/Stack"
import type { Cause } from "../../io/Cause"
import type { RIO } from "../../io/Effect"
import { Effect } from "../../io/Effect"
import { Exit } from "../../io/Exit"
import { ImmutableQueue } from "../../support/ImmutableQueue"
import type { ChannelStateRead } from "./ChannelState"
import {
  ChannelState,
  ChannelStateDoneTypeId,
  ChannelStateEffectTypeId,
  ChannelStateEmitTypeId,
  ChannelStateReadTypeId,
  concreteChannelState
} from "./ChannelState"
import type { ChildExecutorDecision } from "./ChildExecutorDecision"
import type { BracketOut, Channel, Continuation, Ensuring } from "./definition"
import {
  BracketOutTypeId,
  BridgeTypeId,
  ConcatAllTypeId,
  concrete,
  concreteContinuation,
  ContinuationFinalizer,
  ContinuationKTypeId,
  Emit,
  EmitTypeId,
  EnsuringTypeId,
  Fail,
  FailTypeId,
  FoldTypeId,
  FromEffectTypeId,
  PipeToTypeId,
  ProvideTypeId,
  ReadTypeId,
  SucceedNow,
  SucceedNowTypeId,
  SucceedTypeId,
  SuspendTypeId
} from "./definition"
import type {
  DrainChildExecutors,
  PullFromChild,
  PullFromUpstream
} from "./Subexecutor"
import {
  concreteSubexecutor,
  DrainChildExecutorsTypeId,
  PullFromChildTypeId,
  PullFromUpstreamTypeId,
  Subexecutor,
  SubexecutorEmitTypeId
} from "./Subexecutor"
import { UpstreamPullRequest } from "./UpstreamPullRequest"
import type { UpstreamPullStrategy } from "./UpstreamPullStrategy"

export type ErasedExecutor<Env> = ChannelExecutor<
  Env,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>

export type ErasedChannel<R> = Channel<
  R,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>

export type ErasedContinuation<R> = Continuation<
  R,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>

export type ErasedFinalizer<Env> = (_: Exit<unknown, unknown>) => RIO<Env, unknown>

export class ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  private currentChannel: ErasedChannel<Env> | undefined

  private done: Exit<unknown, unknown> | undefined = undefined

  private doneStack: List<ErasedContinuation<Env>> = List.empty()

  private emitted: unknown | undefined = undefined

  private inProgressFinalizer: RIO<Env, unknown> | undefined = undefined

  private input: ErasedExecutor<Env> | undefined = undefined

  private activeSubexecutor: Subexecutor<Env> | undefined = undefined

  private cancelled: Exit<OutErr, OutDone> | undefined = undefined

  private closeLastSubstream: RIO<Env, unknown> | undefined = undefined

  constructor(
    initialChannel: Lazy<Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>,
    private providedEnv: unknown,
    private executeCloseLastSubstream: (_: RIO<Env, unknown>) => RIO<Env, unknown>
  ) {
    this.currentChannel = initialChannel() as ErasedChannel<Env>
  }

  private restorePipe(
    exit: Exit<unknown, unknown>,
    prev: ErasedExecutor<Env> | undefined,
    __tsplusTrace?: string
  ): Effect<Env, never, unknown> | undefined {
    const currInput = this.input
    this.input = prev
    return currInput != null ? currInput.close(exit) : Effect.unit
  }

  private unwindAllFinalizers(
    acc: Effect<Env, never, Exit<never, unknown>>,
    conts: List<ErasedContinuation<Env>>,
    exit: Exit<unknown, unknown>
  ): Effect<Env, never, Exit<never, unknown>> {
    while (conts.length > 0) {
      const head = conts.unsafeFirst()!
      concreteContinuation(head)
      if (head._typeId === ContinuationKTypeId) {
        conts = conts.tail()
      } else {
        acc = acc > head.finalizer(exit).exit()
        conts = conts.tail()
      }
    }
    return acc
  }

  private popAllFinalizers(
    exit: Exit<unknown, unknown>,
    __tsplusTrace?: string
  ): RIO<Env, unknown> {
    const effect = this.unwindAllFinalizers(
      Effect.succeed(Exit.unit),
      this.doneStack,
      exit
      // TODO
      // )
    ).flatMap((exit) => Effect.done(exit))
    this.doneStack = List.empty()
    this.storeInProgressFinalizer(effect)
    return effect
  }

  private popNextFinalizersGo(
    stack: List<ErasedContinuation<Env>>,
    builder: MutableList<ContinuationFinalizer<Env, unknown, unknown>>
  ): List<ErasedContinuation<Env>> {
    while (stack.length > 0) {
      const head = stack.unsafeFirst()!
      concreteContinuation(head)
      if (head._typeId === ContinuationKTypeId) {
        return stack
      }
      builder.push(head)
      stack = stack.tail()
    }
    return List.empty()
  }

  private popNextFinalizers(): List<ContinuationFinalizer<Env, unknown, unknown>> {
    const builder =
      MutableList.emptyPushable<ContinuationFinalizer<Env, unknown, unknown>>()
    this.doneStack = this.popNextFinalizersGo(this.doneStack, builder)
    return builder
  }

  private storeInProgressFinalizer(finalizer: RIO<Env, unknown>): void {
    this.inProgressFinalizer = finalizer
  }

  private clearInProgressFinalizer(): void {
    this.inProgressFinalizer = undefined
  }

  private ifNotNull<R>(effect: RIO<R, unknown> | undefined): RIO<R, unknown> {
    return effect != null ? effect : Effect.unit
  }

  close(
    exit: Exit<unknown, unknown>,
    __tsplusTrace?: string
  ): RIO<Env, unknown> | undefined {
    let runInProgressFinalizers: RIO<Env, unknown> | undefined = undefined
    if (this.inProgressFinalizer != null) {
      const finalizer = this.inProgressFinalizer
      runInProgressFinalizers = finalizer.ensuring(
        Effect.succeed(this.clearInProgressFinalizer())
      )
    }

    const closeSubexecutors =
      this.activeSubexecutor != null ? this.activeSubexecutor.close(exit) : undefined

    let closeSelf: RIO<Env, unknown> | undefined = undefined
    const selfFinalizers = this.popAllFinalizers(exit)
    if (selfFinalizers != null) {
      closeSelf = selfFinalizers.ensuring(
        Effect.succeed(this.clearInProgressFinalizer())
      )
    }

    if (
      closeSubexecutors == null &&
      runInProgressFinalizers == null &&
      closeSelf == null
    ) {
      return undefined
    }

    return Effect.tuple(
      this.ifNotNull(closeSubexecutors).exit(),
      this.ifNotNull(runInProgressFinalizers).exit(),
      this.ifNotNull(closeSelf).exit()
    )
      .map(({ tuple: [a, b, c] }) => a > b > c)
      .uninterruptible()
      .flatMap((exit) => Effect.done(exit))
  }

  getDone(): Exit<OutErr, OutDone> {
    return this.done as Exit<OutErr, OutDone>
  }

  getEmit(): OutElem {
    return this.emitted as OutElem
  }

  cancelWith(exit: Exit<OutErr, OutDone>): void {
    this.cancelled = exit
  }

  run(): ChannelState<Env, unknown> {
    let result: ChannelState<Env, unknown> | undefined = undefined

    while (result == null) {
      if (this.cancelled != null) {
        result = this.processCancellation()
      } else if (this.activeSubexecutor != null) {
        result = this.runSubexecutor()
      } else {
        if (this.currentChannel == null) {
          result = ChannelState.Done
        } else {
          concrete(this.currentChannel)

          const currentChannel = this.currentChannel

          switch (currentChannel._typeId) {
            case BridgeTypeId: {
              // PipeTo(left, Bridge(queue, channel))
              // In a fiber: repeatedly run left and push its outputs to the queue
              // Add a finalizer to interrupt the fiber and close the executor
              this.currentChannel = currentChannel.channel

              if (this.input != null) {
                const inputExecutor = this.input
                this.input = undefined

                const drainer: RIO<Env, unknown> =
                  currentChannel.input.awaitRead >
                  Effect.suspendSucceed(() => {
                    const state = inputExecutor.run()
                    concreteChannelState(state)
                    switch (state._typeId) {
                      case ChannelStateDoneTypeId: {
                        return inputExecutor.getDone().fold(
                          (cause) => currentChannel.input.error(cause),
                          (value) => currentChannel.input.done(value)
                        )
                      }
                      case ChannelStateEmitTypeId: {
                        return currentChannel.input
                          .emit(inputExecutor.getEmit())
                          .zipRight(() => drainer)
                      }
                      case ChannelStateEffectTypeId: {
                        return state.effect.foldCauseEffect(
                          (cause) => currentChannel.input.error(cause),
                          () => drainer
                        )
                      }
                      case ChannelStateReadTypeId: {
                        return readUpstream(state, () => drainer).catchAllCause(
                          (cause) => currentChannel.input.error(cause)
                        )
                      }
                    }
                  })

                result = ChannelState.Effect(
                  drainer.fork().flatMap((fiber) =>
                    Effect.succeed(() =>
                      this.addFinalizer(
                        (exit) =>
                          fiber.interrupt() >
                          Effect.suspendSucceed(() => {
                            const effect = this.restorePipe(exit, inputExecutor)
                            return effect != null ? effect : Effect.unit
                          })
                      )
                    )
                  )
                )
              }

              break
            }

            case PipeToTypeId: {
              const previousInput = this.input

              const leftExec: ErasedExecutor<Env> = new ChannelExecutor(
                currentChannel.left,
                this.providedEnv,
                (effect) => this.executeCloseLastSubstream(effect)
              )
              leftExec.input = previousInput
              this.input = leftExec

              this.addFinalizer((exit) => {
                const effect = this.restorePipe(exit, previousInput)
                return effect != null ? effect : Effect.unit
              })

              this.currentChannel = currentChannel.right()

              break
            }

            case ReadTypeId: {
              result = ChannelState.Read(
                this.input!,
                identity,
                (out) => {
                  this.currentChannel = currentChannel.more(out)
                  return undefined
                },
                (exit) => {
                  this.currentChannel = currentChannel.done.onExit(exit)
                  return undefined
                }
              )

              break
            }

            case SucceedNowTypeId: {
              result = this.doneSucceed(currentChannel.terminal)
              break
            }

            case FailTypeId: {
              result = this.doneHalt(currentChannel.error())
              break
            }

            case SucceedTypeId: {
              result = this.doneSucceed(currentChannel.effect())
              break
            }

            case SuspendTypeId: {
              this.currentChannel = currentChannel.effect()
              break
            }

            case FromEffectTypeId: {
              const peffect =
                this.providedEnv != null
                  ? currentChannel.effect().provideEnvironment(this.providedEnv as Env)
                  : currentChannel.effect()

              result = ChannelState.Effect(
                peffect.foldCauseEffect(
                  (cause) => {
                    const state = this.doneHalt(cause)
                    if (state == null) {
                      return Effect.unit
                    }
                    return state.effectOrUnit()
                  },
                  (a) => {
                    const state = this.doneSucceed(a)
                    if (state == null) {
                      return Effect.unit
                    }
                    return state.effectOrUnit()
                  }
                )
              )

              break
            }

            case EmitTypeId: {
              this.emitted = currentChannel.out()
              this.currentChannel =
                this.activeSubexecutor != null ? undefined : new SucceedNow(undefined)
              result = ChannelState.Emit
              break
            }

            case EnsuringTypeId: {
              this.runEnsuring(currentChannel)
              break
            }

            case ConcatAllTypeId: {
              const executor: ErasedExecutor<Env> = new ChannelExecutor(
                currentChannel.value,
                this.providedEnv,
                (effect) =>
                  Effect.succeed(() => {
                    const prevLastClose =
                      this.closeLastSubstream == null
                        ? Effect.unit
                        : this.closeLastSubstream
                    this.closeLastSubstream = prevLastClose > effect
                  })
              )
              executor.input = this.input

              this.activeSubexecutor = Subexecutor.PullFromUpstream(
                executor,
                currentChannel.k,
                undefined,
                new ImmutableQueue(List.empty()),
                currentChannel.combineInners,
                currentChannel.combineAll,
                currentChannel.onPull,
                currentChannel.onEmit
              )

              this.closeLastSubstream = undefined
              this.currentChannel = undefined

              break
            }

            case FoldTypeId: {
              this.doneStack = this.doneStack.prepend(currentChannel.k)
              this.currentChannel = currentChannel.value
              break
            }

            case BracketOutTypeId: {
              result = this.runBracketOut(currentChannel)
              break
            }

            case ProvideTypeId: {
              const previousEnv = this.providedEnv
              this.providedEnv = currentChannel.env()
              this.currentChannel = currentChannel.channel

              this.addFinalizer(() =>
                Effect.succeed(() => {
                  this.providedEnv = previousEnv
                })
              )

              break
            }
          }
        }
      }
    }

    return result! as ChannelState<Env, OutErr>
  }

  private doneSucceed(z: unknown): ChannelState<Env, unknown> | undefined {
    if (this.doneStack.length === 0) {
      this.done = Exit.succeed(z)
      this.currentChannel = undefined
      return ChannelState.Done
    }

    const head = this.doneStack.unsafeFirst()!
    concreteContinuation(head)

    if (head._typeId === ContinuationKTypeId) {
      this.doneStack = this.doneStack.tail()
      this.currentChannel = head.onSuccess(z)
      return undefined
    }

    const finalizers = this.popNextFinalizers()

    if (this.doneStack.length === 0) {
      this.doneStack = finalizers
      this.done = Exit.succeed(z)
      this.currentChannel = undefined
      return ChannelState.Done
    }

    const finalizerEffect = this.runFinalizers(
      finalizers.map((_) => _.finalizer),
      Exit.succeed(z)
    )!

    this.storeInProgressFinalizer(finalizerEffect)

    return ChannelState.Effect(
      finalizerEffect
        .ensuring(Effect.succeed(this.clearInProgressFinalizer()))
        .uninterruptible()
        .zipRight(Effect.succeed(this.doneSucceed(z)))
    )
  }

  doneHalt(cause: Cause<unknown>): ChannelState<Env, unknown> | undefined {
    if (this.doneStack.length === 0) {
      this.done = Exit.failCause(cause)
      this.currentChannel = undefined
      return ChannelState.Done
    }

    const head = this.doneStack.unsafeFirst()!
    concreteContinuation(head)

    if (head._typeId === ContinuationKTypeId) {
      this.doneStack = this.doneStack.tail()
      this.currentChannel = head.onHalt(cause)
      return undefined
    }

    const finalizers = this.popNextFinalizers()

    if (this.doneStack.length === 0) {
      this.doneStack = finalizers
      this.done = Exit.failCause(cause)
      this.currentChannel = undefined
      return ChannelState.Done
    }

    const finalizerEffect = this.runFinalizers(
      finalizers.map((_) => _.finalizer),
      Exit.failCause(cause)
    )!

    this.storeInProgressFinalizer(finalizerEffect)

    return ChannelState.Effect(
      finalizerEffect
        .ensuring(Effect.succeed(this.clearInProgressFinalizer()))
        .uninterruptible()
        .zipRight(Effect.succeed(this.doneHalt(cause)))
    )
  }

  private processCancellation(): ChannelState<Env, unknown> {
    this.currentChannel = undefined
    this.done = this.cancelled
    this.cancelled = undefined
    return ChannelState.Done
  }

  private runBracketOut(
    bracketOut: BracketOut<Env, unknown, unknown, unknown>
  ): ChannelState<Env, unknown> {
    return ChannelState.Effect(
      Effect.uninterruptibleMask(({ restore }) =>
        restore(this.provide(bracketOut.acquire())).foldCauseEffect(
          (cause) =>
            Effect.succeed(() => {
              this.currentChannel = new Fail(() => cause)
            }),
          (out) =>
            Effect.succeed(() => {
              this.addFinalizer((exit) => bracketOut.finalizer(out, exit))
              this.currentChannel = new Emit(() => out)
            })
        )
      )
    )
  }

  private provide<Env, OutErr, OutDone>(
    effect: Effect<Env, OutErr, OutDone>,
    __tsplusTrace?: string
  ): Effect<Env, OutErr, OutDone> {
    return this.providedEnv == null
      ? effect
      : effect.provideEnvironment(this.providedEnv as Env)
  }

  private runEnsuring(
    ensuring: Ensuring<Env, unknown, unknown, unknown, unknown, unknown, unknown>
  ): void {
    this.addFinalizer(ensuring.finalizer)
    this.currentChannel = ensuring.channel
  }

  private addFinalizer(f: ErasedFinalizer<Env>): void {
    this.doneStack = this.doneStack.prepend(new ContinuationFinalizer(f))
  }

  private runFinalizers(
    finalizers: List<(exit: Exit<unknown, unknown>) => RIO<Env, unknown>>,
    exit: Exit<unknown, unknown>,
    __tsplusTrace?: string
  ): RIO<Env, unknown> | undefined {
    return finalizers.length === 0
      ? undefined
      : Effect.forEach(finalizers, (f) => f(exit).exit())
          .map((results) =>
            Exit.collectAll(results).getOrElse(Exit.succeed(List.empty()))
          )
          .flatMap((exit) => Effect.done(exit))
  }

  private runSubexecutor(): ChannelState<Env, unknown> | undefined {
    const subexecutor = this.activeSubexecutor!
    concreteSubexecutor(subexecutor)
    switch (subexecutor._typeId) {
      case PullFromUpstreamTypeId: {
        return this.pullFromUpstream(subexecutor)
      }
      case PullFromChildTypeId: {
        return this.pullFromChild(
          subexecutor.childExecutor,
          subexecutor.parentSubexecutor,
          subexecutor.onEmit,
          subexecutor
        )
      }
      case DrainChildExecutorsTypeId: {
        return this.drainChildExecutors(subexecutor)
      }
      case SubexecutorEmitTypeId: {
        this.emitted = subexecutor.value
        this.activeSubexecutor = subexecutor.next
        return ChannelState.Emit
      }
    }
  }

  private replaceSubexecutor(nextSubExecutor: Subexecutor<Env>): void {
    this.currentChannel = undefined
    this.activeSubexecutor = nextSubExecutor
  }

  private finishSubexecutorWithCloseEffect(
    subexecutorDone: Exit<unknown, unknown>,
    ...closeFns: Array<(exit: Exit<unknown, unknown>) => RIO<Env, unknown> | undefined>
  ): ChannelState<Env, unknown> | undefined {
    this.addFinalizer(() =>
      Effect.forEachDiscard(closeFns, (closeFn) =>
        Effect.succeed(closeFn(subexecutorDone)).flatMap((closeEffect) =>
          closeEffect != null ? closeEffect : Effect.unit
        )
      )
    )

    const state = subexecutorDone.fold(
      (cause) => this.doneHalt(cause),
      (a) => this.doneSucceed(a)
    )
    this.activeSubexecutor = undefined
    return state
  }

  finishWithExit(
    exit: Exit<unknown, unknown>,
    __tsplusTrace?: string
  ): Effect<Env, unknown, unknown> {
    const state = exit.fold(
      (cause) => this.doneHalt(cause),
      (a) => this.doneSucceed(a)
    )
    this.activeSubexecutor = undefined
    return state == null ? Effect.unit : state.effectOrUnit()
  }

  private applyUpstreamPullStrategy(
    upstreamFinished: boolean,
    queue: ImmutableQueue<PullFromChild<Env> | undefined>,
    strategy: UpstreamPullStrategy<unknown>
  ): Tuple<[Option<unknown>, ImmutableQueue<PullFromChild<Env> | undefined>]> {
    switch (strategy._tag) {
      case "PullAfterNext": {
        return Tuple(
          strategy.emitSeparator,
          !upstreamFinished || queue.exists((a) => a != null)
            ? queue.prepend(undefined)
            : queue
        )
      }
      case "PullAfterAllEnqueued": {
        return Tuple(
          strategy.emitSeparator,
          !upstreamFinished || queue.exists((a) => a != null)
            ? queue.push(undefined)
            : queue
        )
      }
    }
  }

  private performPullFromUpstream(
    self: PullFromUpstream<Env>
  ): ChannelState<Env, unknown> {
    return ChannelState.Read(
      self.upstreamExecutor,
      (effect) => {
        const closeLast =
          this.closeLastSubstream == null ? Effect.unit : this.closeLastSubstream
        this.closeLastSubstream = undefined
        return this.executeCloseLastSubstream(closeLast) > effect
      },
      (emitted) => {
        if (this.closeLastSubstream != null) {
          const closeLast = this.closeLastSubstream
          this.closeLastSubstream = undefined

          return this.executeCloseLastSubstream(closeLast).map(() => {
            const childExecutor = new ChannelExecutor(
              () => self.createChild(emitted),
              this.providedEnv,
              (effect) => this.executeCloseLastSubstream(effect)
            )
            childExecutor.input = this.input

            const {
              tuple: [emitSeparator, updatedChildExecutors]
            } = this.applyUpstreamPullStrategy(
              false,
              self.activeChildExecutors,
              self.onPull(UpstreamPullRequest.Pulled(emitted))
            )

            this.activeSubexecutor = Subexecutor.PullFromChild(
              childExecutor,
              Subexecutor.PullFromUpstream(
                self.upstreamExecutor,
                self.createChild,
                self.lastDone,
                updatedChildExecutors,
                self.combineChildResults,
                self.combineWithChildResult,
                self.onPull,
                self.onEmit
              ),
              self.onEmit
            )

            if (emitSeparator.isSome()) {
              this.activeSubexecutor = Subexecutor.Emit(
                emitSeparator.value,
                this.activeSubexecutor
              )
            }

            return undefined
          })
        } else {
          const childExecutor = new ChannelExecutor(
            () => self.createChild(emitted),
            this.providedEnv,
            (effect) => this.executeCloseLastSubstream(effect)
          )
          childExecutor.input = this.input

          const {
            tuple: [emitSeparator, updatedChildExecutors]
          } = this.applyUpstreamPullStrategy(
            false,
            self.activeChildExecutors,
            self.onPull(UpstreamPullRequest.Pulled(emitted))
          )

          this.activeSubexecutor = Subexecutor.PullFromChild(
            childExecutor,
            Subexecutor.PullFromUpstream(
              self.upstreamExecutor,
              self.createChild,
              self.lastDone,
              updatedChildExecutors,
              self.combineChildResults,
              self.combineWithChildResult,
              self.onPull,
              self.onEmit
            ),
            self.onEmit
          )

          if (emitSeparator.isSome()) {
            this.activeSubexecutor = Subexecutor.Emit(
              emitSeparator.value,
              this.activeSubexecutor
            )
          }

          return undefined
        }
      },
      (exit) => {
        if (self.activeChildExecutors.exists((a) => a != null)) {
          const drain = Subexecutor.DrainChildExecutors(
            self.upstreamExecutor,
            self.lastDone,
            self.activeChildExecutors.prepend(undefined),
            self.upstreamExecutor.getDone(),
            self.combineChildResults,
            self.combineWithChildResult,
            self.onPull
          )

          if (this.closeLastSubstream != null) {
            const closeLast = this.closeLastSubstream
            this.closeLastSubstream = undefined
            this.executeCloseLastSubstream(closeLast).map(() =>
              this.replaceSubexecutor(drain)
            )
            return undefined
          }

          this.replaceSubexecutor(drain)

          return undefined
        } else {
          const lastClose = this.closeLastSubstream
          const state = this.finishSubexecutorWithCloseEffect(
            exit.map((a) => self.combineWithChildResult(self.lastDone, a)),
            () => lastClose,
            (exit) => self.upstreamExecutor.close(exit)
          )
          return state != null ? state.effectOrUndefinedIgnored() : undefined
        }
      }
    )
  }

  private pullFromUpstream(
    self: PullFromUpstream<Env>
  ): ChannelState<Env, unknown> | undefined {
    return self.activeChildExecutors
      .dequeue()
      .fold(this.performPullFromUpstream(self), ({ tuple: [activeChild, rest] }) => {
        const parentSubexecutor = Subexecutor.PullFromUpstream(
          self.upstreamExecutor,
          self.createChild,
          self.lastDone,
          rest,
          self.combineChildResults,
          self.combineWithChildResult,
          self.onPull,
          self.onEmit
        ) as PullFromUpstream<Env>

        if (activeChild == null) {
          return this.performPullFromUpstream(parentSubexecutor)
        }

        this.replaceSubexecutor(
          Subexecutor.PullFromChild(
            activeChild.childExecutor,
            parentSubexecutor,
            activeChild.onEmit
          )
        )

        return undefined
      })
  }

  private drainChildExecutors(
    self: DrainChildExecutors<Env>
  ): ChannelState<Env, unknown> | undefined {
    return self.activeChildExecutors.dequeue().fold(
      () => {
        const lastClose = this.closeLastSubstream
        if (lastClose != null) {
          this.addFinalizer(() => Effect.succeed(lastClose))
        }
        return this.finishSubexecutorWithCloseEffect(
          self.upstreamDone,
          () => lastClose,
          self.upstreamExecutor.close
        )
      },
      ({ tuple: [activeChild, rest] }) => {
        if (activeChild != null) {
          const parentSubexecutor = Subexecutor.DrainChildExecutors(
            self.upstreamExecutor,
            self.lastDone,
            rest,
            self.upstreamDone,
            self.combineChildResults,
            self.combineWithChildResult,
            self.onPull
          )

          this.replaceSubexecutor(
            Subexecutor.PullFromChild(
              activeChild.childExecutor,
              parentSubexecutor,
              activeChild.onEmit
            )
          )
          return undefined
        }

        const {
          tuple: [emitSeparator, remainingExecutors]
        } = this.applyUpstreamPullStrategy(
          true,
          rest,
          self.onPull(UpstreamPullRequest.NoUpstream(rest.count((a) => a != null)))
        )

        this.replaceSubexecutor(
          Subexecutor.DrainChildExecutors(
            self.upstreamExecutor,
            self.lastDone,
            remainingExecutors,
            self.upstreamDone,
            self.combineChildResults,
            self.combineWithChildResult,
            self.onPull
          )
        )

        return emitSeparator.fold(undefined, (value) => {
          this.emitted = value
          return ChannelState.Emit
        })
      }
    )
  }

  private handleSubexecFailure(
    childExecutor: ErasedExecutor<Env>,
    parentSubexecutor: Subexecutor<Env>,
    cause: Cause<unknown>
  ): ChannelState<Env, unknown> | undefined {
    return this.finishSubexecutorWithCloseEffect(
      Exit.failCause(cause),
      parentSubexecutor.close,
      childExecutor.close
    )
  }

  private finishWithDoneValue(
    childExecutor: ErasedExecutor<Env>,
    parentSubexecutor: Subexecutor<Env>,
    doneValue: unknown
  ): void {
    concreteSubexecutor(parentSubexecutor)
    switch (parentSubexecutor._typeId) {
      case PullFromUpstreamTypeId: {
        const modifiedParent = Subexecutor.PullFromUpstream(
          parentSubexecutor.upstreamExecutor,
          parentSubexecutor.createChild,
          parentSubexecutor.lastDone != null
            ? parentSubexecutor.combineChildResults(
                parentSubexecutor.lastDone,
                doneValue
              )
            : doneValue,
          parentSubexecutor.activeChildExecutors,
          parentSubexecutor.combineChildResults,
          parentSubexecutor.combineWithChildResult,
          parentSubexecutor.onPull,
          parentSubexecutor.onEmit
        )
        this.closeLastSubstream = childExecutor.close(Exit.succeed(doneValue))
        this.replaceSubexecutor(modifiedParent)
        break
      }
      case DrainChildExecutorsTypeId: {
        const modifiedParent = Subexecutor.DrainChildExecutors(
          parentSubexecutor.upstreamExecutor,
          parentSubexecutor.lastDone != null
            ? parentSubexecutor.combineChildResults(
                parentSubexecutor.lastDone,
                doneValue
              )
            : doneValue,
          parentSubexecutor.activeChildExecutors,
          parentSubexecutor.upstreamDone,
          parentSubexecutor.combineChildResults,
          parentSubexecutor.combineWithChildResult,
          parentSubexecutor.onPull
        )
        this.closeLastSubstream = childExecutor.close(Exit.succeed(doneValue))
        this.replaceSubexecutor(modifiedParent)
        break
      }
      default: {
        break
      }
    }
  }

  private pullFromChild(
    childExecutor: ErasedExecutor<Env>,
    parentSubexecutor: Subexecutor<Env>,
    onEmitted: (_: unknown) => ChildExecutorDecision,
    self: PullFromChild<Env>
  ): ChannelState<Env, unknown> {
    return ChannelState.Read(
      childExecutor,
      identity,
      (emitted) => {
        const decision = onEmitted(emitted)
        switch (decision._tag) {
          case "Yield": {
            const modifiedParent = parentSubexecutor.enqueuePullFromChild(self)
            this.replaceSubexecutor(modifiedParent)
            break
          }
          case "Close": {
            this.finishWithDoneValue(childExecutor, parentSubexecutor, decision.value)
            break
          }
          case "Continue": {
            break
          }
        }
        this.activeSubexecutor = Subexecutor.Emit(emitted, this.activeSubexecutor!)
        return undefined
      },
      (exit) => {
        switch (exit._tag) {
          case "Failure": {
            const result = this.handleSubexecFailure(
              childExecutor,
              parentSubexecutor,
              exit.cause
            )
            return result != null ? result.effectOrUndefinedIgnored() : undefined
          }
          case "Success": {
            this.finishWithDoneValue(childExecutor, parentSubexecutor, exit.value)
            return undefined
          }
        }
      }
    )
  }
}

export function readUpstream<R, E, A>(
  r: ChannelStateRead<R, E>,
  cont: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  const readStack = new Stack(r as ChannelStateRead<unknown, unknown>)
  return read(readStack, cont)
}

function read<R, E, A>(
  readStack: Stack<ChannelStateRead<unknown, unknown>>,
  cont: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  const current = readStack.value
  let newReadStack = readStack.previous
  const state = current.upstream.run()
  concreteChannelState(state)
  switch (state._typeId) {
    case ChannelStateEmitTypeId: {
      const emitEffect = current.onEmit(current.upstream.getEmit())
      if (newReadStack == null) {
        if (emitEffect == null) {
          return Effect.suspendSucceed(cont())
        }
        return emitEffect > cont()
      }
      if (emitEffect == null) {
        return Effect.suspendSucceed(read(newReadStack, cont))
      }
      return emitEffect > read(newReadStack, cont)
    }

    case ChannelStateDoneTypeId: {
      const doneEffect = current.onDone(current.upstream.getDone())
      if (newReadStack == null) {
        if (doneEffect == null) {
          return Effect.suspendSucceed(cont())
        }
        return doneEffect > cont()
      }
      if (doneEffect == null) {
        return Effect.suspendSucceed(read(newReadStack, cont))
      }
      return doneEffect > read(newReadStack, cont)
    }

    case ChannelStateEffectTypeId: {
      newReadStack = new Stack(current, newReadStack)
      return (
        current
          .onEffect(state.effect as Effect<unknown, never, void>)
          .catchAllCause((cause) =>
            Effect.suspendSucceed(() => {
              const doneEffect = current.onDone(Exit.failCause(cause))
              return doneEffect == null ? Effect.unit : doneEffect
            })
          ) > read(newReadStack, cont)
      )
    }

    case ChannelStateReadTypeId: {
      newReadStack = new Stack(current, newReadStack)
      newReadStack = new Stack(state, newReadStack)
      return Effect.suspendSucceed(read(newReadStack, cont))
    }
  }
}

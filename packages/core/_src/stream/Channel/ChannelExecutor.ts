import type { ChannelStateRead } from "@effect/core/stream/Channel/ChannelState"
import { ChannelState, concreteChannelState } from "@effect/core/stream/Channel/ChannelState"
import type { ChildExecutorDecision } from "@effect/core/stream/Channel/ChildExecutorDecision"
import type {
  BracketOut,
  Continuation,
  Ensuring
} from "@effect/core/stream/Channel/definition/primitives"
import {
  concrete,
  concreteContinuation,
  ContinuationFinalizer,
  Emit,
  Fail,
  SucceedNow
} from "@effect/core/stream/Channel/definition/primitives"
import type {
  DrainChildExecutors,
  PullFromChild,
  PullFromUpstream
} from "@effect/core/stream/Channel/Subexecutor"
import { concreteSubexecutor, Subexecutor } from "@effect/core/stream/Channel/Subexecutor"
import { UpstreamPullRequest } from "@effect/core/stream/Channel/UpstreamPullRequest"
import type { UpstreamPullStrategy } from "@effect/core/stream/Channel/UpstreamPullStrategy"

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

export type ErasedFinalizer<R> = (_: Exit<unknown, unknown>) => Effect.RIO<R, unknown>

export class ChannelExecutor<R, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  private currentChannel: ErasedChannel<R> | undefined

  private done: Exit<unknown, unknown> | undefined = undefined

  private doneStack: List<ErasedContinuation<R>> = List.empty()

  private emitted: unknown | undefined = undefined

  private inProgressFinalizer: Effect<R, never, unknown> | undefined = undefined

  private input: ErasedExecutor<R> | undefined = undefined

  private activeSubexecutor: Subexecutor<R> | undefined = undefined

  private cancelled: Exit<OutErr, OutDone> | undefined = undefined

  private closeLastSubstream: Effect<R, never, unknown> | undefined = undefined

  constructor(
    initialChannel: Lazy<Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>>,
    private providedEnv: Env<unknown> | undefined,
    private executeCloseLastSubstream: (_: Effect<R, never, unknown>) => Effect.RIO<R, unknown>
  ) {
    this.currentChannel = initialChannel() as ErasedChannel<R>
  }

  private restorePipe(
    exit: Exit<unknown, unknown>,
    prev: ErasedExecutor<R> | undefined
  ): Effect<R, never, unknown> | undefined {
    const currInput = this.input
    this.input = prev
    return currInput != null ? currInput.close(exit) : Effect.unit
  }

  private unwindAllFinalizers(
    acc: Effect<R, never, Exit<never, unknown>>,
    conts: List<ErasedContinuation<R>>,
    exit: Exit<unknown, unknown>
  ): Effect<R, never, Exit<never, unknown>> {
    while (conts.length !== 0) {
      const head = conts.unsafeHead!
      concreteContinuation(head)
      if (head._tag === "ContinuationK") {
        conts = conts.unsafeTail ?? List.empty()
      } else {
        acc = acc.flatMap(() => head.finalizer(exit).exit)
        conts = conts.unsafeTail ?? List.empty()
      }
    }
    return acc
  }

  private popAllFinalizers(
    exit: Exit<unknown, unknown>
  ): Effect.RIO<R, unknown> {
    const effect = this.unwindAllFinalizers(
      Effect.sync(Exit.unit),
      this.doneStack,
      exit
    ).flatMap((exit) => Effect.done(exit))
    this.doneStack = List.empty()
    this.storeInProgressFinalizer(effect)
    return effect
  }

  private popNextFinalizersGo(
    stack: List<ErasedContinuation<R>>,
    builder: ListBuffer<ContinuationFinalizer<R, unknown, unknown>>
  ): List<ErasedContinuation<R>> {
    while (stack.length > 0) {
      const head = stack.unsafeHead!
      concreteContinuation(head)
      if (head._tag === "ContinuationK") {
        return stack
      }
      builder.append(head)
      stack = stack.unsafeTail ?? List.empty()
    }
    return List.empty()
  }

  private popNextFinalizers(): List<ContinuationFinalizer<R, unknown, unknown>> {
    const builder = ListBuffer.empty<ContinuationFinalizer<R, unknown, unknown>>()
    this.doneStack = this.popNextFinalizersGo(this.doneStack, builder)
    return List.from(builder)
  }

  private storeInProgressFinalizer(finalizer: Effect.RIO<R, unknown>): void {
    this.inProgressFinalizer = finalizer
  }

  private clearInProgressFinalizer(): void {
    this.inProgressFinalizer = undefined
  }

  private ifNotNull<R>(effect: Effect.RIO<R, unknown> | undefined): Effect.RIO<R, unknown> {
    return effect != null ? effect : Effect.unit
  }

  close(exit: Exit<unknown, unknown>): Effect.RIO<R, unknown> | undefined {
    let runInProgressFinalizers: Effect.RIO<R, unknown> | undefined = undefined
    const finalizer = this.inProgressFinalizer
    if (finalizer != null) {
      runInProgressFinalizers = finalizer.ensuring(
        Effect.sync(this.clearInProgressFinalizer())
      )
    }

    const closeSubexecutors = this.activeSubexecutor == null ?
      undefined :
      this.activeSubexecutor.close(exit)

    let closeSelf: Effect.RIO<R, unknown> | undefined = undefined
    const selfFinalizers = this.popAllFinalizers(exit)
    if (selfFinalizers != null) {
      closeSelf = selfFinalizers.ensuring(
        Effect.sync(this.clearInProgressFinalizer())
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
      this.ifNotNull(closeSubexecutors).exit,
      this.ifNotNull(runInProgressFinalizers).exit,
      this.ifNotNull(closeSelf).exit
    )
      .map(({ tuple: [a, b, c] }) => a.zipRight(b).zipRight(c))
      .uninterruptible
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

  run(): ChannelState<R, unknown> {
    let result: ChannelState<R, unknown> | undefined = undefined

    while (result == null) {
      if (this.cancelled != null) {
        result = this.processCancellation()
      } else if (this.activeSubexecutor != null) {
        result = this.runSubexecutor()
      } else {
        if (this.currentChannel == null) {
          result = ChannelState.Done
        } else {
          try {
            const currentChannel = this.currentChannel

            concrete(currentChannel)

            switch (currentChannel._tag) {
              case "Bridge": {
                // PipeTo(left, Bridge(queue, channel))
                // In a fiber: repeatedly run left and push its outputs to the queue
                // Add a finalizer to interrupt the fiber and close the executor
                this.currentChannel = currentChannel.channel

                if (this.input != null) {
                  const inputExecutor = this.input
                  this.input = undefined

                  const drainer: Effect<R, never, unknown> = currentChannel.input.awaitRead >
                    Effect.suspendSucceed(() => {
                      const state = inputExecutor.run()
                      concreteChannelState(state)
                      switch (state._tag) {
                        case "Done": {
                          return inputExecutor.getDone().fold(
                            (cause) => currentChannel.input.error(cause),
                            (value) => currentChannel.input.done(value)
                          )
                        }
                        case "Emit": {
                          return currentChannel.input
                            .emit(inputExecutor.getEmit())
                            .zipRight(drainer)
                        }
                        case "Effect": {
                          return state.effect.foldCauseEffect(
                            (cause) => currentChannel.input.error(cause),
                            () => drainer
                          )
                        }
                        case "Read": {
                          return readUpstream(state, drainer).catchAllCause((cause) =>
                            currentChannel.input.error(cause)
                          )
                        }
                      }
                    })

                  result = ChannelState.Effect(
                    drainer.fork.flatMap((fiber) =>
                      Effect.sync(() =>
                        this.addFinalizer(
                          (exit) =>
                            fiber.interrupt.zipRight(
                              Effect.suspendSucceed(() => {
                                const effect = this.restorePipe(exit, inputExecutor)
                                return effect != null ? effect : Effect.unit
                              })
                            )
                        )
                      )
                    )
                  )
                }

                break
              }

              case "PipeTo": {
                const previousInput = this.input

                const leftExec: ErasedExecutor<R> = new ChannelExecutor(
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

              case "Read": {
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

              case "SucceedNow": {
                result = this.doneSucceed(currentChannel.terminal)
                break
              }

              case "Fail": {
                result = this.doneHalt(currentChannel.error())
                break
              }

              case "Succeed": {
                result = this.doneSucceed(currentChannel.effect())
                break
              }

              case "Suspend": {
                this.currentChannel = currentChannel.effect()
                break
              }

              case "FromEffect": {
                const peffect = this.providedEnv != null
                  ? currentChannel.effect.provideEnvironment(this.providedEnv as Env<R>)
                  : currentChannel.effect

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

              case "Emit": {
                this.emitted = currentChannel.out
                this.currentChannel = this.activeSubexecutor != null ?
                  undefined :
                  new SucceedNow(undefined)
                result = ChannelState.Emit
                break
              }

              case "Ensuring": {
                this.runEnsuring(currentChannel)
                break
              }

              case "ConcatAll": {
                const executor: ErasedExecutor<R> = new ChannelExecutor(
                  currentChannel.value,
                  this.providedEnv,
                  (effect) =>
                    Effect.sync(() => {
                      const prevLastClose = this.closeLastSubstream == null
                        ? Effect.unit
                        : this.closeLastSubstream
                      this.closeLastSubstream = prevLastClose.zipRight(effect)
                    })
                )
                executor.input = this.input

                this.activeSubexecutor = Subexecutor.PullFromUpstream(
                  executor,
                  currentChannel.k,
                  undefined,
                  ImmutableQueue.empty(),
                  currentChannel.combineInners,
                  currentChannel.combineAll,
                  currentChannel.onPull,
                  currentChannel.onEmit
                )

                this.closeLastSubstream = undefined
                this.currentChannel = undefined

                break
              }

              case "Fold": {
                this.doneStack = this.doneStack.prepend(currentChannel.k)
                this.currentChannel = currentChannel.value
                break
              }

              case "BracketOut": {
                result = this.runBracketOut(currentChannel)
                break
              }

              case "Provide": {
                const previousEnv = this.providedEnv
                this.providedEnv = currentChannel.env
                this.currentChannel = currentChannel.channel

                this.addFinalizer(() =>
                  Effect.sync(() => {
                    this.providedEnv = previousEnv
                  })
                )

                break
              }
            }
          } catch (error) {
            this.currentChannel = Channel.failCauseSync(Cause.die(error))
          }
        }
      }
    }

    return result! as ChannelState<R, OutErr>
  }

  private doneSucceed(z: unknown): ChannelState<R, unknown> | undefined {
    if (this.doneStack.length === 0) {
      this.done = Exit.succeed(z)
      this.currentChannel = undefined
      return ChannelState.Done
    }

    const head = this.doneStack.unsafeHead!
    concreteContinuation(head)

    if (head._tag === "ContinuationK") {
      this.doneStack = this.doneStack.unsafeTail ?? List.empty()
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
        .ensuring(Effect.sync(this.clearInProgressFinalizer()))
        .uninterruptible
        .zipRight(Effect.sync(this.doneSucceed(z)))
    )
  }

  doneHalt(cause: Cause<unknown>): ChannelState<R, unknown> | undefined {
    if (this.doneStack.length === 0) {
      this.done = Exit.failCause(cause)
      this.currentChannel = undefined
      return ChannelState.Done
    }

    const head = this.doneStack.unsafeHead!
    concreteContinuation(head)

    if (head._tag === "ContinuationK") {
      this.doneStack = this.doneStack.unsafeTail ?? List.empty()
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
        .ensuring(Effect.sync(this.clearInProgressFinalizer()))
        .uninterruptible
        .zipRight(Effect.sync(this.doneHalt(cause)))
    )
  }

  private processCancellation(): ChannelState<R, unknown> {
    this.currentChannel = undefined
    this.done = this.cancelled
    this.cancelled = undefined
    return ChannelState.Done
  }

  private runBracketOut(
    bracketOut: BracketOut<R, unknown, unknown, unknown>
  ): ChannelState<R, unknown> {
    return ChannelState.Effect(
      Effect.uninterruptibleMask(({ restore }) =>
        restore(this.provide(bracketOut.acquire())).foldCauseEffect(
          (cause) =>
            Effect.sync(() => {
              this.currentChannel = new Fail(() => cause)
            }),
          (out) =>
            Effect.sync(() => {
              this.addFinalizer((exit) => bracketOut.finalizer(out, exit))
              this.currentChannel = new Emit(out)
            })
        )
      )
    )
  }

  private provide<R, OutErr, OutDone>(
    effect: Effect<R, OutErr, OutDone>
  ): Effect<R, OutErr, OutDone> {
    return this.providedEnv == null
      ? effect
      : effect.provideEnvironment(this.providedEnv as Env<R>)
  }

  private runEnsuring(
    ensuring: Ensuring<R, unknown, unknown, unknown, unknown, unknown, unknown>
  ): void {
    this.addFinalizer(ensuring.finalizer)
    this.currentChannel = ensuring.channel
  }

  private addFinalizer(f: ErasedFinalizer<R>): void {
    this.doneStack = this.doneStack.prepend(new ContinuationFinalizer(f))
  }

  private runFinalizers(
    finalizers: List<(exit: Exit<unknown, unknown>) => Effect.RIO<R, unknown>>,
    exit: Exit<unknown, unknown>
  ): Effect.RIO<R, unknown> | undefined {
    return finalizers.length === 0
      ? undefined
      : Effect.forEach(finalizers, (f) => f(exit).exit)
        .map((results) => {
          const result = Exit.collectAll(results)
          if (result._tag === "Some") {
            return result.value
          }
          return Exit.unit
        })
        .flatMap((exit) => Effect.done(exit as Exit<never, unknown>))
  }

  private runSubexecutor(): ChannelState<R, unknown> | undefined {
    const subexecutor = this.activeSubexecutor!
    concreteSubexecutor(subexecutor)
    switch (subexecutor._tag) {
      case "PullFromUpstream": {
        return this.pullFromUpstream(subexecutor)
      }
      case "PullFromChild": {
        return this.pullFromChild(
          subexecutor.childExecutor,
          subexecutor.parentSubexecutor,
          subexecutor.onEmit,
          subexecutor
        )
      }
      case "DrainChildExecutors": {
        return this.drainChildExecutors(subexecutor)
      }
      case "Emit": {
        this.emitted = subexecutor.value
        this.activeSubexecutor = subexecutor.next
        return ChannelState.Emit
      }
    }
  }

  private replaceSubexecutor(nextSubExecutor: Subexecutor<R>): void {
    this.currentChannel = undefined
    this.activeSubexecutor = nextSubExecutor
  }

  private finishSubexecutorWithCloseEffect(
    subexecutorDone: Exit<unknown, unknown>,
    ...closeFns: Array<(exit: Exit<unknown, unknown>) => Effect.RIO<R, unknown> | undefined>
  ): ChannelState<R, unknown> | undefined {
    this.addFinalizer(() =>
      Effect.forEachDiscard(
        closeFns,
        (closeFn) =>
          Effect.sync(closeFn(subexecutorDone)).flatMap((closeEffect) =>
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

  finishWithExit(exit: Exit<unknown, unknown>): Effect<R, unknown, unknown> {
    const state = exit.fold(
      (cause) => this.doneHalt(cause),
      (a) => this.doneSucceed(a)
    )
    this.activeSubexecutor = undefined
    return state == null ? Effect.unit : state.effectOrUnit()
  }

  private applyUpstreamPullStrategy(
    upstreamFinished: boolean,
    queue: ImmutableQueue<PullFromChild<R> | undefined>,
    strategy: UpstreamPullStrategy<unknown>
  ): Tuple<[Maybe<unknown>, ImmutableQueue<PullFromChild<R> | undefined>]> {
    switch (strategy._tag) {
      case "PullAfterNext": {
        return Tuple(
          strategy.emitSeparator,
          !upstreamFinished || queue.find((a) => a != null).isSome()
            ? queue.prepend(undefined)
            : queue
        )
      }
      case "PullAfterAllEnqueued": {
        return Tuple(
          strategy.emitSeparator,
          !upstreamFinished || queue.find((a) => a != null).isSome()
            ? queue.append(undefined)
            : queue
        )
      }
    }
  }

  private performPullFromUpstream(
    self: PullFromUpstream<R>
  ): ChannelState<R, unknown> {
    return ChannelState.Read(
      self.upstreamExecutor,
      (effect) => {
        const closeLast = this.closeLastSubstream == null ? Effect.unit : this.closeLastSubstream
        this.closeLastSubstream = undefined
        return this.executeCloseLastSubstream(closeLast).zipRight(effect)
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
        if (self.activeChildExecutors.find((a) => a != null).isSome()) {
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
            this.executeCloseLastSubstream(closeLast).map(() => this.replaceSubexecutor(drain))
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
    self: PullFromUpstream<R>
  ): ChannelState<R, unknown> | undefined {
    return self.activeChildExecutors
      .dequeue
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
        ) as PullFromUpstream<R>

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
    self: DrainChildExecutors<R>
  ): ChannelState<R, unknown> | undefined {
    return self.activeChildExecutors.dequeue.fold(
      () => {
        const lastClose = this.closeLastSubstream
        if (lastClose != null) {
          this.addFinalizer(() => Effect.sync(lastClose))
        }
        return this.finishSubexecutorWithCloseEffect(
          self.upstreamDone,
          () => lastClose,
          (exit) => self.upstreamExecutor.close(exit)
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
          self.onPull(
            UpstreamPullRequest.NoUpstream(rest.reduce(0, (acc, a) => a != null ? acc + 1 : acc))
          )
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

        return emitSeparator.fold(() => undefined, (value) => {
          this.emitted = value
          return ChannelState.Emit
        })
      }
    )
  }

  private handleSubexecFailure(
    childExecutor: ErasedExecutor<R>,
    parentSubexecutor: Subexecutor<R>,
    cause: Cause<unknown>
  ): ChannelState<R, unknown> | undefined {
    return this.finishSubexecutorWithCloseEffect(
      Exit.failCause(cause),
      (exit) => parentSubexecutor.close(exit),
      (exit) => childExecutor.close(exit)
    )
  }

  private finishWithDoneValue(
    childExecutor: ErasedExecutor<R>,
    parentSubexecutor: Subexecutor<R>,
    doneValue: unknown
  ): void {
    concreteSubexecutor(parentSubexecutor)
    switch (parentSubexecutor._tag) {
      case "PullFromUpstream": {
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
      case "DrainChildExecutors": {
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
    childExecutor: ErasedExecutor<R>,
    parentSubexecutor: Subexecutor<R>,
    onEmitted: (_: unknown) => ChildExecutorDecision,
    self: PullFromChild<R>
  ): ChannelState<R, unknown> {
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
  cont: LazyArg<Effect<R, E, A>>
): Effect<R, E, A> {
  const readStack = new Stack(r as ChannelStateRead<R, unknown>)
  return read(readStack, cont)
}

function read<R, E, A>(
  readStack: Stack<ChannelState.Read<R, unknown>>,
  cont: LazyArg<Effect<R, E, A>>
): Effect<R, E, A> {
  const current = readStack.value
  let newReadStack = readStack.previous
  const state = current.upstream.run()
  concreteChannelState(state)
  switch (state._tag) {
    case "Emit": {
      const emitEffect = current.onEmit(current.upstream.getEmit())
      if (newReadStack == null) {
        if (emitEffect == null) {
          return Effect.suspendSucceed(cont)
        }
        return emitEffect.flatMap(cont)
      }
      if (emitEffect == null) {
        return Effect.suspendSucceed(read(newReadStack, cont))
      }
      return emitEffect.flatMap(() => read(newReadStack!, cont))
    }

    case "Done": {
      const doneEffect = current.onDone(current.upstream.getDone())
      if (newReadStack == null) {
        if (doneEffect == null) {
          return Effect.suspendSucceed(cont)
        }
        return doneEffect.flatMap(cont)
      }
      if (doneEffect == null) {
        return Effect.suspendSucceed(read(newReadStack, cont))
      }
      return doneEffect.flatMap(() => read(newReadStack!, cont))
    }

    case "Effect": {
      newReadStack = new Stack(current, newReadStack)
      return (
        current
          .onEffect(state.effect as Effect<never, never, void>)
          .catchAllCause((cause) =>
            Effect.suspendSucceed(() => {
              const doneEffect = current.onDone(Exit.failCause(cause))
              return doneEffect == null ? Effect.unit : doneEffect
            })
          ).flatMap(() => read(newReadStack!, cont))
      )
    }

    case "Read": {
      newReadStack = new Stack(current, newReadStack)
      newReadStack = new Stack(state, newReadStack)
      return Effect.suspendSucceed(read(newReadStack, cont))
    }
  }
}

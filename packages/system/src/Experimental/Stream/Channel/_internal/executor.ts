// ets_tracing: off

import "../../../../Operator/index.js"

import type * as Cause from "../../../../Cause/index.js"
import * as L from "../../../../Collections/Immutable/List/index.js"
import * as T from "../../../../Effect/index.js"
import * as Either from "../../../../Either/index.js"
import * as Exit from "../../../../Exit/index.js"
import * as F from "../../../../Fiber/index.js"
import * as O from "../../../../Option/index.js"
import * as P from "./primitives.js"

type ErasedExecutor<Env> = ChannelExecutor<
  Env,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>

type ErasedChannel<R> = P.Channel<
  R,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>

type ErasedContinuation<R> = P.Continuation<
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

type ErasedFinalizer<Env> = P.ContinuationFinalizer<Env, unknown, unknown>

export type SubexecutorStack<R> = FromKAnd<R> | Inner<R>

export const FromKAndTypeId = Symbol()
export type FromKAndTypeId = typeof FromKAndTypeId

export class FromKAnd<R> {
  readonly _typeId: FromKAndTypeId = FromKAndTypeId
  constructor(readonly fromK: ErasedExecutor<R>, readonly rest: Inner<R>) {}
}

export const InnerTypeId = Symbol()
export type InnerTypeId = typeof InnerTypeId

export class Inner<R> {
  readonly _typeId: InnerTypeId = InnerTypeId
  constructor(
    readonly exec: ErasedExecutor<R>,
    readonly subK: (u: unknown) => ErasedChannel<R>,
    readonly lastDone: unknown,
    readonly combineSubK: (a: unknown, b: unknown) => unknown,
    readonly combineSubKAndInner: (a: unknown, b: unknown) => unknown
  ) {}

  close(
    ex: Exit.Exit<unknown, unknown>
  ): T.RIO<R, Exit.Exit<unknown, unknown>> | undefined {
    const fin = this.exec.close(ex)
    if (fin) {
      return T.result(fin)
    }
  }
}

export const ChannelStateDoneTypeId = Symbol()
export type ChannelStateDoneTypeId = typeof ChannelStateDoneTypeId

export class ChannelStateDone {
  readonly _typeId: ChannelStateDoneTypeId = ChannelStateDoneTypeId
}

export const ChannelStateEmitTypeId = Symbol()
export type ChannelStateEmitTypeId = typeof ChannelStateEmitTypeId

export class ChannelStateEmit {
  readonly _typeId: ChannelStateEmitTypeId = ChannelStateEmitTypeId
}

export const ChannelStateEffectTypeId = Symbol()
export type ChannelStateEffectTypeId = typeof ChannelStateEffectTypeId

export class ChannelStateEffect<R, E> {
  readonly _typeId: ChannelStateEffectTypeId = ChannelStateEffectTypeId
  constructor(readonly effect: T.Effect<R, E, unknown>) {}
}

export type ChannelState<R, E> =
  | ChannelStateDone
  | ChannelStateEmit
  | ChannelStateEffect<R, E>

const _ChannelStateDone = new ChannelStateDone()
const _ChannelStateEmit = new ChannelStateEmit()

export function channelStateEffect<R, E>(
  state: ChannelState<R, E> | undefined
): T.Effect<R, E, unknown> {
  if (state?._typeId === ChannelStateEffectTypeId) {
    return state.effect
  }
  return T.unit
}

export function channelStateUnroll<R, E>(
  runStep: () => ChannelState<R, E>
): T.Effect<R, E, Either.Either<ChannelStateEmit, ChannelStateDone>> {
  const step = runStep()
  switch (step._typeId) {
    case ChannelStateEffectTypeId: {
      return T.chain_(step.effect, () => channelStateUnroll(runStep))
    }
    case ChannelStateDoneTypeId: {
      return T.succeed(Either.right(_ChannelStateDone))
    }
    case ChannelStateEmitTypeId: {
      return T.succeed(Either.left(_ChannelStateEmit))
    }
  }
}

export function maybeCloseBoth<Env>(
  l: T.Effect<Env, never, unknown> | undefined,
  r: T.Effect<Env, never, unknown> | undefined
): T.RIO<Env, Exit.Exit<never, unknown>> | undefined {
  if (l && r) {
    return T.zipWith_(T.result(l), T.result(r), (a, b) => Exit.zipRight_(a, b))
  } else if (l) {
    return T.result(l)
  } else if (r) {
    return T.result(r)
  }
}

const endUnit = new P.Done(() => void 0)

export class ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  private input?: ErasedExecutor<Env> | undefined
  private inProgressFinalizer?: T.RIO<Env, Exit.Exit<unknown, unknown>> | undefined
  private subexecutorStack?: SubexecutorStack<Env> | undefined
  private doneStack: L.List<ErasedContinuation<Env>> = L.empty()
  private done?: Exit.Exit<unknown, unknown> | undefined
  private cancelled?: Exit.Exit<OutErr, OutDone> | undefined
  private emitted?: unknown | undefined
  private currentChannel?: ErasedChannel<Env> | undefined
  private closeLastSubstream?: T.Effect<Env, never, unknown> | undefined

  constructor(
    initialChannel: () => P.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      OutElem,
      OutDone
    >,
    private providedEnv: unknown,
    private executeCloseLastSubstream: (
      io: T.Effect<Env, never, unknown>
    ) => T.Effect<Env, never, unknown>
  ) {
    this.currentChannel = initialChannel() as ErasedChannel<Env>
  }

  private restorePipe(
    exit: Exit.Exit<unknown, unknown>,
    prev: ErasedExecutor<Env> | undefined
  ): T.Effect<Env, never, unknown> | undefined {
    const currInput = this.input

    this.input = prev

    return currInput?.close(exit)
  }

  private unwindAllFinalizers(
    acc: Exit.Exit<unknown, unknown>,
    conts: L.List<ErasedContinuation<Env>>,
    exit: Exit.Exit<unknown, unknown>
  ): T.Effect<Env, unknown, unknown> {
    while (!L.isEmpty(conts)) {
      const head = L.unsafeFirst(conts)!
      P.concreteContinuation(head)
      if (head._typeId === P.ContinuationKTypeId) {
        conts = L.tail(conts)
      } else {
        return T.chain_(T.result(head.finalizer(exit)), (finExit) =>
          this.unwindAllFinalizers(Exit.zipRight_(acc, finExit), L.tail(conts), exit)
        )
      }
    }
    return T.done(acc)
  }

  private popAllFinalizers(
    exit: Exit.Exit<unknown, unknown>
  ): T.RIO<Env, Exit.Exit<unknown, unknown>> {
    const effect = T.result(this.unwindAllFinalizers(Exit.unit, this.doneStack, exit))
    this.doneStack = L.empty()
    this.storeInProgressFinalizer(effect)
    return effect
  }

  private popNextFinalizersGo(
    stack: L.List<ErasedContinuation<Env>>,
    builder: L.MutableList<P.ContinuationFinalizer<Env, unknown, unknown>>
  ): L.List<ErasedContinuation<Env>> {
    while (!L.isEmpty(stack)) {
      const head = L.unsafeFirst(stack)!
      P.concreteContinuation(head)
      if (head._typeId === P.ContinuationKTypeId) {
        return stack
      }
      L.push_(builder, head)
      stack = L.tail(stack)
    }
    return L.empty()
  }

  private popNextFinalizers(): L.List<P.ContinuationFinalizer<Env, unknown, unknown>> {
    const builder = L.emptyPushable<P.ContinuationFinalizer<Env, unknown, unknown>>()

    this.doneStack = this.popNextFinalizersGo(this.doneStack, builder)

    return builder
  }

  private storeInProgressFinalizer(
    effect: T.RIO<Env, Exit.Exit<unknown, unknown>> | undefined
  ): void {
    this.inProgressFinalizer = effect
  }

  private clearInProgressFinalizer(): void {
    this.inProgressFinalizer = undefined
  }

  private ifNotNull<R, E>(
    effect: T.RIO<R, Exit.Exit<E, unknown>> | undefined
  ): T.RIO<R, Exit.Exit<E, unknown>> {
    return effect ? effect : T.succeed(Exit.unit)
  }

  close(ex: Exit.Exit<unknown, unknown>): T.Effect<Env, never, unknown> | undefined {
    const runInProgressFinalizer = this.inProgressFinalizer
      ? T.ensuring_(
          this.inProgressFinalizer,
          T.succeedWith(() => this.clearInProgressFinalizer())
        )
      : undefined

    let closeSubexecutors: T.RIO<Env, Exit.Exit<unknown, unknown>> | undefined

    if (this.subexecutorStack) {
      if (this.subexecutorStack._typeId === InnerTypeId) {
        closeSubexecutors = this.subexecutorStack.close(ex)
      } else {
        const fin1 = this.subexecutorStack.fromK.close(ex)
        const fin2 = this.subexecutorStack.rest.close(ex)

        if (fin1 && fin2) {
          closeSubexecutors = T.zipWith_(T.result(fin1), T.result(fin2), (a, b) =>
            Exit.zipRight_(a, b)
          )
        } else if (fin1) {
          closeSubexecutors = T.result(fin1)
        } else if (fin2) {
          closeSubexecutors = T.result(fin2)
        }
      }
    }

    let closeSelf: T.RIO<Env, Exit.Exit<unknown, unknown>> | undefined

    const selfFinalizers = this.popAllFinalizers(ex)

    if (selfFinalizers) {
      closeSelf = T.ensuring_(
        selfFinalizers,
        T.succeedWith(() => this.clearInProgressFinalizer())
      )
    }

    if (closeSubexecutors || runInProgressFinalizer || closeSelf) {
      return T.uninterruptible(
        T.map_(
          T.tuple(
            this.ifNotNull(closeSubexecutors),
            this.ifNotNull(runInProgressFinalizer),
            this.ifNotNull(closeSelf)
          ),
          ({ tuple: [a, b, c] }) => Exit.zipRight_(a, Exit.zipRight_(b, c))
        )
      )
    }
  }

  getDone() {
    return this.done as Exit.Exit<OutErr, OutDone>
  }

  getEmit() {
    return this.emitted as OutElem
  }

  cancelWith(exit: Exit.Exit<OutErr, OutDone>) {
    this.cancelled = exit
  }

  run(): ChannelState<Env, OutErr> {
    let result: ChannelState<Env, unknown> | undefined = undefined

    while (!result) {
      if (this.cancelled) {
        result = this.processCancellation()
      } else if (this.subexecutorStack) {
        result = this.drainSubexecutor()
      } else {
        if (!this.currentChannel) {
          result = _ChannelStateDone
        } else {
          P.concrete(this.currentChannel)
          const currentChannel = this.currentChannel

          switch (currentChannel._typeId) {
            case P.BridgeTypeId: {
              this.currentChannel = currentChannel.channel

              if (this.input) {
                const inputExecutor = this.input
                this.input = undefined
                const drainer: T.RIO<Env, unknown> = T.zipRight_(
                  currentChannel.input.awaitRead,
                  T.suspend(() => {
                    const state = inputExecutor.run()

                    switch (state._typeId) {
                      case ChannelStateEmitTypeId: {
                        return T.chain_(
                          currentChannel.input.emit(inputExecutor.getEmit()),
                          () => drainer
                        )
                      }
                      case ChannelStateEffectTypeId: {
                        return T.foldCauseM_(
                          state.effect,
                          (cause) => currentChannel.input.error(cause),
                          () => drainer
                        )
                      }
                      case ChannelStateDoneTypeId: {
                        const done = inputExecutor.getDone()

                        return done._tag === "Success"
                          ? currentChannel.input.done(done.value)
                          : currentChannel.input.error(done.cause)
                      }
                    }
                  })
                )
                result = new ChannelStateEffect(
                  T.chain_(T.fork(drainer), (fiber) =>
                    T.succeedWith(() => {
                      this.addFinalizer(
                        new P.ContinuationFinalizer((exit) =>
                          T.chain_(F.interrupt(fiber), () =>
                            T.suspend(
                              () => this.restorePipe(exit, inputExecutor) || T.unit
                            )
                          )
                        )
                      )
                    })
                  )
                )
              }
              break
            }
            case P.PipeToTypeId: {
              const previousInput = this.input
              const leftExec = new ChannelExecutor(
                currentChannel.left,
                this.providedEnv,
                this.executeCloseLastSubstream
              )
              leftExec.input = previousInput
              this.input = leftExec
              this.addFinalizer(
                new P.ContinuationFinalizer(
                  (exit) => this.restorePipe(exit, previousInput) || T.unit
                )
              )
              this.currentChannel = currentChannel.right()
              break
            }
            case P.ReadTypeId: {
              result = this.runRead(currentChannel)
              break
            }
            case P.DoneTypeId: {
              result = this.doneSucceed(currentChannel.terminal())
              break
            }
            case P.HaltTypeId: {
              result = this.doneHalt(currentChannel.error())
              break
            }
            case P.EffectTypeId: {
              const peffect =
                typeof this.providedEnv !== "undefined"
                  ? T.provideAll_(currentChannel.effect, this.providedEnv as Env)
                  : currentChannel.effect
              result = new ChannelStateEffect(
                T.foldCauseM_(
                  peffect,
                  (cause) => {
                    const res = this.doneHalt(cause)
                    if (res?._typeId === ChannelStateEffectTypeId) {
                      return res.effect
                    } else {
                      return T.unit
                    }
                  },
                  (z) => {
                    const res = this.doneSucceed(z)
                    if (res?._typeId === ChannelStateEffectTypeId) {
                      return res.effect
                    } else {
                      return T.unit
                    }
                  }
                )
              )
              break
            }
            case P.EmitTypeId: {
              this.emitted = currentChannel.out()
              this.currentChannel = endUnit
              result = _ChannelStateEmit
              break
            }
            case P.EnsuringTypeId: {
              this.addFinalizer(
                new P.ContinuationFinalizer((e) => currentChannel.finalizer(e))
              )
              this.currentChannel = currentChannel.channel
              break
            }
            case P.ConcatAllTypeId: {
              const innerExecuteLastClose = (f: T.Effect<Env, never, unknown>) =>
                T.succeedWith(() => {
                  const prevLastClose = this.closeLastSubstream
                    ? this.closeLastSubstream
                    : T.unit

                  this.closeLastSubstream = T.zipRight_(prevLastClose, f)
                })
              const exec = new ChannelExecutor(
                () => currentChannel.value,
                this.providedEnv,
                innerExecuteLastClose
              )
              exec.input = this.input
              this.subexecutorStack = new Inner(
                exec,
                currentChannel.k,
                undefined,
                currentChannel.combineInners,
                currentChannel.combineAll
              )
              this.closeLastSubstream = undefined
              this.currentChannel = undefined
              break
            }
            case P.FoldTypeId: {
              this.doneStack = L.prepend_(this.doneStack, currentChannel.k)
              this.currentChannel = currentChannel.value
              break
            }
            case P.BracketOutTypeId: {
              result = this.runBracketOut(currentChannel)
              break
            }
            case P.ProvideTypeId: {
              const previousEnv = this.providedEnv
              this.providedEnv = currentChannel.env
              this.currentChannel = currentChannel.channel
              this.addFinalizer(
                new P.ContinuationFinalizer(() =>
                  T.succeedWith(() => {
                    this.providedEnv = previousEnv
                  })
                )
              )
              break
            }
            case P.EffectTotalTypeId: {
              result = this.doneSucceed(currentChannel.effect())
              break
            }
            case P.EffectSuspendTotalTypeId: {
              this.currentChannel = currentChannel.effect()
              break
            }
          }
        }
      }
    }

    return result! as ChannelState<Env, OutErr>
  }

  private runReadGo(
    state: ChannelState<Env, unknown>,
    read: P.Read<
      Env,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown
    >,
    input: ErasedExecutor<Env>
  ): T.RIO<Env, void> {
    switch (state._typeId) {
      case ChannelStateEmitTypeId: {
        return T.succeedWith(() => {
          this.currentChannel = read.more(input.getEmit())
        })
      }
      case ChannelStateDoneTypeId: {
        return T.succeedWith(() => {
          this.currentChannel = read.done.onExit(input.getDone())
        })
      }
      case ChannelStateEffectTypeId: {
        return T.foldCauseM_(
          state.effect,
          (cause) =>
            T.succeedWith(() => {
              this.currentChannel = read.done.onHalt(cause)
            }),
          () => this.runReadGo(input.run(), read, input)
        )
      }
    }
  }

  private runRead(
    read: P.Read<
      Env,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown
    >
  ): ChannelState<Env, unknown> | undefined {
    if (this.input) {
      const input = this.input
      const state = input.run()

      switch (state._typeId) {
        case ChannelStateEmitTypeId: {
          this.currentChannel = read.more(input.getEmit())
          return
        }
        case ChannelStateDoneTypeId: {
          this.currentChannel = read.done.onExit(input.getDone())
          return
        }
        case ChannelStateEffectTypeId: {
          return new ChannelStateEffect(
            T.foldCauseM_(
              state.effect,
              (cause) =>
                T.succeedWith(() => {
                  this.currentChannel = read.done.onHalt(cause)
                }),
              () => this.runReadGo(input.run(), read, input)
            )
          )
        }
      }
    } else {
      this.currentChannel = read.more(void 0)
    }
  }

  private runBracketOut(
    bracketOut: P.BracketOut<Env, unknown, unknown, unknown>
  ): ChannelState<Env, unknown> | undefined {
    return new ChannelStateEffect(
      T.uninterruptibleMask((mask) =>
        T.foldCauseM_(
          mask.restore(bracketOut.acquire),
          (cause) =>
            T.succeedWith(() => {
              this.currentChannel = new P.Halt(() => cause)
            }),
          (out) =>
            T.succeedWith(() => {
              this.addFinalizer(
                new P.ContinuationFinalizer((e) => bracketOut.finalizer(out, e))
              )
              this.currentChannel = new P.Emit(() => out)
            })
        )
      )
    )
  }

  private addFinalizer(f: ErasedFinalizer<Env>) {
    this.doneStack = L.prepend_(this.doneStack, f)
  }

  private drainSubexecutor(): ChannelState<Env, unknown> | undefined {
    const subexecutorStack = this.subexecutorStack!

    if (subexecutorStack._typeId === InnerTypeId) {
      return this.drainInnerSubExecutor(subexecutorStack)
    } else {
      return this.drainFromKAndSubexecutor(
        subexecutorStack.fromK,
        subexecutorStack.rest
      )
    }
  }

  private handleSubexecFailure<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    exec: ErasedExecutor<Env>,
    rest: Inner<Env>,
    self: ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    cause: Cause.Cause<unknown>
  ): ChannelState<Env, unknown> | undefined {
    return self.finishSubexecutorWithCloseEffect(
      Exit.halt(cause),
      (_) => rest.exec.close(_),
      (_) => exec.close(_)
    )
  }

  private drainFromKAndSubexecutor(
    exec: ErasedExecutor<Env>,
    rest: Inner<Env>
  ): ChannelState<Env, unknown> | undefined {
    const run = exec.run()

    switch (run._typeId) {
      case ChannelStateEffectTypeId: {
        return new ChannelStateEffect(
          T.catchAllCause_(run.effect, (cause) =>
            channelStateEffect(this.handleSubexecFailure(exec, rest, this, cause))
          )
        )
      }
      case ChannelStateEmitTypeId: {
        this.emitted = exec.getEmit()
        return _ChannelStateEmit
      }
      case ChannelStateDoneTypeId: {
        const done = exec.getDone()
        switch (done._tag) {
          case "Failure": {
            return this.handleSubexecFailure(exec, rest, this, done.cause)
          }
          case "Success": {
            const modifiedRest = new Inner(
              rest.exec,
              rest.subK,
              rest.lastDone ? rest.combineSubK(rest.lastDone, done.value) : done.value,
              rest.combineSubK,
              rest.combineSubKAndInner
            )
            this.closeLastSubstream = exec.close(done)
            this.replaceSubexecutor(modifiedRest)
            return undefined
          }
        }
      }
    }
  }

  private replaceSubexecutor(nextSubExec: Inner<Env>) {
    this.currentChannel = undefined
    this.subexecutorStack = nextSubExec
  }

  private finishSubexecutorWithCloseEffect(
    subexecDone: Exit.Exit<unknown, unknown>,
    ...closeFns: ((
      ex: Exit.Exit<unknown, unknown>
    ) => T.Effect<Env, never, unknown> | undefined)[]
  ): ChannelState<Env, unknown> | undefined {
    this.addFinalizer(
      new P.ContinuationFinalizer((_) =>
        T.forEachUnit_(closeFns, (closeFn) =>
          T.chain_(
            T.succeedWith(() => closeFn(subexecDone)),
            (closeEffect) => {
              if (closeEffect) {
                return closeEffect
              } else {
                return T.unit
              }
            }
          )
        )
      )
    )

    const state = Exit.fold_(
      subexecDone,
      (e) => this.doneHalt(e),
      (a) => this.doneSucceed(a)
    )

    this.subexecutorStack = undefined

    return state
  }

  private doneSucceed(z: unknown): ChannelState<Env, unknown> | undefined {
    if (L.isEmpty(this.doneStack)) {
      this.done = Exit.succeed(z)
      this.currentChannel = undefined
      return _ChannelStateDone
    }

    const head = L.unsafeFirst(this.doneStack)!
    P.concreteContinuation(head)

    if (head._typeId === P.ContinuationKTypeId) {
      this.doneStack = L.tail(this.doneStack)
      this.currentChannel = head.onSuccess(z)
      return
    } else {
      const finalizers = this.popNextFinalizers()

      if (L.isEmpty(this.doneStack)) {
        this.doneStack = finalizers
        this.done = Exit.succeed(z)
        this.currentChannel = undefined
        return _ChannelStateDone
      } else {
        const finalizerEffect = this.runFinalizers(
          L.map_(finalizers, (_) => _.finalizer),
          Exit.succeed(z)
        )
        this.storeInProgressFinalizer(finalizerEffect)
        return new ChannelStateEffect(
          T.chain_(
            T.uninterruptible(
              T.ensuring_(
                finalizerEffect,
                T.succeedWith(() => {
                  this.clearInProgressFinalizer()
                })
              )
            ),
            () => T.succeedWith(() => this.doneSucceed(z))
          )
        )
      }
    }
  }

  private runFinalizers(
    finalizers: L.List<(e: Exit.Exit<unknown, unknown>) => T.RIO<Env, unknown>>,
    ex: Exit.Exit<unknown, unknown>
  ): T.RIO<Env, Exit.Exit<unknown, unknown>> {
    if (L.isEmpty(finalizers)) {
      return T.succeed(Exit.unit)
    }
    return T.map_(
      T.forEach_(finalizers, (cont) => T.result(cont(ex))),
      (results) => O.getOrElse_(Exit.collectAll(...results), () => Exit.unit)
    )
  }

  private doneHalt(
    cause: Cause.Cause<unknown>
  ): ChannelState<Env, unknown> | undefined {
    if (L.isEmpty(this.doneStack)) {
      this.done = Exit.halt(cause)
      this.currentChannel = undefined
      return _ChannelStateDone
    }

    const head = L.unsafeFirst(this.doneStack)!
    P.concreteContinuation(head)

    if (head._typeId === P.ContinuationKTypeId) {
      this.doneStack = L.tail(this.doneStack)
      this.currentChannel = head.onHalt(cause)
      return
    } else {
      const finalizers = this.popNextFinalizers()

      if (L.isEmpty(this.doneStack)) {
        this.doneStack = finalizers
        this.done = Exit.halt(cause)
        this.currentChannel = undefined
        return _ChannelStateDone
      } else {
        const finalizerEffect = this.runFinalizers(
          L.map_(finalizers, (_) => _.finalizer),
          Exit.halt(cause)
        )
        this.storeInProgressFinalizer(finalizerEffect)
        return new ChannelStateEffect(
          T.chain_(
            T.uninterruptible(
              T.ensuring_(
                finalizerEffect,
                T.succeedWith(() => {
                  this.clearInProgressFinalizer()
                })
              )
            ),
            () => T.succeedWith(() => this.doneHalt(cause))
          )
        )
      }
    }
  }

  private drainInnerSubExecutor(
    inner: Inner<Env>
  ): ChannelState<Env, unknown> | undefined {
    const run = inner.exec.run()

    switch (run._typeId) {
      case ChannelStateEmitTypeId: {
        if (this.closeLastSubstream) {
          const closeLast = this.closeLastSubstream
          this.closeLastSubstream = undefined

          return new ChannelStateEffect(
            T.map_(this.executeCloseLastSubstream(closeLast), (_) => {
              const fromK: ErasedExecutor<Env> = new ChannelExecutor(
                () => inner.subK(inner.exec.getEmit()),
                this.providedEnv,
                this.executeCloseLastSubstream
              )

              fromK.input = this.input
              this.subexecutorStack = new FromKAnd(fromK, inner)
            })
          )
        } else {
          const fromK: ErasedExecutor<Env> = new ChannelExecutor(
            () => inner.subK(inner.exec.getEmit()),
            this.providedEnv,
            this.executeCloseLastSubstream
          )

          fromK.input = this.input
          this.subexecutorStack = new FromKAnd(fromK, inner)
          return undefined
        }
      }
      case ChannelStateDoneTypeId: {
        const lastClose = this.closeLastSubstream
        const done = inner.exec.getDone()
        switch (done._tag) {
          case "Failure": {
            return this.finishSubexecutorWithCloseEffect(
              done,
              () => lastClose,
              (_) => inner.exec.close(_)
            )
          }
          case "Success": {
            const doneValue = Exit.succeed(
              inner.combineSubKAndInner(inner.lastDone, done.value)
            )
            return this.finishSubexecutorWithCloseEffect(
              doneValue,
              () => lastClose,
              (_) => inner.exec.close(_)
            )
          }
        }
      }
      case ChannelStateEffectTypeId: {
        const closeLast = this.closeLastSubstream ? this.closeLastSubstream : T.unit

        this.closeLastSubstream = undefined

        return new ChannelStateEffect(
          T.zipRight_(
            this.executeCloseLastSubstream(closeLast),
            T.catchAllCause_(run.effect, (cause) =>
              channelStateEffect(
                this.finishSubexecutorWithCloseEffect(
                  Exit.halt(cause),
                  (_) => inner.exec.close(_),
                  (_) => inner.exec.close(_)
                )
              )
            )
          )
        )
      }
    }
  }

  private processCancellation(): ChannelState<Env, unknown> {
    this.currentChannel = undefined
    this.done = this.cancelled
    this.cancelled = undefined
    return _ChannelStateDone
  }
}

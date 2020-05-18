import type { Either } from "../../../Either"
import {
  Cause,
  Done,
  done,
  Exit,
  interrupt as interruptExit,
  raise
} from "../../../Exit"
import type { FunctionN } from "../../../Function"
import { none } from "../../../Option"
import type * as EffectTypes from "../../Common/effect"
import {
  IAccessEnv,
  IAccessInterruptible,
  IAccessRuntime,
  IAsync,
  IChain,
  ICollapse,
  ICompleted,
  IInterruptibleRegion,
  IMap,
  Instructions,
  IProvideEnv,
  IPure,
  IPureEither,
  IPureOption,
  IRaised,
  ISuspended
} from "../../Common/instructions"
import { DoublyLinkedList } from "../../DoublyLinkedList"
import { defaultRuntime } from "../../Runtime"
import {
  FoldFrame,
  FoldFrameTag,
  Frame,
  FrameType,
  InterruptFrame,
  InterruptFrameTag,
  MapFrame,
  MapFrameTag
} from "../driver/Frame"

import { DriverSync } from "./DriverSync"

export class DriverSyncImpl<E, A> implements DriverSync<E, A> {
  completed: Exit<E, A> | null = null
  listeners: FunctionN<[Exit<E, A>], void>[] | undefined
  interrupted = false
  currentFrame: FrameType | undefined = undefined
  interruptRegionStack: boolean[] | undefined
  envStack = new DoublyLinkedList<any>()

  isComplete(): boolean {
    return this.completed !== null
  }

  complete(a: Exit<E, A>): void {
    this.completed = a
    if (this.listeners !== undefined) {
      for (const f of this.listeners) {
        f(a)
      }
    }
  }

  isInterruptible(): boolean {
    return this.interruptRegionStack !== undefined &&
      this.interruptRegionStack.length > 0
      ? this.interruptRegionStack[this.interruptRegionStack.length - 1]
      : true
  }

  handle(e: Cause<unknown>): Instructions | undefined {
    let frame = this.currentFrame
    this.currentFrame = this.currentFrame?.prev
    while (frame) {
      if (
        frame.tag() === FoldFrameTag &&
        (e._tag !== "Interrupt" || !this.isInterruptible())
      ) {
        return (frame as FoldFrame).recover(e)
      }
      // We need to make sure we leave an interrupt region or environment provision region while unwinding on errors
      if (frame.tag() === InterruptFrameTag) {
        ;(frame as InterruptFrame).exitRegion()
      }
      frame = this.currentFrame
      this.currentFrame = this.currentFrame?.prev
    }
    // At the end... so we have failed
    this.complete(e as Cause<E>)
    return
  }

  dispatchResumeInterrupt() {
    const go = this.handle(interruptExit)
    if (go) {
      // eslint-disable-next-line
      this.loop(go)
    }
  }

  resumeInterrupt(): void {
    this.dispatchResumeInterrupt()
  }

  next(value: unknown): Instructions | undefined {
    const frame = this.currentFrame
    this.currentFrame = this.currentFrame?.prev

    if (frame) {
      if (frame.tag() === MapFrameTag) {
        if (this.currentFrame === undefined) {
          this.complete(done(frame.apply(value)) as Done<A>)
          return
        }
        return new IPure(frame.apply(value))
      } else {
        return frame.apply(value) as any
      }
    }
    this.complete(done(value) as Done<A>)
    return
  }

  foldResume(status: Either<unknown, unknown>) {
    if (status._tag === "Right") {
      const go = this.next(status.right)
      if (go) {
        /* eslint-disable-next-line */
        this.loop(go)
      }
    } else {
      const go = this.handle(raise(status.left))
      if (go) {
        /* eslint-disable-next-line */
        this.loop(go)
      }
    }
  }

  resume(status: Either<unknown, unknown>): void {
    this.foldResume(status)
  }

  IAccessEnv(_: IAccessEnv<any>) {
    const env = this.envStack.tail?.value || {}
    return this.next(env)
  }

  IProvideEnv(_: IProvideEnv<any, any, any, any>) {
    this.envStack.append(_.r as any)

    return new ICollapse(
      _.e as any,
      (e) => {
        this.envStack.deleteTail()
        return new ICompleted(e) as any
      },
      (r) => {
        this.envStack.deleteTail()
        return new ICompleted(done(r)) as any
      }
    )
  }

  IPure(_: IPure<A>) {
    return this.next(_.a)
  }

  IPureOption(_: IPureOption<any, any>) {
    if (_.a._tag === "Some") {
      return this.next(_.a.value)
    } else {
      return this.handle(raise(_.onEmpty()))
    }
  }

  IPureEither(_: IPureEither<any, any>) {
    if (_.a._tag === "Right") {
      return this.next(_.a.right)
    } else {
      return this.handle(raise(_.a.left))
    }
  }

  IRaised(_: IRaised<any>) {
    if (_.e._tag === "Interrupt") {
      this.interrupted = true
    }
    return this.handle(_.e)
  }

  ICompleted(_: ICompleted<any, any>) {
    if (_.e._tag === "Done") {
      return this.next(_.e.value)
    } else {
      return this.handle(_.e)
    }
  }

  ISuspended(_: ISuspended<any, any, any, any>) {
    return _.e()
  }

  IAsync(_: IAsync<any, any>) {
    return undefined
  }

  IChain(_: IChain<any, any, any, any, any, any, any, any>) {
    this.currentFrame = new Frame(_.f as any, this.currentFrame)
    return _.e as any
  }

  IMap(_: IMap<any, any, any, any, any>) {
    this.currentFrame = new MapFrame(_.f, this.currentFrame)
    return _.e as any
  }

  ICollapse(_: ICollapse<any, any, any, any, any, any, any, any, any, any, any, any>) {
    this.currentFrame = new FoldFrame(
      _.success as any,
      _.failure as any,
      this.currentFrame
    )
    return _.inner as any
  }

  IInterruptibleRegion(_: IInterruptibleRegion<any, any, any, any>) {
    if (this.interruptRegionStack === undefined) {
      this.interruptRegionStack = [_.int]
    } else {
      this.interruptRegionStack.push(_.int)
    }
    this.currentFrame = new InterruptFrame(this.interruptRegionStack, this.currentFrame)
    return _.e as any
  }

  IAccessRuntime(_: IAccessRuntime<any>) {
    return new IPure(_.f(defaultRuntime))
  }

  IAccessInterruptible(_: IAccessInterruptible<any>) {
    return new IPure(_.f(this.isInterruptible()))
  }

  // tslint:disable-next-line: cyclomatic-complexity
  loop(go: Instructions): void {
    let current: Instructions | undefined = go

    while (current && (!this.interrupted || !this.isInterruptible())) {
      try {
        current = this[current.tag()](current as any)
      } catch (e) {
        current = new IRaised({ _tag: "Abort", abortedWith: e, remaining: none })
      }
    }

    // If !current then the interrupt came to late and we completed everything
    if (this.interrupted && current) {
      this.resumeInterrupt()
    }
  }

  start(run: EffectTypes.SyncRE<{}, E, A>): Either<Error, Exit<E, A>> {
    this.loop(run as any)

    if (this.completed !== null) {
      return { _tag: "Right", right: this.completed }
    }

    this.interrupt()

    return {
      _tag: "Left",
      left: new Error("async operations running")
    }
  }

  interrupt(): void {
    if (this.interrupted || this.isComplete()) {
      return
    }
    this.interrupted = true
  }
}

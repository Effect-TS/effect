import type { Either } from "fp-ts/lib/Either"

import { Cause, Exit, interruptWithError, done, Done, raise } from "../../Exit"
import type { Lazy, FunctionN } from "../../Function"
import {
  Instructions,
  IPure,
  AsyncFn,
  EffectTypes,
  AsyncCancelContFn,
  IAccessEnv,
  IProvideEnv,
  IPureOption,
  IPureEither,
  IRaised,
  ICompleted,
  ISuspended,
  IAsync,
  IChain,
  IMap,
  ICollapse,
  IInterruptibleRegion,
  IAccessRuntime,
  IAccessInterruptible
} from "../Common"
import { DoublyLinkedList } from "../DoublyLinkedList"
import { defaultRuntime } from "../Runtime"

export type RegionFrameType = InterruptFrame
export type FrameType = Frame | FoldFrame | RegionFrameType | MapFrame

export const FrameTag = "Frame" as const
export class Frame implements Frame {
  constructor(
    readonly apply: (u: unknown) => Instructions,
    readonly prev: FrameType | undefined
  ) {}
  tag() {
    return FrameTag
  }
}

export const FoldFrameTag = "FoldFrame" as const
export class FoldFrame implements FoldFrame {
  constructor(
    readonly apply: (u: unknown) => Instructions,
    readonly recover: (cause: Cause<unknown>) => Instructions,
    readonly prev: FrameType | undefined
  ) {}
  tag() {
    return FoldFrameTag
  }
}

export const MapFrameTag = "MapFrame" as const
export class MapFrame implements MapFrame {
  constructor(
    readonly apply: (u: unknown) => unknown,
    readonly prev: FrameType | undefined
  ) {}
  tag() {
    return MapFrameTag
  }
}

export const InterruptFrameTag = "InterruptFrame" as const
export class InterruptFrame {
  constructor(
    readonly interruptStatus: boolean[],
    readonly prev: FrameType | undefined
  ) {}
  apply(u: unknown) {
    this.interruptStatus.pop()
    return new IPure(u)
  }
  exitRegion() {
    this.interruptStatus.pop()
  }
  tag() {
    return InterruptFrameTag
  }
}

export interface Driver<E, A> {
  start(run: EffectTypes.AsyncE<E, A>): void
  interrupt(): void
  onExit(f: FunctionN<[Exit<E, A>], void>): Lazy<void>
  completed: Exit<E, A> | null
}

export class DriverImpl<E, A> implements Driver<E, A> {
  completed: Exit<E, A> | null = null
  listeners: FunctionN<[Exit<E, A>], void>[] | undefined
  interrupted = false
  currentFrame: FrameType | undefined = undefined
  interruptRegionStack: boolean[] | undefined
  cancelAsync: AsyncCancelContFn | undefined
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

  onExit(f: FunctionN<[Exit<E, A>], void>): Lazy<void> {
    if (this.completed !== null) {
      f(this.completed)
    }
    if (this.listeners === undefined) {
      this.listeners = [f]
    } else {
      this.listeners.push(f)
    }
    return () => {
      if (this.listeners !== undefined) {
        this.listeners = this.listeners.filter((cb) => cb !== f)
      }
    }
  }

  exit(): Exit<E, A> | null {
    return this.completed
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

  dispatchResumeInterrupt({ errors }: { errors?: Error[] }) {
    const go = this.handle(interruptWithError(...(errors || [])))
    if (go) {
      // eslint-disable-next-line
      this.loop(go)
    }
  }

  resumeInterrupt(errors?: Error[]): void {
    defaultRuntime.dispatch(this.dispatchResumeInterrupt.bind(this), { errors })
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
        this.loop(go)
      }
    } else {
      const go = this.handle(raise(status.left))
      if (go) {
        this.loop(go)
      }
    }
  }

  resume(status: Either<unknown, unknown>): void {
    this.cancelAsync = undefined
    defaultRuntime.dispatch(this.foldResume.bind(this), status)
  }

  contextSwitch(op: AsyncFn<unknown, unknown>): void {
    let complete = false
    const wrappedCancel = op((status) => {
      if (complete) {
        return
      }
      complete = true
      this.resume(status)
    })
    this.cancelAsync = (cb) => {
      complete = true
      wrappedCancel((...errors) => {
        cb(...errors)
      })
    }
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
    this.contextSwitch(_.e)
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

  loop(go: Instructions): void {
    let current: Instructions | undefined = go

    while (current && (!this.interrupted || !this.isInterruptible())) {
      try {
        current = this[current.tag()](current as any)
      } catch (e) {
        current = new IRaised({
          _tag: "Abort",
          abortedWith: e,
          remaining: { _tag: "None" }
        })
      }
    }

    if (this.interrupted && current) {
      this.resumeInterrupt()
    }
  }

  start(run: EffectTypes.AsyncRE<{}, E, A>): void {
    defaultRuntime.dispatch(this.loop.bind(this), run as any)
  }

  interrupt(): void {
    if (this.interrupted || this.isComplete()) {
      return
    }
    this.interrupted = true
    if (this.cancelAsync && this.isInterruptible()) {
      this.cancelAsync((...errors) => {
        this.resumeInterrupt(errors)
      })
    }
  }
}

/* adapted from https://github.com/rzeigler/waveguide */

import type { Either } from "../../../Either"
import * as Ex from "../../../Exit"
import type { Lazy, FunctionN } from "../../../Function"
import * as Common from "../../Common"
import { DoublyLinkedList } from "../../DoublyLinkedList"
import { defaultRuntime } from "../../Runtime"

import { Driver } from "./Driver"
import { FiberImpl } from "./Fiber"
import {
  FrameType,
  FoldFrameTag,
  FoldFrame,
  InterruptFrameTag,
  InterruptFrame,
  MapFrameTag,
  Frame,
  MapFrame
} from "./Frame"

export class Supervisor {
  fibers = new DoublyLinkedList<DriverImpl<any, any>>()

  push(fiber: DriverImpl<any, any>) {
    const node = this.fibers.appendNode(fiber)

    fiber.onExit(() => {
      if (node.next && !node.removed) {
        node.removed = true

        node.next.previous = node.previous
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        node.previous!.next = node.next
      }
    })
  }

  onExit(a: Ex.Exit<any, any>, driver: DriverImpl<any, any>) {
    if (this.fibers.empty()) {
      driver.complete(a)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const fiberDriver = this.fibers.deleteHead()!.value!

    fiberDriver.onExit((fibExit) => {
      if (fibExit._tag === "Done") {
        this.onExit(a, driver)
      } else if (
        fibExit._tag === "Interrupt" &&
        fibExit.errors._tag === "None" &&
        fibExit.remaining._tag === "None"
      ) {
        this.onExit(a, driver)
      } else {
        if (a._tag === "Done") {
          this.onExit(Ex.withRemaining(Ex.abort(a.value), fibExit), driver)
        } else {
          this.onExit(Ex.withRemaining(a, fibExit), driver)
        }
      }
    })

    fiberDriver.interrupt()
  }
}

export class DriverImpl<E, A> implements Driver<E, A> {
  completed: Ex.Exit<E, A> | null = null
  listeners: FunctionN<[Ex.Exit<E, A>], void>[] | undefined
  interrupted = false
  currentFrame: FrameType | undefined = undefined
  interruptRegionStack: boolean[] | undefined
  cancelAsync: Common.AsyncCancelContFn | undefined
  envStack = new DoublyLinkedList<any>()
  supervisor = new Supervisor()
  sync = false

  constructor(initialEnv?: any) {
    if (initialEnv) {
      this.envStack.append(initialEnv)
    }
  }

  isComplete(): boolean {
    return this.completed !== null
  }

  complete(a: Ex.Exit<E, A>): void {
    this.completed = a
    if (this.listeners !== undefined) {
      for (const f of this.listeners) {
        f(a)
      }
    }
  }

  onExit(f: FunctionN<[Ex.Exit<E, A>], void>): Lazy<void> {
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

  exit(): Ex.Exit<E, A> | null {
    return this.completed
  }

  isInterruptible(): boolean {
    return this.interruptRegionStack !== undefined &&
      this.interruptRegionStack.length > 0
      ? this.interruptRegionStack[this.interruptRegionStack.length - 1]
      : true
  }

  handle(e: Ex.Cause<unknown>): Common.Instructions | undefined {
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
    this.supervisor.onExit(e as Ex.Cause<E>, this)
    return
  }

  dispatchResumeInterrupt({ errors }: { errors?: unknown[] }) {
    const go = this.handle(Ex.interruptWithError(...(errors || [])))
    if (go) {
      // eslint-disable-next-line
      this.loop(go)
    }
  }

  resumeInterrupt(errors?: unknown[]): void {
    defaultRuntime.dispatch(this.dispatchResumeInterrupt.bind(this), { errors })
  }

  next(value: unknown): Common.Instructions | undefined {
    const frame = this.currentFrame
    this.currentFrame = this.currentFrame?.prev

    if (frame) {
      if (frame.tag() === MapFrameTag) {
        if (this.currentFrame === undefined) {
          this.supervisor.onExit(Ex.done(frame.apply(value)) as Ex.Done<A>, this)
          return
        }
        return new Common.IPure(frame.apply(value))
      } else {
        return frame.apply(value) as any
      }
    }
    this.supervisor.onExit(Ex.done(value) as Ex.Done<A>, this)
    return
  }

  foldResume(status: Either<unknown, unknown>) {
    if (status._tag === "Right") {
      const go = this.next(status.right)
      if (go) {
        this.loop(go)
      }
    } else {
      const go = this.handle(Ex.raise(status.left))
      if (go) {
        this.loop(go)
      }
    }
  }

  resume(status: Either<unknown, unknown>): void {
    this.cancelAsync = undefined
    defaultRuntime.dispatch(this.foldResume.bind(this), status)
  }

  contextSwitch(op: Common.AsyncFn<unknown, unknown>): void {
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

  IFork(_: Common.IFork<any, any, any, any>) {
    if (_.supervised && this.sync) {
      throw new Error("Sync driver doesn't support supervision")
    } else {
      const env = this.envStack.tail?.value || {}
      const driver = new DriverImpl(env)
      const fiber = new FiberImpl(driver, _.name)

      driver.start(_.op)

      if (_.supervised) {
        this.supervisor.push(driver)
      }

      return this.next(fiber)
    }
  }

  IAccessEnv(_: Common.IAccessEnv<any>) {
    const env = this.envStack.tail?.value || {}
    return this.next(env)
  }

  IProvideEnv(_: Common.IProvideEnv<any, any, any, any>) {
    this.envStack.append(_.r as any)

    return new Common.ICollapse(
      _.e as any,
      (e) => {
        this.envStack.deleteTail()
        return new Common.ICompleted(e) as any
      },
      (r) => {
        this.envStack.deleteTail()
        return new Common.ICompleted(Ex.done(r)) as any
      }
    )
  }

  IPure(_: Common.IPure<A>) {
    return this.next(_.a)
  }

  IPureOption(_: Common.IPureOption<any, any>) {
    if (_.a._tag === "Some") {
      return this.next(_.a.value)
    } else {
      return this.handle(Ex.raise(_.onEmpty()))
    }
  }

  IPureEither(_: Common.IPureEither<any, any>) {
    if (_.a._tag === "Right") {
      return this.next(_.a.right)
    } else {
      return this.handle(Ex.raise(_.a.left))
    }
  }

  IRaised(_: Common.IRaised<any>) {
    if (_.e._tag === "Interrupt") {
      this.interrupted = true
    }
    return this.handle(_.e)
  }

  ICompleted(_: Common.ICompleted<any, any>) {
    if (_.e._tag === "Done") {
      return this.next(_.e.value)
    } else {
      return this.handle(_.e)
    }
  }

  ISuspended(_: Common.ISuspended<any, any, any, any>) {
    return _.e()
  }

  IAsync(_: Common.IAsync<any, any>) {
    if (this.sync) {
      throw new Error("async operations running")
    } else {
      this.contextSwitch(_.e)
      return undefined
    }
  }

  IChain(_: Common.IChain<any, any, any, any, any, any, any, any>) {
    this.currentFrame = new Frame(_.f as any, this.currentFrame)
    return _.e as any
  }

  IMap(_: Common.IMap<any, any, any, any, any>) {
    this.currentFrame = new MapFrame(_.f, this.currentFrame)
    return _.e as any
  }

  ICollapse(
    _: Common.ICollapse<any, any, any, any, any, any, any, any, any, any, any, any>
  ) {
    this.currentFrame = new FoldFrame(
      _.success as any,
      _.failure as any,
      this.currentFrame
    )
    return _.inner as any
  }

  IInterruptibleRegion(_: Common.IInterruptibleRegion<any, any, any, any>) {
    if (this.interruptRegionStack === undefined) {
      this.interruptRegionStack = [_.int]
    } else {
      this.interruptRegionStack.push(_.int)
    }
    this.currentFrame = new InterruptFrame(this.interruptRegionStack, this.currentFrame)
    return _.e as any
  }

  IAccessRuntime(_: Common.IAccessRuntime<any>) {
    return new Common.IPure(_.f(defaultRuntime))
  }

  IAccessInterruptible(_: Common.IAccessInterruptible<any>) {
    return new Common.IPure(_.f(this.isInterruptible()))
  }

  loop(go: Common.Instructions): void {
    let current: Common.Instructions | undefined = go

    while (current && (!this.interrupted || !this.isInterruptible())) {
      try {
        current = this[current.tag()](current as any)
      } catch (e) {
        current = new Common.IRaised({
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

  start(run: Common.EffectTypes.AsyncRE<{}, E, A>): void {
    defaultRuntime.dispatch(this.loop.bind(this), run as any)
  }

  startSync(run: Common.EffectTypes.AsyncRE<{}, E, A>): Ex.Exit<E, A> {
    this.sync = true

    this.loop(run as any)

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.completed!
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

/* adapted from https://github.com/rzeigler/waveguide */

import { FiberImpl } from "../../../Effect/Fiber"
import type { Either } from "../../../Either"
import * as Ex from "../../../Exit"
import type { FunctionN, Lazy } from "../../../Function"
import * as Common from "../../Common"
import { DoublyLinkedList } from "../../DoublyLinkedList"
import { defaultRuntime } from "../../Runtime"

import { Driver } from "./Driver"
import {
  FoldFrame,
  FoldFrameTag,
  Frame,
  FrameType,
  InterruptFrame,
  InterruptFrameTag,
  MapFrame,
  MapFrameTag,
  InterruptRegionFrame,
  RefInterruptRegionFrame
} from "./Frame"

export const setExitSymbol = Symbol()

export interface SetExit {
  _tag: typeof setExitSymbol
  exit: Ex.Exit<any, any>
}

export function setExit(exit: Ex.Exit<any, any>): SetExit {
  return {
    _tag: setExitSymbol,
    exit
  }
}

export function isSetExit(u: any): u is SetExit {
  return typeof u !== "undefined" && u !== null && u["_tag"] === setExitSymbol
}

export class Supervisor {
  fibers = new DoublyLinkedList<Driver<any, any>>()

  add(driver: Driver<any, any>) {
    const node = this.fibers.add(driver)

    driver.onExit((fibExit) => {
      if (fibExit._tag === "Done") {
        this.fibers.remove(node)
      } else if (
        fibExit._tag === "Interrupt" &&
        fibExit.errors._tag === "None" &&
        fibExit.next._tag === "None"
      ) {
        this.fibers.remove(node)
      } else if (fibExit._tag === "Raise" || fibExit._tag === "Abort") {
        this.fibers.remove(node)
      }
    })
  }

  complete(a: Ex.Exit<any, any>, driver: DriverImpl<any, any>) {
    const fiber = this.fibers.shift()

    if (fiber === undefined) {
      driver.complete(a)
      return
    }

    fiber.onExit((fibExit) => {
      if (
        fibExit._tag === "Interrupt" &&
        (fibExit.errors._tag === "Some" || fibExit.next._tag === "Some")
      ) {
        if (a._tag === "Done") {
          this.complete(Ex.combinedCause(Ex.abort(a.value))(fibExit), driver)
        } else {
          this.complete(Ex.combinedCause(a)(fibExit), driver)
        }
      } else {
        this.complete(a, driver)
      }
    })

    if (!fiber.completed) {
      fiber.interrupt()
    }
  }
}

export class EnvFrame {
  constructor(readonly current: any, readonly previous: EnvFrame | undefined) {}
}

export class ListenersFrame<E, A> {
  constructor(
    readonly f: FunctionN<[Ex.Exit<E, A>], void>,
    readonly next: ListenersFrame<E, A> | undefined
  ) {}
}

export class DriverImpl<E, A> implements Driver<E, A> {
  completed: Ex.Exit<E, A> | undefined = undefined
  listeners = new DoublyLinkedList<FunctionN<[Ex.Exit<E, A>], void>>()
  interrupted = false
  frameStack: FrameType | undefined
  interruptRegionStack: RefInterruptRegionFrame = new RefInterruptRegionFrame(undefined)
  cancelAsync: Common.AsyncCancelContFn | undefined
  envStack: EnvFrame | undefined
  supervisor: Supervisor | undefined

  constructor(initialEnv?: any) {
    if (initialEnv) {
      this.envStack = new EnvFrame(initialEnv, undefined)
    }
  }

  done(a: Ex.Exit<E, A>) {
    if (this.supervisor) {
      this.supervisor.complete(a, this)
      return
    }
    this.complete(a)
  }

  isComplete(): boolean {
    return this.completed !== undefined
  }

  complete(a: Ex.Exit<E, A>): void {
    this.completed = a
    this.listeners.forEach((f) => {
      f(a)
    })
  }

  onExit(f: FunctionN<[Ex.Exit<E, A>], void>): Lazy<void> {
    if (this.completed !== undefined) {
      f(this.completed)
    }

    const node = this.listeners.add(f)

    return () => {
      this.listeners.remove(node)
    }
  }

  exit(): Ex.Exit<E, A> | undefined {
    return this.completed
  }

  isInterruptible(): boolean {
    return this.interruptRegionStack.ref?.current === false ? false : true
  }

  handle(e: Ex.Cause<unknown>): Common.Instructions | undefined {
    let frame = this.frameStack
    this.frameStack = this.frameStack?.p

    while (frame !== undefined) {
      if (
        frame._tag === FoldFrameTag &&
        (e._tag !== "Interrupt" || !this.isInterruptible())
      ) {
        return frame.recover(e)
      }
      // We need to make sure we leave an interrupt region or environment provision region while unwinding on errors
      if (frame._tag === InterruptFrameTag) {
        frame.exitRegion()
      }
      frame = this.frameStack
      this.frameStack = this.frameStack?.p
    }
    // At the end... so we have failed
    this.done(e as Ex.Cause<E>)
    return
  }

  dispatchResumeInterrupt({ errors }: { errors?: unknown[] }) {
    if (errors && errors.length === 1 && isSetExit(errors[0])) {
      this.done(errors[0].exit)
    } else {
      const go = this.handle(Ex.interruptWithError(...(errors || [])))
      if (go) {
        // eslint-disable-next-line
        this.loop(go)
      }
    }
  }

  resumeInterrupt(errors?: unknown[]): void {
    defaultRuntime.dispatch(this.dispatchResumeInterrupt.bind(this), { errors })
  }

  next(value: unknown): Common.Instructions | undefined {
    const frame = this.frameStack
    this.frameStack = this.frameStack?.p

    if (frame !== undefined) {
      if (frame._tag === MapFrameTag && !this.frameStack) {
        this.done(Ex.done(frame.f(value)) as Ex.Done<A>)
        return
      }
      return frame.apply(value) as any
    }

    this.done(Ex.done(value) as Ex.Done<A>)
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

  ISupervised(_: Common.ISupervised<any, any, any, any>) {
    const driver = new DriverImpl<E, A>(this.envStack?.current || {})
    const fiber = new FiberImpl(driver, _.name)
    if (!this.supervisor) {
      this.supervisor = new Supervisor()
    }
    this.supervisor.add(driver)
    driver.start(_.effect)
    return this.next(fiber)
  }

  IAccessEnv(_: Common.IAccessEnv) {
    const env = this.envStack?.current || {}
    return this.next(env)
  }

  IProvideEnv(_: Common.IProvideEnv<any, any, any, any>) {
    this.envStack = new EnvFrame(_.r as any, this.envStack)

    return new Common.ICollapse(
      _.e as any,
      (e) => {
        this.envStack = this.envStack?.previous
        return new Common.ICompleted(e) as any
      },
      (r) => {
        this.envStack = this.envStack?.previous
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
    this.contextSwitch(_.e)
    return undefined
  }

  IChain(_: Common.IChain<any, any, any, any, any, any, any, any>) {
    this.frameStack = new Frame(_.f as any, this.frameStack)
    return _.e as any
  }

  IMap(_: Common.IMap<any, any, any, any, any>) {
    this.frameStack = new MapFrame(_.f, this.frameStack)
    return _.e as any
  }

  ICollapse(
    _: Common.ICollapse<any, any, any, any, any, any, any, any, any, any, any, any>
  ) {
    this.frameStack = new FoldFrame(_.success as any, _.failure as any, this.frameStack)
    return _.inner as any
  }

  IInterruptibleRegion(_: Common.IInterruptibleRegion<any, any, any, any>) {
    this.interruptRegionStack.ref = new InterruptRegionFrame(
      _.int,
      this.interruptRegionStack.ref
    )
    this.frameStack = new InterruptFrame(this.interruptRegionStack, this.frameStack)
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
        current = this[current._tag](current as any)
      } catch (e) {
        current = new Common.IRaised({
          _tag: "Abort",
          abortedWith: e,
          next: {
            _tag: "None"
          }
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
  startSync(run: Common.EffectTypes.SyncRE<{}, E, A>): Ex.Exit<E, A> {
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

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
  InterruptRegionFrame,
  MapFrame,
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
  fibers = new DoublyLinkedList<{ name?: string; driver: Driver<any, any> }>()

  add(driver: Driver<any, any>, name?: string) {
    const node = this.fibers.add({ driver, name })

    driver.onExit(() => {
      if (!node.removed) {
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

    fiber.driver.onExit((fibExit) => {
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

    if (!fiber.driver.completed) {
      fiber.driver.interrupt()
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

  dispatchResumeInterrupt({
    causedBy,
    errors
  }: {
    errors?: unknown[]
    causedBy?: Ex.Cause<unknown>
  }) {
    let comboCause = causedBy

    if (errors && errors.length === 1 && isSetExit(errors[0])) {
      if (
        errors[0].exit._tag === "Interrupt" &&
        errors[0].exit.causedBy._tag === "Some"
      ) {
        comboCause = errors[0].exit.causedBy.value
      }

      if (
        errors[0].exit._tag === "Interrupt" &&
        errors[0].exit.errors._tag === "Some"
      ) {
        errors.push(...errors[0].exit.errors.value)
      }

      errors.shift()
    }

    const go = this.handle(
      comboCause
        ? Ex.causedBy(comboCause)(Ex.interruptWithError(...(errors || [])))
        : Ex.interruptWithError(...(errors || []))
    )
    if (go) {
      // eslint-disable-next-line
      this.loop(go)
    }
  }

  resumeInterrupt(errors?: unknown[], causedBy?: Ex.Cause<unknown>): void {
    defaultRuntime.dispatch(this.dispatchResumeInterrupt.bind(this), {
      errors,
      causedBy
    })
  }

  next(value: unknown): Common.Instructions | undefined {
    const frame = this.frameStack
    this.frameStack = this.frameStack?.p

    if (frame !== undefined) {
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

  loop(go: Common.Instructions): void {
    let current: Common.Instructions | undefined = go

    while (current && (!this.interrupted || !this.isInterruptible())) {
      try {
        switch (current._tag) {
          case "IAccessEnv": {
            const env = this.envStack?.current || {}
            current = this.next(env)
            break
          }
          case "IAccessInterruptible": {
            current = new Common.IPure(current.f(this.isInterruptible()))
            break
          }
          case "IAccessRuntime": {
            current = new Common.IPure(current.f(defaultRuntime))
            break
          }
          case "IAsync": {
            this.contextSwitch(current.e)
            current = undefined
            break
          }
          case "IChain": {
            this.frameStack = new Frame(current.f as any, this.frameStack)
            current = current.e as any
            break
          }
          case "ICollapse": {
            this.frameStack = new FoldFrame(
              current.success as any,
              current.failure as any,
              this.frameStack
            )
            current = current.inner as any
            break
          }
          case "ICompleted": {
            if (current.e._tag === "Done") {
              current = this.next(current.e.value)
            } else {
              current = this.handle(current.e)
            }
            break
          }
          case "IInterruptibleRegion": {
            this.interruptRegionStack.ref = new InterruptRegionFrame(
              current.int,
              this.interruptRegionStack.ref
            )
            this.frameStack = new InterruptFrame(
              this.interruptRegionStack,
              this.frameStack
            )
            current = current.e as any
            break
          }
          case "IMap": {
            this.frameStack = new MapFrame(current.f, this.frameStack)
            current = current.e as any
            break
          }
          case "IProvideEnv": {
            this.envStack = new EnvFrame(current.r as any, this.envStack)

            current = new Common.ICollapse(
              current.e as any,
              (e) => {
                this.envStack = this.envStack?.previous
                return new Common.ICompleted(e) as any
              },
              (r) => {
                this.envStack = this.envStack?.previous
                return new Common.ICompleted(Ex.done(r)) as any
              }
            )

            break
          }
          case "IPure": {
            current = this.next(current.a)
            break
          }
          case "IPureEither": {
            if (current.a._tag === "Right") {
              current = this.next(current.a.right)
            } else {
              current = this.handle(Ex.raise(current.a.left))
            }
            break
          }
          case "IPureOption": {
            if (current.a._tag === "Some") {
              current = this.next(current.a.value)
            } else {
              current = this.handle(Ex.raise(current.onEmpty()))
            }
            break
          }
          case "IRaised": {
            if (current.e._tag === "Interrupt") {
              this.interrupted = true
            }
            current = this.handle(current.e)
            break
          }
          case "ISupervised": {
            const driver = new DriverImpl<E, A>(this.envStack?.current || {})
            const fiber = new FiberImpl(driver, current.name)
            if (!this.supervisor) {
              this.supervisor = new Supervisor()
            }
            this.supervisor.add(driver, current.name)
            driver.start(current.effect)
            current = this.next(fiber)
            break
          }
          case "ISuspended": {
            current = current.e() as any
            break
          }
        }
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

  interrupt(causedBy?: Ex.Cause<unknown>): void {
    if (this.interrupted || this.isComplete()) {
      return
    }
    this.interrupted = true
    if (this.cancelAsync && this.isInterruptible()) {
      this.cancelAsync((...errors) => {
        this.resumeInterrupt(errors, causedBy)
      })
    }
  }
}

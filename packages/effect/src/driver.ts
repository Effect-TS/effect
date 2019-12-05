/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/driver.ts
 */

import { Either, fold as foldEither } from "fp-ts/lib/Either";
import { FunctionN, Lazy } from "fp-ts/lib/function";
import {
  Cause,
  Done,
  done,
  Exit,
  ExitTag,
  interrupt as interruptExit,
  raise
} from "./original/exit";
import { defaultRuntime, Runtime } from "./original/runtime";
import { NoEnv } from "./effect";
import * as T from "./effect";

export type RegionFrameType = InterruptFrame;
export type FrameType = Frame | FoldFrame | RegionFrameType | MapFrame;

interface Frame {
  readonly _tag: "frame";
  apply(u: unknown): T.Instructions;
}

const makeFrame = (f: FunctionN<[unknown], T.Instructions>): Frame => ({
  _tag: "frame",
  apply: f
});

interface FoldFrame {
  readonly _tag: "fold-frame";
  apply(u: unknown): T.Instructions;
  recover(cause: Cause<unknown>): T.Instructions;
}

class FoldFrame implements FoldFrame {
  constructor(private readonly c: T.Collapse) {}
  readonly _tag = "fold-frame" as const;

  apply(u: unknown): T.Instructions {
    return this.c.f2(u);
  }
  recover(cause: Cause<unknown>): T.Instructions {
    return this.c.f1(cause);
  }
}

interface MapFrame {
  readonly _tag: "map-frame";
  apply(u: unknown): unknown;
}

class MapFrame implements MapFrame {
  constructor(private readonly c: T.Map) {}
  readonly _tag = "map-frame" as const;

  apply(u: unknown): unknown {
    return this.c.f1(u);
  }
}

interface InterruptFrame {
  readonly _tag: "interrupt-frame";
  apply(u: unknown): T.Instructions;
  exitRegion(): void;
}

const makeInterruptFrame = (interruptStatus: boolean[]): InterruptFrame => ({
  _tag: "interrupt-frame",
  apply(u: unknown) {
    interruptStatus.pop();
    return T.EffectIO.fromEffect(T.pure(u));
  },
  exitRegion() {
    interruptStatus.pop();
  }
});

export interface Driver<E, A> {
  start(run: T.Effect<T.NoEnv, E, A>): void;
  interrupt(): void;
  onExit(f: FunctionN<[Exit<E, A>], void>): Lazy<void>;
  completed: Exit<E, A> | null;
}

export class DriverImpl<E, A> implements Driver<E, A> {
  completed: Exit<E, A> | null = null;
  listeners: FunctionN<[Exit<E, A>], void>[] | undefined;

  started = false;
  interrupted = false;
  frameStack: FrameType[] = [];
  interruptRegionStack: boolean[] | undefined;
  isInterruptible_ = true;
  cancelAsync: Lazy<void> | undefined;
  envStack: any[] = [];

  constructor(readonly runtime: Runtime = defaultRuntime) {}

  set(a: Exit<E, A>): void {
    this.completed = a;
    if (this.listeners !== undefined) {
      for (const f of this.listeners) {
        f(a);
      }
    }
  }

  isComplete(): boolean {
    return this.completed !== null;
  }
  complete(a: Exit<E, A>): void {
    if (this.completed !== null) {
      throw new Error("Die: Completable is already completed");
    }
    this.set(a);
  }
  tryComplete(a: Exit<E, A>): boolean {
    if (this.completed !== null) {
      return false;
    }
    this.set(a);
    return true;
  }

  onExit(f: FunctionN<[Exit<E, A>], void>): Lazy<void> {
    if (this.completed !== null) {
      f(this.completed);
    }
    if (this.listeners === undefined) {
      this.listeners = [f];
    } else {
      this.listeners.push(f);
    }
    return () => {
      if (this.listeners !== undefined) {
        this.listeners = this.listeners.filter(cb => cb !== f);
      }
    };
  }

  exit(): Exit<E, A> | null {
    return this.completed;
  }

  isInterruptible(): boolean {
    return this.interruptRegionStack !== undefined &&
      this.interruptRegionStack.length > 0
      ? this.interruptRegionStack[this.interruptRegionStack.length - 1]
      : true;
  }

  // canRecover(cause: Cause<unknown>): boolean {
  //   // It is only possible to recovery from interrupts in an uninterruptible region
  //   return cause._tag === ExitTag.Interrupt ? !this.isInterruptible() : true;
  // }

  handle(e: Cause<unknown>): T.Instructions | undefined {
    let frame = this.frameStack.pop();
    while (frame) {
      if (
        frame._tag === "fold-frame" &&
        (e._tag !== ExitTag.Interrupt || !this.isInterruptible())
      ) {
        return frame.recover(e);
      }
      // We need to make sure we leave an interrupt region or environment provision region while unwinding on errors
      if (frame._tag === "interrupt-frame") {
        frame.exitRegion();
      }
      frame = this.frameStack.pop();
    }
    // At the end... so we have failed
    this.complete(e as Cause<E>);
    return;
  }

  resumeInterrupt(): void {
    this.runtime.dispatch(() => {
      const go = this.handle(interruptExit);
      if (go) {
        // eslint-disable-next-line
        this.loop(go);
      }
    });
  }

  next(value: unknown): T.Instructions | undefined {
    const frame = this.frameStack.pop();

    if (frame) {
      switch (frame._tag) {
        case "map-frame": {
          return new T.EffectIO(T.EffectTag.Pure, frame.apply(value));
        }
        default:
          return frame.apply(value);
      }
    }
    this.complete(done(value) as Done<A>);
    return;
  }

  resume(status: Either<unknown, unknown>): void {
    this.cancelAsync = undefined;
    this.runtime.dispatch(() => {
      foldEither(
        (cause: unknown) => {
          const go = this.handle(raise(cause));
          if (go) {
            /* eslint-disable-next-line */
            this.loop(go);
          }
        },
        (value: unknown) => {
          const go = this.next(value);
          if (go) {
            /* eslint-disable-next-line */
            this.loop(go);
          }
        }
      )(status);
    });
  }

  contextSwitch(
    op: FunctionN<[FunctionN<[Either<unknown, unknown>], void>], Lazy<void>>
  ): void {
    let complete = false;
    const wrappedCancel = op(status => {
      if (complete) {
        return;
      }
      complete = true;
      this.resume(status);
    });
    this.cancelAsync = () => {
      complete = true;
      wrappedCancel();
    };
  }

  // tslint:disable-next-line: cyclomatic-complexity
  loop(go: T.Instructions): void {
    let current: T.Instructions | undefined = go;

    while (current && (!this.isInterruptible() || !this.interrupted)) {
      try {
        switch (current._tag) {
          case T.EffectTag.AccessEnv:
            const env =
              this.envStack.length > 0
                ? this.envStack[this.envStack.length - 1]
                : {};
            current = this.next(env);
            break;
          case T.EffectTag.ProvideEnv:
            this.envStack.push(current.f1 as any);
            current = T.EffectIO.fromEffect(
              T.effect.chainError(
                T.effect.chain(current.f0 as any, r =>
                  T.sync(() => {
                    this.envStack.pop();
                    return r;
                  })
                ),
                e =>
                  T.effect.chain(
                    T.sync(() => {
                      this.envStack.pop();
                      return {};
                    }),
                    _ => T.raiseError(e)
                  )
              )
            );
            break;
          case T.EffectTag.Pure:
            current = this.next(current.f0);
            break;
          case T.EffectTag.Raised:
            if (current.f0._tag === ExitTag.Interrupt) {
              this.interrupted = true;
            }
            current = this.handle(current.f0);
            break;
          case T.EffectTag.Completed:
            if (current.f0._tag === ExitTag.Done) {
              current = this.next(current.f0.value);
            } else {
              current = this.handle(current.f0);
            }
            break;
          case T.EffectTag.Suspended:
            current = current.f0();
            break;
          case T.EffectTag.Async:
            this.contextSwitch(current.f0);
            current = undefined;
            break;
          case T.EffectTag.Chain:
            this.frameStack.push(makeFrame(current.f1));
            current = current.f0;
            break;
          case T.EffectTag.Map:
            this.frameStack.push(new MapFrame(current));
            current = current.f0;
            break;
          case T.EffectTag.Collapse:
            this.frameStack.push(new FoldFrame(current));
            current = current.f0;
            break;
          case T.EffectTag.InterruptibleRegion:
            if (this.interruptRegionStack === undefined) {
              this.interruptRegionStack = [current.f0];
            } else {
              this.interruptRegionStack.push(current.f0);
            }
            this.frameStack.push(makeInterruptFrame(this.interruptRegionStack));
            current = current.f1;
            break;
          case T.EffectTag.AccessRuntime:
            current = T.EffectIO.fromEffect(T.pure(current.f0(this.runtime)));
            break;
          case T.EffectTag.AccessInterruptible:
            current = T.EffectIO.fromEffect(
              T.pure(current.f0(this.isInterruptible()))
            );
            break;
          default:
            throw new Error(`Die: Unrecognized current type ${current}`);
        }
      } catch (e) {
        current = T.EffectIO.fromEffect(T.raiseAbort(e));
      }
    }
    // If !current then the interrupt came to late and we completed everything
    if (this.interrupted && current) {
      this.resumeInterrupt();
    }
  }

  start(run: T.Effect<NoEnv, E, A>): void {
    if (this.started) {
      throw new Error("Bug: Runtime may not be started multiple times");
    }
    this.started = true;
    this.runtime.dispatch(() => this.loop(T.EffectIO.fromEffect(run)));
  }

  interrupt(): void {
    if (this.interrupted || this.isComplete()) {
      return;
    }
    this.interrupted = true;
    if (this.cancelAsync && this.isInterruptible()) {
      this.cancelAsync();
      this.resumeInterrupt();
    }
  }
}

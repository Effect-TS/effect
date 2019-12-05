/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/driver.ts
 */

import { Either, fold as foldEither, isLeft } from "fp-ts/lib/Either";
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
import * as ex from "./original/exit";

export type RegionFrameType = InterruptFrame;
export type FrameType = FoldFrame | RegionFrameType;

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

function tryM<A>(f: (a: A) => T.Instructions): T.Instructions {
  return new T.EffectIO(T.EffectTag.TryM, f);
}

function tryS<A, B>(f: (a: A) => B): T.Instructions {
  return new T.EffectIO(T.EffectTag.TryS, f);
}

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
  interruptRegionStack: boolean[] = [];
  isInterruptible_ = true;
  cancelAsync: Lazy<void> | undefined;
  envStack: any[] = [];
  callStack: T.Instructions[] = [];
  badly: Cause<E> | undefined = undefined;

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

  handle(e: Cause<unknown>): T.Instructions | undefined {
    while (
      this.callStack.length > 0 &&
      this.callStack[this.callStack.length - 1]._tag !== T.EffectTag.Frame
    ) {
      this.callStack.pop();
    }

    const frameIns = this.callStack.pop();

    if (frameIns && frameIns._tag === T.EffectTag.Frame) {
      const frame = frameIns.f0;

      if (
        frame._tag === "fold-frame" &&
        (e._tag !== ExitTag.Interrupt || !this.isInterruptible())
      ) {
        return frame.recover(e);
      }

      if (frame._tag === "interrupt-frame") {
        frame.exitRegion();
      }
    }

    this.badly = e as Cause<E>;

    return;
  }

  resumeInterrupt(): void {
    this.runtime.dispatch(() => {
      const handler = this.handle(interruptExit);

      if (handler) {
        this.callStack.push(handler);
      }

      this.loop();
    });
  }

  resume(status: Either<unknown, unknown>): void {
    this.cancelAsync = undefined;
    this.runtime.dispatch(() => {
      foldEither(
        (cause: unknown) => {
          this.callStack.push(T.EffectIO.fromEffect(T.raised(raise(cause))));
          this.loop();
        },
        (value: unknown) => {
          this.loop(value);
        }
      )(status);
    });
  }

  contextSwitch(
    op: FunctionN<[FunctionN<[Either<unknown, unknown>], void>], Lazy<void>>
  ): void {
    const wrappedCancel = op(status => {
      if (isLeft(status)) {
        this.callStack.push(
          T.EffectIO.fromEffect(T.raised(raise(status.left)))
        );
      } else {
        this.callStack.push(T.EffectIO.fromEffect(T.pure(status.right)));
      }
      this.loop();
    });
    this.cancelAsync = () => {
      wrappedCancel();
    };
  }

  // tslint:disable-next-line: cyclomatic-complexity
  loop(ddd?: unknown): void {
    let data = ddd;

    while (!this.isInterruptible() || !this.interrupted) {
      const current: T.Instructions | undefined = this.callStack.pop();

      if (!current) {
        if (this.badly) {
          this.complete(this.badly);
        } else {
          this.complete(done(data) as Done<A>);
        }
        return;
      }

      try {
        switch (current._tag) {
          case T.EffectTag.Frame:
            if (current.f0._tag === "fold-frame") {
              if (this.badly) {
                this.callStack.push(current.f0.recover(this.badly));
              } else {
                this.callStack.push(current.f0.apply(data));
              }
            } else {
              this.callStack.push(current.f0.apply(data));
            }
            break;
          case T.EffectTag.AccessEnv:
            data =
              this.envStack.length > 0
                ? this.envStack[this.envStack.length - 1]
                : {};
            break;
          case T.EffectTag.ProvideEnv:
            this.envStack.push(current.f1);

            this.callStack.push(
              T.EffectIO.fromEffect(
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
              )
            );
            break;
          case T.EffectTag.Pure:
            data = current.f0;
            break;
          case T.EffectTag.Raised:
            if (current.f0._tag === ExitTag.Interrupt) {
              this.interrupted = true;
            }
            const handler = this.handle(current.f0);
            if (handler) {
              this.callStack.push(handler);
            }
            break;
          case T.EffectTag.Completed:
            if (current.f0._tag === ExitTag.Done) {
              data = current.f0.value;
            } else {
              const handler = this.handle(current.f0);
              if (handler) {
                this.callStack.push(handler);
              }
            }
            break;
          case T.EffectTag.Suspended:
            this.callStack.push(current.f0());
            break;
          case T.EffectTag.Async:
            this.contextSwitch(current.f0);
            return;
          case T.EffectTag.TryM:
            this.callStack.push(current.f0(data));
            break;
          case T.EffectTag.TryS:
            try {
              data = current.f0(data);
            } catch (e) {
              this.callStack.push(T.EffectIO.fromEffect(T.raiseError(e)));
            }
            break;
          case T.EffectTag.Chain:
            this.callStack.push(tryM(current.f1));
            this.callStack.push(current.f0);
            break;
          case T.EffectTag.Map:
            this.callStack.push(tryS(current.f1));
            this.callStack.push(current.f0);
            break;
          case T.EffectTag.Collapse:
            this.callStack.push({
              _tag: T.EffectTag.Frame,
              f0: new FoldFrame(current)
            });
            this.callStack.push(current.f0);
            break;
          case T.EffectTag.InterruptibleRegion:
            this.interruptRegionStack.push(current.f0);
            this.callStack.push({
              _tag: T.EffectTag.Frame,
              f0: makeInterruptFrame(this.interruptRegionStack)
            });
            this.callStack.push(current.f1);
            break;
          case T.EffectTag.AccessRuntime:
            data = current.f0(this.runtime);
            break;
          case T.EffectTag.AccessInterruptible:
            data = current.f0(this.isInterruptible());
            break;
          default:
            throw new Error(`Die: Unrecognized current type ${current}`);
        }
      } catch (e) {
        this.callStack.push(T.EffectIO.fromEffect(T.raiseAbort(e)));
      }
    }

    if (this.interrupted) {
      this.complete(ex.interrupt);
    }
  }

  start(run: T.Effect<NoEnv, E, A>): void {
    if (this.started) {
      throw new Error("Bug: Runtime may not be started multiple times");
    }
    this.started = true;
    this.callStack.push(T.EffectIO.fromEffect(run));
    this.runtime.dispatch(() => this.loop());
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

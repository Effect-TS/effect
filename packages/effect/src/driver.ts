/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/driver.ts
 */

import { either as E, function as F, option as O, array as A } from "fp-ts";
import {
  Cause,
  Done,
  done,
  Exit,
  interrupt as interruptExit,
  raise
} from "./original/exit";
import { defaultRuntime, Runtime } from "./original/runtime";
import * as T from "./effect";
import * as L from "./list";
import { pipe } from "fp-ts/lib/pipeable";

export type RegionFrameType = InterruptFrame;
export type FrameType = Frame | FoldFrame | RegionFrameType | MapFrame;

interface Frame {
  readonly _tag: "frame";
  readonly prev: FrameType | undefined;
  readonly apply: (u: unknown) => T.Instructions;
}

class Frame implements Frame {
  constructor(
    readonly apply: (u: unknown) => T.Instructions,
    readonly prev: FrameType | undefined
  ) {}
  readonly _tag = "frame" as const;
}

interface FoldFrame {
  readonly _tag: "fold-frame";
  readonly prev: FrameType | undefined;
  readonly apply: (u: unknown) => T.Instructions;
  readonly recover: (cause: Cause<unknown>) => T.Instructions;
}

class FoldFrame implements FoldFrame {
  constructor(
    readonly apply: (u: unknown) => T.Instructions,
    readonly recover: (cause: Cause<unknown>) => T.Instructions,
    readonly prev: FrameType | undefined
  ) {}
  readonly _tag = "fold-frame" as const;
}

interface MapFrame {
  readonly _tag: "map-frame";
  readonly prev: FrameType | undefined;
  readonly apply: (u: unknown) => unknown;
}

class MapFrame implements MapFrame {
  constructor(
    readonly apply: (u: unknown) => unknown,
    readonly prev: FrameType | undefined
  ) {}
  readonly _tag = "map-frame" as const;
}

interface InterruptFrame {
  readonly _tag: "interrupt-frame";
  readonly prev: FrameType | undefined;
  readonly apply: (u: unknown) => T.Instructions;
  readonly exitRegion: () => void;
}

const makeInterruptFrame = (
  interruptStatus: boolean[],
  prev: FrameType | undefined
): InterruptFrame => ({
  prev,
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
  interrupt(cb: (is: T.InterruptionState) => void): void;
  onExit(f: F.FunctionN<[Exit<E, A>], void>): T.Interruptor;
  completed: Exit<E, A> | null;
}

export class DriverImpl<E, A> implements Driver<E, A> {
  completed: Exit<E, A> | null = null;
  listeners: F.FunctionN<[Exit<E, A>], void>[] | undefined;

  started = false;
  interrupted = false;
  currentFrame: FrameType | undefined = undefined;
  interruptRegionStack: boolean[] | undefined;
  cancelAsync: T.Interruptor | undefined;
  envStack = L.empty<any>();
  interruptionStates: T.InterruptionState[] = [];
  interruptionListeners: ((is: T.InterruptionState) => void)[] = [];

  constructor(readonly runtime: Runtime = defaultRuntime) {
    this.set = this.set.bind(this);
    this.start = this.start.bind(this);
    this.callInterruptListeners = this.callInterruptListeners.bind(this);
    this.resumeInterrupt = this.resumeInterrupt.bind(this);
    this.resume = this.resume.bind(this);
    this.onExit = this.onExit.bind(this);
    this.next = this.next.bind(this);
    this.loop = this.loop.bind(this);
    this.isInterruptible = this.isInterruptible.bind(this);
    this.isComplete = this.isComplete.bind(this);
    this.interrupt = this.interrupt.bind(this);
    this.handle = this.handle.bind(this);
    this.foldResume = this.foldResume.bind(this);
    this.exit = this.exit.bind(this);
    this.dispatchResumeInterrupt = this.dispatchResumeInterrupt.bind(this);
    this.contextSwitch = this.contextSwitch.bind(this);
    this.complete = this.complete.bind(this);
  }

  set(a: Exit<E, A>): void {
    if (a._tag === "Interrupt") {
      const state = pipe(
        this.interruptionStates,
        A.foldMap(T.monoidIS)(F.identity)
      );
      a.state.errors = T.monoidIS.concat(a.state, state).errors;
    }
    this.completed = a;
    if (this.listeners !== undefined) {
      for (const f of this.listeners) {
        f(a);
      }
    }
    if (a._tag === "Interrupt") {
      this.callInterruptListeners();
    }
  }

  isComplete(): boolean {
    return this.completed !== null;
  }

  complete(a: Exit<E, A>): void {
    /* istanbul ignore if */
    if (this.completed !== null) {
      throw new Error("Die: Completable is already completed");
    }
    this.set(a);
  }

  onExit(f: F.FunctionN<[Exit<E, A>], void>): T.Interruptor {
    if (this.completed !== null) {
      f(this.completed);
    }
    if (this.listeners === undefined) {
      this.listeners = [f];
    } else {
      this.listeners.push(f);
    }
    // TODO: figure how to trigger if possible
    /* istanbul ignore next */
    return cb => {
      if (this.listeners !== undefined) {
        this.listeners = this.listeners.filter(cb => cb !== f);
      }
      cb(T.interruptSuccess());
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
    let frame = this.currentFrame;
    this.currentFrame = this.currentFrame?.prev;
    while (frame) {
      if (
        frame._tag === "fold-frame" &&
        (e._tag !== "Interrupt" || !this.isInterruptible())
      ) {
        return frame.recover(e);
      }
      // We need to make sure we leave an interrupt region or environment provision region while unwinding on errors
      if (frame._tag === "interrupt-frame") {
        frame.exitRegion();
      }
      frame = this.currentFrame;
      this.currentFrame = this.currentFrame?.prev;
    }
    // At the end... so we have failed
    this.complete(e as Cause<E>);
    return;
  }

  dispatchResumeInterrupt() {
    const go = this.handle(interruptExit);
    if (go) {
      // eslint-disable-next-line
      this.loop(go);
    }
  }

  resumeInterrupt(): void {
    this.runtime.dispatch(this.dispatchResumeInterrupt.bind(this), undefined);
  }

  next(value: unknown): T.Instructions | undefined {
    const frame = this.currentFrame;
    this.currentFrame = this.currentFrame?.prev;

    if (frame) {
      switch (frame._tag) {
        case "map-frame": {
          if (this.currentFrame === undefined) {
            this.complete(done(frame.apply(value)) as Done<A>);
            return;
          }
          return new T.EffectIO(T.EffectTag.Pure, frame.apply(value));
        }
        default:
          return frame.apply(value);
      }
    }
    this.complete(done(value) as Done<A>);
    return;
  }

  foldResume(status: E.Either<unknown, unknown>) {
    E.fold(
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
  }

  resume(status: E.Either<unknown, unknown>): void {
    this.cancelAsync = undefined;
    this.runtime.dispatch(this.foldResume.bind(this), status);
  }

  contextSwitch(
    op: F.FunctionN<
      [F.FunctionN<[E.Either<unknown, unknown>], void>],
      T.Interruptor
    >
  ): void {
    let complete = false;
    const wrappedCancel = op(status => {
      if (complete) {
        return;
      }
      complete = true;
      this.resume(status);
    });
    this.cancelAsync = cb => {
      complete = true;
      wrappedCancel(cb);
    };
  }

  // tslint:disable-next-line: cyclomatic-complexity
  loop(go: T.Instructions): void {
    let current: T.Instructions | undefined = go;

    while (current && (!this.interrupted || !this.isInterruptible())) {
      try {
        switch (current._tag) {
          case T.EffectTag.AccessEnv:
            const env = L.isNotEmpty(this.envStack)
              ? L.lastUnsafe(this.envStack)
              : {};
            current = this.next(env);
            break;
          case T.EffectTag.ProvideEnv:
            L.push(this.envStack, current.f1 as any);
            current = T.EffectIO.fromEffect(
              T.effect.foldExit(
                current.f0 as any,
                e =>
                  T.effect.chain(
                    T.sync(() => {
                      L.popLastUnsafe(this.envStack);
                      return {};
                    }),
                    _ => T.raised(e)
                  ),
                r =>
                  T.sync(() => {
                    L.popLastUnsafe(this.envStack);
                    return r;
                  })
              )
            );
            break;
          case T.EffectTag.Pure:
            current = this.next(current.f0);
            break;
          case T.EffectTag.PureOption: {
            if (O.isSome(current.f0)) {
              current = this.next(current.f0.value);
            } else {
              current = this.handle(raise(current.f1()));
            }
            break;
          }
          case T.EffectTag.PureEither: {
            if (E.isRight(current.f0)) {
              current = this.next(current.f0.right);
            } else {
              current = this.handle(raise(current.f0.left));
            }
            break;
          }
          case T.EffectTag.Raised:
            if (current.f0._tag === "Interrupt") {
              this.interrupted = true;
            }
            current = this.handle(current.f0);
            break;
          case T.EffectTag.Completed:
            if (current.f0._tag === "Done") {
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
            this.currentFrame = new Frame(current.f1, this.currentFrame);
            current = current.f0;
            break;
          case T.EffectTag.Map:
            this.currentFrame = new MapFrame(current.f1, this.currentFrame);
            current = current.f0;
            break;
          case T.EffectTag.Collapse:
            this.currentFrame = new FoldFrame(
              current.f2,
              current.f1,
              this.currentFrame
            );
            current = current.f0;
            break;
          case T.EffectTag.InterruptibleRegion:
            if (this.interruptRegionStack === undefined) {
              this.interruptRegionStack = [current.f0];
            } else {
              this.interruptRegionStack.push(current.f0);
            }
            this.currentFrame = makeInterruptFrame(
              this.interruptRegionStack,
              this.currentFrame
            );
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
            /* istanbul ignore next */
            throw new Error(`Die: Unrecognized current type ${current}`);
        }
      } catch (e) {
        current = T.EffectIO.fromEffect(T.raiseAbort(e));
      }
    }
    if (this.interrupted) {
      if (current) {
        this.resumeInterrupt();
      } else {
        // If !current then the interrupt came to late and we completed everything
        this.interruptionStates.push(
          T.interruptError(
            new Error("interrupt came to late and we completed everything")
          )
        );
        this.callInterruptListeners();
      }
    }
  }

  callInterruptListeners() {
    const state = pipe(
      this.interruptionStates,
      A.foldMap(T.monoidIS)(F.identity)
    );

    this.interruptionListeners.forEach(f => f(state));
  }

  start(run: T.Effect<{}, E, A>): void {
    if (this.started) {
      /* istanbul ignore next */
      throw new Error("Bug: Runtime may not be started multiple times");
    }
    this.started = true;
    this.runtime.dispatch(this.loop.bind(this), run as any);
  }

  interrupt(cb: (is: T.InterruptionState) => void): void {
    if (this.interrupted) {
      cb(T.interruptError(new Error("already interrupted")));
      return;
    }
    if (this.isComplete()) {
      cb(T.interruptError(new Error("already completed")));
      return;
    }
    this.interruptionListeners.push(cb);
    this.interrupted = true;
    if (this.isInterruptible()) {
      if (this.cancelAsync) {
        this.cancelAsync(is => {
          this.interruptionStates.push(is);
          this.resumeInterrupt();
        });
      } else {
        cb(T.interruptSuccess());
      }
      return;
    }
  }
}

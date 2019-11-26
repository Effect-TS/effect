/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/driver.ts
 */

import { Either, fold as foldEither } from "fp-ts/lib/Either";
import { FunctionN, Lazy } from "fp-ts/lib/function";
import { Option } from "fp-ts/lib/Option";
import {
  Cause,
  Done,
  done,
  Exit,
  ExitTag,
  interrupt as interruptExit,
  raise
} from "waveguide/lib/exit";
import { defaultRuntime, Runtime } from "waveguide/lib/runtime";
import { Completable, completable } from "waveguide/lib/support/completable";
import {
  MutableStack,
  mutableStack
} from "waveguide/lib/support/mutable-stack";
import { NoEnv } from ".";
import * as T from "./";

// It turns out th is is used quite often
type UnkIO = T.Effect<unknown, unknown, unknown>;

export type RegionFrameType = InterruptFrame;
export type FrameType = Frame | FoldFrame | RegionFrameType;

interface Frame {
  readonly _tag: "frame";
  apply(u: unknown): UnkIO;
}

const makeFrame = (f: FunctionN<[unknown], UnkIO>): Frame => ({
  _tag: "frame",
  apply: f
});

interface FoldFrame {
  readonly _tag: "fold-frame";
  apply(u: unknown): UnkIO;
  recover(cause: Cause<unknown>): UnkIO;
}

const makeFoldFrame = (
  f: FunctionN<[unknown], UnkIO>,
  r: FunctionN<[Cause<unknown>], UnkIO>
): FoldFrame => ({
  _tag: "fold-frame",
  apply: f,
  recover: r
});

interface InterruptFrame {
  readonly _tag: "interrupt-frame";
  apply(u: unknown): UnkIO;
  exitRegion(): void;
}

const makeInterruptFrame = (
  interruptStatus: MutableStack<boolean>
): InterruptFrame => {
  return {
    _tag: "interrupt-frame",
    apply(u: unknown) {
      interruptStatus.pop();
      return T.pure(u) as UnkIO;
    },
    exitRegion() {
      interruptStatus.pop();
    }
  };
};

export interface Driver<E, A> {
  start(run: T.Effect<T.NoEnv, E, A>): void;
  interrupt(): void;
  onExit(f: FunctionN<[Exit<E, A>], void>): Lazy<void>;
  exit(): Option<Exit<E, A>>;
}

export function makeDriver<E, A>(
  runtime: Runtime = defaultRuntime
): Driver<E, A> {
  let started = false;
  let interrupted = false;
  const result: Completable<Exit<E, A>> = completable();
  const frameStack: MutableStack<FrameType> = mutableStack();
  const interruptRegionStack: MutableStack<boolean> = mutableStack();
  let cancelAsync: Lazy<void> | undefined;

  function onExit(f: FunctionN<[Exit<E, A>], void>): Lazy<void> {
    return result.listen(f);
  }

  function exit(): Option<Exit<E, A>> {
    return result.value();
  }

  function isInterruptible(): boolean {
    const flag = interruptRegionStack.peek();
    if (flag === undefined) {
      return true;
    }
    return flag;
  }

  function canRecover(cause: Cause<unknown>): boolean {
    // It is only possible to recovery from interrupts in an uninterruptible region
    if (cause._tag === ExitTag.Interrupt) {
      return !isInterruptible();
    }
    return true;
  }

  function handle(e: Cause<unknown>): UnkIO | undefined {
    let frame = frameStack.pop();
    while (frame) {
      if (frame._tag === "fold-frame" && canRecover(e)) {
        return frame.recover(e);
      }
      // We need to make sure we leave an interrupt region or environment provision region while unwinding on errors
      if (frame._tag === "interrupt-frame") {
        frame.exitRegion();
      }
      frame = frameStack.pop();
    }
    // At the end... so we have failed
    result.complete(e as Cause<E>);
    return;
  }

  function resumeInterrupt(): void {
    runtime.dispatch(() => {
      const go = handle(interruptExit);
      if (go) {
        // eslint-disable-next-line
        loop(go);
      }
    });
  }

  function next(value: unknown): UnkIO | undefined {
    const frame = frameStack.pop();
    if (frame) {
      return frame.apply(value);
    }
    result.complete(done(value) as Done<A>);
    return;
  }

  function resume(status: Either<unknown, unknown>): void {
    cancelAsync = undefined;
    runtime.dispatch(() => {
      foldEither(
        (cause: unknown) => {
          const go = handle(raise(cause));
          if (go) {
            /* eslint-disable-next-line */
            loop(go);
          }
        },
        (value: unknown) => {
          const go = next(value);
          if (go) {
            /* eslint-disable-next-line */
            loop(go);
          }
        }
      )(status);
    });
  }

  function contextSwitch(
    op: FunctionN<[FunctionN<[Either<unknown, unknown>], void>], Lazy<void>>
  ): void {
    let complete = false;
    const wrappedCancel = op(status => {
      if (complete) {
        return;
      }
      complete = true;
      resume(status);
    });
    cancelAsync = () => {
      complete = true;
      wrappedCancel();
    };
  }

  function loop(go: UnkIO): void {
    let current: UnkIO | undefined = go;

    while (current && (!isInterruptible() || !interrupted)) {
      try {
        const cu = current({});

        switch (cu._tag) {
          case T.EffectTag.Pure:
            const pure_ = cu.$R(T.noEnv);
            current = next(pure_.value);
            break;
          case T.EffectTag.Raised:
            const raised_ = cu.$R(T.noEnv);
            if (raised_.error._tag === ExitTag.Interrupt) {
              interrupted = true;
            }
            current = handle(raised_.error);
            break;
          case T.EffectTag.Completed:
            const completed_ = cu.$R(T.noEnv);
            if (completed_.exit._tag === ExitTag.Done) {
              current = next(completed_.exit.value);
            } else {
              current = handle(completed_.exit);
            }
            break;
          case T.EffectTag.Suspended:
            current = cu.$R(T.noEnv).thunk();
            break;
          case T.EffectTag.Async:
            contextSwitch(cu.$R(T.noEnv).op);
            current = undefined;
            break;
          case T.EffectTag.Chain:
            const chain_ = cu.$R(T.noEnv);
            frameStack.push(makeFrame(chain_.bind));
            current = chain_.inner;
            break;
          case T.EffectTag.Collapse:
            const collapse_ = cu.$R(T.noEnv);
            frameStack.push(
              makeFoldFrame(collapse_.success, collapse_.failure)
            );
            current = collapse_.inner;
            break;
          case T.EffectTag.InterruptibleRegion:
            const intreg_ = cu.$R(T.noEnv);
            interruptRegionStack.push(intreg_.flag);
            frameStack.push(makeInterruptFrame(interruptRegionStack));
            current = intreg_.inner;
            break;
          case T.EffectTag.AccessRuntime:
            current = T.pure(cu.$R(T.noEnv).f(runtime)) as UnkIO;
            break;
          case T.EffectTag.AccessEnvironment:
            current = T.pure(cu.$R(T.noEnv)) as UnkIO;
            break;
          case T.EffectTag.AccessInterruptible:
            current = T.pure(cu.$R(T.noEnv).f(isInterruptible())) as UnkIO;
            break;
          default:
            throw new Error(`Die: Unrecognized current type ${current}`);
        }
      } catch (e) {
        current = T.raiseAbort(e) as UnkIO;
      }
    }
    // If !current then the interrupt came to late and we completed everything
    if (interrupted && current) {
      resumeInterrupt();
    }
  }

  function start(run: T.Effect<NoEnv, E, A>): void {
    if (started) {
      throw new Error("Bug: Runtime may not be started multiple times");
    }
    started = true;
    runtime.dispatch(() => loop(run as UnkIO));
  }

  function interrupt(): void {
    if (interrupted || result.isComplete()) {
      return;
    }
    interrupted = true;
    if (cancelAsync && isInterruptible()) {
      cancelAsync();
      resumeInterrupt();
    }
  }

  return {
    start,
    interrupt,
    onExit,
    exit
  };
}

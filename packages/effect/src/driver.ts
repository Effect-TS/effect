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
} from "./original/exit";
import { defaultRuntime, Runtime } from "./original/runtime";
import { Completable, CompletableImpl } from "./original/support/completable";
import { MutableStack, mutableStack } from "./original/support/mutable-stack";
import { NoEnv } from "./effect";
import * as T from "./effect";

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
): InterruptFrame => ({
  _tag: "interrupt-frame",
  apply(u: unknown) {
    interruptStatus.pop();
    return T.pure(u);
  },
  exitRegion() {
    interruptStatus.pop();
  }
});

export interface Driver<E, A> {
  start: (run: T.Effect<T.NoEnv, E, A>) => void;
  interrupt: () => void;
  onExit: (f: FunctionN<[Exit<E, A>], void>) => Lazy<void>;
  exit: () => Option<Exit<E, A>>;
}

export function makeDriver<E, A>(
  runtime: Runtime = defaultRuntime
): Driver<E, A> {
  let started = false;
  let interrupted = false;
  const result: Completable<Exit<E, A>> = new CompletableImpl();
  const frameStack: MutableStack<FrameType> = mutableStack();
  const interruptRegionStack: MutableStack<boolean> = mutableStack();
  let cancelAsync: Lazy<void> | undefined;
  const envStack: Array<any> = [];

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

  // tslint:disable-next-line: cyclomatic-complexity
  function loop(go: UnkIO): void {
    let current: UnkIO | undefined = go;

    while (current && (!isInterruptible() || !interrupted)) {
      try {
        const cu = (current as any) as T.EffectIO<unknown, unknown, unknown>;
        const env = envStack.length > 0 ? envStack[envStack.length - 1] : {};

        switch (cu._tag) {
          case T.EffectTag.AccessEnv:
            current = next(env);
            break;
          case T.EffectTag.ProvideEnv:
            envStack.push(cu.value);
            current = T.effect.chain(cu.effect, r =>
              T.sync(() => {
                envStack.pop();
                return r;
              })
            );
            break;
          case T.EffectTag.Pure:
            current = next(cu.value);
            break;
          case T.EffectTag.Raised:
            if (cu.error._tag === ExitTag.Interrupt) {
              interrupted = true;
            }
            current = handle(cu.error);
            break;
          case T.EffectTag.Completed:
            if (cu.exit._tag === ExitTag.Done) {
              current = next(cu.exit.value);
            } else {
              current = handle(cu.exit);
            }
            break;
          case T.EffectTag.Suspended:
            current = cu.thunk();
            break;
          case T.EffectTag.Async:
            contextSwitch(cu.op);
            current = undefined;
            break;
          case T.EffectTag.Chain:
            frameStack.push(makeFrame(cu.bind));
            current = cu.inner;
            break;
          case T.EffectTag.Collapse:
            frameStack.push(makeFoldFrame(cu.success, cu.failure));
            current = cu.inner;
            break;
          case T.EffectTag.InterruptibleRegion:
            interruptRegionStack.push(cu.flag);
            frameStack.push(makeInterruptFrame(interruptRegionStack));
            current = cu.inner;
            break;
          case T.EffectTag.AccessRuntime:
            current = T.pure(cu.f(runtime)) as UnkIO;
            break;
          case T.EffectTag.AccessInterruptible:
            current = T.pure(cu.f(isInterruptible())) as UnkIO;
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

/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/driver.ts
 */

import { option as O, either as E, function as F } from "fp-ts";
import { Cause, Done, done, Exit, interrupt as interruptExit, raise } from "./original/exit";
import { defaultRuntime } from "./original/runtime";
import * as T from "./effect";
import { DoublyLinkedList } from "./listc";
import { FrameType, Frame, MapFrame, FoldFrame, InterruptFrame } from "./driver";

// the same as Driver but backs runSync
/* istanbul ignore file */

export interface DriverSync<E, A> {
  start(run: T.SyncE<E, A>): E.Either<Error, Exit<E, A>>;
}

export class DriverSyncImpl<E, A> implements DriverSync<E, A> {
  completed: Exit<E, A> | null = null;
  listeners: F.FunctionN<[Exit<E, A>], void>[] | undefined;
  interrupted = false;
  currentFrame: FrameType | undefined = undefined;
  interruptRegionStack: boolean[] | undefined;
  envStack = new DoublyLinkedList<any>();

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
    /* istanbul ignore if */
    if (this.completed !== null) {
      throw new Error("Die: Completable is already completed");
    }
    this.set(a);
  }

  isInterruptible(): boolean {
    return this.interruptRegionStack !== undefined && this.interruptRegionStack.length > 0
      ? this.interruptRegionStack[this.interruptRegionStack.length - 1]
      : true;
  }

  handle(e: Cause<unknown>): T.Instructions | undefined {
    let frame = this.currentFrame;
    this.currentFrame = this.currentFrame?.prev;
    while (frame) {
      if (frame instanceof FoldFrame && (e._tag !== "Interrupt" || !this.isInterruptible())) {
        return frame.recover(e);
      }
      // We need to make sure we leave an interrupt region or environment provision region while unwinding on errors
      if (frame instanceof InterruptFrame) {
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
    this.dispatchResumeInterrupt();
  }

  next(value: unknown): T.Instructions | undefined {
    const frame = this.currentFrame;
    this.currentFrame = this.currentFrame?.prev;

    if (frame) {
      if (frame instanceof MapFrame) {
        if (this.currentFrame === undefined) {
          this.complete(done(frame.apply(value)) as Done<A>);
          return;
        }
        return new T.Pure(frame.apply(value));
      } else {
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
    this.foldResume(status);
  }

  // tslint:disable-next-line: cyclomatic-complexity
  loop(go: T.Instructions): void {
    let current: T.Instructions | undefined = go;

    while (current && (!this.interrupted || !this.isInterruptible())) {
      try {
        if (current instanceof T.IAccessEnv) {
          const env = !this.envStack.empty() ? this.envStack.tail!.value : {};
          current = this.next(env);
        } else if (current instanceof T.IProvideEnv) {
          this.envStack.append(current.r);
          current =
            T.effect.foldExit(
              current.e,
              (e) =>
                T.effect.chain(
                  T.sync(() => {
                    this.envStack.deleteTail();
                    return {};
                  }),
                  (_) => T.raised(e)
                ),
              (r) =>
                T.sync(() => {
                  this.envStack.deleteTail();
                  return r;
                })
            ) as any;
        } else if (current instanceof T.Pure) {
          current = this.next(current.a);
        } else if (current instanceof T.PureOption) {
          if (O.isSome(current.a)) {
            current = this.next(current.a.value);
          } else {
            current = this.handle(raise(current.onEmpty()));
          }
        } else if (current instanceof T.PureEither) {
          if (E.isRight(current.a)) {
            current = this.next(current.a.right);
          } else {
            current = this.handle(raise(current.a.left));
          }
        } else if (current instanceof T.Raised) {
          if (current.e._tag === "Interrupt") {
            this.interrupted = true;
          }
          current = this.handle(current.e);
        } else if (current instanceof T.Completed) {
          if (current.e._tag === "Done") {
            current = this.next(current.e.value);
          } else {
            current = this.handle(current.e);
          }
        } else if (current instanceof T.Suspended) {
          current = current.e() as any;
        } else if (current instanceof T.IAsync) {
          current = undefined;
        } else if (current instanceof T.IChain) {
          this.currentFrame = new Frame(current.f as any, this.currentFrame);
          current = current.e as any;
        } else if (current instanceof T.IMap) {
          this.currentFrame = new MapFrame(current.f, this.currentFrame);
          current = current.e as any;
        } else if (current instanceof T.ICollapse) {
          this.currentFrame = new FoldFrame(
            current.success as any,
            current.failure as any,
            this.currentFrame
          );
          current = current.inner as any;
        } else if (current instanceof T.IInterruptibleRegion) {
          if (this.interruptRegionStack === undefined) {
            this.interruptRegionStack = [current.int];
          } else {
            this.interruptRegionStack.push(current.int);
          }
          this.currentFrame = new InterruptFrame(this.interruptRegionStack, this.currentFrame);
          current = current.e as any;
        } else if (current instanceof T.IAccessRuntime) {
          current = new T.Pure(current.f(defaultRuntime));
        } else if (current instanceof T.IAccessInterruptible) {
          current = new T.Pure(current.f(this.isInterruptible()));
        } else {
          throw new Error(`Die: Unrecognized current type ${current}`);
        }
      } catch (e) {
        current = T.raiseAbort(e);
      }
    }
    // If !current then the interrupt came to late and we completed everything
    if (this.interrupted && current) {
      this.resumeInterrupt();
    }
  }

  start(run: T.SyncRE<{}, E, A>): E.Either<Error, Exit<E, A>> {
    this.loop(run as any);

    if (this.completed !== null) {
      return E.right(this.completed);
    }

    this.interrupt();

    return E.left(new Error("async operations running"));
  }

  interrupt(): void {
    if (this.interrupted || this.isComplete()) {
      return;
    }
    this.interrupted = true;
  }
}

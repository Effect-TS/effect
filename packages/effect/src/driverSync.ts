/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/driver.ts
 */

import { either as E, function as F } from "fp-ts";
import { Cause, Done, done, Exit, interrupt as interruptExit, raise } from "./original/exit";
import { defaultRuntime } from "./original/runtime";
import * as T from "./effect";
import { DoublyLinkedList } from "./listc";
import {
  FrameType,
  Frame,
  MapFrame,
  FoldFrame,
  InterruptFrame,
  FoldFrameTag,
  InterruptFrameTag,
  MapFrameTag
} from "./driver";

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
      if (frame.tag === FoldFrameTag && (e._tag !== "Interrupt" || !this.isInterruptible())) {
        return (frame as FoldFrame).recover(e);
      }
      // We need to make sure we leave an interrupt region or environment provision region while unwinding on errors
      if (frame.tag === InterruptFrameTag) {
        (frame as InterruptFrame).exitRegion();
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
      if (frame.tag === MapFrameTag) {
        if (this.currentFrame === undefined) {
          this.complete(done(frame.apply(value)) as Done<A>);
          return;
        }
        return new T.IPure(frame.apply(value));
      } else {
        return frame.apply(value) as any;
      }
    }
    this.complete(done(value) as Done<A>);
    return;
  }

  foldResume(status: E.Either<unknown, unknown>) {
    if (status._tag === "Right") {
      const go = this.next(status.right);
      if (go) {
        /* eslint-disable-next-line */
        this.loop(go);
      }
    } else {
      const go = this.handle(raise(status.left));
      if (go) {
        /* eslint-disable-next-line */
        this.loop(go);
      }
    }
  }

  resume(status: E.Either<unknown, unknown>): void {
    this.foldResume(status);
  }

  IAccessEnv(_: T.IAccessEnv<any>) {
    const env = !this.envStack.empty() ? this.envStack.tail!.value : {};
    return this.next(env);
  }

  IProvideEnv(_: T.IProvideEnv<any, any, any, any>) {
    this.envStack.append(_.r as any);
    return (
      T.effect.foldExit(
        _.e as any,
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
      ) as any
    );
  }

  IPure(_: T.IPure<A>) {
    return this.next(_.a);
  }

  IPureOption(_: T.IPureOption<any, any>) {
    if (_.a._tag === "Some") {
      return this.next(_.a.value);
    } else {
      return this.handle(raise(_.onEmpty()));
    }
  }

  IPureEither(_: T.IPureEither<any, any>) {
    if (_.a._tag === "Right") {
      return this.next(_.a.right);
    } else {
      return this.handle(raise(_.a.left));
    }
  }

  IRaised(_: T.IRaised<any>) {
    if (_.e._tag === "Interrupt") {
      this.interrupted = true;
    }
    return this.handle(_.e);
  }

  ICompleted(_: T.ICompleted<any, any>) {
    if (_.e._tag === "Done") {
      return this.next(_.e.value);
    } else {
      return this.handle(_.e);
    }
  }

  ISuspended(_: T.ISuspended<any, any, any, any>) {
    return _.e();
  }

  IAsync(_: T.IAsync<any, any>) {
    return undefined;
  }

  IChain(_: T.IChain<any, any, any, any, any, any, any, any>) {
    this.currentFrame = new Frame(_.f as any, this.currentFrame);
    return _.e as any;
  }

  IMap(_: T.IMap<any, any, any, any, any>) {
    this.currentFrame = new MapFrame(_.f, this.currentFrame);
    return _.e as any;
  }

  ICollapse(_: T.ICollapse<any, any, any, any, any, any, any, any, any, any, any, any>) {
    this.currentFrame = new FoldFrame(_.success as any, _.failure as any, this.currentFrame);
    return _.inner as any;
  }

  IInterruptibleRegion(_: T.IInterruptibleRegion<any, any, any, any>) {
    if (this.interruptRegionStack === undefined) {
      this.interruptRegionStack = [_.int];
    } else {
      this.interruptRegionStack.push(_.int);
    }
    this.currentFrame = new InterruptFrame(this.interruptRegionStack, this.currentFrame);
    return _.e as any;
  }

  IAccessRuntime(_: T.IAccessRuntime<any>) {
    return new T.IPure(_.f(defaultRuntime));
  }

  IAccessInterruptible(_: T.IAccessInterruptible<any>) {
    return new T.IPure(_.f(this.isInterruptible()));
  }

  // tslint:disable-next-line: cyclomatic-complexity
  loop(go: T.Instructions): void {
    let current: T.Instructions | undefined = go;

    while (current && (!this.interrupted || !this.isInterruptible())) {
      try {
        current = this[current.tag](current as any);
      } catch (e) {
        current = new T.IRaised({ _tag: "Abort", abortedWith: e });
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

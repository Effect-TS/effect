import { FiberContext } from "@effect/core/io/Fiber/_internal/context";
import { constVoid } from "@tsplus/stdlib/data/Function";

export class Runtime<R> {
  constructor(readonly environment: Env<R>, readonly runtimeConfig: RuntimeConfig) {}

  unsafeRunWith = <E, A>(
    effect: Effect<R, E, A>,
    k: (exit: Exit<E, A>) => void,
    __tsplusTrace?: string
  ): ((fiberId: FiberId) => (_: (exit: Exit<E, A>) => void) => void) => {
    const fiberId = FiberId.unsafeMake(TraceElement.parse(__tsplusTrace));

    const children = new Set<FiberContext<any, any>>();

    const supervisor = this.runtimeConfig.value.supervisor;

    const fiberRefLocals: Map<FiberRef<unknown>, List.NonEmpty<Tuple<[FiberId.Runtime, unknown]>>> = new Map<any, any>([
      [FiberRef.currentEnvironment.value, List.cons(Tuple(fiberId, this.environment), List.nil())],
      [DefaultEnv.services.value, List.cons(Tuple(fiberId, DefaultEnv.Services.live.value), List.nil())]
    ]);

    const context: FiberContext<E, A> = new FiberContext(
      fiberId,
      children,
      fiberRefLocals,
      this.runtimeConfig,
      new Stack(InterruptStatus.Interruptible.toBoolean)
    );

    FiberScope.global.value.unsafeAdd(this.runtimeConfig, context);

    if (supervisor !== Supervisor.none) {
      supervisor.unsafeOnStart(this.environment, effect, Option.none, context);

      context.unsafeOnDone((exit) => supervisor.unsafeOnEnd(exit.flatten(), context));
    }

    context.nextEffect = effect;
    context.run();
    context.unsafeOnDone((exit) => {
      k(exit.flatten());
    });

    return (id) => (k) => this.unsafeRunAsyncWith(context._interruptAs(id), (exit) => k(exit.flatten()));
  };

  /**
   * Executes the effect asynchronously, discarding the result of execution.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunAsync = <E, A>(effect: Effect<R, E, A>, __tsplusTrace?: string): void => {
    return this.unsafeRunAsyncWith(effect, constVoid);
  };

  /**
   * Executes the effect asynchronously, eventually passing the exit value to
   * the specified callback.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunAsyncWith = <E, A>(
    effect: Effect<R, E, A>,
    k: (exit: Exit<E, A>) => void,
    __tsplusTrace?: string
  ): void => {
    this.unsafeRunWith(effect, k);
  };

  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the value of the effect once the effect has been executed, or will be
   * rejected with the first error or exception throw by the effect.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   */
  unsafeRunPromise = <E, A>(
    effect: Effect<R, E, A>,
    __tsplusTrace?: string
  ): Promise<A> => {
    return new Promise((resolve, reject) => {
      this.unsafeRunAsyncWith(effect, (exit) => {
        switch (exit._tag) {
          case "Success": {
            resolve(exit.value);
            break;
          }
          case "Failure": {
            reject(exit.cause.squashWith(identity));
            break;
          }
        }
      });
    });
  };

  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the `Exit` state of the effect once the effect has been executed.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   */
  unsafeRunPromiseExit = <E, A>(
    effect: Effect<R, E, A>,
    __tsplusTrace?: string
  ): Promise<Exit<E, A>> => {
    return new Promise((resolve) => {
      this.unsafeRunAsyncWith(effect, (exit) => {
        resolve(exit);
      });
    });
  };
}

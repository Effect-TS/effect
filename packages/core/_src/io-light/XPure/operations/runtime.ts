import { concreteXPure } from "@effect-ts/core/io-light/XPure/definition/primitives";

type Frame = FoldFrame | ApplyFrame;

class FoldFrame {
  readonly _xptag = "FoldFrame";
  constructor(
    readonly failure: (e: any) => XPure<any, any, any, any, any, any>,
    readonly apply: (e: any) => XPure<any, any, any, any, any, any>
  ) {}
}

class ApplyFrame {
  readonly _xptag = "ApplyFrame";
  constructor(readonly apply: (e: any) => XPure<any, any, any, any, any, any>) {}
}

class Runtime {
  stack: Stack<Frame> | undefined = undefined;

  pop() {
    const nextInstr = this.stack;
    if (nextInstr) {
      this.stack = this.stack?.previous;
    }
    return nextInstr?.value;
  }

  push(cont: Frame) {
    this.stack = new Stack(cont, this.stack);
  }

  findNextErrorHandler() {
    let unwinding = true;
    while (unwinding) {
      const nextInstr = this.pop();

      if (nextInstr == null) {
        unwinding = false;
      } else {
        if (nextInstr._xptag === "FoldFrame") {
          unwinding = false;
          this.push(new ApplyFrame(nextInstr.failure));
        }
      }
    }
  }

  runAll<W, S1, S2, E, A>(
    self: XPure<W, S1, S2, unknown, E, A>,
    s: S1
  ): Tuple<[Chunk<W>, Either<E, Tuple<[S2, A]>>]> {
    let s0 = s as any;
    let a: any = undefined;
    let environments: Stack<any> | undefined = undefined;
    let failed = false;
    let current = self as XPure<any, any, any, any, any, any> | undefined;
    let logs = Chunk.empty<W>();

    while (current != null) {
      concreteXPure(current);
      const xp = current;

      switch (xp._xptag) {
        case "FlatMap": {
          concreteXPure(xp.xpure);
          const nested = xp.xpure;
          const continuation = xp.cont;

          switch (nested._xptag) {
            case "Succeed": {
              current = continuation(nested.value());
              break;
            }
            case "Modify": {
              const updated = nested.run(s0);

              s0 = updated.get(0);
              a = updated.get(1);

              current = continuation(a);
              break;
            }
            default: {
              current = nested;
              this.push(new ApplyFrame(continuation));
            }
          }

          break;
        }
        case "Log": {
          logs = logs.append(xp.w());
          a = undefined;
          const nextInstr = this.pop();
          current = nextInstr?.apply(a);
          break;
        }
        case "Suspend": {
          current = xp.f();
          break;
        }
        case "Succeed": {
          a = xp.value();
          const nextInstr = this.pop();
          if (nextInstr) {
            current = nextInstr.apply(a);
          } else {
            current = undefined;
          }
          break;
        }
        case "Fail": {
          this.findNextErrorHandler();
          const nextInst = this.pop();
          if (nextInst) {
            current = nextInst.apply(xp.e());
          } else {
            failed = true;
            a = xp.e();
            current = undefined;
          }
          break;
        }
        case "Fold": {
          const state = s0;
          this.push(
            new FoldFrame(
              (c) => XPure.set(state).flatMap(() => xp.failure(c)),
              xp.success
            )
          );
          current = xp.xpure;
          break;
        }
        case "Access": {
          current = xp.access(environments?.value || {});
          break;
        }
        case "Provide": {
          environments = new Stack(xp.r(), environments);
          current = xp.xpure.foldXPure(
            (e) =>
              XPure.succeed(() => {
                environments = environments?.previous;
              }).flatMap(() => XPure.fail(() => e)),
            (a) =>
              XPure.succeed(() => {
                environments = environments?.previous;
              }).flatMap(() => XPure.succeed(() => a))
          );
          break;
        }
        case "Modify": {
          const updated = xp.run(s0);
          s0 = updated.get(0);
          a = updated.get(1);
          const nextInst = this.pop();
          if (nextInst) {
            current = nextInst.apply(a);
          } else {
            current = undefined;
          }
          break;
        }
      }
    }

    if (failed) {
      return Tuple(logs, Either.left(a));
    }

    return Tuple(logs, Either.right(Tuple(s0, a)));
  }
}

/**
 * Runs this computation to produce its result.
 *
 * @tsplus fluent ets/XPure run
 */
export function run<W, S2, A>(self: XPure<W, unknown, S2, unknown, never, A>): A {
  return self.runState(undefined).get(1);
}

/**
 * Runs this computation to produce its result or the first failure to
 * occur.
 *
 * @tsplus fluent ets/XPure runEither
 */
export function runEither<W, S2, E, A>(
  self: XPure<W, unknown, S2, unknown, E, A>
): Either<E, A> {
  return new Runtime()
    .runAll(self, undefined)
    .get(1)
    .map((x) => x.get(1));
}

/**
 * Runs this computation to produce its result and the log.
 *
 * @tsplus fluent ets/XPure runLog
 */
export function runLog<W, S2, E, A>(
  self: XPure<W, unknown, S2, unknown, E, A>
): Tuple<[Chunk<W>, A]> {
  const result = new Runtime().runAll(self, undefined);
  const e = result.get(1);
  if (e._tag === "Left") {
    throw e.left;
  }
  return Tuple(result.get(0), e.right.get(1));
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 *
 * @tsplus fluent ets/XPure runResult
 */
export function runResult_<W, S1, S2, A>(
  self: XPure<W, S1, S2, unknown, never, A>,
  s: S1
): A {
  return self.runState(s).get(1);
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 *
 * @tsplus static ets/XPure/Aspects runResult
 */
export const runResult = Pipeable(runResult_);

/**
 * Runs this computation with the specified initial state, returning both the
 * log and either all the failures that occurred or the updated state and the
 * result.
 *
 * @tsplus fluent ets/XPure runAll
 */
export function runAll_<W, S1, S2, E, A>(
  self: XPure<W, S1, S2, unknown, E, A>,
  s: S1
): Tuple<[Chunk<W>, Either<E, Tuple<[S2, A]>>]> {
  return new Runtime().runAll(self, s);
}

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 *
 * @tsplus static ets/XPure/Aspects runAll
 */
export const runAll = Pipeable(runAll_);

/**
 * Runs this computation with the specified initial state, returning both
 * the updated state and the result.
 *
 * @tsplus fluent ets/XPure runState
 */
export function runState_<W, S1, S2, A>(
  self: XPure<W, S1, S2, unknown, never, A>,
  s: S1
): Tuple<[S2, A]> {
  const result = new Runtime().runAll(self, s).get(1);
  if (result._tag === "Left") {
    throw result.left;
  }
  return result.right;
}

/**
 * Runs this computation with the specified initial state, returning both
 * the updated state and the result.
 *
 * @tsplus static ets/XPure/Aspects runState
 */
export const runState = Pipeable(runState_);

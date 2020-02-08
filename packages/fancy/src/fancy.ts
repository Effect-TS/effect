import { effect as T, exit as EX } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import { Lazy } from "fp-ts/lib/function";

// alpha
/* istanbul ignore file */

export const dispatcherURI = Symbol();

export interface Runner<R> {
  [dispatcherURI]: {
    run: (env: R) => <A>(_: T.Effect<R, never, A>, cb?: (a: A) => void) => void;
  };
}

export const stateURI = Symbol();

export interface State<S> {
  [stateURI]: {
    state: S;
  };
}

export const stateOf = <S>(s: S): State<S> => ({
  [stateURI]: {
    state: s
  }
});

export interface StateP<S> {
  state: S;
}

export class Fancy<S, R> {
  readonly ui: T.Effect<R, never, React.FC<StateP<S>>>;
  private opsC = 0;
  private readonly cancellers = {} as Record<string, Lazy<void>>;

  constructor(renderEffect: T.Effect<R, never, React.FC<StateP<S>>>) {
    const dispatch = <R>(r: R) => <A>(
      eff: T.Effect<R, never, A>,
      cb: (a: A) => void = () => {
        //
      }
    ) => {
      const n = this.opsC;

      this.opsC = this.opsC + 1;

      this.cancellers[`op-${n}`] = T.run(T.provideAll(r)(eff), ex => {
        delete this.cancellers[`op-${n}`];

        if (EX.isDone(ex)) {
          cb(ex.value);
        } else {
          if (!EX.isInterrupt(ex)) {
            console.error("dispatched effects are not supposed to fail");
            console.error(ex);
          }
        }
      });
    };

    this.ui = pipe(
      T.onInterrupted(
        renderEffect,
        T.sync(() => {
          this.stop();
        })
      ),
      T.provideS<Runner<R>>({
        [dispatcherURI]: {
          run: dispatch
        }
      })
    );
  }

  stop() {
    Object.keys(this.cancellers).forEach(k => {
      this.cancellers[k]();
      delete this.cancellers[k];
    });
  }
}

function hasRunner<R>(u: unknown): u is Runner<R> {
  return typeof u === "object" && u !== null && dispatcherURI in u;
}

export const runner = <R>() =>
  T.access((s: R) =>
    hasRunner<R>(s)
      ? s[dispatcherURI].run(s)
      : T.raiseAbort(new Error("runner out of context"))
  );

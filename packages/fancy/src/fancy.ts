import {
  stream as S,
  effect as T,
  exit as EX,
  managed as M
} from "@matechs/effect";
import * as L from "@matechs/effect/lib/list";
import { pipe } from "fp-ts/lib/pipeable";
import { Option, some, isSome, none } from "fp-ts/lib/Option";
import { Lazy } from "fp-ts/lib/function";

// alpha
/* istanbul ignore file */

export const dispatcherURI = Symbol();

export interface Dispatcher<R> {
  [dispatcherURI]: {
    dispatch: (env: R) => (_: T.Effect<R, never, any>) => void;
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

export class Fancy<S, R extends State<S>> {
  readonly ui: T.Effect<R, never, React.FC<{ state: S }>>;
  readonly actions: S.Stream<unknown, never, void>;
  readonly actionList = L.empty<void>();
  private resCallback: Option<(_: Option<void>) => void> = none;
  private opsC = 0;
  private readonly cancellers = {} as Record<string, Lazy<void>>;

  constructor(
    renderEffect: T.Effect<R & Dispatcher<R>, never, React.FC<{ state: S }>>
  ) {
    const dispatch = <R>(r: R) => (eff: T.Effect<R, never, void>) => {
      const n = this.opsC;

      this.opsC = this.opsC + 1;

      this.cancellers[`op-${n}`] = T.run(T.provideAll(r)(eff), ex => {
        delete this.cancellers[`op-${n}`];

        if (EX.isDone(ex)) {
          if (isSome(this.resCallback)) {
            const res = this.resCallback.value;

            this.resCallback = none;

            res(some(ex.value));
          } else {
            L.push(this.actionList, ex.value);
          }
        } else {
          if (!EX.isInterrupt(ex)) {
            console.error("dispatched effects are not supposed to fail");
            console.error(ex);
          }
        }
      });
    };

    this.actions = S.fromSource(
      M.encaseEffect(
        T.pure(
          T.asyncTotal(res => {
            if (L.isNotEmpty(this.actionList)) {
              const ret = L.popUnsafe(this.actionList)!!;

              res(some(ret));
            } else {
              this.resCallback = some(res);
            }

            return () => {
              Object.keys(this.cancellers).forEach(op => {
                this.cancellers[op]();
              });
            };
          })
        )
      )
    );

    this.ui = pipe(
      renderEffect,
      T.provideS<Dispatcher<R>>({
        [dispatcherURI]: {
          dispatch
        }
      })
    );
  }
}

export const dispatcherOf = <R>() =>
  T.access((s: Dispatcher<R> & R) => s[dispatcherURI].dispatch(s));

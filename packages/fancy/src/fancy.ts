import {
  stream as S,
  effect as T,
  exit as EX,
  managed as M
} from "@matechs/effect";
import * as L from "@matechs/effect/lib/list";
import { pipe } from "fp-ts/lib/pipeable";
import { Option, some, isSome, none } from "fp-ts/lib/Option";

export const dispatcherURI = Symbol();

export interface Dispatcher<R> {
  [dispatcherURI]: {
    dispatch: (env: R) => (_: T.Effect<R, never, void>) => void;
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

export class Fancy<R> {
  readonly ui: S.Stream<R, never, React.FC>;
  readonly actions: S.Stream<R, never, void>;
  readonly actionList = L.empty<T.Effect<R, never, void>>();
  private resCallback: Option<(_: T.Effect<R, never, void>) => void> = none;

  constructor(renderEffect: T.Effect<R & Dispatcher<R>, never, React.FC>) {
    const dispatch = <R>(r: R) => (eff: T.Effect<R, never, void>) => {
      if (isSome(this.resCallback)) {
        const res = this.resCallback.value;

        this.resCallback = none;

        res(T.provideAll(r)(eff));
      } else {
        L.push(this.actionList, T.provideAll(r)(eff));
      }
    };

    this.actions = S.fromSource(
      M.encaseEffect(
        T.access((rM: R) =>
          pipe(
            T.accessEnvironment<R>(),
            T.chain(r =>
              T.asyncTotal(res => {
                if (L.isNotEmpty(this.actionList)) {
                  const eff = L.popUnsafe(this.actionList)!!;

                  T.run(pipe(eff, T.provideAll({ ...rM, ...r })), ex => {
                    if (EX.isDone(ex)) {
                      res(some(undefined));
                    } else {
                      console.error("SHOULD NEVER HAPPEN");
                    }
                  });
                } else {
                  this.resCallback = some((eff: T.Effect<R, never, void>) => {
                    T.run(pipe(eff, T.provideAll({ ...r, ...rM })), ex => {
                      if (EX.isDone(ex)) {
                        res(some(undefined));
                      } else {
                        console.error("SHOULD NEVER HAPPEN");
                      }
                    });
                  });
                }

                return () => {
                  //
                };
              })
            )
          )
        )
      )
    );

    this.ui = S.concat(
      S.encaseEffect(
        pipe(
          renderEffect,
          T.provideS<Dispatcher<R>>({
            [dispatcherURI]: {
              dispatch
            }
          })
        )
      ),
      pipe(
        this.actions,
        S.chain(_ =>
          S.encaseEffect(
            pipe(
              renderEffect,
              T.provideS<Dispatcher<R>>({
                [dispatcherURI]: {
                  dispatch
                }
              })
            )
          )
        )
      )
    );
  }
}

export const dispatcherOf = <R>() =>
  T.access((s: Dispatcher<R> & R) => s[dispatcherURI].dispatch(s));

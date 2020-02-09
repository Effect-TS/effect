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
import { actionsURI, Actions, hasActions } from "./actions";
import { Type } from "io-ts";
import * as AR from "fp-ts/lib/Array";
import { either, isLeft } from "fp-ts/lib/Either";

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
    version: number;
    state: S;
  };
}

export const stateOf = <S>(s: S): State<S> => ({
  [stateURI]: {
    version: 0,
    state: s
  }
});

export interface StateP<S> {
  state: S;
}

export class Fancy<S, R extends State<S>, RH, Action> {
  readonly ui: T.Effect<R, never, React.FC<StateP<S>>>;
  readonly actions: S.Stream<unknown, never, any>;
  readonly final: S.Stream<unknown, never, any>;
  readonly actionList = L.empty<any>();
  private resCallback: Option<(_: Option<any>) => void> = none;
  private opsC = 0;
  private readonly cancellers = {} as Record<string, Lazy<void>>;

  private rh: RH = undefined as any;

  constructor(
    renderEffect: T.Effect<R & Runner<R>, never, React.FC<StateP<S>>>,
    private readonly actionType: Type<Action, unknown>,
    handler: (
      run: <A>(e: T.Effect<RH, never, A>) => void
    ) => (action: Action) => void
  ) {
    const dispatch = <R>(r: R) => <A>(
      eff: T.Effect<R, never, A>,
      cb: (a: A) => void = () => {
        //
      }
    ) => {
      this.rh = r as any;

      const n = this.opsC;

      this.opsC = this.opsC + 1;

      this.cancellers[`op-${n}`] = T.run(T.provideAll(r)(eff), ex => {
        delete this.cancellers[`op-${n}`];

        if (EX.isDone(ex)) {
          cb(ex.value);

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

    this.final = pipe(
      this.actions,
      S.chain(a =>
        S.encaseEffect(
          T.sync(() => {
            if (hasActions(this.rh) && this.rh[actionsURI].actions.length > 0) {
              const decoded = AR.array.traverse(either)(
                this.rh[actionsURI].actions,
                x => this.actionType.decode(x)
              );

              this.rh[actionsURI].actions = [];

              if (isLeft(decoded)) {
                console.error("cannot decode action");
                console.error(decoded.left);
              } else {
                pipe(decoded.right, AR.map(handler(dispatch(this.rh))));
              }
            }
            return a;
          })
        )
      )
    );

    this.ui = pipe(
      renderEffect,
      T.provideS<Runner<R> & Actions>({
        [dispatcherURI]: {
          run: dispatch
        },
        [actionsURI]: {
          actions: []
        }
      })
    );
  }
}

export const runner = <R>() =>
  T.access((s: Runner<R> & R) => s[dispatcherURI].run(s));

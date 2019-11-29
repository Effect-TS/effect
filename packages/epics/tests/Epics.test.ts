import * as T from "@matechs/effect";
import * as S from "@matechs/effect/lib/stream";
import * as assert from "assert";
import * as Op from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { Action, applyMiddleware, combineReducers, createStore } from "redux";
import { combineEpics, createEpicMiddleware } from "redux-observable";
import * as Ep from "../src";
import { Do } from "fp-ts-contrib/lib/Do";

type User = { id: string; prefix: string };

interface UserFetched extends Action<any> {
  type: "USER_FETCHED";
  user: User;
}

interface UserFetchFailed extends Action<any> {
  type: "USER_FETCH_FAILED";
  error: string;
}

interface FetchUser extends Action<any> {
  type: "FETCH_USER";
  id: string;
}

type MyAction = FetchUser | UserFetched | UserFetchFailed;

type State = { user: Op.Option<User>; error: Op.Option<string> };

function reducer(
  state: State = { user: Op.none, error: Op.none },
  action: MyAction
): State {
  switch (action.type) {
    case "USER_FETCHED": {
      return { ...state, user: Op.some(action.user), error: Op.none };
    }
    case "USER_FETCH_FAILED": {
      return { ...state, user: Op.none, error: Op.some(action.error) };
    }
  }
  return state;
}

function isFetchUser(x: MyAction): x is FetchUser {
  return x.type === "FETCH_USER";
}

type Config = {
  config: {
    prefix: string;
  };
};

const fetchUser: Ep.Epic<Config, MyAction, State> = _ => action$ =>
  Do(S.stream)
    .bind("action", S.filterRefineWith(isFetchUser)(action$))
    .bindL("fetched", ({ action: { id } }) =>
      S.encaseEffect(
        T.accessM(({ config: { prefix } }: Config) =>
          T.condWith(prefix === "prefix")(
            T.sync(
              (): MyAction => ({
                type: "USER_FETCHED",
                user: {
                  id,
                  prefix
                }
              })
            )
          )(
            T.sync(
              (): MyAction => ({
                type: "USER_FETCH_FAILED",
                error: "wrong prefix"
              })
            )
          )
        )
      )
    )
    .return(s => s.fetched);

describe("Epics", () => {
  jest.setTimeout(5000);

  it("should use redux-observable", async () => {
    const module = pipe(
      T.noEnv,
      T.mergeEnv({ config: { prefix: "prefix" } } as Config)
    );

    const rootEpic = combineEpics(Ep.embed(module, fetchUser));

    const epicMiddleware = createEpicMiddleware<
      MyAction,
      MyAction,
      State,
      State
    >();
    const store = createStore(
      combineReducers({
        reducer
      }),
      applyMiddleware(epicMiddleware)
    );

    const updates: State[] = [];

    store.subscribe(() => {
      updates.push(store.getState().reducer);
    });

    epicMiddleware.run(rootEpic);

    store.dispatch({ id: "test", type: "FETCH_USER" } as FetchUser);

    await T.runToPromise(T.delay(T.unit, 10));

    assert.deepEqual(updates, [
      { user: Op.none, error: Op.none },
      { user: Op.some({ id: "test", prefix: "prefix" }), error: Op.none }
    ]);
  });

  it("should use redux-observable (fail case)", async () => {
    const module = pipe(
      T.noEnv,
      T.mergeEnv({ config: { prefix: "prefix-wrong" } } as Config)
    );

    const rootEpic = combineEpics(Ep.embed(module, fetchUser));

    const epicMiddleware = createEpicMiddleware<
      MyAction,
      MyAction,
      State,
      State
    >();
    const store = createStore(
      combineReducers({
        reducer
      }),
      applyMiddleware(epicMiddleware)
    );

    const updates: State[] = [];

    store.subscribe(() => {
      updates.push(store.getState().reducer);
    });

    epicMiddleware.run(rootEpic);

    store.dispatch({ id: "test", type: "FETCH_USER" } as FetchUser);

    await T.runToPromise(T.delay(T.unit, 10));

    assert.deepEqual(updates, [
      { user: Op.none, error: Op.none },
      { user: Op.none, error: Op.some("wrong prefix") }
    ]);
  });
});

import * as T from "@matechs/effect";
import * as S from "@matechs/effect/lib/stream";
import * as assert from "assert";
import * as Op from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { Action, applyMiddleware, combineReducers, createStore } from "redux";
import { combineEpics, createEpicMiddleware } from "redux-observable";
import * as Ep from "../src";

type User = { id: string; prefix: string };

interface UserFetched extends Action<any> {
  type: "USER_FETCHED";
  user: User;
}

interface FetchUser extends Action<any> {
  type: "FETCH_USER";
  id: string;
}

type MyAction = FetchUser | UserFetched;

function isFetchUser(x: MyAction): x is FetchUser {
  return x.type === "FETCH_USER";
}

function isUserFetched(x: MyAction): x is UserFetched {
  return x.type === "USER_FETCHED";
}

type State = { user: Op.Option<User> };

type Config = {
  config: {
    prefix: string;
  };
};

function reducer(state: State = { user: Op.none }, action: MyAction): State {
  switch (action.type) {
    case "USER_FETCHED": {
      return { user: Op.some(action.user) };
    }
  }
  return state;
}

describe("Epics", () => {
  jest.setTimeout(5000);

  it("should use redux-observable", async () => {
    const fetchUser: Ep.Epic<Config, MyAction, State> = _ => action$ =>
      pipe(
        action$,
        S.filterRefineWith(isFetchUser),
        S.mapMWith(a =>
          T.access(
            ({ config: { prefix } }: Config): MyAction => ({
              type: "USER_FETCHED",
              user: {
                id: a.id,
                prefix
              }
            })
          )
        )
      );

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
      { user: Op.none },
      { user: Op.some({ id: "test", prefix: "prefix" }) }
    ]);
  });
});

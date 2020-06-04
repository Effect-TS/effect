import * as assert from "assert"

import { Action, applyMiddleware, combineReducers, createStore } from "redux"
import { combineEpics, createEpicMiddleware } from "redux-observable"

import * as Ep from "../src"

import * as T from "@matechs/core/Effect"
import { identity } from "@matechs/core/Function"
import { pipe } from "@matechs/core/Function"
import * as Op from "@matechs/core/Option"
import * as S from "@matechs/core/Stream"

interface User {
  id: string
  prefix: string
}

interface Dummy extends Action<any> {
  type: "DUMMY"
}

interface UserFetched extends Action<any> {
  type: "USER_FETCHED"
  user: User
}

interface UserFetchFailed extends Action<any> {
  type: "USER_FETCH_FAILED"
  error: string
}

interface FetchUser extends Action<any> {
  type: "FETCH_USER"
  id: string
}

type MyAction = FetchUser | UserFetched | UserFetchFailed | Dummy

interface State {
  user: Op.Option<User>
  error: Op.Option<string>
}

function reducer(
  state: State = { user: Op.none, error: Op.none },
  action: MyAction
): State {
  switch (action.type) {
    case "USER_FETCHED": {
      return { ...state, user: Op.some(action.user), error: Op.none }
    }
    case "USER_FETCH_FAILED": {
      return { ...state, user: Op.none, error: Op.some(action.error) }
    }
  }
  return state
}

function isFetchUser(x: MyAction): x is FetchUser {
  return x.type === "FETCH_USER"
}

interface Config {
  config: {
    prefix: string
  }
}

interface Config2 {
  config2: {
    prefix: string
  }
}

const fetchUser = Ep.epic<State, MyAction>()((_, action$) =>
  pipe(
    action$,
    S.filter(isFetchUser),
    S.chain(({ id }) =>
      S.encaseEffect(
        T.accessM(({ config: { prefix } }: Config) =>
          T.condWith(prefix === "prefix")(
            T.pure<MyAction>({
              type: "USER_FETCHED",
              user: {
                id,
                prefix
              }
            })
          )(
            T.pure<MyAction>({
              type: "USER_FETCH_FAILED",
              error: "wrong prefix"
            })
          )
        )
      )
    )
  )
)

const fetchUser2 = Ep.epic<State, MyAction>()((_, action$) =>
  pipe(
    action$,
    S.filter(isFetchUser),
    S.chain(() =>
      S.encaseEffect(
        T.accessM(({ config2: { prefix } }: Config2) =>
          T.condWith(prefix === "prefix2")(
            T.pure<MyAction>({
              type: "DUMMY"
            })
          )(
            T.pure<MyAction>({
              type: "USER_FETCH_FAILED",
              error: "wrong prefix"
            })
          )
        )
      )
    )
  )
)

describe("Epics", () => {
  jest.setTimeout(5000)

  it("should use redux-observable", async () => {
    const rootEpic = combineEpics(
      Ep.embed(
        fetchUser,
        fetchUser2
      )(
        T.provide<Config & Config2>({
          config: { prefix: "prefix" },
          config2: { prefix: "prefix2" }
        })
      )
    )

    const epicMiddleware = createEpicMiddleware<MyAction, MyAction, State, State>()

    const store = createStore(
      combineReducers({
        reducer
      }),
      applyMiddleware(epicMiddleware)
    )

    const updates: State[] = []

    store.subscribe(() => {
      updates.push(store.getState().reducer)
    })

    epicMiddleware.run(rootEpic)

    store.dispatch({ id: "test", type: "FETCH_USER" } as FetchUser)

    await T.runToPromise(T.delay(T.unit, 10))

    assert.deepStrictEqual(updates, [
      { user: Op.none, error: Op.none },
      { user: Op.some({ id: "test", prefix: "prefix" }), error: Op.none },
      { user: Op.some({ id: "test", prefix: "prefix" }), error: Op.none }
    ])
  })

  it("should use redux-observable (fail case)", async () => {
    const rootEpic = combineEpics(
      Ep.embed(fetchUser)(T.provide({ config: { prefix: "prefix-wrong" } }))
    )

    const epicMiddleware = createEpicMiddleware<MyAction, MyAction, State, State>()
    const store = createStore(
      combineReducers({
        reducer
      }),
      applyMiddleware(epicMiddleware)
    )

    const updates: State[] = []

    store.subscribe(() => {
      updates.push(store.getState().reducer)
    })

    epicMiddleware.run(rootEpic)

    store.dispatch({ id: "test", type: "FETCH_USER" } as FetchUser)

    await T.runToPromise(T.delay(T.unit, 10))

    assert.deepStrictEqual(updates, [
      { user: Op.none, error: Op.none },
      { user: Op.none, error: Op.some("wrong prefix") }
    ])
  })

  it("should access state", async () => {
    interface ReducerState {
      counter: number
    }

    interface State {
      reducer: ReducerState
    }

    interface Add {
      type: "add"
      add: number
    }

    interface Added {
      type: "added"
    }

    type MyAction = Add | Added

    const isAdd = (a: MyAction): a is Add => a.type === "add"

    const reducer = (
      state: ReducerState = { counter: 0 },
      action: MyAction
    ): ReducerState =>
      action.type === "add"
        ? {
            counter: state.counter + action.add
          }
        : state

    const updates: { from: string; state: ReducerState }[] = []

    const incReducer = Ep.epic<State, MyAction>()((state$, action$) =>
      pipe(
        action$,
        S.filter(isAdd),
        S.chain(() => S.encaseEffect(state$.value)),
        S.map((state) => {
          updates.push({ from: "a", state: state.reducer })
          return { type: "added" as const }
        }),
        S.chain((x) =>
          pipe(
            state$.stream,
            S.take(2),
            S.map((s) => {
              updates.push({ from: "b", state: s.reducer })
              return x
            })
          )
        )
      )
    )

    const rootEpic = combineEpics(Ep.embed(incReducer)(identity))

    const epicMiddleware = createEpicMiddleware<MyAction, MyAction, State, State>()

    const store = createStore(
      combineReducers({
        reducer
      }),
      applyMiddleware(epicMiddleware)
    )

    epicMiddleware.run(rootEpic)

    const makeAdd = (n: number): Add => ({
      type: "add",
      add: n
    })
    store.dispatch(makeAdd(1))
    store.dispatch(makeAdd(3))
    store.dispatch(makeAdd(5))
    store.dispatch(makeAdd(8))

    await T.runToPromise(T.delay(T.unit, 10))

    const makeState = (from: string, counter: number) => ({
      from,
      state: { counter }
    })

    assert.deepStrictEqual(updates, [
      makeState("a", 1),
      makeState("b", 1),
      makeState("b", 4),
      makeState("a", 4),
      makeState("b", 4),
      makeState("b", 9),
      makeState("a", 9),
      makeState("b", 9),
      makeState("b", 17),
      makeState("a", 17),
      makeState("b", 17)
    ])
  })
})

describe("embed", () => {
  it("should accept Epic not emitting in the result stream (never)", () => {
    Ep.embed(Ep.epic()(() => S.never)) // Should compile
  })
})

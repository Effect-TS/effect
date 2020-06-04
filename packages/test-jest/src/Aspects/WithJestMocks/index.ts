import * as T from "@matechs/core/Effect"
import { Lazy } from "@matechs/core/Function"
import { pipe } from "@matechs/core/Function"
import * as M from "@matechs/test"
import { Spec } from "@matechs/test/Def"

export const JestMocksURI = "@matechs/test-jest/JestMocksURI"

export type MockT<Mocks> = {
  [k in (string | number | symbol) & keyof Mocks]: jest.SpyInstance<any, any>
}

export interface JestMocks<Mocks extends MockT<Mocks>> {
  [JestMocksURI]: {
    useMockM: <S, R, E, A>(
      op: (_: Mocks) => T.Effect<S, R, E, A>
    ) => T.Effect<S, R, E, A>
  }
}

export const useMockM = <Mocks extends MockT<Mocks>>() => <S, R, E, A>(
  op: (_: Mocks) => T.Effect<S, R, E, A>
) => T.accessM((_: JestMocks<Mocks>) => _[JestMocksURI].useMockM(op))

export const mockedTestM = (name: string) => <Mocks extends MockT<Mocks>>(
  acquire: Lazy<Mocks>
) => <R, E, A>(
  eff: (_: {
    useMockM: <S, R, E, A>(
      op: (_: Mocks) => T.Effect<S, R, E, A>
    ) => T.Effect<S, R & JestMocks<Mocks>, E, A>
  }) => T.Effect<unknown, R & JestMocks<Mocks>, E, A>
): Spec<R> =>
  pipe(
    M.testM(
      name,
      eff({
        useMockM: useMockM<Mocks>()
      })
    ),
    M.withHookP(
      pipe(
        T.sync(acquire),
        T.map(
          (_): JestMocks<Mocks> => ({
            [JestMocksURI]: {
              useMockM: (op) => op(_)
            }
          })
        )
      ),
      (_) =>
        _[JestMocksURI].useMockM((_) =>
          T.sync(() => {
            Reflect.ownKeys(_).forEach((k) => {
              ;(_[k] as Mocks[any]).mockReset()
            })
          })
        )
    )
  )

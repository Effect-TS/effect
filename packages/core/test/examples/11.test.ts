import * as M from "@effect-ts/system/Collections/Immutable/Map"
import * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"
import { flow, identity, pipe } from "@effect-ts/system/Function"

import * as E from "../../src/Either/index.js"
import * as EitherT from "../../src/EitherT/index.js"
import * as DSL from "../../src/Prelude/DSL/index.js"
import * as P from "../../src/Prelude/index.js"
import * as X from "../../src/XPure/index.js"
import * as R from "../../src/XPure/XReader/index.js"
import * as ReaderT from "../../src/XPure/XReaderT/index.js"
import * as XS from "../../src/XPure/XState/index.js"

type State<K, V> = M.Map<K, V>

export interface Store<K, V, A> extends XS.XState<State<K, V>, A> {}

export interface StoreF<K, V> extends P.HKT {
  readonly type: Store<K, V, this["A"]>
}

export const getStoreMonad = <K, V>() =>
  P.instance<P.Monad<StoreF<K, V>>>({
    any: () => X.succeed({}),
    flatten: XS.chain(identity),
    map: XS.map
  })

const K = pipe(getStoreMonad<string, number>(), EitherT.monad, ReaderT.monad)

export const chain = DSL.chainF(K)

export const succeed = DSL.succeedF(K)

test("11", () => {
  const program: R.XReader<
    number,
    Store<string, number, E.Either<never, number>>
  > = pipe(
    succeed("hello"),
    R.map(
      X.chain(
        E.fold(
          (e) => X.succeed(E.left(e)),
          (v) =>
            X.modify(
              flow(
                M.toMutable,
                (s) => s.set(v, v.length),
                M.fromMutable,
                (s) => Tp.tuple(s, E.right(v.length))
              )
            )
        )
      )
    ),
    chain((x) => X.accessM((y: number) => succeed(x * y)))
  )

  const result: Tp.Tuple<[State<string, number>, E.Either<never, number>]> = pipe(
    program,
    R.runEnv(2),
    X.runState(M.empty)
  )

  expect(result).toEqual(Tp.tuple(M.singleton("hello", 5), E.right(10)))
})

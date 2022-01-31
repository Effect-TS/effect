// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Map from "../../Collections/Immutable/Map/index.js"
import type * as Ex from "../../Exit/index.js"
import { identity, pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as P from "../../Promise/index.js"
import type * as Q from "../../Queue/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import type { Stream } from "./definitions.js"
import { distributedWithDynamic_ } from "./distributedWithDynamic.js"

/**
 * More powerful version of `broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 */
export function distributedWith<O>(
  n: number,
  maximumLag: number,
  decide: (_: O) => T.UIO<(_: number) => boolean>
) {
  return <R, E>(self: Stream<R, E, O>) => distributedWith_(self, n, maximumLag, decide)
}

/**
 * More powerful version of `broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 */
export function distributedWith_<R, E, O>(
  self: Stream<R, E, O>,
  n: number,
  maximumLag: number,
  decide: (_: O) => T.UIO<(_: number) => boolean>
): M.Managed<R, never, A.Chunk<Q.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return pipe(
    P.make<never, (_: O) => T.UIO<(_: symbol) => boolean>>(),
    M.fromEffect,
    M.chain((prom) =>
      pipe(
        distributedWithDynamic_(
          self,
          maximumLag,
          (o) => T.chain_(P.await(prom), (_) => _(o)),
          (_) => T.unit
        ),
        M.chain((next) =>
          pipe(
            A.mapEffect_(
              pipe(
                A.range(0, n - 1),
                A.map((id) =>
                  T.map_(next, ({ tuple: [key, queue] }) => [[key, id], queue] as const)
                )
              ),
              identity
            ),
            T.chain((entries) => {
              const [mappings, queues] = A.reduceRight_(
                entries,
                [
                  Map.empty as Map.Map<symbol, number>,
                  A.empty() as A.Chunk<Q.Dequeue<Ex.Exit<O.Option<E>, O>>>
                ] as const,
                ([mapping, queue], [mappings, queues]) => [
                  Map.insert(mapping[0], mapping[1])(mappings),
                  A.concat_(A.single(queue), queues)
                ]
              )
              return pipe(
                P.succeed_(prom, (o: O) =>
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  T.map_(decide(o), (f) => (key: symbol) => f(mappings.get(key)!))
                ),
                T.as(queues)
              )
            }),
            M.fromEffect
          )
        )
      )
    )
  )
}

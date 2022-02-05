// ets_tracing: off

import * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import * as SS from "../../Collections/Immutable/SortedSet/index.js"
import * as T from "../../Effect/index.js"
import * as E from "../../Either/index.js"
import { runtimeOrd } from "../../Fiber/index.js"
import { pipe } from "../../Function/index.js"
import * as Supervisor from "../../Supervisor/index.js"
import { AtomicReference } from "../../Support/AtomicReference/index.js"
import * as Annotations from "../Annotations/index.js"
import { Int } from "../Int/index.js"
import { fibers } from "../TestAnnotation/index.js"

export function fibersPerTest<R, E, A>(self: T.Effect<R, E, A>) {
  const acquire = pipe(
    T.succeedWith(() => new AtomicReference(SS.make(runtimeOrd()))),
    T.tap((ref) => Annotations.annotate(fibers, E.right(Chunk.single(ref))))
  )

  const release = pipe(
    Annotations.get(fibers),
    T.chain((f) => {
      switch (f._tag) {
        case "Left":
          return T.unit
        case "Right":
          return pipe(
            f.right,
            T.forEach((_) => T.succeedWith(() => _.get)),
            T.map(Chunk.reduce(SS.make(runtimeOrd()), SS.union_)),
            T.map(SS.size),
            T.tap((n) => Annotations.annotate(fibers, E.left(Int(n))))
          )
      }
    })
  )

  return T.bracket_(
    acquire,
    (ref) =>
      pipe(
        Supervisor.fibersIn(ref),
        T.chain((supervisor) => T.supervised_(self, supervisor))
      ),
    () => release
  )
}

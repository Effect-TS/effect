import * as Chunk from "../../Collections/Immutable/Chunk"
import * as SS from "../../Collections/Immutable/SortedSet"
import * as T from "../../Effect"
import * as E from "../../Either"
import { runtimeOrd } from "../../Fiber"
import { pipe } from "../../Function"
import * as Supervisor from "../../Supervisor"
import { AtomicReference } from "../../Support/AtomicReference"
import * as Annotations from "../Annotations"
import { Int } from "../Int"
import { fibers } from "../TestAnnotation"

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

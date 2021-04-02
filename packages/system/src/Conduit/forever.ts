import { pretty } from "../Cause"
import * as T from "../Effect"
import { pipe } from "../Function"
import { tag } from "../Has"
import * as M from "../Managed"
import * as L from "../Persistent/List"
import * as Channel from "./Channel"
import * as S from "./Stream"

const MapServiceTypeId = Symbol()

interface MapService {
  readonly _typeId: typeof MapServiceTypeId
  readonly augment: (s: string) => T.UIO<string>
}

const MapService = tag<MapService>()

const { augment } = T.deriveLifted(MapService)(["augment"], [], [])

console.time("stream")

const stream = pipe(
  Channel.managed(
    pipe(
      T.effectTotal(() => {
        console.log("OPEN")
      }),
      M.makeExit(() =>
        T.effectTotal(() => {
          console.log("CLOSE")
        })
      ),
      M.map(() => S.write(1))
    )
  ),
  S.forever,
  S.map((n) => `(${n})`),
  S.mapEffect(augment),
  S.takeN(5)
)

pipe(
  stream,
  S.runList,
  T.chain((l) =>
    T.effectTotal(() => {
      console.log(L.toArray(l))
    })
  ),
  T.provideService(MapService)({
    _typeId: MapServiceTypeId,
    augment: (s) =>
      T.effectTotal(() => {
        console.log("augument")
        return `[${s}]`
      })
  }),
  T.runPromiseExit
).then((x) => {
  console.timeEnd("stream")
  if (x._tag === "Failure") {
    console.log(pretty(x.cause))
  }
})

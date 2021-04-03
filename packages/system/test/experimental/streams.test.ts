import * as T from "../../src/Effect"
import * as Ex from "../../src/Exit"
import * as S from "../../src/Experimental/Stream"
import * as Channel from "../../src/Experimental/Stream/Channel"
import { pipe } from "../../src/Function"
import { tag } from "../../src/Has"
import * as I from "../../src/Iterable"
import * as M from "../../src/Managed"
import * as O from "../../src/Option"
import * as L from "../../src/Persistent/List"

describe("Stream", () => {
  const MapServiceTypeId = Symbol()

  interface MapService {
    readonly _typeId: typeof MapServiceTypeId
    readonly augment: (s: string) => T.UIO<string>
  }

  const MapService = tag<MapService>()

  const { augment } = T.deriveLifted(MapService)(["augment"], [], [])

  it("Interoperate with Effect", async () => {
    const stream = pipe(
      S.succeed(1),
      S.chain((x) => S.iterable(I.unfold(x, (n) => n + 1))),
      S.take(2),
      S.chain((n) =>
        pipe(
          S.iterate(n, (n) => n + 1),
          S.take(3)
        )
      ),
      S.map((n) => `(${n})`),
      S.mapM(augment)
    )

    const result = await pipe(
      stream,
      S.runList,
      T.provideService(MapService)({
        _typeId: MapServiceTypeId,
        augment: (s) => T.effectTotal(() => `[${s}]`)
      }),
      T.runPromise
    )

    expect(result).toEqual(
      L.from(["[(1)]", "[(2)]", "[(3)]", "[(2)]", "[(3)]", "[(4)]"])
    )
  })

  it("Interoperate with Managed", async () => {
    const logs: string[] = []

    const log = (s: string) =>
      T.effectTotal(() => {
        logs.push(s)
      })

    const stream = pipe(
      M.makeExit_(log("OPEN")["|>"](T.zipRight(T.succeed(1))), () => log("CLOSE")),
      S.fromManaged,
      S.forever,
      S.map((n) => `(${n})`),
      S.mapM(augment),
      S.take(5)
    )

    const result = await pipe(
      stream,
      S.runList,
      T.provideService(MapService)({
        _typeId: MapServiceTypeId,
        augment: (s) => T.succeed(`[${s}]`)["|>"](T.tap((s) => log(`AUGMENT: [${s}]`)))
      }),
      T.runPromise
    )

    expect(result).toEqual(L.from(["[(1)]", "[(1)]", "[(1)]", "[(1)]", "[(1)]"]))
    expect(logs).toEqual([
      "OPEN",
      "AUGMENT: [[(1)]]",
      "CLOSE",
      "OPEN",
      "AUGMENT: [[(1)]]",
      "CLOSE",
      "OPEN",
      "AUGMENT: [[(1)]]",
      "CLOSE",
      "OPEN",
      "AUGMENT: [[(1)]]",
      "CLOSE",
      "OPEN",
      "AUGMENT: [[(1)]]",
      "CLOSE"
    ])
  })

  it("Fuse Transducers Together", async () => {
    function split(separator: string) {
      return Channel.transducer((input: O.Option<string>, state = "") =>
        Channel.gen(function* (_) {
          if (O.isSome(input)) {
            const splits = (state + input.value).split(separator)
            const newState = splits.pop()!
            yield* _(Channel.writeIterable(splits))
            return newState
          }
          yield* _(Channel.writeIterable(state))
          return state
        })
      )
    }

    function groupLoop(
      size: number,
      state: L.List<string> = L.empty()
    ): Channel.Transducer<unknown, never, string, L.List<string>> {
      if (state.length === size) {
        return Channel.write(state)["|>"](Channel.chain(() => groupLoop(size)))
      }
      return Channel.needInput(
        (i: string) => groupLoop(size, L.append_(state, i)),
        () => Channel.write(state)
      )
    }

    function group(size: number) {
      return Channel.suspend(() => groupLoop(size))
    }

    const result = await pipe(
      S.succeedMany("a|b|c", "|d", "e|", "f")[".|"](split("|")[".|"](group(2))),
      S.runList,
      T.runPromise
    )

    expect(result).toEqual(
      L.from([L.from(["a", "b"]), L.from(["c", "de"]), L.from(["f"])])
    )
  })

  it("Catches errors", async () => {
    const result = await pipe(
      S.iterateM(0, (n) => {
        if (n > 2) {
          return T.fail(10)
        }
        return T.succeed(n + 1)
      }),
      S.take(5),
      S.catchAll((n) => S.succeed(n)),
      S.runList,
      T.runPromise
    )

    expect(result).toEqual(L.from([0, 1, 2, 3, 10]))
  })

  it("Catches exceptions", async () => {
    const result = await pipe(
      S.iterate(0, (n) => {
        if (n > 2) {
          throw "err"
        }
        return n + 1
      }),
      S.take(5),
      S.runList,
      T.runPromiseExit
    )

    expect(result).toEqual(Ex.die("err"))
  })
})

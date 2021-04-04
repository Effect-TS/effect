import * as C from "../../src/Cause"
import * as T from "../../src/Effect"
import * as Ex from "../../src/Exit"
import { assertsFailure } from "../../src/Exit"
import * as S from "../../src/Experimental/Stream"
import * as Channel from "../../src/Experimental/Stream/Channel"
import * as Pipeline from "../../src/Experimental/Stream/Pipeline"
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
      return Pipeline.transducer((input: O.Option<string>, state = "") =>
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

    function group<A>(size: number) {
      return Pipeline.transducer((input: O.Option<A>, state = L.empty<A>()) =>
        Channel.gen(function* (_) {
          if (O.isSome(input)) {
            const newState = L.append_(state, input.value)
            if (L.size(newState) === size) {
              yield* _(Channel.write(newState))
              return L.empty()
            }
            return newState
          }
          yield* _(Channel.write(state))
          return state
        })
      )
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

  it("scan", async () => {
    const result = await pipe(
      S.iterate(0, (n) => n + 1),
      S.scan("", (s, n) => `${s}(${n})`),
      S.take(3),
      S.runList,
      T.runPromise
    )
    expect(result).toEqual(L.from(["(0)", "(0)(1)", "(0)(1)(2)"]))
  })

  it("mergeT", async () => {
    const result = await pipe(
      S.mergeT(
        S.iterateM(10, (n) => T.delay(5)(T.succeed(n + 1)))["|>"](S.take(5)),
        S.iterateM(20, (n) => T.delay(10)(T.succeed(n + 1)))["|>"](S.take(5))
      ),
      S.runList,
      T.runPromise
    )

    expect(new Set(result)).toEqual(new Set([10, 11, 12, 13, 14, 20, 21, 22, 23, 24]))
  })

  it("mergeT-error", async () => {
    const result = await pipe(
      S.mergeT(
        S.iterateM(10, (n) => T.delay(5)(n > 3 ? T.die("error") : T.succeed(n + 1))),
        S.iterateM(20, (n) => T.delay(10)(T.succeed(n + 1)))
      ),
      S.runList,
      T.runPromiseExit
    )
    assertsFailure(result)
    expect(C.defects(result.cause)).toEqual(["error"])
  })

  it("zipWith", async () => {
    const result = await pipe(
      S.zipWith_(
        S.iterate(10, (n) => n + 1)["|>"](S.take(5)),
        S.iterate(20, (n) => n + 1)["|>"](S.take(3)),
        (a, b) => `(${a})(${b})`
      ),
      S.runList,
      T.runPromise
    )

    expect(result).toEqual(L.from([`(10)(20)`, `(11)(21)`, `(12)(22)`]))
  })

  it("zipWithPar", async () => {
    const result = await pipe(
      S.zipWithPar_(
        S.iterateM(10, (n) => T.delay(10)(T.succeed(n + 1)))["|>"](S.take(5)),
        S.iterateM(20, (n) => T.delay(10)(T.succeed(n + 1)))["|>"](S.take(3)),
        (a, b) => `(${a})(${b})`
      ),
      S.runList,
      T.runPromise
    )

    expect(result).toEqual(L.from([`(10)(20)`, `(11)(21)`, `(12)(22)`]))
  })

  it("range", async () => {
    const result = await pipe(S.range(0, 5), S.runList, T.runPromise)

    expect(result).toEqual(L.from([0, 1, 2, 3, 4, 5]))
  })

  it("streamAsync", async () => {
    const fn = jest.fn()

    const result = await pipe(
      S.streamAsync<unknown, never, number>((cb) => {
        let n = 0
        const timer = setInterval(() => {
          cb(O.some(S.range(0, n++)))
        }, 10)
        return T.effectTotal(() => {
          fn()
          clearInterval(timer)
        })
      }),
      S.take(10),
      S.runList,
      T.runPromise
    )

    expect(result).toEqual(L.from([0, 0, 1, 0, 1, 2, 0, 1, 2, 3]))
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

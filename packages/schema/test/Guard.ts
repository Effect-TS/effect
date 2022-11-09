import * as _ from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

interface SetService {
  readonly guard: <A>(guard: _.Guard<A>) => _.Guard<Set<A>>
}

const SetService = C.Tag<SetService>()

const set = <P, E, A>(item: S.Schema<P, E, A>): S.Schema<P | SetService, E, Set<A>> =>
  S.constructor(SetService, item)

const getSetGuard = <A>(guard: _.Guard<A>): _.Guard<Set<A>> =>
  _.make((input): input is Set<A> =>
    input instanceof Set && Array.from(input.values()).every(guard.is)
  )

describe("Guard", () => {
  describe("guardFor", () => {
    const ctx = pipe(
      C.empty(),
      C.add(SetService)({
        guard: getSetGuard
      })
    )
    const guardFor = _.guardFor(ctx)

    it("constructor", () => {
      const schema = set(S.string)
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(new Set())).toEqual(true)
      expect(guard.is(new Set(["a", "b"]))).toEqual(true)
      expect(guard.is(new Set(["a", 1]))).toEqual(false)
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is("a")).toEqual(true)
    })

    it("union & constructor", () => {
      const schema = S.union(set(S.union(S.string, S.number)), S.number)
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is("a")).toEqual(false)
      expect(guard.is(new Set(["a"]))).toEqual(true)
      expect(guard.is(new Set(["a", 1]))).toEqual(true)
    })
  })
})

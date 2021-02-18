import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import * as L from "../src/Layer"
import * as M from "../src/Managed"
import * as Ref from "../src/Ref"
import * as SC from "../src/Schedule"

describe("Layer", () => {
  describe("retry", () => {
    it("should retry according to the specified schedule", async () => {
      const result = await pipe(
        T.do,
        T.bind("ref", () => Ref.makeRef(0)),
        T.let("effect", ({ ref }) =>
          pipe(
            Ref.update_(ref, (_) => _ + 1),
            T.andThen(T.fail("fail"))
          )
        ),
        T.let("layer", ({ effect }) =>
          L.retry(new L.LayerManaged(M.fromEffect(effect)), SC.recurs(3))
        ),
        T.tap(({ layer }) => pipe(layer, L.build, M.useNow, T.ignore)),
        T.chain(({ ref }) => ref.get),
        T.runPromise
      )

      expect(result).toEqual(4)
    })
  })
})

import * as T from "../src/Effect/index.js"
import { pipe } from "../src/Function/index.js"
import * as L from "../src/Layer/index.js"
import * as M from "../src/Managed/index.js"
import * as Ref from "../src/Ref/index.js"
import * as SC from "../src/Schedule/index.js"

describe("Layer", () => {
  describe("retry", () => {
    it("should retry according to the specified schedule", async () => {
      const result = await pipe(
        T.do,
        T.bind("ref", () => Ref.makeRef(0)),
        T.let("effect", ({ ref }) =>
          pipe(
            Ref.update_(ref, (_) => _ + 1),
            T.zipRight(T.fail("fail"))
          )
        ),
        T.let("layer", ({ effect }) =>
          L.retry(L.fromRawManaged(M.fromEffect(effect)), SC.recurs(3))
        ),
        T.tap(({ layer }) => pipe(layer, L.build, M.useNow, T.ignore)),
        T.chain(({ ref }) => ref.get),
        T.runPromise
      )

      expect(result).toEqual(4)
    })
  })
})

import * as T from "@effect-ts/core/Effect"
import * as S from "@effect-ts/core/Effect/Stream"
import { pipe } from "@effect-ts/core/Function"
import * as fs from "fs"
import * as path from "path"

import * as NS from "../src/Stream"

describe("Node Stream", () => {
  it("build from readable", async () => {
    const res = await pipe(
      NS.streamFromReadable(() =>
        fs.createReadStream(path.join(__dirname, "fix/data.txt"))
      ),
      S.runCollect,
      T.runPromise
    )

    expect(Buffer.from(res).toString("utf-8")).toEqual("a, b, c")
  })
})

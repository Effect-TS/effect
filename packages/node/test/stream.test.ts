import * as C from "@effect-ts/core/Chunk"
import * as T from "@effect-ts/core/Effect"
import * as S from "@effect-ts/core/Effect/Stream"
import { flow, pipe } from "@effect-ts/core/Function"
import * as fs from "fs"
import * as path from "path"
import * as zlib from "zlib"

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

    expect(C.asBuffer(res).toString("utf-8")).toEqual("a, b, c")
  })
  it("transform (gzip/gunzip)", async () => {
    const res = await pipe(
      NS.streamFromReadable(() =>
        fs.createReadStream(path.join(__dirname, "fix/data.txt"))
      ),
      NS.transform(zlib.createGzip),
      S.runCollect,
      T.chain(flow(S.fromChunk, NS.transform(zlib.createGunzip), S.runCollect)),
      T.runPromise
    )

    expect(C.asBuffer(res).toString("utf-8")).toEqual("a, b, c")
  })
})

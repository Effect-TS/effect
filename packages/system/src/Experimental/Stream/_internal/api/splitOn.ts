// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import { pipe } from "../../../../Function"
import type * as C from "../core"
import * as Map from "./map"
import * as MapChunks from "./mapChunks"
import * as SplitOnChunk from "./splitOnChunk"

/**
 * Splits strings on a delimiter.
 */
export function splitOn_<R, E>(
  self: C.Stream<R, E, string>,
  delimiter: string
): C.Stream<R, E, string> {
  return pipe(
    self,
    Map.map((str) => CK.from(str)),
    MapChunks.mapChunks(CK.flatten),
    SplitOnChunk.splitOnChunk(CK.from(delimiter)),
    Map.map((_) => [..._].join(""))
  )
}

/**
 * Splits strings on a delimiter.
 *
 * @ets_data_first splitOn_
 */
export function splitOn(delimiter: string) {
  return <R, E>(self: C.Stream<R, E, string>) => splitOn_(self, delimiter)
}

import * as assert from "assert"

import * as U from "../src"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import { unwrap } from "@matechs/core/Monocle/Iso"

function run<E, A>(eff: T.SyncRE<U.UUIDEnv, E, A>): Promise<A> {
  return pipe(eff, U.provideUUID, T.runToPromise)
}

describe("UUID", () => {
  it("gen", async () => {
    const uuid = await pipe(U.gen, run)

    assert.deepStrictEqual(unwrap(U.isoUUID)(uuid).length, 36)
  })

  it("base58", async () => {
    const uuid = await pipe(U.gen, run)
    const base58 = await pipe(uuid, U.toBase58, run)
    const fromBase58 = await pipe(base58, U.fromBase58, run)

    assert.deepStrictEqual(uuid, fromBase58)
  })

  it("base90", async () => {
    const uuid = await pipe(U.gen, run)
    const base90 = await pipe(uuid, U.toBase90, run)
    const fromBase90 = await pipe(base90, U.fromBase90, run)

    assert.deepStrictEqual(uuid, fromBase90)
  })
})

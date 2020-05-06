import * as assert from "assert"

import { T, pipe } from "@matechs/prelude"

import * as U from "../src"

function run<E, A>(eff: T.SyncRE<U.UUIDEnv, E, A>): Promise<A> {
  return pipe(eff, U.provideUUID, T.runToPromise)
}

describe("UUID", () => {
  it("gen", async () => {
    const uuid = await pipe(U.gen, run)

    assert.deepStrictEqual(U.isoUUID.unwrap(uuid).length, 36)
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

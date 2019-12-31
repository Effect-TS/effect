import * as U from "../src";
import { effect as T } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import * as assert from "assert";

function run<E, A>(eff: T.Effect<U.UUIDEnv, E, A>): Promise<A> {
  return pipe(eff, T.provideAll(U.uuidEnv), T.runToPromise);
}

describe("UUID", () => {
  it("gen", async () => {
    const uuid = await pipe(U.gen, run);

    assert.deepEqual(U.isoUUID.unwrap(uuid).length, 36);
  });

  it("base58", async () => {
    const uuid = await pipe(U.gen, run);
    const base58 = await pipe(uuid, U.toBase58, run);
    const fromBase58 = await pipe(base58, U.fromBase58, run);

    assert.deepEqual(uuid, fromBase58);
  });

  it("base90", async () => {
    const uuid = await pipe(U.gen, run);
    const base90 = await pipe(uuid, U.toBase90, run);
    const fromBase90 = await pipe(base90, U.fromBase90, run);

    assert.deepEqual(uuid, fromBase90);
  });
});

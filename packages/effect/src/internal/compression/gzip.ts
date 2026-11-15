import { type Decoder, fail } from "./failure.ts"

/** @internal */
export const gzip: Decoder = () => fail("Unsupported", "not implemented")

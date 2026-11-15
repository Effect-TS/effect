import { type Decoder, fail } from "./failure.ts"

/** @internal */
export const zstd: Decoder = () => fail("Unsupported", "not implemented")

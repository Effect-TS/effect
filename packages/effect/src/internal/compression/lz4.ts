import { type Decoder, fail } from "./failure.ts"

/** @internal */
export const lz4Block: Decoder = () => fail("Unsupported", "not implemented")

/** @internal */
export const lz4Frame: Decoder = () => fail("Unsupported", "not implemented")

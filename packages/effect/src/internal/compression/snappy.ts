import { type Decoder, fail } from "./failure.ts"

/** @internal */
export const snappy: Decoder = () => fail("Unsupported", "not implemented")

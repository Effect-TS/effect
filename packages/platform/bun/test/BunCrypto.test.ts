import * as BunCrypto from "@effect/platform-bun/BunCrypto"
import { describeCrypto } from "../../node-shared/test/Crypto.test-utils.ts"

describeCrypto("BunCrypto", BunCrypto.layer, { md5: true, native: true })

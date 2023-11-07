import * as Kv from "@effect/platform-node/KeyValueStore"
// @ts-ignore
import { testLayer } from "@effect/platform/test/KeyValueStore.test"
import { describe } from "vitest"

const KeyValueLive = Kv.layerFileSystem(`${__dirname}/fixtures/kv`)

describe("KeyValueStore / layerFileSystem", () => testLayer(KeyValueLive))

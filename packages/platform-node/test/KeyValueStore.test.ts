import * as Kv from "@effect/platform-node/KeyValueStore"
import { testLayer } from "@effect/platform/test/KeyValueStore.test"

const KeyValueLive = Kv.layerFileSystem(`${__dirname}/fixtures/kv`)

describe("KeyValueStore / layerFileSystem", () => testLayer(KeyValueLive))

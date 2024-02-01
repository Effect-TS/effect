import * as KvN from "@effect/platform-node-shared/KeyValueStoreNode"
// @ts-ignore
import { testLayer } from "@effect/platform/test/KeyValueStore.test"
import { describe } from "vitest"

const KeyValueLive = KvN.layerFileSystem(`${__dirname}/fixtures/kv`)

describe.sequential("KeyValueStore / layerFileSystem", () => testLayer(KeyValueLive))

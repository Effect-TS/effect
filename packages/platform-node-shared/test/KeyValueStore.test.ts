import * as KvN from "@effect/platform-node-shared/NodeKeyValueStore"
// @ts-ignore
import { testLayer } from "@effect/platform/test/KeyValueStore.test"
import { describe } from "@effect/vitest"

const KeyValueLive = KvN.layerFileSystem(`${__dirname}/fixtures/kv`)

describe.sequential("KeyValueStore / layerFileSystem", () => testLayer(KeyValueLive))

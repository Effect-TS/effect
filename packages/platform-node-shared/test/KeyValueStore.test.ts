import * as KvN from "@effect/platform-node-shared/NodeKeyValueStore"
import { describe } from "@effect/vitest"
// @ts-ignore
import { testLayer } from "../../platform/test/KeyValueStore.test.js"

const KeyValueLive = KvN.layerFileSystem(`${__dirname}/fixtures/kv`)

describe.sequential("KeyValueStore / layerFileSystem", () => testLayer(KeyValueLive))

import * as Kv from "@effect/platform-browser/BrowserKeyValueStore"
// @ts-ignore
import { testLayer } from "@effect/platform/test/KeyValueStore.test"
import { describe } from "@effect/vitest"

describe("KeyValueStore / layerLocalStorage", () => testLayer(Kv.layerLocalStorage))
describe("KeyValueStore / layerSessionStorage", () => testLayer(Kv.layerSessionStorage))

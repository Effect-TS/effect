import * as Kv from "@effect/platform-browser/BrowserKeyValueStore"
import { describe } from "@effect/vitest"
// @ts-ignore
import { testLayer } from "../../platform/test/KeyValueStore.test.js"

describe("KeyValueStore / layerLocalStorage", () => testLayer(Kv.layerLocalStorage))
describe("KeyValueStore / layerSessionStorage", () => testLayer(Kv.layerSessionStorage))

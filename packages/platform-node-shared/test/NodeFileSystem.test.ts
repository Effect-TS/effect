import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import { describe } from "@effect/vitest"
import { testLayer } from "../../effect/test/FileSystem.test-utils.ts"

describe("FileSystem", () => testLayer(NodeFileSystem.layer))

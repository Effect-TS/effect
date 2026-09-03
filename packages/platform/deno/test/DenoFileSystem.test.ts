import * as DenoFileSystem from "@effect/platform-deno/DenoFileSystem"
import * as FileSystemTest from "../../../effect/test/FileSystemTest.ts"

FileSystemTest.suite("deno", DenoFileSystem.layer)

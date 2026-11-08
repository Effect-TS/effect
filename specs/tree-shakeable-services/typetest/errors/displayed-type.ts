// The deliberate mismatch makes tsc print the type of an operation and of a call.
import * as FileSystem from "../../src/FileSystem.ts"

export const operation: string = FileSystem.readFile

export const call: string = FileSystem.readFile("a.txt")

export const streamCall: string = FileSystem.stream("a.txt")

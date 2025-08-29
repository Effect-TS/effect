// Minimal ambient declarations for bun:test to satisfy type-checking
// in environments where @types/bun is not installed.
declare module "bun:test" {
  export const test: any
  export namespace test {
    const skip: any
    const only: any
    const failing: any
    const todo: any
  }
  export const describe: any
  export const beforeAll: any
  export const beforeEach: any
  export const afterAll: any
  export const afterEach: any
  export const expect: any
  export const jest: any
  export const mock: any
  export const setDefaultTimeout: any
  export const setSystemTime: any
  export const spyOn: any
}


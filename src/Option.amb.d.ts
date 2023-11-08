export {}
declare module "./Option.js" {
  // export * as Option from "./impl/Option.js"
  export namespace Option {
    export type * from "./impl/Option.js"
  }
}

// not sure why removing this breaks things
declare module "./impl/Option.js" {
  // // export * as Option from "./impl/Option.js"
  // export namespace Option {
  //   export type * from "./impl/Option.js"
  // }
}

// codegen:start { preset: barrel, include: ./*.ts, exclude: ./hkt.ts }
export * from "./base"
export * from "./custom"
export * from "./fix"
export * from "./infer"
export * from "./instance"
export * from "./kind"
export * from "./or-never"
export * from "./variance"
// codegen:end

export {
  ConcreteURIS,
  UHKT,
  UHKT2,
  UHKT3,
  UHKT4,
  HKT,
  HKT2,
  HKT3,
  HKT4,
  URItoIndex,
  URItoKind,
  UHKTCategory
} from "./hkt"

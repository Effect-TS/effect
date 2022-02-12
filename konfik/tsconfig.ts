import { TsconfigKonfik } from "@konfik-plugin/tsconfig"

export const tsconfigBase = TsconfigKonfik({
  compilerOptions: {
    downlevelIteration: true,
    resolveJsonModule: true,
    esModuleInterop: true,
    declaration: true,
    skipLibCheck: true,
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    preserveSymlinks: true,
    moduleResolution: "Node",
    noEmit: false,
    lib: ["ES2020"],
    sourceMap: true,
    declarationMap: true,
    strict: true,
    noImplicitReturns: false,
    noUnusedLocals: true,
    noUnusedParameters: false,
    noFallthroughCasesInSwitch: true,
    noEmitOnError: false,
    noErrorTruncation: false,
    allowJs: false,
    checkJs: false,
    forceConsistentCasingInFileNames: true,
    suppressImplicitAnyIndexErrors: true,
    stripInternal: true,
    noImplicitAny: true,
    noImplicitThis: true,
    noUncheckedIndexedAccess: true,
    strictNullChecks: true,
    baseUrl: ".",
    target: "ES2018",
    typeRoots: ["./node_modules/@types"]
  },
  exclude: ["node_modules", "build", "dist"]
})

export const tsconfig = TsconfigKonfik({
  extends: "./tsconfig.base.json",
  include: ["*.ts"]
})

export const tsconfigJest = TsconfigKonfik({
  extends: "./tsconfig.json",
  compilerOptions: {
    module: "CommonJS"
  }
})

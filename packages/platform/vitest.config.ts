import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: ViteUserConfig = {
  // test: {
  //   coverage: {
  //     reporter: ["html"],
  //     include: ["src/OpenApi.ts", "src/Multipart.ts", "src/HttpApi*.ts"]
  //   }
  // }
}

export default mergeConfig(shared, config)

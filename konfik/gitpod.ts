import { GitpodKonfik } from "@konfik-plugin/gitpod"

export const gitpod = GitpodKonfik({
  tasks: [
    {
      name: "init",
      command: "yarn install"
    }
  ],
  github: {
    prebuilds: {
      addCheck: true
    }
  },
  vscode: {
    extensions: ["dbaeumer.vscode-eslint"]
  }
})

{
  inputs = {
    nixpkgs = {
      url = "github:nixos/nixpkgs/nixpkgs-unstable";
    };

    flake-utils = {
      url = "github:numtide/flake-utils";
    };
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
      corepackEnable = pkgs.runCommand "corepack-enable" {} ''
        mkdir -p $out/bin
        ${pkgs.nodejs_20}/bin/corepack enable --install-directory $out/bin
      '';
    in {
      formatter = pkgs.alejandra;

      devShells = {
        default = with pkgs;
          mkShell {
            buildInputs = [
              corepackEnable
              bun
              deno
              nodejs_20
            ];

            nativeBuildInputs = lib.optionals (!pkgs.stdenvNoCC.isDarwin) [
              playwright-driver.browsers
            ];
          }
          // lib.optionalAttrs (!pkgs.stdenvNoCC.isDarwin) {
            PLAYWRIGHT_BROWSERS_PATH = "${playwright-driver.browsers}";
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
          };
      };
    });
}

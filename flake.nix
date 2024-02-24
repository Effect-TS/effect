{
  inputs = {
    nixpkgs = {
      url = "github:nixos/nixpkgs/nixpkgs-unstable";
    };
  };
  outputs = {nixpkgs, ...}: let
    systems = ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];
  in {
    formatter = nixpkgs.lib.genAttrs systems (
      system: let
        pkgs = import nixpkgs {inherit system;};
      in
        pkgs.alejandra
    );
    devShells = nixpkgs.lib.genAttrs systems (
      system: let
        pkgs = import nixpkgs {inherit system;};
        node = pkgs.nodejs_20;
        corepackEnable = pkgs.runCommand "corepack-enable" {} ''
          mkdir -p $out/bin
          ${node}/bin/corepack enable --install-directory $out/bin
        '';
      in {
        default = with pkgs;
          mkShell {
            buildInputs = [
              corepackEnable
              bun
              deno
              node
            ];
          };
      }
    );
  };
}

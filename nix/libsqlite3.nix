{ pkgs, enableLoadExtension ? true }:

# Build a lib-only output for sqlite, ensuring loadable extensions are enabled.
let
  lib = pkgs.lib;
  sqlite = pkgs.sqlite.overrideAttrs (old: {
    configureFlags = (old.configureFlags or []) ++ lib.optionals enableLoadExtension [ "--enable-load-extension" ];
    env = (old.env or {}) // {
      NIX_CFLAGS_COMPILE = (old.env.NIX_CFLAGS_COMPILE or (old.NIX_CFLAGS_COMPILE or ""))
        + (if enableLoadExtension then " -DSQLITE_ENABLE_LOAD_EXTENSION=1" else "");
    };
  });
in pkgs.stdenv.mkDerivation {
  pname = "libsqlite3";
  version = sqlite.version;
  src = pkgs.writeText "dummy" "";
  dontConfigure = true;
  dontBuild = true;
  dontUnpack = true;
  installPhase = ''
    mkdir -p $out/lib
    cp -a ${sqlite.out}/lib/libsqlite3*.dylib $out/lib/ 2>/dev/null || true
    cp -a ${sqlite.out}/lib/libsqlite3*.so*   $out/lib/ 2>/dev/null || true
  '';
  meta = with pkgs.lib; {
    description = "Shared libsqlite3 from nixpkgs with loadable extensions enabled";
    platforms = [ pkgs.stdenv.hostPlatform.system ];
    license = licenses.publicDomain;
  };
}

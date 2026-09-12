# SPDX-License-Identifier: MPL-2.0

# 名前と、置き場と、どの runtime を取るか。tools/src/defines.ts から移したもの。
module FelesBuild
  module Defines
    BRANDING = { base_name: "noraneko", display_name: "Noraneko" }.freeze

    PROJECT_ROOT = File.expand_path("../..", __dir__)

    PLATFORM =
      case RUBY_PLATFORM
      when /mswin|mingw|cygwin/ then :windows
      when /darwin/ then :darwin
      else :linux
      end

    ARCH = RUBY_PLATFORM.match?(/arm64|aarch64/) ? "aarch64" : "x86_64"

    # binary の扱いかたを変えたときに、手元の _dist/bin を捨てさせるための番号
    VERSION = PLATFORM == :darwin ? "000" : "002"

    # noraneko-runtime の代わりに素の Firefox で開発する。dev は prebuilt の omni.ja を
    # 触るだけなので、runtime との差(build/packaging と C++ の小さな二つ)に寄りかかっていない。
    # NORANEKO_STOCK_FIREFOX=1 で on。版は patch の当たる gecko-dev に合わせて固定する。
    STOCK_FIREFOX = !ENV["NORANEKO_STOCK_FIREFOX"].to_s.empty?
    STOCK_FIREFOX_VERSION = ENV.fetch("NORANEKO_STOCK_FIREFOX_VERSION", "149.0.2")

    APP_NAME = STOCK_FIREFOX ? "Firefox" : BRANDING[:display_name] # <name>.app (darwin)
    EXE_NAME = STOCK_FIREFOX ? "firefox" : BRANDING[:base_name]    # 実行ファイル
    NONMAC_DIR = STOCK_FIREFOX ? "firefox" : BRANDING[:base_name]  # 展開先(linux/win)

    def self.in_root(*parts) = File.join(PROJECT_ROOT, *parts)

    PATHS = {
      root: PROJECT_ROOT,
      bin_root: in_root("_dist", "bin"),
      buildid2: in_root("_dist", "buildid2"),
      profile_test: in_root("_dist", "profile", "test"),
      # omni.ja をほどいて置く場所。.app の外に置く(codesign --deep に 56MB を掴ませない)
      omni_work: in_root("_dist", "omni"),
      loader_features: in_root("bridge/loader-features"),
      loader_modules: in_root("bridge/loader-modules"),
      i18n: in_root("i18n"),
      modules: in_root("browser-features/modules"),
    }.freeze

    # 出来上がりを binary の resource/content に張る先。[張る名前, project からの相対]
    # injector.rb の chrome.manifest の行と揃えておくこと。
    FEATURE_MOUNTS = [
      ["content", "browser-features/chrome/_dist"],
      ["startup", "bridge/startup/_dist"],
      ["skin", "browser-features/skin"],
      ["resource", "bridge/loader-modules/_dist"],
      ["resource-builtin", "browser-features/webext-actors/_dist"],
      ["loader", "bridge/loader-features/_dist"],
      ["aboutdialog", "browser-features/pages-aboutDialog/_dist"],
      ["newtab", "browser-features/pages-newtab/_dist"],
      ["settings", "browser-features/settings/_dist"],
    ].freeze

    # darwin では .app はいつも bin_root/<base_name>/ の下(dmg をそこへ写す)。
    # 素の Firefox かどうかで変わるのは .app と実行ファイルの名前だけ。
    APP_DIR = File.join(PATHS[:bin_root], BRANDING[:base_name], "#{APP_NAME}.app")

    BIN_DIR =
      if PLATFORM == :darwin
        File.join(APP_DIR, "Contents", "Resources")
      else
        File.join(PATHS[:bin_root], NONMAC_DIR)
      end

    BIN_PATH_EXE =
      if PLATFORM == :darwin
        File.join(APP_DIR, "Contents", "MacOS", EXE_NAME)
      elsif STOCK_FIREFOX
        File.join(BIN_DIR, EXE_NAME + (PLATFORM == :windows ? ".exe" : ""))
      else
        File.join(BIN_DIR, BRANDING[:base_name] + (PLATFORM == :windows ? ".exe" : "-bin"))
      end

    BIN_VERSION = File.join(BIN_DIR, "nora.version.txt")
    PROD_BIN_DIR = "../obj-artifact-build-output/dist/bin"

    DEV_SERVER = { ready_string: "nora-{bbd11c51-3be9-4676-b912-ca4c0bdcab94}-dev" }.freeze

    # noraneko-runtime の資産(名前と、どう展開するか)
    def self.bin_archive
      name = BRANDING[:base_name]
      case PLATFORM
      when :windows
        { filename: "#{name}-windows-x86_64-moz-artifact.zip", format: :zip }
      when :linux
        { filename: "#{name}-linux-#{ARCH}-moz-artifact.tar.xz", format: :tar_xz }
      when :darwin
        # Apple Silicon は noraneko-ci(aarch64 Linux から cross)が出す .app の tar.xz。
        # universal dmg は Intel 向けの旧形式(古い release にしか無い)。
        if ARCH == "aarch64"
          { filename: "#{name}-macos-aarch64-moz-artifact.tar.xz", format: :tar_xz }
        else
          { filename: "#{name}-macOS-universal-moz-artifact.dmg", format: :dmg }
        end
      end
    end

    # 素の Firefox。Mozilla の redirector から、版を固定して取る。
    def self.stock_archive
      base = "https://download.mozilla.org/?lang=en-US&product=firefox-#{STOCK_FIREFOX_VERSION}"
      case PLATFORM
      when :darwin
        { filename: "firefox-#{STOCK_FIREFOX_VERSION}.dmg", format: :dmg, url: "#{base}&os=osx" }
      when :linux
        raise "Stock Firefox: linux は x86_64 だけ繋いである(いまは #{ARCH})" unless ARCH == "x86_64"
        { filename: "firefox-#{STOCK_FIREFOX_VERSION}.tar.xz", format: :tar_xz, url: "#{base}&os=linux64" }
      else
        # Windows の素の Firefox は installer の .exe で、別の展開が要る(7z など)。まだ繋いでいない
        raise "Stock Firefox は Windows にまだ繋いでいない"
      end
    end
  end
end

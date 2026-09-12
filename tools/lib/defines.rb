# SPDX-License-Identifier: MPL-2.0

# tools/src/defines.ts の Ruby 側。
# いまは Ruby が使う path だけを持つ。platform で変わるもの(BIN_DIR / APP_DIR / getBinArchive)は、
# それを使う側(initializer / injector / patcher / browser_launcher)が TS のあいだ defines.ts にある。
module FelesBuild
  module Defines
    PROJECT_ROOT = File.expand_path("../..", __dir__)

    PATHS = {
      root: PROJECT_ROOT,
      buildid2: File.join(PROJECT_ROOT, "_dist", "buildid2"),
      # profile_test は defines.ts にも同じものがある(browser_launcher / initializer がまだ TS)
      profile_test: File.join(PROJECT_ROOT, "_dist", "profile", "test"),
      loader_features: File.join(PROJECT_ROOT, "bridge/loader-features"),
      i18n: File.join(PROJECT_ROOT, "i18n"),
      loader_modules: File.join(PROJECT_ROOT, "bridge/loader-modules"),
      modules: File.join(PROJECT_ROOT, "browser-features/modules"),
    }.freeze
  end
end

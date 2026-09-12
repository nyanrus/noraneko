# SPDX-License-Identifier: MPL-2.0

require_relative "defines"
require_relative "omni"
require_relative "utils"

module FelesBuild
  # browser.xhtml に startup の script を足し、dev では preferences.xhtml の CSP をゆるめる。
  #
  # DOM を組まずに、文字のまま触る。触るのは自分で書いた印(data-geckomixin)と、
  # 名指しした CSP の meta だけ — injector が chrome.manifest でやっている
  # "# begin noraneko" と同じ作法。DOM を通すと書式が丸ごと書き換わって、
  # あとで patch を当てたいときに当たらなくなる(REXML は約 6000 行中 5418 行を書き換えた)。
  module Xhtml
    LOGGER = Utils::Logger.new("xhtml")

    MARK = "data-geckomixin"
    SCRIPT = %(<script type="module" src="chrome://noraneko-startup/content/chrome_root.js" ) +
             %(async="async" #{MARK}=""></script>)
    MARKED = /<script\b[^>]*\b#{MARK}\b[^>]*(?:\/>|>\s*<\/script>)/

    BROWSER = "browser/chrome/browser/content/browser/browser.xhtml"
    PREFERENCES = "browser/chrome/browser/content/browser/preferences/preferences.xhtml"

    # dev は localhost の vite から読むので、そのぶんだけ広げる
    DEV_CSP = "default-src chrome: http://localhost:* ws://localhost:*; " \
              "img-src chrome: moz-icon: https: blob: data:; " \
              "style-src chrome: data: 'unsafe-inline'; object-src 'none'"
    CSP_META = /(<meta\b[^>]*\bhttp-equiv="Content-Security-Policy"[^>]*\bcontent=")([^"]*)(")/

    def self.edit(root, relative)
      path = File.join(root, relative)
      raise "#{relative} が無い: #{path}" unless File.exist?(path)

      before = File.read(path)
      after = yield before
      File.write(path, after) unless after == before
    end

    def self.inject(root, dev: false)
      edit(root, BROWSER) do |text|
        raise "</head> が browser.xhtml に無い" unless text.include?("</head>")

        text.gsub(MARKED, "").sub("</head>", "#{SCRIPT}</head>")
      end

      if dev
        edit(root, PREFERENCES) do |text|
          raise "CSP の <meta> が preferences.xhtml に無い" unless text.match?(CSP_META)

          text.sub(CSP_META) { "#{$1}#{DEV_CSP}#{$3}" }
        end
      end

      LOGGER.success "XHTML injection complete."
    end
  end
end

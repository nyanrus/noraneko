# SPDX-License-Identifier: MPL-2.0

require "fileutils"
require_relative "defines"
require_relative "utils"

module FelesBuild
  # browser/omni.ja を、一度ほどいて、ただのファイルとして触れるようにする。
  #
  # 触る人(patcher / injector / xhtml)が三人とも別々に zip を開いて閉じるのをやめて、
  # 開けるのは一度、閉じるのも一度にした。そうすると:
  #   - omni の中のファイルと、素の flat 配置のファイルが、同じ相対 path の同じファイルになる。
  #     `git apply --directory <root>` が両方に同じ形で当たる(npm:diff が要らない)。
  #   - 素の Firefox の「最適化済」omni.ja(JSZip が読めなかったもの)も、unzip は読める。
  #   - 結び直すのが一箇所になるので、codesign を「最後に omni.ja を触ったあと」に置ける。
  #
  # ほどいた木は残す(次からは unzip をやり直さない。patch を作るための git もそこに置ける)。
  # 新しい runtime を展開したときは initializer が捨てる。
  module Omni
    LOGGER = Utils::Logger.new("omni")

    JA = File.join(Defines::BIN_DIR, "browser", "omni.ja")
    WORK = Defines::PATHS[:omni_work]

    # omni 配置(browser/omni.ja がある)か、flat 配置か。
    def self.packaged? = File.exist?(JA) || File.directory?(WORK)

    # 触る側が使う根。flat 配置ならそのまま binary の中、omni 配置ならほどいた木。
    # どちらでも、この下は browser/chrome/... という同じ形をしている。
    def self.root = packaged? ? WORK : Defines::BIN_DIR

    # ほどく。すでにほどいてあれば、そちらが真。
    def self.open
      return unless File.exist?(JA)
      return if File.directory?(WORK)

      LOGGER.info "Unpacking #{JA} ..."
      FileUtils.mkdir_p(File.join(WORK, "browser"))
      # unzip は「余分な bytes」の警告で 0 以外を返すことがあるが、展開自体はできている
      system("unzip", "-q", "-o", JA, "-d", File.join(WORK, "browser"), out: File::NULL, err: File::NULL)
      raise "omni.ja をほどけなかった: #{JA}" unless File.directory?(File.join(WORK, "browser", "modules"))

      LOGGER.success "Unpacked omni.ja (#{WORK})."
    end

    # 結ぶ。mozpack の OmniJarFormatter と同じ `zip -0DXqr`:
    #   -0 圧縮しない(omni.ja は STORE)  -D dir の entry を入れない
    #   -X uid/gid などの extra field を入れない  -q -r
    def self.seal
      return unless File.directory?(WORK)

      FileUtils.rm_f(JA)
      FileUtils.mkdir_p(File.dirname(JA))
      Utils.run("zip", "-0", "-D", "-X", "-q", "-r", JA, ".", cwd: File.join(WORK, "browser"))
      LOGGER.success "Sealed omni.ja (#{File.size(JA)}B)."
    end

    # 新しい runtime を展開したら、ほどいた木は古い。
    def self.discard
      FileUtils.rm_rf(WORK)
    end
  end
end

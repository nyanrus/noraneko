# SPDX-License-Identifier: MPL-2.0

require "fileutils"
require_relative "defines"
require_relative "dev_browser"
require_relative "utils"

module FelesBuild
  # browser を起こして、閉じるまで出るものを読む。
  module BrowserLauncher
    LOGGER = Utils::Logger.new("launcher")

    # Firefox の出力は色で読む(上から順に、当たったものの色)
    COLORS = {
      /MOZ_CRASH|JavaScript error:|console\.error|\] Errors|\[fluent\] (Couldn't find a message:|Missing)|EGL Error:/ => 31,
      /console\.warn|WARNING:|\[WARN|JavaScript warning:/ => 33,
      /console\.debug/ => 36,
    }.freeze

    def self.command(port)
      [Defines::BIN_PATH_EXE,
       "--profile", Defines::PATHS[:profile_test],
       "--remote-debugging-port", port.to_s,
       # dev だけ: BiDi から about:/chrome: のページの中も評価できるように(手元で drop の様子を見るため)
       "--remote-allow-system-access",
       "--jsdebugger"]
    end

    def self.run(port = 5180)
      # 素の Firefox には buildid2 の patch が無く、build が変わっても startup cache が
      # 古いまま残る(chrome registry がずれる)。開く前に捨てて読み直させる。
      FileUtils.rm_rf(File.join(Defines::PATHS[:profile_test], "startupCache")) if Defines::STOCK_FIREFOX

      # 同じ profile の先客が居ると、Firefox はそちらに渡して、こちらはすぐ終わる。
      # 黙って渡すと「起きてすぐ閉じた」ように見えるので、先に言う。
      DevBrowser.running.each do |pid, _|
        LOGGER.warn "すでに開発用の noraneko が動いている (pid #{pid})。"
        LOGGER.warn "この profile は先客に渡るので、いま建てたものは映らない。"
        LOGGER.warn "閉じてから起こすなら: deno task feles-build stop"
      end

      cmd = command(port)
      puts "[launcher] Launching browser with command: #{cmd.join(' ')}"
      Utils.run_with_logging(cmd) do |stream, raw|
        line = raw.chomp
        if stream == :stderr && line.match?(%r{^WebDriver BiDi listening on ws://})
          puts "nora-{bbd11c51-3be9-4676-b912-ca4c0bdcab94}-webdriver"
        end
        color = COLORS.find { |pattern, _| line.match?(pattern) }&.last
        puts color ? "\e[#{color}m#{line}\e[0m" : line
      end
      puts "[launcher] Browser Closed"
    end
  end
end

# SPDX-License-Identifier: MPL-2.0

require "fileutils"
require_relative "defines"
require_relative "utils"

module FelesBuild
  # 手元で見るための vite。出るものは logs/vite-*.log へ。
  module DevServer
    LOGGER = Utils::Logger.new("dev-server")

    SERVERS = {
      "main" => ["browser-features/chrome", 5181],
      "designs" => ["browser-features/skin", 5174],
    }.freeze

    @pids = []

    def self.run
      LOGGER.info "Starting Vite dev servers..."
      logs = Defines.in_root("logs")
      FileUtils.mkdir_p(logs)
      kill_stale

      SERVERS.each do |name, (dir, port)|
        log = File.join(logs, "vite-#{name}.log")
        pid = spawn("deno", "run", "-A", "npm:vite", "--port", port.to_s,
                    chdir: Defines.in_root(dir), in: File::NULL, out: log, err: [:child, :out])
        Process.detach(pid)
        @pids << pid
        LOGGER.info "Started Vite dev server for #{name} with PID: #{pid}, logging to #{log}"
      end

      LOGGER.info "All Vite dev servers started."
      sleep 5 # 立ち上がるのを待つ(出力を読んで確かめるほうが正しいが、いまはこれ)
    end

    # 前の回の vite(親が SIGKILL などで落ちて孤児になったもの)を止める。
    # macOS には親と一緒に子が死ぬ仕組みが無いので、次の起動のここで片づける。
    # 見分けかたは「コマンドラインが npm:vite で、cwd がこの repo の中」。
    # (port では見ない: 取られていた port を避けて別の port に逃げた vite が、
    #  あとで browser の 5180 を塞いだことがある)
    def self.kill_stale
      pids = `pgrep -f npm:vite 2>/dev/null`.split.map(&:to_i) - [Process.pid]
      killed = pids.count do |pid|
        line = `lsof -a -d cwd -p #{pid} -Fn 2>/dev/null`.lines.find { |l| l.start_with?("n") }
        cwd = line.to_s[1..].to_s.chomp
        next false unless cwd.start_with?(Defines::PROJECT_ROOT)

        LOGGER.warn "killing stale vite (pid #{pid}, cwd #{cwd}) left from a previous run"
        Process.kill("TERM", pid) rescue nil
        true
      end
      sleep 0.8 if killed.positive?
    end

    def self.shutdown
      return if @pids.empty?

      LOGGER.info "Shutting down Vite dev servers..."
      @pids.each { |pid| Process.kill("TERM", pid) rescue nil }
      @pids = []
      LOGGER.success "Vite dev servers shut down."
    end
  end
end

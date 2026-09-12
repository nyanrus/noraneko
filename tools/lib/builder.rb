# SPDX-License-Identifier: MPL-2.0

require "fileutils"
require "json"
require_relative "defines"
require_relative "update"
require_relative "utils"

module FelesBuild
  # 出来上がりを作る段。vite を library として使うのではなく、各 package の
  # `deno task build` を順に起こすだけ(束ねるのは Deno のほうが得意なので、そこは任せる)。
  module Builder
    LOGGER = Utils::Logger.new("builder")

    def self.package_version
      JSON.parse(File.read(Defines.in_root("package.json")))["version"]
    end

    # [走らせるもの, どこで]。dev と production の違いは chrome を先に建てるかどうかだけ。
    def self.commands(mode, buildid2)
      version = package_version
      chrome = [%w[deno run -A vite build --base chrome://noraneko/content], "browser-features/chrome"]
      loader_modules = [
        ["deno", "task", "build", "--env.MODE=#{mode}",
         "--env.__BUILDID2__=#{buildid2}", "--env.__VERSION2__=#{version}"],
        "bridge/loader-modules",
      ]
      startup = [["deno", "task", "build", "--env.MODE=#{mode}"], "bridge/startup"]
      webext_actors = [["deno", "task", "build", "--env.MODE=#{mode}"], "browser-features/webext-actors"]
      plain = %w[
        browser-features/pages-aboutDialog
        browser-features/pages-newtab
        browser-features/settings
      ].map { |dir| [%w[deno task build], dir] }

      middle = mode.start_with?("dev") ? [loader_modules, chrome] : [chrome, loader_modules]
      [startup, *middle, webext_actors, *plain]
    end

    def self.run(mode, buildid2)
      LOGGER.info "Building features with mode=#{mode}"

      begin
        Update.write_buildid2(buildid2)
      rescue => e
        LOGGER.error "Failed to write buildid2: #{e.message}"
      end

      commands(mode, buildid2).each do |command, dir|
        cwd = Defines.in_root(dir)
        LOGGER.info "Running `#{command.join(' ')}` in `#{cwd}`"
        result = Utils.run_checked(*command, cwd: cwd)
        next if result[:success]

        raise "Build command `#{command.join(' ')}` in `#{cwd}` failed\n" \
              "STDOUT:\n#{result[:stdout]}\nSTDERR:\n#{result[:stderr]}"
      end

      if mode.start_with?("production")
        out = Defines.in_root("_dist", "noraneko")
        FileUtils.rm_rf(out)
        FileUtils.mkdir_p(out)
        Utils.create_feature_symlinks(out)
      end

      LOGGER.success "Build complete."
    end
  end
end

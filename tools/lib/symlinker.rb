# SPDX-License-Identifier: MPL-2.0

require "fileutils"
require_relative "defines"
require_relative "utils"

module FelesBuild
  # loader の隣に、i18n と modules への近道を張る(build.rb symlink)
  module Symlinker
    LOGGER = Utils::Logger.new("symlinker")

    LINKS = {
      File.join(Defines::PATHS[:loader_features], "link-i18n") => Defines::PATHS[:i18n],
      File.join(Defines::PATHS[:loader_modules], "link-modules") => Defines::PATHS[:modules],
    }.freeze

    def self.run
      LINKS.each do |link, target|
        FileUtils.rm_rf(link) # symlink は辿らずに、その symlink だけが外れる
        FileUtils.ln_sf(target, link)
      rescue => e
        LOGGER.warn "Failed to create symlink #{link} -> #{target}: #{e.message}"
      end
      LOGGER.success "Symlinks created successfully."
    end
  end
end

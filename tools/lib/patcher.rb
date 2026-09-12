# SPDX-License-Identifier: MPL-2.0

require "fileutils"
require_relative "defines"
require_relative "omni"
require_relative "utils"

module FelesBuild
  # runtime に手を入れる patch。omni 配置でも flat 配置でも、当てる先は Omni.root の下の
  # 同じ相対 path なので、道は一本。`git apply --directory <root>` がそのまま当たる。
  module Patcher
    LOGGER = Utils::Logger.new("patcher")

    DIR = Defines.in_root("tools", "patches")
    APPLIED = Defines.in_root("_dist", "bin", "applied_patches")

    GIT_APPLY = %w[apply --reject --whitespace=fix --unsafe-paths].freeze

    def self.patches_in(dir) = File.directory?(dir) ? Dir.children(dir).grep(/\.patch\z/).sort : []

    # 前に当てたものと、いま置いてあるものが同じなら、何もしなくていい。
    def self.patch_needed?
      return false unless File.directory?(DIR)
      return true unless File.directory?(APPLIED)

      now = patches_in(DIR)
      return true if now != patches_in(APPLIED)

      now.any? { |name| File.read(File.join(DIR, name)) != File.read(File.join(APPLIED, name)) }
    end

    def self.git_apply(patch_path, reverse: false)
      args = GIT_APPLY.dup
      args << "-R" if reverse
      Utils.run_checked("git", *args, "--directory", Omni.root, patch_path)
    end

    def self.apply_patches
      unless patch_needed?
        LOGGER.info "No patches needed to apply."
        return
      end

      reverse_applied
      LOGGER.info "Applying new patches."
      FileUtils.mkdir_p(APPLIED)

      failed = patches_in(DIR).reject do |name|
        path = File.join(DIR, name)
        LOGGER.info "Applying patch: #{path}"
        result = git_apply(path)
        if result[:success]
          FileUtils.cp(path, File.join(APPLIED, name))
        else
          LOGGER.warn "Failed to apply patch: #{path}"
          LOGGER.warn result[:stderr]
        end
        result[:success]
      end
      raise "Patch failed: aborted (#{failed.join(', ')})" unless failed.empty?

      LOGGER.success "All patches applied successfully."
    end

    # 当て直す前に、前のものを外す。外せないものがあったら、そこで止める
    # (中途半端に混ざった runtime のまま進まないように)。
    def self.reverse_applied
      return unless File.directory?(APPLIED)

      LOGGER.info "Reversing previously applied patches."
      failed = patches_in(APPLIED).reject do |name|
        result = git_apply(File.join(APPLIED, name), reverse: true)
        unless result[:success]
          LOGGER.warn "Failed to reverse patch: #{name}"
          LOGGER.warn result[:stderr]
        end
        result[:success]
      end
      raise "Reverse Patch Failed: aborted (#{failed.join(', ')})" unless failed.empty?

      FileUtils.rm_rf(APPLIED)
    end

    # patch を作るための git。手で runtime を直して `misc patch --action create` で拾う。
    def self.initialize_git
      root = Omni.root
      if File.exist?(File.join(root, ".git"))
        LOGGER.info "Git repository is already initialized in #{root}."
        return
      end

      LOGGER.info "Initializing Git repository in #{root}."
      FileUtils.mkdir_p(root)
      File.write(File.join(root, ".gitignore"), <<~IGNORE)
        ./noraneko-devdir/*
        ./browser/chrome/browser/res/activity-stream/data/content/abouthomecache/*
      IGNORE
      Utils.run("git", "init", cwd: root)
      Utils.run("git", "add", ".", cwd: root)
      Utils.run("git", "commit", "-m", "initialize", cwd: root)
      LOGGER.success "Git repository initialization complete."
    end

    def self.create_patches
      initialize_git
      root = Omni.root
      changed = Utils.run("git", "diff", "--name-only", cwd: root)[:stdout].split("\n").reject(&:empty?)
      if changed.empty?
        LOGGER.info "No changes detected."
        return
      end

      FileUtils.mkdir_p(DIR)
      changed.each do |file|
        diff = Utils.run_checked("git", "diff", file, cwd: root)
        unless diff[:success]
          LOGGER.warn "Failed to create patch for: #{file}"
          LOGGER.warn diff[:stderr]
          next
        end
        # a/ b/ ではなく ./ で書く(当てる側が --directory で根を決めるので)
        text = diff[:stdout].gsub(/^--- a\//, "--- ./").gsub(/^\+\+\+ b\//, "+++ ./").strip + "\n"
        path = File.join(DIR, file.tr("/", "-").sub(/\.[^\/.]+\z/, "") + ".patch")
        File.write(path, text)
        LOGGER.info "Created/Updated patch: #{path}"
      end
    end

    def self.run(action = "apply")
      case action
      when "apply" then apply_patches
      when "create" then create_patches
      when "init" then initialize_git
      else LOGGER.error "Unknown patcher action: #{action}"
      end
    end
  end
end

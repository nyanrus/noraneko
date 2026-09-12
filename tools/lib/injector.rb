# SPDX-License-Identifier: MPL-2.0

require "fileutils"
require "json"
require_relative "defines"
require_relative "omni"
require_relative "utils"

module FelesBuild
  # noraneko の chrome package を binary に名乗らせる。
  #
  # omni 配置: ほどいた木の chrome.manifest に、絶対 file:// URI で足す。
  #   (FileLocation.cpp: jar の中の manifest 命令は jar の中に閉じるが、content/resource は
  #    NS_NewURI を通るので絶対 URI が効き、file:// は CanLoadResource を通る)
  # flat 配置: chrome.manifest に一行足して、noraneko-devdir/ に近道を張る。
  module Injector
    LOGGER = Utils::Logger.new("injector")

    BEGIN_MARK = "# begin noraneko"
    END_MARK = "# end noraneko"

    FLAT_MANIFEST = <<~MANIFEST.freeze
      content noraneko content/ contentaccessible=yes
      content noraneko-startup startup/ contentaccessible=yes
      content noraneko-newtab pages-newtab contentaccessible=yes
      skin noraneko classic/1.0 skin/
      resource noraneko resource/ contentaccessible=yes
      resource noraneko-builtin resource-builtin/ contentaccessible=yes
      content noraneko-pages-aboutdialog aboutdialog/ contentaccessible=yes
      override chrome://browser/content/aboutDialog.xhtml chrome://noraneko-pages-aboutdialog/content/aboutDialog.xhtml
      content noraneko-settings settings/ contentaccessible=yes
      category browser-window-domcontentloaded resource://noraneko/modules/NoranekoWindow.sys.mjs NoranekoWindow.onDOMContentLoaded
      category browser-before-ui-startup resource://noraneko/modules/NoranekoStartup.sys.mjs NoranekoStartup.init
    MANIFEST

    def self.uri(relative) = "file://#{File.expand_path(relative, Defines::PROJECT_ROOT)}/"

    def self.omni_manifest_lines
      [
        BEGIN_MARK,
        "content noraneko #{uri('browser-features/chrome/_dist')} contentaccessible=yes",
        "content noraneko-startup #{uri('bridge/startup/_dist')} contentaccessible=yes",
        "content noraneko-newtab #{uri('browser-features/pages-newtab/_dist')} contentaccessible=yes",
        "skin noraneko classic/1.0 #{uri('browser-features/skin')}",
        "resource noraneko #{uri('bridge/loader-modules/_dist')} contentaccessible=yes",
        "resource noraneko-builtin #{uri('browser-features/webext-actors/_dist')} contentaccessible=yes",
        "content noraneko-pages-aboutdialog #{uri('browser-features/pages-aboutDialog/_dist')} contentaccessible=yes",
        "override chrome://browser/content/aboutDialog.xhtml chrome://noraneko-pages-aboutdialog/content/aboutDialog.html",
        "content noraneko-settings #{uri('browser-features/settings/_dist')} contentaccessible=yes",
        "category browser-window-domcontentloaded resource://noraneko/modules/NoranekoWindow.sys.mjs NoranekoWindow.onDOMContentLoaded",
        "category browser-before-ui-startup resource://noraneko/modules/NoranekoStartup.sys.mjs NoranekoStartup.init",
        END_MARK,
      ]
    end

    # 何度やっても同じになるように、前に足した節は先に外す。
    def self.patch_chrome_manifest
      path = File.join(Omni.root, "browser", "chrome.manifest")
      raise "chrome.manifest が無い: #{path}" unless File.exist?(path)

      text = File.read(path)
      from = text.index(BEGIN_MARK)
      to = text.index(END_MARK)
      text = text[0...from].rstrip + text[(to + END_MARK.length)..] if from && to

      File.write(path, "#{text.rstrip}\n#{omni_manifest_lines.join("\n")}\n")
      LOGGER.success "Patched chrome.manifest inside omni.ja."
    end

    # noraneko の built-in WebExtension を、Firefox が自分のを載せるのと同じ場所に載せる
    # (built_in_addons.json)。build の時点で載るので、about:newtab のような早いページが
    # 起動時の競争に巻き込まれない。id が同じものは差し替える。
    def self.merge_builtin_addons
      source = Defines.in_root("browser-features/webext-actors/_dist/builtins.json")
      unless File.exist?(source)
        LOGGER.warn "webext-actors builtins.json not found; skipping built-in registration."
        return
      end

      ours = JSON.parse(File.read(source))
      return if ours.empty?

      path = Dir.glob(File.join(Omni.root, "browser", "**", "built_in_addons.json")).first
      unless path
        LOGGER.warn "built_in_addons.json not found inside omni.ja; skipping."
        return
      end

      data = JSON.parse(File.read(path))
      our_ids = ours.map { |o| o["id"] }
      builtins = (data["builtins"] || []).reject { |b| our_ids.include?(b["addon_id"]) }
      ours.each do |o|
        builtins << { "addon_id" => o["id"], "addon_version" => o["version"], "res_url" => o["res_url"] }
      end
      data["builtins"] = builtins
      File.write(path, JSON.generate(data))

      LOGGER.success "Registered #{ours.length} noraneko built-in addon(s) in #{path.sub(Omni.root + '/', '')}."
    end

    def self.run_flat(mode, dir_name)
      # production は mach が並べた binary なので、chrome.manifest には足さない
      if mode != "production"
        manifest_path = File.join(Defines::BIN_DIR, "chrome.manifest")
        entry = "manifest #{dir_name}/noraneko.manifest"
        manifest = File.exist?(manifest_path) ? File.read(manifest_path) : ""
        File.write(manifest_path, "#{manifest}\n#{entry}") unless manifest.include?(entry)
      end

      dir = File.join(Defines::BIN_DIR, dir_name)
      FileUtils.rm_rf(dir)
      FileUtils.mkdir_p(dir)
      File.write(File.join(dir, "noraneko.manifest"), FLAT_MANIFEST)
      Utils.create_feature_symlinks(dir)
    end

    def self.run(mode, dir_name = "noraneko-devdir")
      if Omni.packaged?
        LOGGER.info "Omni layout detected - patching the unpacked chrome.manifest."
        patch_chrome_manifest
        merge_builtin_addons
      else
        LOGGER.info "Flat layout detected - writing chrome.manifest and noraneko-devdir."
        run_flat(mode, dir_name)
      end
      LOGGER.success "Manifest injected successfully."
    end
  end
end

# SPDX-License-Identifier: MPL-2.0

require "fileutils"
require "json"
require "securerandom"
require_relative "defines"
require_relative "utils"

module FelesBuild
  # 版と build id。どれも build.rb から呼ばれる。
  module Update
    LOGGER = Utils::Logger.new("update")

    # build ごとに変わる id。Mozilla は buildid で update を見るが、それは build 時に決まって
    # 動かないので、版を上げずに release を差し替えるための二本目として buildid2 がある。
    #
    # UUIDv7(頭 48 bit が unix 時刻の ms なので、並べると時間順になる)。
    # SecureRandom.uuid_v7 は ruby 3.3 からで、CI の ubuntu-latest はまだ 3.2 なので自分で組む。
    def self.build_id
      ms = (Time.now.to_f * 1000).to_i
      bytes = [ms >> 40, ms >> 32, ms >> 24, ms >> 16, ms >> 8, ms].pack("C6") + SecureRandom.bytes(10)
      bytes = bytes.bytes
      bytes[6] = (bytes[6] & 0x0f) | 0x70 # version 7
      bytes[8] = (bytes[8] & 0x3f) | 0x80 # variant 10
      hex = bytes.pack("C16").unpack1("H*")
      [hex[0, 8], hex[8, 4], hex[12, 4], hex[16, 4], hex[20, 12]].join("-")
    end

    def self.package_version
      JSON.parse(File.read(File.join(Defines::PROJECT_ROOT, "package.json")))["version"]
    end

    def self.write_version(gecko_dir)
      config = File.join(gecko_dir, "config")
      FileUtils.mkdir_p(config)
      %w[version.txt version_display.txt].each do |name|
        File.write(File.join(config, name), package_version)
      end
      LOGGER.success "Version files written to #{config}"
    end

    def self.write_buildid2(build_id)
      path = Defines::PATHS[:buildid2]
      FileUtils.mkdir_p(File.dirname(path))
      File.write(path, build_id)
      LOGGER.success "Build ID written to #{path}"
    end

    def self.read_buildid2
      path = Defines::PATHS[:buildid2]
      File.exist?(path) ? File.read(path).strip : nil
    end

    # Mozilla の update の口。いま呼んでいるところは repo の中に無い
    # (docs/BUILD_SYSTEM.md には載っている)。TS の generateUpdateXml をそのまま移したもの。
    def self.generate_update_xml(meta_path, output_path)
      meta = JSON.parse(File.read(meta_path))
      patch_url = "http://github.com/nyanrus/noraneko/releases/download/alpha/noraneko-win-amd64-full.mar"
      File.write(output_path, <<~XML)
        <?xml version="1.0" encoding="UTF-8"?>
        <updates>
          <update type="minor" displayVersion="#{meta["version_display"]}" appVersion="#{meta["version"]}" platformVersion="#{meta["version"]}" buildID="#{meta["buildid"]}" appVersion2="#{meta["noraneko_version"]}">
            <patch type="complete" URL="#{patch_url}" size="#{meta["mar_size"]}" hashFunction="sha512" hashValue="#{meta["mar_shasum"]}"/>
          </update>
        </updates>
      XML
      LOGGER.success "update.xml generated at #{output_path}"
    end
  end
end

#!/usr/bin/env ruby
# SPDX-License-Identifier: MPL-2.0
#
# feles-build のうち、ファイルを触るだけの段。ここが Ruby 側のひとつの扉で、
# tools/src/utils.ts の runRuby / runRubyCapture がここを叩く。
#
#   ruby tools/lib/build.rb <step> [args]

# mac の /usr/bin/ruby は 2.6 で、SecureRandom.uuid_v7 がまだ無い。
# 素っ気ない NoMethodError になる前に、どうすればいいか言っておく。
abort "ruby #{RUBY_VERSION} は古い(3.3 以上が要る)。`mise install` で mise.toml の版が入る" if RUBY_VERSION < "3.3"

require_relative "dev_env_manager"
require_relative "symlinker"
require_relative "update"

USAGE = <<~TXT
  usage: ruby tools/lib/build.rb <step> [args]

    symlink                    loader の隣に i18n と modules への近道を張る
    uuid                       版の id を一つ作って stdout へ(stdout に出るのはこれだけ)
    write-buildid2 <id>        その id を _dist/buildid2 に置く
    write-version <gecko dir>  <dir>/config/version*.txt に package.json の版を書く
    dev-env                    dev の profile に user.js と、版の控えを置く
    update-xml <meta> <out>    Mozilla の update の口(いま呼んでいるところは無い)
TXT

def arg(index, name)
  ARGV[index] || abort("#{name} が要る\n\n#{USAGE}")
end

case ARGV.shift
when "symlink"        then FelesBuild::Symlinker.run
when "uuid"           then puts FelesBuild::Update.build_id
when "write-buildid2" then FelesBuild::Update.write_buildid2(arg(0, "<id>"))
when "write-version"  then FelesBuild::Update.write_version(arg(0, "<gecko dir>"))
when "dev-env"        then FelesBuild::DevEnvManager.setup
when "update-xml"     then FelesBuild::Update.generate_update_xml(arg(0, "<meta>"), arg(1, "<out>"))
else abort USAGE
end

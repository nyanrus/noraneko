#!/usr/bin/env ruby
# build-drop: webext-actor を「降ってくる束(drop)」にする。
#
#   ruby tools/scripts/build-drop.rb --code <code> [--note "..."] <actor> [<actor>...]
#   (deno task drop:build -- --code ... でも同じ)
#
# browser-features/webext-actors/_dist/<actor>/ を xpi に固めて、_dist/drops/<code>/ に
# <actor>.xpi と manifest.json(id / version / sha256)を書く。あとは B2 の drops/<code>/ に置くだけ
# (dl.f3liz.casa/drop/<code>/… で配られ、about:nora:settings のコード欄で入る。modules/Drops.sys.mts)。
#
# built-in と同じ id で profile に入るので:
# - version は built-in より大きく(<version>.<yyyymmddHHMM>)。
# - api.js は resource://noraneko-builtin/(= built-in の中身)ではなく、自分の xpi の actor.mjs を読む。
require "json"
require "digest"
require "fileutils"
require "tmpdir"
require "time"

code = nil
note = nil
actors = []
args = ARGV.dup
until args.empty?
  a = args.shift
  case a
  when "--code" then code = args.shift
  when "--note" then note = args.shift
  else actors << a
  end
end
unless code&.match?(/\A[a-z0-9][a-z0-9._-]{0,63}\z/) && !actors.empty?
  warn "usage: build-drop.rb --code <code> [--note ...] <actor>..."
  exit 2
end

root = File.expand_path("../..", __dir__)
dist = File.join(root, "browser-features/webext-actors/_dist")
out = File.join(root, "_dist/drops", code)
stamp = Time.now.utc.strftime("%Y%m%d%H%M")

FileUtils.rm_rf(out)
FileUtils.mkdir_p(out)

entries = actors.map do |actor|
  src = File.join(dist, actor)
  manifest = JSON.parse(File.read(File.join(src, "manifest.json")))
  id = manifest.dig("browser_specific_settings", "gecko", "id")
  version = "#{manifest["version"]}.#{stamp}"

  file = "#{actor}.xpi"
  xpi = File.join(out, file)
  Dir.mktmpdir("nora-drop-") do |work|
    FileUtils.cp(Dir.glob(File.join(src, "*")).select { |f| File.file?(f) }, work)
    # source を同梱する(入れる本人が読めるように。build された bytes が自分の source を持ち歩く)
    src_dir = File.join(root, "browser-features/webext-actors")
    FileUtils.mkdir_p(File.join(work, "source"))
    ([File.join(src_dir, actor, "actor.ts")] + Dir.glob(File.join(src_dir, "_shared", "*.ts"))).each do |f|
      rel = f.sub("#{src_dir}/", "")
      FileUtils.mkdir_p(File.join(work, "source", File.dirname(rel)))
      FileUtils.cp(f, File.join(work, "source", rel))
    end
    manifest["version"] = version
    manifest["name"] = "#{manifest["name"]} (drop #{code})"
    File.write(File.join(work, "manifest.json"), JSON.pretty_generate(manifest))
    # api.js: built-in の resource:// ではなく、この xpi の actor.mjs を読む(jar:file: の URL は importESModule で読める)
    api = File.read(File.join(work, "api.js"))
    # importESModule は jar:file: を信用しない("System modules must be loaded from a trusted scheme")。
    # 入れる側(modules/Drops.sys.mts)が resource://<alias>/ を xpi の root に張るので、api.js はそれを読むだけ。
    # alias の規則は Drops.sys.mts と同じ: ("noraneko-drop-" + code + "-" + version) を [a-z0-9] 以外 "-" に、小文字。
    # 版を含めるのは、module cache が URL 単位で、同じ session で版を替えたとき古いのが残らないように
    res_alias = "noraneko-drop-#{code}-#{version}".gsub(/[^a-z0-9]/i, "-").downcase
    patched = api.sub(%r{ChromeUtils\.importESModule\(\s*"resource://noraneko-builtin/[^"]+/actor\.mjs",?\s*\)}) do
      %(ChromeUtils.importESModule("resource://#{res_alias}/actor.mjs"))
    end
    abort "#{actor}: api.js の importESModule が見つからない" if patched == api
    File.write(File.join(work, "api.js"), patched)
    system("zip", "-q", "-r", "-X", xpi, ".", chdir: work) or abort "zip failed: #{actor}"
  end
  size = File.size(xpi)
  sha256 = Digest::SHA256.file(xpi).hexdigest
  puts "#{actor}: #{id} #{version} #{file} #{size}B"
  { id: id, name: actor, version: version, file: file, sha256: sha256, size: size }
end

source = {
  repo: `git -C #{root} remote get-url origin 2>/dev/null`.strip.sub(/\.git\z/, ""),
  commit: `git -C #{root} rev-parse HEAD 2>/dev/null`.strip,
  path: "browser-features/webext-actors",
}
File.write(File.join(out, "manifest.json"),
           JSON.pretty_generate({ code: code, note: note, built_at: Time.now.utc.iso8601, source: source, entries: entries }.compact) + "\n")
puts "→ #{out}/manifest.json"

#!/usr/bin/env ruby
# build-drop: webext-actor を「降ってくる束(drop)」にする。
#
#   ruby scripts/build-drop.rb --uuid <uuid> --name <name> [--note "..."] <actor> [<actor>...]
#   (ふつうは scripts/build.rb が env を揃えて呼ぶ。noraneko の testbed の tools/scripts/build-drop.rb と同じもの)
#
# _dist/<actor>/ を xpi(= ただの zip)に固めて、_build/<name>/ に
# <actor>.xpi と manifest.json(uuid / name / version / sha256)を書く。あとは dl.f3liz.casa/drop/<uuid> に置くだけ
# (正体は uuid、name は札。about:nora:settings に uuid を入れると降ってくる。modules/Drops.sys.mts)。
#
# built-in と同じ id で profile に入るので:
# - version は built-in より大きく(<version>.<commit の yyyymmddHHMM>)。同じ commit なら同じ版。
# - parent.sys.mjs / child.sys.mjs は resource://noraneko-builtin/(= built-in の中身)ではなく、自分の xpi の
#   actor.mjs / content.js を読む(alias に書き換える)。
require "json"
require "digest"
require "fileutils"
require "tmpdir"
require "time"

uuid = nil
name = nil
note = nil
actors = []
args = ARGV.dup
until args.empty?
  a = args.shift
  case a
  when "--uuid" then uuid = args.shift
  when "--name" then name = args.shift
  when "--note" then note = args.shift
  else actors << a
  end
end
unless uuid&.match?(/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/) && name&.match?(/\A[a-z0-9][a-z0-9._-]{0,63}\z/) && !actors.empty?
  warn "usage: build-drop.rb --uuid <uuid(小文字)> --name <name> [--note ...] <actor>..."
  exit 2
end

# 置き場。registry: BUILD_ROOT(git の repo。commit の時刻と source の由来)と BUILD_ACTORS(stage した webext-actors)を env で
root = ENV.fetch("BUILD_ROOT") { File.expand_path("../..", __dir__) }
actors_root = ENV.fetch("BUILD_ACTORS") { File.join(root, "browser-features/webext-actors") }
dist = File.join(actors_root, "_dist")
out = File.join(ENV.fetch("BUILD_OUT") { File.join(root, "_dist/drops") }, name)

# reproducible: 同じ commit から同じ bytes が出るように。日時は「今」でなく commit の時刻。
# zip の中の mtime も全部これに揃え、zip は TZ=UTC・ファイル一覧を sort して渡す(順も固定)。
#   git rev-parse HEAD      → いまの commit の sha(manifest の source.commit)
#   git log -1 --format=%ct → その commit の時刻(unix 秒)。版と mtime の元
commit = `git -C #{root} rev-parse HEAD 2>/dev/null`.strip
commit_time = `git -C #{root} log -1 --format=%ct 2>/dev/null`.strip.to_i
abort "git の commit が読めない(reproducible にできない)" if commit.empty? || commit_time.zero?

# 版の日時は分まで。mtime も同じ分に丸める(zip の時刻は 2 秒刻みで、秒がずれると bytes が変わる。
# GitHub の PR は merge commit を checkout するので、秒違いの commit で同じ bytes を出すため)
commit_time = commit_time - (commit_time % 60)
stamp = Time.at(commit_time).utc.strftime("%Y%m%d%H%M")
ENV["TZ"] = "UTC"

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
    # _dist/<actor>/ の産物(manifest.json / actor.json / parent.sys.mjs / child.sys.mjs / actor.mjs / content.js)を作業場へ
    FileUtils.cp(Dir.glob(File.join(src, "*")).select { |f| File.file?(f) }, work)

    # source を同梱する(入れる本人が読めるように。build された bytes が自分の source を持ち歩く)
    src_dir = actors_root
    FileUtils.mkdir_p(File.join(work, "source"))
    (Dir.glob(File.join(src_dir, actor, "**", "*")).select { |f| File.file?(f) } + Dir.glob(File.join(src_dir, "_shared", "*.ts"))).each do |f|
      rel = f.sub("#{src_dir}/", "")
      FileUtils.mkdir_p(File.join(work, "source", File.dirname(rel)))
      FileUtils.cp(f, File.join(work, "source", rel))
    end

    # manifest.json: 版と名前を drop 用に
    manifest["version"] = version
    manifest["name"] = "#{manifest["name"]} (drop #{name})"
    File.write(File.join(work, "manifest.json"), JSON.pretty_generate(manifest))

    # parent.sys.mjs / child.sys.mjs: built-in の resource:// ではなく、この xpi の actor.mjs / content.js を読む。
    # importESModule は jar:file: を信用しない("System modules must be loaded from a trusted scheme")。
    # 入れる側(modules/Drops.sys.mts)が resource://<alias>/ を xpi の root に張るので、ここではその URL に書き換えるだけ。
    # alias の規則は Drops.sys.mts と同じ: ("noraneko-drop-" + uuid + "-" + version) を [a-z0-9] 以外 "-" に、小文字。
    # 版を含めるのは、module cache が URL 単位で、同じ session で版を替えたとき古いのが残らないように
    res_alias = "noraneko-drop-#{uuid}-#{version}".gsub(/[^a-z0-9]/i, "-").downcase
    %w[parent.sys.mjs child.sys.mjs].each do |f|
      src_text = File.read(File.join(work, f))
      patched = src_text.gsub(%r{resource://noraneko-builtin/[^/"]+/}, "resource://#{res_alias}/")
      abort "#{actor}: #{f} に resource://noraneko-builtin/ が無い" if patched == src_text
      File.write(File.join(work, f), patched)
    end

    Dir.chdir(work) do
      files = Dir.glob("**/*", File::FNM_DOTMATCH).select { |f| File.file?(f) }.sort
      js = files.select { |f| f.end_with?(".js", ".mjs") }

      # syntax check: 固める前に読めるか。壊れた印を入れて一日溶かした
      #   node --check <js> → parse だけ(deno check は .js でも JSDoc の import('./x') を型として追い、
      #   同梱した preact の source で転ぶ)。読めない JS があれば exit 1
      #   .json は JSON.parse
      js.each { |f| system("node", "--check", f) or abort "#{actor}: syntax check failed (node --check #{f})" }

      # minify 禁止: 人が読めない JS は drop にしない(一行が長すぎるものは minify と見なす)
      js.each do |f|
        long = File.foreach(f).find { |l| l.length > 400 }
        abort "#{actor}: #{f} looks minified (line > 400 chars). drop の JS は読める形で" if long
      end
      files.select { |f| f.end_with?(".json") }.each do |f|
        JSON.parse(File.read(f)) rescue abort("#{actor}: #{f} is not valid JSON")
      end

      # 権限と mtime を揃える(umask や今の時刻が bytes に混ざらないように)
      Dir.glob("**/*", File::FNM_DOTMATCH).each do |f|
        next if f.end_with?("/.", "/..") || f == "." || f == ".."
        File.chmod(File.directory?(f) ? 0o755 : 0o644, f)
        File.utime(commit_time, commit_time, f)
      end

      # zip -q -X -D <xpi> <files...>(sort 済の一覧を、この順で):
      #   -X = uid/gid などの extra field を入れない、-D = dir の entry を入れない。どちらも bytes を揺らさないため
      #   xpi は拡張子が違うだけの zip。unzip -l で中が見える
      system("zip", "-q", "-X", "-D", xpi, *files) or abort "zip failed: #{actor}"
    end
  end

  size = File.size(xpi)
  sha256 = Digest::SHA256.file(xpi).hexdigest
  puts "#{actor}: #{id} #{version} #{file} #{size}B"
  { id: id, name: actor, version: version, file: file, sha256: sha256, size: size }
end

# manifest.json: どの repo の、どの commit の、どの path から build したか(git remote get-url origin が repo)
source = {
  repo: `git -C #{root} remote get-url origin 2>/dev/null`.strip.sub(/\.git\z/, ""),
  commit: commit,
  commit_time: Time.at(commit_time).utc.iso8601,
  path: ENV.fetch("BUILD_SOURCE_PATH", "browser-features/webext-actors"),
}
File.write(File.join(out, "manifest.json"),
           JSON.pretty_generate({ uuid: uuid, name: name, note: note, source: source, entries: entries }.compact) + "\n")
puts "→ #{out}/manifest.json"

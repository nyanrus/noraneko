#!/usr/bin/env ruby
# SPDX-License-Identifier: MPL-2.0
#
# TabbrowserCompat.init_compat() が実行時に出す警告の、建てる前の双子。
# gecko-compat の module は一つの prototype に重ねて載せるので、あとの module が勝ち、
# 二度書かれた名前は黙って隠れる。ソースを読んで、
#   - 二つの module が同じ名前を定義している
#   - TabbrowserCompat.ts の *instance field* が module の getter/setter と同じ名前
#     (own property が accessor を隠す)
# のときに落ちる。class の *method* は module に上書きさせるのが意図なので、言わない。
#
#   deno task check:tabbrowser   (= ruby tools/scripts/check-tabbrowser-methods.rb)

ROOT = File.expand_path("../..", __dir__)
DIR = File.join(ROOT, "browser-features/chrome/features/tabbrowser/gecko-compat")
CLASS_FILE = File.join(DIR, "TabbrowserCompat.ts")

# 分かっていて残している重なり(分析の覚書を見て)。片づいたら消す。
ALLOW = %w[addTabGroup removeTabGroup].freeze

# `  name(`, `  async name(`, `  get name(`, `  set name(` を字下げ二つで
MEMBER_RE = /^  (?:async )?(get |set )?(_?[A-Za-z][A-Za-z0-9]*)\s*\(/
# `  name: T = …;` や `  private name = …;`(instance field。`declare` は除く)
FIELD_RE = /^  (?!declare |static |readonly )(?:private |protected |public )?(_?[A-Za-z][A-Za-z0-9]*)(?:\??: [^=;\n]+)? = /

owners = Hash.new { |h, k| h[k] = [] }
accessors = []

Dir.children(File.join(DIR, "modules")).sort.each do |name|
  next unless name.end_with?(".ts")

  mod = name.delete_suffix(".ts")
  seen = []
  File.read(File.join(DIR, "modules", name)).scan(MEMBER_RE) do |kind, member|
    accessors << member if kind
    next if seen.include?(member) # 同じ module の get/set の対

    seen << member
    owners[member] << mod
  end
end

problems = owners.filter_map do |name, mods|
  "#{name}: defined in #{mods.join(', ')} (last one wins)" if mods.size > 1 && !ALLOW.include?(name)
end

File.read(CLASS_FILE).scan(FIELD_RE) do |(name)|
  next unless accessors.include?(name)

  problems << "#{name}: instance field in TabbrowserCompat.ts hides a module accessor (use `declare`)"
end

unless problems.empty?
  warn "[check-tabbrowser-methods] duplicate members:"
  problems.each { |p| warn "  - #{p}" }
  exit 1
end
puts "[check-tabbrowser-methods] ok (#{owners.size} members, #{accessors.uniq.size} accessors)"

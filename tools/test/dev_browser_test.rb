# SPDX-License-Identifier: MPL-2.0
#
#   ruby tools/test/dev_browser_test.rb   (= deno task test:tools)
#
# DevBrowser.ours? が、配った Noraneko を決して掴まないことを確かめる。
# ここが緩むと人の使っているブラウザが落ちるので、緩めるときは必ずここに一本足すこと。

require "minitest/autorun"
require_relative "../lib/dev_browser"

class DevBrowserTest < Minitest::Test
  BIN = "/home/someone/repos/noraneko/_dist/bin/"
  PROFILE = "/home/someone/repos/noraneko/_dist/profile/test"

  def ours?(command) = FelesBuild::DevBrowser.ours?(command, exe_prefix: BIN, profile: PROFILE)

  def dev_command(exe: "#{BIN}noraneko/Noraneko.app/Contents/MacOS/noraneko", profile: PROFILE)
    "#{exe} --profile #{profile} --remote-debugging-port 5180 --wait-for-browser --jsdebugger"
  end

  def test_手元の_dev_は_掴む
    assert ours?(dev_command)
  end

  def test_linux_の_flat_配置の_dev_も_掴む
    assert ours?(dev_command(exe: "#{BIN}noraneko/noraneko-bin"))
  end

  # ここから下が本題。どれも掴んではいけない。
  def test_配った_Noraneko_は_掴まない
    refute ours?("/Applications/Noraneko.app/Contents/MacOS/noraneko")
    refute ours?("/Applications/Noraneko.app/Contents/MacOS/noraneko --profile /Users/x/Library/Application Support/Noraneko/Profiles/abc.default")
    refute ours?("/usr/lib/noraneko/noraneko-bin")
    refute ours?("/opt/noraneko/noraneko")
  end

  def test_素の_Firefox_も_掴まない
    refute ours?("/Applications/Firefox.app/Contents/MacOS/firefox")
  end

  def test_repo_の_中から起きていても_別の_profile_なら掴まない
    refute ours?(dev_command(profile: "/Users/x/Library/Application Support/Noraneko/Profiles/abc.default"))
    refute ours?(dev_command(profile: "#{PROFILE}-backup"))  # 前方一致だけで通らないこと
    refute ours?("#{BIN}noraneko/Noraneko.app/Contents/MacOS/noraneko")  # --profile が無い
  end

  def test_dev_の_profile_でも_repo_の外の実行ファイルなら掴まない
    refute ours?("/Applications/Noraneko.app/Contents/MacOS/noraneko --profile #{PROFILE}")
  end

  def test_名前が似ているだけの_path_は掴まない
    refute ours?("/home/someone/repos/noraneko/_dist/bin-old/noraneko --profile #{PROFILE}")
    refute ours?("/home/someone/repos/noraneko-fork/_dist/bin/noraneko --profile #{PROFILE}")
  end

  def test_空やゴミ
    refute ours?(nil)
    refute ours?("")
    refute ours?("--profile #{PROFILE}")
  end
end

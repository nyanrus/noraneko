#!/usr/bin/env ruby
# SPDX-License-Identifier: MPL-2.0
#
#   ruby tools/launcher.rb        (= deno task launcher)
#
# feles-build を押して呼ぶための小さな画面。127.0.0.1 にだけ立って、ブラウザが開く。
# 走らせられるのは下の COMMANDS に書いてあるものだけ。gem は使わない。

require "cgi"
require "json"
require "rbconfig"
require "socket"

require_relative "lib/dev_browser"

ROOT = File.expand_path("..", __dir__)
FELES = File.join(ROOT, "tools", "feles-build.rb")

# 押せるもの。ここに無い文字列は走らない(外から叩かれても、この表の外には出ない)
COMMANDS = {
  "dev" => %w[dev],
  "stage" => %w[stage],
  "before-mach" => %w[build --phase before-mach],
  "stop-browser" => %w[stop],
  "patch-apply" => %w[misc patch --action apply],
  "write-version" => %w[misc writeVersion],
}.freeze

# 走っているものは、いつも一つ。log は後ろ 2000 行だけ覚えておく。
module Runner
  KEEP = 2000
  @mutex = Mutex.new
  @lines = []
  @dropped = 0 # 捨てた行数。画面が「どこまで見たか」を数えるのに要る
  @pid = nil
  @name = nil
  @started_at = nil

  class << self
    def state(from)
      browsers = open_browsers # ps を叩くので、mutex を持つ前に
      @mutex.synchronize do
        # 持っている範囲の外を訊かれたら頭から返す(新しい run の始まりはこれで分かる)
        from = @dropped if from < @dropped || from > @dropped + @lines.length
        {
          running: !@pid.nil?,
          name: @name,
          seconds: @started_at ? (Time.now - @started_at).to_i : nil,
          from: from,
          next: @dropped + @lines.length,
          lines: @lines[(from - @dropped)..] || [],
          open_browsers: browsers,
        }
      end
    end

    # すでに開いている dev の browser の数。ps は毎回叩くと重いので 2 秒だけ覚えておく。
    def open_browsers
      if @browsers_at.nil? || Time.now - @browsers_at > 2
        @browsers = FelesBuild::DevBrowser.running.length
        @browsers_at = Time.now
      end
      @browsers
    end

    def start(name)
      args = COMMANDS[name] or return "そんな command は無い: #{name}"
      @mutex.synchronize do
        return "もう #{@name} が走っている" if @pid

        reader, writer = IO.pipe
        # pgroup: true で、止めるときに vite や browser も一緒に畳める
        pid = spawn(RbConfig.ruby, FELES, *args,
                    chdir: ROOT, in: File::NULL, out: writer, err: %i[child out], pgroup: true)
        writer.close
        @pid = pid
        @name = name
        @started_at = Time.now
        @lines = []
        @dropped = 0
        Thread.new { pump(reader, pid) }
      end
      nil
    end

    def stop
      @mutex.synchronize do
        return "走っていない" unless @pid

        Process.kill("TERM", -@pid) rescue nil
      end
      nil
    end

    private

    def pump(reader, pid)
      reader.each_line { |line| push(line.chomp) }
      reader.close
      status = (Process.wait2(pid)[1] rescue nil)
      how = if status.nil? then "?"
            elsif status.signaled? then "SIG#{Signal.signame(status.termsig)}"
            else "exit #{status.exitstatus}"
            end
      push("--- 終わりました (#{how}) ---")
      @mutex.synchronize { @pid = @name = @started_at = nil if @pid == pid }
    end

    def push(line)
      @mutex.synchronize do
        @lines << line.gsub(/\e\[[0-9;]*m/, "") # 色は画面側で塗る
        @dropped += @lines.shift(@lines.length - KEEP).length if @lines.length > KEEP
      end
    end
  end
end

PAGE = <<~'HTML'
  <!doctype html><html lang="ja"><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Noraneko を動かす</title>
  <style>
    :root { color-scheme: light dark; --bg:#fbfaf8; --fg:#2c2a28; --line:#e2ddd6; --soft:#78716a;
            --accent:#3a6ea5; --ok:#2f7a43; --warn:#9a6b12; --err:#a33a30; --card:#ffffff; }
    @media (prefers-color-scheme: dark) {
      :root { --bg:#1c1b1a; --fg:#ddd8d2; --line:#34312e; --soft:#948d86;
              --accent:#87b3dd; --ok:#7fc08e; --warn:#d6ad5c; --err:#e08a80; --card:#232120; }
    }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--fg);
           font:15px/1.7 system-ui, -apple-system, "Hiragino Sans", sans-serif; }
    main { max-width: 44rem; margin:0 auto; padding: 2rem 1.25rem 4rem; }
    h1 { font-size:1.15rem; font-weight:600; margin:0 0 .25rem; }
    .lede { color:var(--soft); margin:0 0 1.75rem; font-size:.9rem; }

    .notice { display:flex; gap:.75rem; align-items:flex-start; background:var(--card);
              border:1px solid var(--line); border-left:3px solid var(--warn);
              border-radius:.5rem; padding:.85rem 1rem; margin-bottom:1.25rem; }
    .notice p { margin:0; font-size:.875rem; }
    .notice .t { font-weight:600; display:block; margin-bottom:.15rem; }
    .notice button { flex:none; }
    [hidden] { display:none !important; }

    .choices { display:grid; gap:.75rem; margin-bottom:1.5rem; }
    .choice { display:flex; align-items:center; gap:1rem; width:100%; text-align:left;
              background:var(--card); border:1px solid var(--line); border-radius:.6rem;
              padding:.9rem 1.1rem; color:inherit; font:inherit; cursor:pointer; }
    .choice:hover:not(:disabled) { border-color:var(--accent); }
    .choice:disabled { opacity:.45; cursor:default; }
    .choice b { display:block; font-weight:600; font-size:.95rem; }
    .choice span { display:block; color:var(--soft); font-size:.8rem; line-height:1.5; }

    button { font:inherit; color:inherit; }
    .small { padding:.35rem .8rem; border:1px solid var(--line); border-radius:.4rem;
             background:transparent; cursor:pointer; font-size:.825rem; }
    .small:hover:not(:disabled) { border-color:var(--soft); }
    .small:disabled { opacity:.4; cursor:default; }

    #now { background:var(--card); border:1px solid var(--line); border-radius:.6rem;
           padding:1rem 1.1rem; margin-bottom:1rem; }
    #nowHead { display:flex; align-items:center; gap:.6rem; }
    .dot { width:.5rem; height:.5rem; border-radius:50%; background:var(--soft); flex:none; }
    .dot.on { background:var(--ok); animation: pulse 1.6s ease-in-out infinite; }
    .dot.bad { background:var(--err); }
    @keyframes pulse { 50% { opacity:.35; } }
    #phase { font-weight:600; font-size:.95rem; }
    #elapsed { color:var(--soft); font-size:.8rem; margin-left:auto; }
    #hint { color:var(--soft); font-size:.825rem; margin:.4rem 0 0; }
    #hint.bad { color:var(--err); }
    #nowActions { margin-top:.85rem; }

    details { border-top:1px solid var(--line); padding-top:1rem; margin-top:1.5rem; }
    summary { cursor:pointer; color:var(--soft); font-size:.85rem; }
    summary::marker { color:var(--line); }
    #log { font:11.5px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; white-space:pre-wrap;
           word-break:break-word; overflow-y:auto; max-height:26rem; margin-top:.75rem;
           padding:.75rem .9rem; background:var(--card); border:1px solid var(--line);
           border-radius:.4rem; color:var(--soft); }
    #log .SUCCESS { color:var(--ok); } #log .WARN { color:var(--warn); }
    #log .ERROR { color:var(--err); } #log .INFO { color:var(--fg); }
    .devrow { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:.75rem; }
  </style>

  <main>
    <h1>Noraneko を動かす</h1>
    <p class="lede">この画面から、手元の Noraneko を組み立てて開けます。
      コマンドを覚えていなくて大丈夫です。</p>

    <div class="notice" id="openNotice" hidden>
      <p><span class="t">すでに Noraneko が開いています</span>
         このまま起動しても、新しく組み立てたものは今開いている窓のほうに渡されて、
         画面には映りません。先に閉じてください。</p>
      <button class="small" id="closeOpen">閉じる</button>
    </div>

    <div class="choices" id="choices">
      <button class="choice" data-cmd="dev">
        <div><b>起動する</b>
        <span>手元のコードで組み立てて、Noraneko を開きます。ふだんはこれです。</span></div>
      </button>
      <button class="choice" data-cmd="stage">
        <div><b>配るときと同じ形で起動する</b>
        <span>人に配るときと同じ組み立てかたで開きます。少し時間がかかります。</span></div>
      </button>
    </div>

    <div id="now">
      <div id="nowHead">
        <span class="dot" id="dot"></span>
        <span id="phase">まだ何も動いていません</span>
        <span id="elapsed"></span>
      </div>
      <p id="hint">上のどちらかを押すと始まります。</p>
      <div id="nowActions"><button class="small" id="stop" disabled>中止する</button></div>
    </div>

    <details>
      <summary>くわしい記録</summary>
      <div id="log"></div>
      <div class="devrow">
        <button class="small" data-cmd="stop-browser">開いている Noraneko を閉じる</button>
        <button class="small" data-cmd="patch-apply">patch を当て直す</button>
        <button class="small" data-cmd="before-mach">配布用に組み立てる</button>
        <button class="small" data-cmd="write-version">版の番号を書く</button>
      </div>
    </details>
  </main>

  <script>
    const TOKEN = new URLSearchParams(location.search).get("t") || "";
    const el = (id) => document.getElementById(id);
    const log = el("log"), dot = el("dot"), phase = el("phase"), hint = el("hint");

    // log の一行を、いま何をしているかの言葉にする。上から順に、最初に当たったもの。
    const PHASES = [
      [/Downloading binary|not found\. Downloading/, "Noraneko 本体をダウンロードしています",
       "はじめての起動では数分かかります。そのままお待ちください。"],
      [/\[initializer\]|\[omni\]/, "下ごしらえをしています", "Noraneko 本体を用意しています。"],
      [/\[patcher\]/, "手を入れています", ""],
      [/\[builder\]/, "組み立てています", "いちばん時間のかかるところです。1〜2 分ほど。"],
      [/\[injector\]|\[xhtml\]/, "組み込んでいます", ""],
      [/\[dev-env\]|\[dev-server\]/, "準備をしています", "もうすぐ開きます。"],
      [/Launching browser/, "Noraneko を開いています", "窓が出てこないときは、下の記録を見てください。"],
      [/Browser Closed/, "閉じられました", ""],
    ];
    const DONE = {
      dev: ["終わりました", "Noraneko の窓を閉じたので、ここも終わりました。"],
      stage: ["終わりました", "Noraneko の窓を閉じたので、ここも終わりました。"],
      "stop-browser": ["閉じました", "開いていた Noraneko を閉じました。"],
    };

    let from = 0, phaseText = null, phaseHint = "", failed = false, lastError = "";

    for (const b of document.querySelectorAll("[data-cmd]")) {
      b.onclick = () => post("/run?t=" + TOKEN + "&cmd=" + b.dataset.cmd);
    }
    el("stop").onclick = () => post("/stop?t=" + TOKEN);
    el("closeOpen").onclick = () => post("/run?t=" + TOKEN + "&cmd=stop-browser");

    async function post(url) {
      try { await fetch(url, { method: "POST" }); } catch {}
      tick();
    }

    function elapsed(s) {
      if (s === null || s === undefined) return "";
      return s < 60 ? s + " 秒" : Math.floor(s / 60) + " 分 " + (s % 60) + " 秒";
    }

    function read(line) {
      const level = line.match(/^\[[^\]]+\] (INFO|WARN|ERROR|SUCCESS):/);
      if (level && level[1] === "ERROR") { lastError = line; }
      const done = line.match(/^--- 終わりました \((.+)\) ---$/);
      if (done) { failed = !/^exit 0$/.test(done[1]); return; }
      for (const [re, text, tip] of PHASES) {
        if (re.test(line)) { phaseText = text; phaseHint = tip; return; }
      }
    }

    function append(lines) {
      const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 40;
      for (const line of lines) {
        read(line);
        const level = line.match(/^\[[^\]]+\] (INFO|WARN|ERROR|SUCCESS):/);
        const div = document.createElement("div");
        div.className = level ? level[1] : "";
        div.textContent = line;
        log.append(div);
      }
      if (atBottom) log.scrollTop = log.scrollHeight;
    }

    async function tick() {
      let s;
      try { s = await (await fetch("/state?t=" + TOKEN + "&from=" + from)).json(); } catch { return; }
      if (s.from !== from) {
        log.textContent = "";
        phaseText = null; phaseHint = ""; failed = false; lastError = "";
      }
      from = s.next;
      append(s.lines);

      el("openNotice").hidden = !(s.open_browsers > 0) || s.running;
      dot.className = "dot" + (s.running ? " on" : (failed ? " bad" : ""));
      el("elapsed").textContent = s.running ? elapsed(s.seconds) : "";
      el("stop").disabled = !s.running;
      for (const b of document.querySelectorAll("[data-cmd]")) b.disabled = s.running;

      if (s.running) {
        phase.textContent = phaseText || "はじめています";
        hint.textContent = phaseHint;
        hint.className = "";
      } else if (failed) {
        phase.textContent = "うまくいきませんでした";
        hint.textContent = lastError
          ? "理由: " + lastError.replace(/^\[[^\]]+\] ERROR: /, "")
          : "「くわしい記録」の赤い行に理由が出ています。";
        hint.className = "bad";
      } else if (log.childElementCount) {
        const done = DONE[phaseLast] || ["終わりました", ""];
        phase.textContent = done[0];
        hint.textContent = done[1];
        hint.className = "";
      }
      if (s.name) phaseLast = s.name;
    }
    let phaseLast = null;
    tick();
    setInterval(tick, 700);
  </script>
HTML

def respond(socket, status, type, body)
  socket.print "HTTP/1.1 #{status}\r\nContent-Type: #{type}\r\n" \
               "Content-Length: #{body.bytesize}\r\nConnection: close\r\n\r\n#{body}"
end

def handle(socket, token)
  request = socket.gets or return
  method, target, = request.split
  nil while (header = socket.gets) && header.strip != "" # header は読み捨てる

  path, _, query = target.to_s.partition("?")
  params = CGI.parse(query)
  given = params["t"]&.first

  return respond(socket, "200 OK", "text/html; charset=utf-8", PAGE) if path == "/" && method == "GET"
  # 画面以外は token を見る(他所のページから叩かれて build が始まらないように)
  return respond(socket, "403 Forbidden", "text/plain", "no") unless given == token

  case [method, path]
  in ["GET", "/state"]
    respond(socket, "200 OK", "application/json", JSON.generate(Runner.state(params["from"]&.first.to_i)))
  in ["POST", "/run"]
    error = Runner.start(params["cmd"]&.first.to_s)
    respond(socket, error ? "409 Conflict" : "200 OK", "text/plain", error || "ok")
  in ["POST", "/stop"]
    error = Runner.stop
    respond(socket, "200 OK", "text/plain", error || "ok")
  else
    respond(socket, "404 Not Found", "text/plain", "no")
  end
rescue => e
  warn "launcher: #{e.message}"
ensure
  socket.close rescue nil
end

server = TCPServer.new("127.0.0.1", (ENV["PORT"] || 0).to_i) # 0 = 空いている port を借りる
token = format("%08x%08x", rand(2**32), rand(2**32))
url = "http://127.0.0.1:#{server.addr[1]}/?t=#{token}"

puts "noraneko dev launcher: #{url}"
system("open", url) if RUBY_PLATFORM.include?("darwin")

Signal.trap("INT") do
  Runner.stop
  exit 0
end

loop { Thread.new(server.accept) { |socket| handle(socket, token) } }

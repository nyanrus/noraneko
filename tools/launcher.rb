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
      @mutex.synchronize do
        from = @dropped if from < @dropped
        {
          running: !@pid.nil?,
          name: @name,
          seconds: @started_at ? (Time.now - @started_at).to_i : nil,
          from: from,
          next: @dropped + @lines.length,
          lines: @lines[(from - @dropped)..] || [],
        }
      end
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

PAGE = <<~HTML
  <!doctype html><html lang="ja"><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>noraneko dev</title>
  <style>
    :root { color-scheme: light dark; --bg:#fbfaf8; --fg:#2c2a28; --line:#e2ddd6; --soft:#7a736c;
            --ok:#2f7a43; --warn:#9a6b12; --err:#a33a30; --info:#3a6ea5; }
    @media (prefers-color-scheme: dark) {
      :root { --bg:#1c1b1a; --fg:#ddd8d2; --line:#34312e; --soft:#918a83;
              --ok:#7fc08e; --warn:#d6ad5c; --err:#e08a80; --info:#87b3dd; }
    }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--fg); font:14px/1.6 system-ui, sans-serif; }
    main { max-width: 60rem; margin: 0 auto; padding: 1.5rem 1.25rem 0; }
    h1 { font-size: 1rem; font-weight: 600; margin: 0 0 1rem; color: var(--soft); }
    .row { display:flex; flex-wrap:wrap; gap:.5rem; margin-bottom:1rem; }
    button { font: inherit; padding:.4rem .9rem; border:1px solid var(--line); border-radius:.4rem;
             background:transparent; color:var(--fg); cursor:pointer; }
    button:hover:not(:disabled) { border-color: var(--soft); }
    button:disabled { opacity:.4; cursor:default; }
    button.stop { margin-left:auto; }
    #status { display:flex; align-items:center; gap:.5rem; color:var(--soft);
              padding-bottom:.75rem; border-bottom:1px solid var(--line); }
    .dot { width:.5rem; height:.5rem; border-radius:50%; background:var(--soft); }
    .dot.on { background: var(--ok); }
    #log { font:12px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; white-space:pre-wrap;
           word-break:break-word; overflow-y:auto; height:60vh; padding:.75rem 0 2rem; }
    .SUCCESS { color: var(--ok); } .WARN { color: var(--warn); }
    .ERROR { color: var(--err); } .INFO { color: var(--info); }
    .end { color: var(--soft); }
  </style>
  <main>
    <h1>noraneko dev</h1>
    <div class="row" id="buttons"></div>
    <div id="status"><span class="dot"></span><span id="statusText">止まっている</span></div>
    <div id="log"></div>
  </main>
  <script>
    const TOKEN = new URLSearchParams(location.search).get("t") || "";
    const NAMES = { "dev": "dev", "stage": "stage", "before-mach": "build (before-mach)", "stop-browser": "開発用を閉じる",
                    "patch-apply": "patch apply", "write-version": "writeVersion" };
    const buttons = document.getElementById("buttons");
    const log = document.getElementById("log");
    const statusText = document.getElementById("statusText");
    const dot = document.querySelector(".dot");
    let from = 0, running = false;

    for (const [key, label] of Object.entries(NAMES)) {
      const b = document.createElement("button");
      b.textContent = label;
      b.dataset.cmd = key;
      b.onclick = () => post("/run?t=" + TOKEN + "&cmd=" + key);
      buttons.append(b);
    }
    const stop = document.createElement("button");
    stop.textContent = "止める";
    stop.className = "stop";
    stop.onclick = () => post("/stop?t=" + TOKEN);
    buttons.append(stop);

    async function post(url) { await fetch(url, { method: "POST" }); tick(); }

    function elapsed(s) {
      if (s === null) return "";
      return s < 60 ? s + "秒" : Math.floor(s / 60) + "分" + String(s % 60).padStart(2, "0") + "秒";
    }

    function append(lines) {
      const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 40;
      for (const line of lines) {
        const div = document.createElement("div");
        const level = line.match(/^\\[[^\\]]+\\] (INFO|WARN|ERROR|SUCCESS):/);
        div.className = level ? level[1] : (line.startsWith("---") ? "end" : "");
        div.textContent = line;
        log.append(div);
      }
      if (atBottom) log.scrollTop = log.scrollHeight;
    }

    async function tick() {
      let s;
      try { s = await (await fetch("/state?t=" + TOKEN + "&from=" + from)).json(); } catch { return; }
      if (s.from !== from) { log.textContent = ""; }
      from = s.next;
      append(s.lines);
      running = s.running;
      dot.classList.toggle("on", running);
      statusText.textContent = running
        ? "走っている (" + NAMES[s.name] + ", " + elapsed(s.seconds) + ")"
        : "止まっている";
      for (const b of buttons.children) {
        b.disabled = b.className === "stop" ? !running : running;
      }
    }
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

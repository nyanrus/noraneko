# SPDX-License-Identifier: MPL-2.0

module FelesBuild
  module Utils
    # tools/src/utils.ts の Logger と同じ形で出す: "[prefix] LEVEL: message"
    class Logger
      COLORS = {
        "INFO" => 34, "WARN" => 33, "ERROR" => 31, "SUCCESS" => 32, "DEBUG" => 90
      }.freeze

      def initialize(prefix)
        @prefix = prefix
      end

      def info(message) = say("INFO", message)
      def warn(message) = say("WARN", message)
      def error(message) = say("ERROR", message)
      def success(message) = say("SUCCESS", message)

      def debug(message)
        say("DEBUG", message) if ENV["DEBUG"]
      end

      private

      def say(level, message)
        puts "\e[#{COLORS.fetch(level)}m[#{@prefix}] #{level}: #{message}\e[0m"
      end
    end
  end
end

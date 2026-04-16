import React, { useState } from "react";

interface ResultViewProps {
  designMd: string;
  onBack: () => void;
}

export function ResultView({ designMd, onBack }: ResultViewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "raw">("preview");

  async function handleCopy() {
    await navigator.clipboard.writeText(designMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([designMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Extract a brief summary from the design.md
  const summaryMatch = designMd.match(
    /\*\*One-line summary:\*\*\s*"?([^"\n]+)"?/
  );
  const summary = summaryMatch?.[1] ?? "Design system extracted successfully";

  const lineCount = designMd.split("\n").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Success banner */}
      <div className="p-3 bg-[#4CB782]/10 border border-[#4CB782]/20 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-[#4CB782]"
          >
            <path
              d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM6.5 10.5L4 8l.7-.7L6.5 9.1l4.8-4.8.7.7L6.5 10.5z"
              fill="currentColor"
            />
          </svg>
          <span className="text-sm font-medium text-[#4CB782]">
            Scan complete
          </span>
        </div>
        <p className="text-xs text-[#8A8F98]">{summary}</p>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex-1 p-2 bg-[#0F1011] rounded-md text-center">
          <p className="text-lg font-semibold text-[#F7F8F8]">{lineCount}</p>
          <p className="text-xs text-[#62666D]">lines</p>
        </div>
        <div className="flex-1 p-2 bg-[#0F1011] rounded-md text-center">
          <p className="text-lg font-semibold text-[#F7F8F8]">
            {Math.round(designMd.length / 1024)}KB
          </p>
          <p className="text-xs text-[#62666D]">size</p>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex border-b border-[#23252A]">
        <button
          onClick={() => setActiveTab("preview")}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "preview"
              ? "border-[#5E6AD2] text-[#F7F8F8]"
              : "border-transparent text-[#62666D] hover:text-[#8A8F98]"
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setActiveTab("raw")}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "raw"
              ? "border-[#5E6AD2] text-[#F7F8F8]"
              : "border-transparent text-[#62666D] hover:text-[#8A8F98]"
          }`}
        >
          Raw Markdown
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[200px] overflow-y-auto rounded-md bg-[#0F1011] border border-[#23252A] p-3">
        {activeTab === "raw" ? (
          <pre className="text-xs text-[#8A8F98] whitespace-pre-wrap font-mono">
            {designMd}
          </pre>
        ) : (
          <div className="text-xs text-[#8A8F98] space-y-1">
            {designMd
              .split("\n")
              .slice(0, 30)
              .map((line, i) => {
                if (line.startsWith("# "))
                  return (
                    <p key={i} className="text-sm font-bold text-[#F7F8F8]">
                      {line.slice(2)}
                    </p>
                  );
                if (line.startsWith("## "))
                  return (
                    <p
                      key={i}
                      className="text-xs font-semibold text-[#F7F8F8] mt-2"
                    >
                      {line.slice(3)}
                    </p>
                  );
                if (line.startsWith("**"))
                  return (
                    <p key={i} className="font-medium text-[#F7F8F8]">
                      {line.replace(/\*\*/g, "")}
                    </p>
                  );
                if (line.startsWith("- "))
                  return <p key={i}>  {line}</p>;
                if (line.trim() === "") return <br key={i} />;
                return <p key={i}>{line}</p>;
              })}
            <p className="text-[#62666D] italic mt-2">
              ... ({lineCount - 30} more lines)
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 py-2.5 px-4 bg-[#5E6AD2] hover:bg-[#7171E1] active:scale-[0.98] text-white text-sm font-medium rounded-md transition-all duration-100"
        >
          {copied ? "Copied!" : "Copy to clipboard"}
        </button>
        <button
          onClick={handleDownload}
          className="py-2.5 px-4 bg-transparent border border-[#23252A] hover:bg-[#1A1B1E] hover:border-[#34363C] text-white text-sm font-medium rounded-md transition-colors duration-100"
        >
          Download
        </button>
      </div>

      <button
        onClick={onBack}
        className="w-full py-2 text-xs text-[#62666D] hover:text-[#8A8F98] transition-colors"
      >
        Scan another page
      </button>
    </div>
  );
}

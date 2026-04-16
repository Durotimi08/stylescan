import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="h-[52px] flex items-center justify-between px-6 border-b border-[#23252A]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#5E6AD2] flex items-center justify-center text-sm font-bold">
            S
          </div>
          <span className="text-sm font-semibold">StyleScan</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/pricing"
            className="text-sm text-[#8A8F98] hover:text-[#F7F8F8] transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-sm text-[#8A8F98] hover:text-[#F7F8F8] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-1.5 bg-[#5E6AD2] hover:bg-[#7171E1] text-white text-sm font-medium rounded-md transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-3xl text-center">
          <div className="inline-flex px-3 py-1 mb-6 text-xs font-medium text-[#5E6AD2] bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 rounded-full">
            Now in beta — Get 10 free scans/month
          </div>

          <h1 className="text-5xl font-semibold tracking-tight leading-[1.15] mb-6">
            Transfer the design DNA
            <br />
            of any website to your
            <br />
            <span className="text-[#5E6AD2]">AI coding agent</span>
          </h1>

          <p className="text-lg text-[#8A8F98] max-w-xl mx-auto mb-10 leading-relaxed">
            StyleScan extracts the design language of any webpage and packages it
            into a <code className="text-[#F7F8F8] bg-[#0F1011] px-1.5 py-0.5 rounded text-sm">design.md</code> file
            that AI agents like Cursor, Claude Code, and v0 can consume as
            a styling backbone.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-3 bg-[#5E6AD2] hover:bg-[#7171E1] active:scale-[0.98] text-white text-sm font-medium rounded-md transition-all"
            >
              Start scanning free
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-transparent border border-[#23252A] hover:bg-[#1A1B1E] hover:border-[#34363C] text-white text-sm font-medium rounded-md transition-colors"
            >
              Go to dashboard
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-4xl w-full mt-32">
          <h2 className="text-2xl font-semibold tracking-tight text-center mb-12">
            How it works
          </h2>

          <div className="grid grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Scan any page",
                desc: "Visit a site you like, click the extension icon, and hit 'Scan this page'.",
              },
              {
                step: "2",
                title: "AI distills the design",
                desc: "We extract DOM/CSS, cluster tokens, and run vision AI to understand the aesthetic.",
              },
              {
                step: "3",
                title: "Drop into your project",
                desc: "Get a design.md file optimized for AI agents. Paste into your system prompt.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="p-6 bg-[#0F1011] border border-[#23252A] rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 flex items-center justify-center text-sm font-semibold text-[#5E6AD2] mb-4">
                  {step}
                </div>
                <h3 className="text-base font-semibold mb-2">{title}</h3>
                <p className="text-sm text-[#8A8F98] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof / Features */}
        <div className="max-w-4xl w-full mt-32">
          <h2 className="text-2xl font-semibold tracking-tight text-center mb-4">
            Built for AI-assisted development
          </h2>
          <p className="text-center text-[#8A8F98] mb-12">
            Works with every major AI coding tool
          </p>

          <div className="grid grid-cols-2 gap-6">
            {[
              {
                title: "Agent-first output",
                desc: "The design.md is optimized for LLM consumption. Structured for parsing, written for understanding.",
              },
              {
                title: "Anti-patterns included",
                desc: "The highest-leverage section. Tells agents what NOT to do — no more default Tailwind blues.",
              },
              {
                title: "Multiple formats",
                desc: "design.md for agents, tokens.json (W3C) for Figma/Style Dictionary, Tailwind config drop-in.",
              },
              {
                title: "One-click scanning",
                desc: "Browser extension scans any page in seconds. Paste a URL in the dashboard for headless crawls.",
              },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="p-6 bg-[#0F1011] border border-[#23252A] rounded-lg"
              >
                <h3 className="text-base font-semibold mb-2">{title}</h3>
                <p className="text-sm text-[#8A8F98] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#23252A] px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#5E6AD2] flex items-center justify-center text-xs font-bold">
              S
            </div>
            <span className="text-xs text-[#62666D]">StyleScan</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#62666D]">
            <a href="#" className="hover:text-[#8A8F98] transition-colors">
              Docs
            </a>
            <a href="#" className="hover:text-[#8A8F98] transition-colors">
              GitHub
            </a>
            <a href="#" className="hover:text-[#8A8F98] transition-colors">
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

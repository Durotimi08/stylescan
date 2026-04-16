import Link from "next/link";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    scans: "10 scans/mo",
    features: [
      "Basic design.md export",
      "Public library browse",
      "Chrome extension",
    ],
    cta: "Get started",
    ctaStyle: "border border-[#23252A] hover:bg-[#1A1B1E]",
    highlighted: false,
  },
  {
    name: "Hobby",
    price: "$9",
    period: "/month",
    scans: "50 scans/mo",
    features: [
      "Full export (no watermark)",
      "All formats (MD/JSON/Tailwind)",
      "Scan history",
      "Priority support",
    ],
    cta: "Start free trial",
    ctaStyle: "border border-[#23252A] hover:bg-[#1A1B1E]",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    scans: "200 scans/mo",
    features: [
      "Everything in Hobby",
      "Multi-page scans",
      "Region scans",
      "Library download",
      "Priority queue",
      "CLI access",
    ],
    cta: "Start free trial",
    ctaStyle: "bg-[#5E6AD2] hover:bg-[#7171E1]",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/seat/month",
    scans: "500 scans/seat/mo",
    features: [
      "Everything in Pro",
      "Shared workspace",
      "Figma sync",
      "Design drift monitoring",
      "MCP server",
      "API access",
    ],
    cta: "Contact sales",
    ctaStyle: "border border-[#23252A] hover:bg-[#1A1B1E]",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="h-[52px] flex items-center justify-between px-6 border-b border-[#23252A]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#5E6AD2] flex items-center justify-center text-sm font-bold">
            S
          </div>
          <span className="text-sm font-semibold">StyleScan</span>
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-semibold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-[#8A8F98]">
            Start free. Upgrade when you need more scans.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col p-6 rounded-lg border ${
                tier.highlighted
                  ? "border-[#5E6AD2] bg-[#5E6AD2]/5"
                  : "border-[#23252A] bg-[#0F1011]"
              }`}
            >
              {tier.highlighted && (
                <div className="text-xs font-medium text-[#5E6AD2] mb-3">
                  Most popular
                </div>
              )}
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <div className="mt-3 mb-1">
                <span className="text-3xl font-semibold">{tier.price}</span>
                <span className="text-sm text-[#8A8F98]">{tier.period}</span>
              </div>
              <p className="text-sm text-[#8A8F98] mb-6">{tier.scans}</p>

              <ul className="flex-1 space-y-3 mb-6">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-[#8A8F98]"
                  >
                    <span className="text-[#4CB782] mt-0.5">*</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`w-full py-2.5 px-4 text-center text-sm font-medium rounded-md text-white transition-colors ${tier.ctaStyle}`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

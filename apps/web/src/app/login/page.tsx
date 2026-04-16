"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const params = useSearchParams();
  const redirectUrl = params.get("redirect_url") ?? "/dashboard";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08090A]">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#0F1011] border border-[#23252A]",
          },
        }}
        forceRedirectUrl={redirectUrl}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

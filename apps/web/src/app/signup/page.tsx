import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#0F1011] border border-[#23252A]",
          },
        }}
        redirectUrl="/dashboard"
      />
    </div>
  );
}

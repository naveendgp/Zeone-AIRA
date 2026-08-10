import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your AI Front Desk — Zeone",
  description: "Set up your own AI receptionist in about two minutes, then talk to it.",
};

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-paper text-ink antialiased">
      {/* the same two soft blooms the landing hero uses, so the pages feel related */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-64 -top-24 h-[500px] w-[500px] rounded-full bg-brand-mist blur-[2px]" />
        <div className="absolute -right-52 bottom-[-120px] h-[420px] w-[420px] rounded-full bg-[#d9f5ee] blur-[2px]" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-obsidian)] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-multiply">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-fire)]/10 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[var(--color-beige)] blur-[100px] -translate-x-32 -translate-y-24"></div>
      </div>

      <div className="relative z-10 text-center space-y-12 p-6 max-w-5xl">
        <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-[var(--color-obsidian)] opacity-0 animate-in fade-in slide-in-from-bottom-5 duration-1000 fill-mode-forwards select-none">
          SERENITY
        </h1>

        <div className="max-w-2xl mx-auto space-y-2 opacity-0 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-300 fill-mode-forwards">
          <h2 className="text-3xl text-[var(--color-fire)] font-bold tracking-tight">Your High-Fidelity Sanctuary</h2>
          <p className="text-xl text-[var(--color-charcoal)]/80 font-medium leading-relaxed">
            A minimalist, local-first music experience designed for focus and clarity.
          </p>
        </div>

        <div className="pt-8 opacity-0 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-500 fill-mode-forwards">
          <Link
            href="/auth"
            className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-lg text-[var(--color-cream)] bg-[var(--color-obsidian)] hover:bg-[var(--color-fire)] rounded-2xl overflow-hidden transition-all duration-300 active:scale-95 shadow-lg hover:shadow-xl"
          >
            <span className="relative z-10 flex items-center gap-3 tracking-wide uppercase">
              Enter Serenity
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-8 text-[var(--color-charcoal)] text-sm font-semibold tracking-wider uppercase">
        © {new Date().getFullYear()} Serenity Project
      </footer>
    </main>
  );
}

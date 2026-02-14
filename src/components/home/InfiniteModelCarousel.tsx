import chatgptLogo from "@/assets/ai-logos/chatgpt-reference.png";
import claudeLogo from "@/assets/ai-logos/claude-reference.png";
import geminiLogo from "@/assets/ai-logos/gemini-reference.png";
import perplexityLogo from "@/assets/ai-logos/perplexity-reference.png";
import grokLogo from "@/assets/ai-logos/grok-reference.png";
import mistralLogo from "@/assets/ai-logos/mistral-logo-clean.png";
import qwenLogo from "@/assets/ai-logos/qwen-logo-clean.png";
import phi3Logo from "@/assets/ai-logos/phi3-logo-clean.png";

const models = [
  { name: "ChatGPT", sub: "GPT-4o", desc: "OpenAI's flagship model", logo: chatgptLogo },
  { name: "Claude", sub: "Sonnet 4", desc: "Anthropic's reasoning powerhouse", logo: claudeLogo },
  { name: "Gemini", sub: "Flash 2.0", desc: "Google's fastest AI model", logo: geminiLogo },
  { name: "Perplexity", sub: "Sonar", desc: "Real-time web-powered AI", logo: perplexityLogo },
  { name: "Grok", sub: "xAI", desc: "Unfiltered & witty AI assistant", logo: grokLogo },
  { name: "Mistral", sub: "Large", desc: "Europe's leading open model", logo: mistralLogo },
  { name: "Qwen", sub: "2.5", desc: "Alibaba's multilingual AI", logo: qwenLogo },
  { name: "Phi-3", sub: "Microsoft", desc: "Compact yet powerful reasoning", logo: phi3Logo },
];

export const InfiniteModelCarousel = () => {
  return (
    <section className="py-16 overflow-hidden">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          All Leading AI Models, One Platform
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Access every major AI under one roof — switch models in a click.
        </p>
      </div>

      {/* Row 1 - scrolls left */}
      <div
        className="relative group mb-4"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div className="flex w-max animate-carousel-scroll group-hover:[animation-play-state:paused]">
          {[...models, ...models].map((m, i) => (
            <div
              key={`row1-${i}`}
              className="flex-shrink-0 w-52 md:w-60 mx-3 rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 flex flex-col items-center text-center gap-3 transition-shadow hover:shadow-lg hover:shadow-primary/10"
            >
              <img
                src={m.logo}
                alt={`${m.name} logo`}
                className="w-14 h-14 object-contain rounded-xl"
                loading="lazy"
              />
              <div>
                <p className="font-semibold text-foreground text-base">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.sub}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 - scrolls right (reverse) */}
      <div
        className="relative group"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div className="flex w-max animate-carousel-scroll-reverse group-hover:[animation-play-state:paused]">
          {[...models.slice().reverse(), ...models.slice().reverse()].map((m, i) => (
            <div
              key={`row2-${i}`}
              className="flex-shrink-0 w-52 md:w-60 mx-3 rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 flex flex-col items-center text-center gap-3 transition-shadow hover:shadow-lg hover:shadow-primary/10"
            >
              <img
                src={m.logo}
                alt={`${m.name} logo`}
                className="w-14 h-14 object-contain rounded-xl"
                loading="lazy"
              />
              <div>
                <p className="font-semibold text-foreground text-base">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.sub}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

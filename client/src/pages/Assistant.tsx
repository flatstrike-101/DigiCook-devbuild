import { Fragment, type ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RecipeDraft = {
  title: string;
  description: string;
  ingredients: Array<{ name: string; amount: string; unit: string }>;
  steps: string[];
};

const SECTION_END_REGEX = /^(notes?|tips?|substitutions?|nutrition|serving|serve|faq|variations?)\b/i;
const INGREDIENT_UNITS = new Set([
  "cup",
  "cups",
  "tbsp",
  "tsp",
  "oz",
  "lb",
  "g",
  "kg",
  "ml",
  "l",
  "pcs",
  "piece",
  "pieces",
  "clove",
  "cloves",
  "slice",
  "slices",
  "can",
  "cans",
  "pinch",
]);

const blueButtonClasses =
  "bg-blue-950 !text-white !border-blue-950 hover:!bg-blue-900 hover:!border-blue-900";

export default function Assistant() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello, I am your personal assistant for DigiCook, I can help you find new recipes and create new recipes.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const renderInline = (text: string): ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        return <strong key={`${part}-${i}`}>{boldMatch[1]}</strong>;
      }
      return <Fragment key={`${part}-${i}`}>{part}</Fragment>;
    });
  };

  const parseRecipeDraft = (content: string): RecipeDraft => {
    const lines = content
      .split("\n")
      .map((line) => line.replace(/[*_`]/g, "").trim())
      .filter(Boolean);

    const normalize = (line: string) =>
      line.replace(/^#{1,6}\s*/, "").replace(/\s+/g, " ").trim();

    const findHeadingIndex = (regex: RegExp) =>
      lines.findIndex((line) => regex.test(normalize(line)));

    const getSectionLines = (startRegex: RegExp, endRegexes: RegExp[]) => {
      const start = findHeadingIndex(startRegex);
      if (start < 0) return [] as string[];
      let end = lines.length;
      for (let i = start + 1; i < lines.length; i++) {
        const candidate = normalize(lines[i]);
        if (endRegexes.some((re) => re.test(candidate))) {
          end = i;
          break;
        }
      }
      return lines.slice(start + 1, end).map(normalize).filter(Boolean);
    };

    const toShortTitle = (raw: string) => {
      let cleaned = raw.replace(/^title\s*:\s*/i, "").trim();

      const recipeForMatch = cleaned.match(/recipe for\s+(.+)/i);
      if (recipeForMatch?.[1]) {
        cleaned = recipeForMatch[1].trim();
      }

      cleaned = cleaned
        .replace(/^here(?:'| i)?s\b[^:]*:\s*/i, "")
        .replace(/^here(?:'| i)?s\b\s+/i, "")
        .replace(/^this is\b\s+/i, "")
        .replace(/^full recipe\b\s*/i, "")
        .replace(/^recipe\b\s*[:\-]?\s*/i, "")
        .replace(/[.:]+$/, "")
        .trim();

      const words = cleaned.split(/\s+/).filter(Boolean);
      return (words.slice(0, 4).join(" ") || "AI Recipe").trim();
    };

    const isAssistantMetaLine = (line: string) =>
      /^would you like\b/i.test(line) ||
      /^let me know\b/i.test(line) ||
      /^if you want\b/i.test(line) ||
      /^if you'd like\b/i.test(line) ||
      /^if you would like\b/i.test(line) ||
      /^feel free\b/i.test(line);

    const parseIngredientLine = (
      rawLine: string
    ): { name: string; amount: string; unit: string } | null => {
      let line = normalize(rawLine)
        .replace(/^[-*]\s*/, "")
        .replace(/^\d+[.)]\s*/, "")
        .trim();
      if (!line || line === "--" || SECTION_END_REGEX.test(line)) return null;

      const categorySplit = line.split(":");
      if (categorySplit.length > 1) {
        const left = categorySplit[0].trim().toLowerCase();
        if (
          /^(protein|veggie|vegetable|grain|aromatics?|sauce|seasoning|oil|fat|base|optional)$/i.test(
            left
          )
        ) {
          line = categorySplit.slice(1).join(":").trim();
        }
      }

      const amountMatch = line.match(
        /^(\d+\s\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?(?:\s*(?:-|to)\s*\d+(?:\.\d+)?)?)\s+(.+)$/i
      );
      if (!amountMatch) {
        return { name: line, amount: "", unit: "" };
      }

      const amount = amountMatch[1].trim();
      const rest = amountMatch[2].trim().replace(/[.,]$/, "");
      const [firstToken, ...restTokens] = rest.split(/\s+/);

      if (firstToken && INGREDIENT_UNITS.has(firstToken.toLowerCase())) {
        return {
          name: restTokens.join(" ").trim(),
          amount,
          unit: firstToken.toLowerCase(),
        };
      }

      return {
        name: rest,
        amount,
        unit: "pcs",
      };
    };

    const introRegex =
      /^(sure|great|awesome|here('| i)?s|here is|of course|okay|alright|perfect)\b/i;
    const descriptionIndex = lines.findIndex((line) => /^description\s*:/i.test(normalize(line)));
    const titleCandidateBeforeDescription =
      descriptionIndex > 0
        ? lines
            .slice(0, descriptionIndex)
            .map(normalize)
            .find(
              (line) =>
                line &&
                !introRegex.test(line) &&
                !isAssistantMetaLine(line) &&
                !/:$/.test(line) &&
                !/^(ingredients?|steps?|instructions?|method)\s*:?$/i.test(line) &&
                !/^\d+[.)]\s+/.test(line) &&
                !/^[-*]\s+/.test(line) &&
                !/\?$/.test(line)
            )
        : undefined;

    const recipeForLine = lines
      .map(normalize)
      .find((line) => /recipe for\s+/i.test(line) && !isAssistantMetaLine(line));

    const titleLine =
      lines.find((line) => /^title\s*:/i.test(normalize(line))) ??
      recipeForLine ??
      titleCandidateBeforeDescription ??
      lines.find((line) => /^#{1,6}\s+/.test(line.trim())) ??
      "AI Recipe";
    const title = toShortTitle(normalize(titleLine));

    const descriptionLine =
      lines.find((line) => /^description\s*:/i.test(normalize(line))) ?? "";
    const description = normalize(descriptionLine).replace(/^description\s*:\s*/i, "").trim();

    const ingredientLines = getSectionLines(
      /^ingredients?\s*:?$/i,
      [/^(instructions?|steps?|method)\s*:?$/i, SECTION_END_REGEX]
    );
    const ingredients = ingredientLines
      .map(parseIngredientLine)
      .filter((i): i is { name: string; amount: string; unit: string } => !!i && !!i.name);

    const stepLines = getSectionLines(
      /^(instructions?|steps?|method)\s*:?$/i,
      [SECTION_END_REGEX]
    );
    const steps = stepLines
      .map((line) =>
        normalize(line)
          .replace(/^\d+[.)]\s*/, "")
          .replace(/^[-*]\s*/, "")
          .replace(/^[A-Za-z ]+:\s*(?=[A-Z0-9])/, "")
          .trim()
      )
      .filter(
        (line) =>
          !!line &&
          line !== "--" &&
          !SECTION_END_REGEX.test(line) &&
          !isAssistantMetaLine(line) &&
          !/\?$/.test(line) &&
          !/^would you like\b/i.test(line) &&
          !/^let me know\b/i.test(line) &&
          !/^if you want\b/i.test(line)
      );

    return {
      title,
      description,
      ingredients: ingredients.length ? ingredients : [{ name: "", amount: "", unit: "" }],
      steps: steps.length ? steps : [""],
    };
  };

  const looksLikeRecipeMessage = (content: string) => {
    const hasIngredientsSection = /(^|\n)\s*ingredients\s*:/i.test(content);
    const hasStepsSection = /(^|\n)\s*(steps|instructions|method)\s*:/i.test(content);
    return hasIngredientsSection && hasStepsSection;
  };

  const useRecipe = (content: string) => {
    const draft = parseRecipeDraft(content);
    localStorage.setItem("digicook_assistant_recipe_draft", JSON.stringify(draft));
    setLocation("/add-recipe");
  };

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!response.ok) {
        let message = "Request failed.";
        try {
          const data = await response.json();
          message = data?.message || message;
        } catch {
          // ignore parse error and keep fallback message
        }
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("Streaming response body is not available.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        fullReply += chunk;

        setMessages((prev) => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === "assistant") {
              next[i] = { ...next[i], content: next[i].content + chunk };
              break;
            }
          }
          return next;
        });
      }

      if (!fullReply.trim()) {
        setMessages((prev) => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === "assistant") {
              next[i] = {
                ...next[i],
                content: "I couldn't generate a response. Please try again.",
              };
              break;
            }
          }
          return next;
        });
      }
    } catch (err: any) {
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === "assistant" && !next[i].content.trim()) {
            next.splice(i, 1);
            break;
          }
        }
        return next;
      });
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="bg-muted/50 border-b py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-serif text-4xl font-bold mb-2">DigiCook Assistant</h1>
          <p className="text-muted-foreground">
            Your personal assistant to make your experience with DigiCook easier.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="border border-border rounded-xl p-4 min-h-[420px] bg-card/40">
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div className="max-w-[85%]">
                  <p
                    className={`text-[11px] uppercase tracking-wide mb-1 px-1 ${
                      m.role === "assistant" ? "opacity-70 text-left" : "opacity-70 text-right"
                    }`}
                  >
                    {m.role === "assistant" ? "Assistant" : "You"}
                  </p>
                  <div
                    className={`rounded-2xl border px-4 py-3 whitespace-pre-wrap ${
                      m.role === "assistant"
                        ? "bg-secondary text-secondary-foreground border-secondary-border"
                        : "bg-blue-950 text-white border-blue-900"
                    }`}
                  >
                    <div className="space-y-2">
                      {m.content.split("\n").map((line, idx) => {
                        const trimmed = line.trim();
                        if (!trimmed) return <div key={`${i}-${idx}`} className="h-2" />;
                        if (/^#{1,6}\s+/.test(trimmed)) {
                          return (
                            <p key={`${i}-${idx}`} className="font-semibold">
                              {renderInline(trimmed.replace(/^#{1,6}\s+/, ""))}
                            </p>
                          );
                        }
                        if (/^\d+[.)]\s+/.test(trimmed)) {
                          return (
                            <p key={`${i}-${idx}`} className="pl-2">
                              {renderInline(trimmed)}
                            </p>
                          );
                        }
                        if (/^[-*]\s+/.test(trimmed)) {
                          return (
                            <p key={`${i}-${idx}`} className="pl-2">
                              {renderInline(trimmed.replace(/^[-*]\s+/, "- "))}
                            </p>
                          );
                        }
                        return <p key={`${i}-${idx}`}>{renderInline(trimmed)}</p>;
                      })}
                    </div>
                  </div>
                  {m.role === "assistant" && looksLikeRecipeMessage(m.content) ? (
                    <div className="mt-2 px-1">
                      <Button size="sm" variant="outline" onClick={() => useRecipe(m.content)}>
                        Copy This Recipe
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex items-center gap-2">
          <Input
            value={input}
            placeholder="Ask Away!"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            disabled={loading}
          />
          <Button
            className={blueButtonClasses}
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

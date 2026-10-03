import { policyFor } from "@/constants/policy";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The full store policy, rendered from the locked copy in
 * `src/constants/policy.ts`. Used by both the first-login modal and the
 * `/policy` page so the two can never disagree. Follows the site language:
 * Vietnamese and English are parallel documents, not translations generated
 * at render time.
 *
 * The copy is the seller's official text, which mixes three shapes — running
 * prose, bulleted rules and a lead-in line — so each section renders only the
 * parts it actually has. A `\n` inside a bullet becomes a real line break,
 * which is how the payment section keeps its "Lý do áp dụng:" reasoning
 * attached to the rule it explains.
 */
export function PolicyContent({ className }: { className?: string }) {
  const { lang } = useI18n();
  const policy = policyFor(lang);

  return (
    <div className={cn("space-y-6 text-sm leading-relaxed", className)}>
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
          {policy.title}
        </h1>
        {policy.intro.map((paragraph) => (
          <p key={paragraph} className="mt-3 text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </div>

      {policy.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="font-display text-base font-bold tracking-tight">
            {section.heading}
          </h2>
          {section.lead && (
            <p className="mt-2 text-muted-foreground">{section.lead}</p>
          )}
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-muted-foreground">
              {paragraph}
            </p>
          ))}
          {section.bullets.length > 0 && (
            <ul className="mt-3 space-y-2.5">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                  />
                  <span className="whitespace-pre-line text-muted-foreground">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {policy.closing.length > 0 && (
        <div className="rounded-2xl bg-accent px-4 py-4">
          {policy.closing.map((line) => (
            <p
              key={line}
              className={cn(
                "text-sm",
                line === policy.closing[policy.closing.length - 1]
                  ? "mt-2 font-semibold text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
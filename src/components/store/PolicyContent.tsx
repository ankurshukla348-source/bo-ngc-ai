import { policyFor } from "@/constants/policy";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The full store policy, rendered from the locked copy in
 * `src/constants/policy.ts`. Used by both the first-login modal and the
 * `/policy` page so the two can never disagree. Follows the site language:
 * Vietnamese and English are parallel documents, not translations generated
 * at render time.
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
        <p className="mt-3 font-semibold">{policy.greeting}</p>
        <p className="mt-3 text-muted-foreground">{policy.story}</p>
        <p className="mt-3 text-muted-foreground">{policy.bridge}</p>
      </div>

      {policy.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="font-display text-base font-bold tracking-tight">
            {section.heading}
          </h2>
          {section.lead && (
            <p className="mt-2 text-muted-foreground">{section.lead}</p>
          )}
          <ul className="mt-3 space-y-2.5">
            {section.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                />
                <span className="text-muted-foreground">{bullet}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

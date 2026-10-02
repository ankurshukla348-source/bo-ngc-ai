import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";

/**
 * Promotional-email consent.
 *
 * Pre-checked on purpose: the field defaults to `true` on the profile and is
 * only ever stored as an explicit `false` when the customer unchecks it, so
 * an abandoned form can never silently subscribe anyone.
 */
export function MarketingOptIn({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const { t } = useI18n();

  return (
    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-secondary/50 p-3.5 transition-colors hover:bg-secondary">
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
        aria-label={t("marketingOptInLabel")}
        className="mt-0.5"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-snug">
          {t("marketingOptInLabel")}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {t("marketingOptInSub")}
        </span>
      </span>
    </label>
  );
}

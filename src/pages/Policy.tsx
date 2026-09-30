import { Header } from "@/components/store/Header";
import { PolicyContent } from "@/components/store/PolicyContent";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

/** Public, always-readable version of the store policy (header/footer link). */
export default function Policy() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          {t("backToStore")}
        </Link>

        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-10">
          <PolicyContent />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("policyUpdatedNote")}
        </p>
      </main>
    </div>
  );
}

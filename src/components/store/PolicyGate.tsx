import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PolicyContent } from "@/components/store/PolicyContent";
import { hasAgreedToPolicy, rememberPolicyAgreement } from "@/constants/policy";
import { useAuth } from "@/hooks/use-auth";
import { ADMIN_EMAIL } from "@/lib/admin";
import { useEffect, useState } from "react";

/**
 * First-login store policy notice.
 *
 * Mounted once, app-wide, right under the router. When a customer finishes
 * signing in and this account has never accepted the policy on this device,
 * the modal opens and blocks the storefront until they tick the box and
 * continue — no close button, no backdrop/Escape dismissal, because the
 * agreement is a consent step, not a dismissible popup.
 *
 * The store owner is exempt: /seller is a workspace, not a shopping session.
 */
export function PolicyGate() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const email = user?.email?.trim().toLowerCase() || undefined;

  useEffect(() => {
    if (isLoading || !isAuthenticated || !email) return;
    // The store owner runs the shop — they are exempt, and are already routed
    // straight to /seller after sign-in.
    if (email === ADMIN_EMAIL) return;
    // Checked per account, so a customer is never asked twice (and never
    // inherits someone else's consent on a shared device).
    if (!hasAgreedToPolicy(email)) {
      setAgreed(false);
      setOpen(true);
    }
  }, [isLoading, isAuthenticated, email]);

  const accept = () => {
    if (!agreed || !email) return;
    rememberPolicyAgreement(email);
    setOpen(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        // Consent cannot be dismissed by accident — the only way out is the
        // checkbox plus the button below.
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="text-brand-ink">Chính sách mua sắm &amp; Đổi trả</DialogTitle>
          <DialogDescription>
            Vui lòng đọc kỹ chính sách của Shop Bảo Ngọc trước khi tiếp tục mua
            sắm.
          </DialogDescription>
        </DialogHeader>

        <PolicyContent className="mt-2" />

        <div className="sticky bottom-0 -mx-6 mt-2 border-t border-border bg-card px-6 py-4">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={agreed}
              onCheckedChange={(next) => setAgreed(next === true)}
              aria-label="Tôi đã đọc và đồng ý với các chính sách mua hàng của Shop Bảo Ngọc"
              className="mt-0.5"
            />
            <span className="text-sm font-semibold leading-snug">
              Tôi đã đọc và đồng ý với các chính sách mua hàng của Shop Bảo
              Ngọc
            </span>
          </label>

          <button
            type="button"
            onClick={accept}
            disabled={!agreed}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

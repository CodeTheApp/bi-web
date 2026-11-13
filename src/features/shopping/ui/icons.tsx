import { Check, CreditCard, Heart, LockKeyhole, Mail, Minus, Plus, QrCode, Search, ShoppingBag, Trash2, Truck, UserRound } from "@/shared/ui/icons/lucide";

/** Storefront aliases keep their existing labels and dimensions, using the shared Lucide family. */
const ICONS = { bag: ShoppingBag, heart: Heart, user: UserRound, search: Search, minus: Minus, plus: Plus, trash: Trash2, check: Check, truck: Truck, lock: LockKeyhole, mail: Mail, pix: QrCode, card: CreditCard } as const;
export function I({ n, size = 20, filled = false, className = "" }: { n: keyof typeof ICONS; size?: number; filled?: boolean; className?: string }) {
  const Icon = ICONS[n];
  return <Icon className={`si ${className}`.trim()} size={size} style={{ width: size, height: size }} fill={filled ? "currentColor" : "none"} strokeWidth={1.5} aria-hidden="true" />;
}

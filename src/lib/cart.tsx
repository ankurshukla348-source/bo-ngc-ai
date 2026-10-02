import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Cart state persisted to localStorage so items survive navigation/refresh. */

export type CartItem = {
  key: string;
  productId: string;
  nameVi: string;
  nameEn: string;
  price: number;
  size: string;
  qty: number;
  image: string | null;
};

type AddableProduct = {
  _id: string;
  nameVi: string;
  nameEn: string;
  price: number;
  image: string | null;
};

type CartValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (product: AddableProduct, size: string, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "mama-cart-v1";

const CartContext = createContext<CartValue | null>(null);

function readStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        !!item &&
        typeof item.key === "string" &&
        typeof item.productId === "string" &&
        typeof item.price === "number" &&
        typeof item.qty === "number" &&
        typeof item.size === "string",
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full or unavailable */
    }
  }, [items]);

  const add = useCallback(
    (product: AddableProduct, size: string, qty = 1) => {
      setItems((prev) => {
        const key = `${product._id}::${size}`;
        const existing = prev.find((item) => item.key === key);
        if (existing) {
          return prev.map((item) =>
            item.key === key ? { ...item, qty: item.qty + qty } : item,
          );
        }
        return [
          ...prev,
          {
            key,
            productId: product._id,
            nameVi: product.nameVi,
            nameEn: product.nameEn,
            price: product.price,
            size,
            qty,
            image: product.image,
          },
        ];
      });
    },
    [],
  );

  const setQty = useCallback((key: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((item) => item.key !== key)
        : prev.map((item) => (item.key === key ? { ...item, qty } : item)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartValue>(() => {
    const count = items.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );
    return { items, count, subtotal, add, setQty, remove, clear };
  }, [items, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

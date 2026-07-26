export type Category = "top" | "bottom" | "shoes";
export const CATEGORIES: readonly Category[] = ["top", "bottom", "shoes"] as const;

export type Style =
  | "casual"
  | "streetwear"
  | "smart-casual"
  | "formal"
  | "sporty"
  | "statement";
export const STYLES: readonly Style[] = [
  "casual",
  "streetwear",
  "smart-casual",
  "formal",
  "sporty",
  "statement",
] as const;

export type Confidence = "high" | "medium" | "low";

export interface Garment {
  id: string;
  category: Category;
  name: string;
  /** Dominant colors as #rrggbb, computed locally from the photo — never model output. */
  colors: string[];
  style: Style;
  /** 1 = summer-weight, 5 = heavy winter. */
  warmth: number;
  /** 1 = loungewear, 5 = black tie. */
  formality: number;
  description?: string;
  /** Supabase Storage path, once synced. Images always render from IndexedDB. */
  imagePath?: string;
  createdAt: string;
}

export interface Outfit {
  topId: string;
  bottomId: string;
  shoesId: string;
  score: number;
}

export interface OutfitHistoryEntry {
  /** Local ISO date, YYYY-MM-DD. */
  date: string;
  garmentIds: string[];
}

export const CATEGORY_LABEL: Record<Category, string> = {
  top: "Top",
  bottom: "Bottom",
  shoes: "Shoes",
};

export function outfitIds(o: Outfit): string[] {
  return [o.topId, o.bottomId, o.shoesId];
}

export function outfitKey(o: Outfit): string {
  return outfitIds(o).slice().sort().join("|");
}

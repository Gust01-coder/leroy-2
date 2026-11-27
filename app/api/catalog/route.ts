import { NextResponse } from "next/server";
import { semanticSearchCatalog } from "@/lib/ai/semanticSearch";
import { DEFAULT_STORE_ID, getStoreById } from "@/lib/store/stores";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const storeId = searchParams.get("storeId") ?? DEFAULT_STORE_ID;
  const category = searchParams.get("category") ?? "Todos";
  const onlyInStock = searchParams.get("inStock") === "true";

  const matches = semanticSearchCatalog(q, storeId, {
    category,
    onlyInStock,
    limit: 40,
  });

  return NextResponse.json({
    query: q,
    store: getStoreById(storeId),
    total: matches.length,
    matches,
  });
}

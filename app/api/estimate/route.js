import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY
);

export async function POST(request) {
  try {
    const { estimateId, finalItems } = await request.json();

    if (!estimateId || !Array.isArray(finalItems)) {
      return NextResponse.json(
        { error: "Chýba ID kalkulácie alebo finálne položky." },
        { status: 400 }
      );
    }

    const safeItems = finalItems
      .map((item) => ({
        id: item.id ?? null,
        name: String(item.name || ""),
        qty: Number(item.qty),
        unit: String(item.unit || ""),
        price: Number(item.price)
      }))
      .filter(
        (item) =>
          item.name &&
          Number.isFinite(item.qty) &&
          item.qty >= 0 &&
          Number.isFinite(item.price) &&
          item.price >= 0
      );

    const finalTotal = safeItems.reduce(
      (sum, item) => sum + item.qty * item.price,
      0
    );

    const { data, error } = await supabase
      .from("estimates")
      .update({
        final_items: safeItems,
        final_total: finalTotal,
        approved: true,
        approved_at: new Date().toISOString()
      })
      .eq("id", estimateId)
      .select("id, approved, final_total")
      .single();

    if (error) {
      console.error("Supabase approve error:", error);
      return NextResponse.json(
        { error: "Nepodarilo sa uložiť schválenú kalkuláciu." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      estimate: data
    });
  } catch (error) {
    console.error("Approve error:", error);
    return NextResponse.json(
      { error: error?.message || "Nepodarilo sa schváliť zákazku." },
      { status: 500 }
    );
  }
}

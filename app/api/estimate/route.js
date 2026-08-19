import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY
);

function cleanItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      id: item.id ?? null,
      name: String(item.name || "").trim(),
      qty: Number(item.qty),
      unit: String(item.unit || "").trim(),
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
}

function total(items) {
  return items.reduce((sum, item) => sum + item.qty * item.price, 0);
}

async function getPriceList() {
  const { data, error } = await supabase
    .from("price_list")
    .select("id, name, unit, price")
    .eq("active", true)
    .order("name");

  if (error) throw new Error("Nepodarilo sa načítať cenník zo Supabase.");
  return data || [];
}

async function getApprovedExperience() {
  const { data, error } = await supabase
    .from("estimates")
    .select("id, description, ai_items, ai_total, final_items, final_total, approved_at")
    .eq("approved", true)
    .order("approved_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Supabase history error:", error);
    return [];
  }

  return data || [];
}

async function createEstimate({ description, items }) {
  const aiItems = cleanItems(items);
  const aiTotal = total(aiItems);

  const { data, error } = await supabase
    .from("estimates")
    .insert({
      description,
      ai_items: aiItems,
      ai_total: aiTotal,
      approved: false
    })
    .select("id, ai_total, approved")
    .single();

  if (error) {
    console.error("Supabase estimate insert error:", error);
    throw new Error("Kalkuláciu sa nepodarilo uložiť do Supabase.");
  }

  return data;
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Schválenie existujúcej kalkulácie.
    if (body.action === "approve") {
      const { estimateId, finalItems } = body;

      if (!estimateId || !Array.isArray(finalItems)) {
        return NextResponse.json(
          { error: "Chýba ID kalkulácie alebo finálne položky." },
          { status: 400 }
        );
      }

      const safeItems = cleanItems(finalItems);
      const finalTotal = total(safeItems);

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

      return NextResponse.json({ success: true, estimate: data });
    }

    // Vytvorenie novej AI kalkulácie.
    const description = String(body.description || "").trim();

    if (!description) {
      return NextResponse.json(
        { error: "Chýba opis zákazky." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Chýba OPENAI_API_KEY v prostredí servera." },
        { status: 500 }
      );
    }

    const [priceList, history] = await Promise.all([
      getPriceList(),
      getApprovedExperience()
    ]);

    const historyText = history.length
      ? history
          .map(
            (estimate, index) =>
              `Skúsenosť ${index + 1}:
Opis: ${estimate.description}
Finálne položky: ${JSON.stringify(estimate.final_items || estimate.ai_items || [])}
Finálna cena: ${estimate.final_total ?? estimate.ai_total} EUR`
          )
          .join("\n\n")
      : "Zatiaľ nie sú k dispozícii žiadne schválené historické zákazky.";

    const systemPrompt = `Si Remeselník AI, odborný pomocník na nacenenie remeselných zákaziek.

Pravidlá:
1. Používaj iba položky a jednotky z dodaného cenníka.
2. Ceny položiek ber z cenníka; nevymýšľaj nové ceny.
3. Množstvo odhadni podľa opisu zákazky.
4. Historické skúsenosti používaj iba ako pomocný kontext. Nikdy ich nepreberaj slepo.
5. Ak historická zákazka nie je podobná, ignoruj ju.
6. Vráť iba platný JSON bez markdownu v tvare:
{"items":[{"name":"...","qty":1,"unit":"ks","price":10.0}]}`;

    const userPrompt = `OPIS ZÁKAZKY:
${description}

AKTUÁLNY CENNÍK:
${JSON.stringify(priceList)}

SCHVÁLENÉ HISTORICKÉ SKÚSENOSTI:
${historyText}`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    const openaiData = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI error:", openaiData);
      return NextResponse.json(
        { error: "AI sa nepodarilo spracovať kalkuláciu." },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(openaiData.choices?.[0]?.message?.content || "{}");
    } catch {
      return NextResponse.json(
        { error: "AI vrátila neplatný formát kalkulácie." },
        { status: 500 }
      );
    }

    const items = cleanItems(parsed.items);
    if (!items.length) {
      return NextResponse.json(
        { error: "AI nevytvorila žiadne položky kalkulácie." },
        { status: 422 }
      );
    }

    const estimate = await createEstimate({ description, items });

    return NextResponse.json({
      estimateId: estimate.id,
      items,
      total: estimate.ai_total,
      learnedFrom: history.length
    });
  } catch (error) {
    console.error("Estimate error:", error);
    return NextResponse.json(
      { error: error?.message || "Nepodarilo sa vytvoriť kalkuláciu." },
      { status: 500 }
    );
  }
}

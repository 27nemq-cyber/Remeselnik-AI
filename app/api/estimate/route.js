import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY
);

export async function POST(request) {
  try {
    const { description } = await request.json();

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Chýba opis zákazky." },
        { status: 400 }
      );
    }

    const { data: priceList, error: priceListError } = await supabase
      .from("price_list")
      .select("id, name, unit, price")
      .eq("active", true)
      .order("id");

    if (priceListError) {
      console.error("Supabase price list error:", priceListError);
      return NextResponse.json(
        { error: "Nepodarilo sa načítať cenník zo Supabase." },
        { status: 500 }
      );
    }

    if (!priceList?.length) {
      return NextResponse.json(
        { error: "V Supabase nie je žiadny aktívny cenník." },
        { status: 500 }
      );
    }

    const catalog = priceList.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      price: Number(item.price)
    }));

    // Overené zákazky sú zdrojom "pamäti" systému.
    const { data: learnedEstimates, error: learnedError } = await supabase
      .from("estimates")
      .select("description, final_items, final_total")
      .eq("approved", true)
      .not("final_items", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (learnedError) {
      console.warn("Supabase learning history error:", learnedError);
    }

    const learningContext = (learnedEstimates || []).map((estimate) => ({
      description: estimate.description,
      items: estimate.final_items,
      total: Number(estimate.final_total || 0)
    }));

    const response = await openai.responses.create({
      model: "gpt-5.6",
      input: [
        {
          role: "system",
          content: `
Si AI asistent pre remeselníkov.

Analyzuj opis zákazky a vytvor predbežnú kalkuláciu.

PRAVIDLÁ:
1. Používaj IBA položky z dodaného cenníka.
2. Nesmieš vytvoriť vlastnú položku.
3. Nesmieš meniť cenu položky.
4. Cena musí byť presne cena z cenníka.
5. Urči primerané množstvo podľa opisu.
6. Ak množstvo nie je možné presne určiť, použi konzervatívny odhad.
7. Nezahŕňaj materiál, ktorý nie je v cenníku.
8. Overené historické zákazky používaj ako skúsenosť, nie ako slepú šablónu.
9. Ak sú historické zákazky podobné, zohľadni ich pri odhade množstva.
10. Vráť iba platný JSON bez markdownu.

CENNÍK:
${JSON.stringify(catalog, null, 2)}

OVERENÉ SKÚSENOSTI Z PREDCHÁDZAJÚCICH ZÁKAZIEK:
${JSON.stringify(learningContext, null, 2)}

POŽADOVANÝ FORMÁT:
{
  "items": [
    {
      "id": 1,
      "name": "názov z cenníka",
      "qty": 10,
      "unit": "bm",
      "price": 8
    }
  ]
}
`
        },
        {
          role: "user",
          content: description
        }
      ]
    });

    const parsed = JSON.parse(response.output_text);

    const items = (parsed.items || [])
      .map((item) => {
        const catalogItem = priceList.find(
          (priceItem) => priceItem.id === item.id
        );

        if (!catalogItem) return null;

        return {
          id: catalogItem.id,
          name: catalogItem.name,
          qty: Number(item.qty),
          unit: catalogItem.unit,
          price: Number(catalogItem.price)
        };
      })
      .filter(
        (item) =>
          item &&
          Number.isFinite(item.qty) &&
          item.qty >= 0
      );

    const total = items.reduce(
      (sum, item) => sum + item.qty * item.price,
      0
    );

    // Uložíme AI návrh. Po schválení sa k nemu doplní finálna verzia.
    const { data: estimate, error: saveError } = await supabase
      .from("estimates")
      .insert({
        description,
        ai_items: items,
        ai_total: total,
        approved: false
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Supabase estimate save error:", saveError);
      return NextResponse.json(
        {
          error:
            "Kalkulácia bola vytvorená, ale nepodarilo sa ju uložiť do histórie."
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      estimateId: estimate.id,
      description,
      items,
      total,
      learnedFrom: learningContext.length
    });
  } catch (error) {
    console.error("AI estimate error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Nepodarilo sa vytvoriť AI kalkuláciu."
      },
      { status: 500 }
    );
  }
}

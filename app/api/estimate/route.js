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

    // Cenník sa už nenačítava z data/price-list.js.
    // Načítava sa priamo zo Supabase.
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

    if (!priceList || priceList.length === 0) {
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

    const response = await openai.responses.create({
      model: "gpt-5.6",
      input: [
        {
          role: "system",
          content: `
Si AI asistent pre remeselníkov.

Tvojou úlohou je analyzovať opis zákazky a vytvoriť predbežnú kalkuláciu.

PRAVIDLÁ:

1. Používaj IBA položky z dodaného cenníka.
2. Nesmieš vytvoriť vlastnú položku.
3. Nesmieš meniť cenu položky.
4. Cena musí byť presne cena z cenníka.
5. Urči primerané množstvo podľa opisu zákazky.
6. Ak množstvo nie je možné presne určiť, použi rozumný konzervatívny odhad.
7. Nezahŕňaj materiál, ktorý nie je v cenníku.
8. Vráť iba platný JSON bez markdownu.

CENNÍK:

${JSON.stringify(catalog, null, 2)}

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

    return NextResponse.json({
      success: true,
      description,
      items,
      total
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

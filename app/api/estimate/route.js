import { NextResponse } from "next/server";
import OpenAI from "openai";
import { priceList } from "../../../data/price-list";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request) {
  try {
    const { description } = await request.json();

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Chýba opis zákazky." },
        { status: 400 }
      );
    }

    const catalog = priceList.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      price: item.price
    }));

    const response = await openai.responses.create({
      model: "gpt-5.6",
      input: [
        {
          role: "system",
          content: `
Si AI asistent pre remeselníkov.

Tvojou úlohou je analyzovať opis zákazky a vytvoriť predbežnú kalkuláciu.

DÔLEŽITÉ PRAVIDLÁ:

1. Používaj IBA položky z dodaného cenníka.
2. Nesmieš vytvoriť vlastnú položku.
3. Nesmieš meniť cenu položky.
4. Cena musí byť presne cena z cenníka.
5. Urči primerané množstvo podľa opisu zákazky.
6. Ak množstvo nie je možné rozumne určiť, použi konzervatívny odhad.
7. Nezahŕňaj materiál, ak nie je v cenníku.
8. Vráť iba JSON bez markdownu.

CENNÍK:
${JSON.stringify(catalog, null, 2)}

Požadovaný formát:

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

    const text = response.output_text;

    const parsed = JSON.parse(text);

    const items = parsed.items
      .map((item) => {
        const catalogItem = priceList.find(
          (priceItem) => priceItem.id === item.id
        );

        if (!catalogItem) {
          return null;
        }

        return {
          name: catalogItem.name,
          qty: Number(item.qty),
          unit: catalogItem.unit,
          price: catalogItem.price
        };
      })
      .filter(Boolean);

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
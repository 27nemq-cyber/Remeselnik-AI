import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { description } = await request.json();

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Chýba opis zákazky." },
        { status: 400 }
      );
    }

    /*
      Zatiaľ DEMO.

      Neskôr sem napojíme:
      1. Supabase
      2. databázu cenníka
      3. AI
      4. výpočet materiálu
      5. výslednú kalkuláciu
    */

    const items = [
      {
        name: "Drážkovanie tehla",
        qty: 100,
        unit: "bm",
        price: 8
      },
      {
        name: "Osadenie zásuvky",
        qty: 48,
        unit: "ks",
        price: 9
      },
      {
        name: "Zapojenie svetla",
        qty: 12,
        unit: "ks",
        price: 12
      }
    ];

    return NextResponse.json({
      success: true,
      items
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: "Nepodarilo sa spracovať zákazku."
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { priceList } from "../../../../data/price-list";

export async function POST(request) {
  try {
    const { description } = await request.json();

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Chýba opis zákazky." },
        { status: 400 }
      );
    }

    // Zatiaľ demo rozpoznanie zákazky.
    // Neskôr túto časť nahradí AI.
    const items = [
      {
        name: priceList[0].name,
        qty: 100,
        unit: priceList[0].unit,
        price: priceList[0].price
      },
      {
        name: priceList[7].name,
        qty: 48,
        unit: priceList[7].unit,
        price: priceList[7].price
      },
      {
        name: priceList[8].name,
        qty: 12,
        unit: priceList[8].unit,
        price: priceList[8].price
      }
    ];

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
    return NextResponse.json(
      {
        error: "Nepodarilo sa spracovať zákazku."
      },
      { status: 500 }
    );
  }
}
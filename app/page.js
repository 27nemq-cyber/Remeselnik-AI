"use client";

import { useState } from "react";

const demoItems = [
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

export default function Home() {
  const [description, setDescription] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function calculateDemo() {
    if (!description.trim()) {
      setMessage("Najprv opíš zákazku.");
      return;
    }

    setLoading(true);
    setMessage("");

    setTimeout(() => {
      setItems(demoItems);
      setMessage(
        "Demo kalkulácia. Neskôr sem napojíme skutočnú AI."
      );
      setLoading(false);
    }, 700);
  }

  const total = items.reduce(
    (sum, item) => sum + item.qty * item.price,
    0
  );

  return (
    <main className="shell">

      <header className="header">
        <div>
          <div className="eyebrow">
            REMESELNÍK AI
          </div>

          <h1>AI Nacenenie</h1>

          <p>
            Opíš zákazku a Remeselník AI pripraví
            návrh kalkulácie.
          </p>
        </div>

        <div className="badge">
          PREPROD
        </div>
      </header>


      <section className="card">

        <label htmlFor="description">
          Opis zákazky
        </label>

        <textarea
          id="description"
          value={description}
          onChange={(e) =>
            setDescription(e.target.value)
          }
          placeholder="Napr.: Kompletná elektroinštalácia 3-izbového bytu, 75 m², 48 zásuviek, 12 svetiel, nový rozvádzač..."
        />

        <button
          onClick={calculateDemo}
          disabled={loading}
        >
          {loading
            ? "Počítam..."
            : "🤖 Vypočítať nacenenie"}
        </button>

        {message && (
          <p className="message">
            {message}
          </p>
        )}

      </section>


      {items.length > 0 && (

        <section className="card">

          <div className="sectionTitle">

            <h2>
              Návrh kalkulácie
            </h2>

            <span>
              AI návrh
            </span>

          </div>


          <div className="table">

            <div className="row head">
              <span>Položka</span>
              <span>Množstvo</span>
              <span>Cena</span>
              <span>Spolu</span>
            </div>


            {items.map((item, index) => (

              <div
                className="row"
                key={index}
              >

                <span>
                  {item.name}
                </span>

                <span>
                  {item.qty} {item.unit}
                </span>

                <span>
                  {item.price.toFixed(2)} €
                </span>

                <strong>
                  {(item.qty * item.price).toFixed(2)} €
                </strong>

              </div>

            ))}

          </div>


          <div className="total">

            <span>
              Predbežná cena
            </span>

            <strong>
              {total.toFixed(2)} €
            </strong>

          </div>


          <div className="actions">

            <button className="secondary">
              Upraviť kalkuláciu
            </button>

            <button>
              Schváliť zákazku
            </button>

          </div>

        </section>

      )}


      <footer>
        Remeselník AI · PREPROD
      </footer>

    </main>
  );
}
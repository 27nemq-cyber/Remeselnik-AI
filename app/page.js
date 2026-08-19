"use client";

import { useState } from "react";

export default function Home() {
  const [description, setDescription] = useState("");
  const [items, setItems] = useState([]);
  const [estimateId, setEstimateId] = useState(null);
  const [learnedFrom, setLearnedFrom] = useState(0);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);

  async function calculateDemo() {
    if (!description.trim()) {
      setMessage("Najprv opíš zákazku.");
      return;
    }

    setLoading(true);
    setMessage("");
    setEditing(false);
    setEstimateId(null);

    try {
      const response = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nepodarilo sa vytvoriť kalkuláciu.");
      }

      setItems(data.items || []);
      setEstimateId(data.estimateId || null);
      setLearnedFrom(data.learnedFrom || 0);

      setMessage(
        data.learnedFrom
          ? `AI použila ${data.learnedFrom} schválených skúseností z minulých zákaziek.`
          : "AI vytvorila prvú kalkuláciu. Zatiaľ nemá schválené historické skúsenosti."
      );
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Nepodarilo sa spojiť s AI.");
    } finally {
      setLoading(false);
    }
  }

  async function approveEstimate() {
    if (!estimateId) {
      setMessage("Kalkulácia ešte nemá uložené ID.");
      return;
    }

    setApproving(true);
    setMessage("");

    try {
      const response = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          estimateId,
          finalItems: items
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nepodarilo sa schváliť zákazku.");
      }

      setMessage(
        `Zákazka je schválená a uložená. AI ju môže použiť ako skúsenosť pri ďalších kalkuláciách.`
      );
      setEditing(false);
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Nepodarilo sa uložiť schválenú zákazku.");
    } finally {
      setApproving(false);
    }
  }

  function updateItem(index, field, value) {
    setItems((currentItems) =>
      currentItems.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "name" || field === "unit"
                  ? value
                  : Number(value)
            }
          : item
      )
    );
  }

  function removeItem(index) {
    setItems((currentItems) => currentItems.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((currentItems) => [
      ...currentItems,
      { name: "Nová položka", qty: 1, unit: "ks", price: 0 }
    ]);
  }

  const total = items.reduce(
    (sum, item) => sum + item.qty * item.price,
    0
  );

  return (
    <main className="shell">
      <header className="header">
        <div>
          <div className="eyebrow">REMESELNÍK AI</div>
          <h1>AI Nacenenie</h1>
          <p>Opíš zákazku a Remeselník AI pripraví návrh kalkulácie.</p>
        </div>
        <div className="badge">SUPABASE</div>
      </header>

      <section className="card">
        <label htmlFor="description">Opis zákazky</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Napr.: Kompletná elektroinštalácia 3-izbového bytu, 75 m², 48 zásuviek, 12 svetiel, nový rozvádzač..."
        />

        <button onClick={calculateDemo} disabled={loading || approving}>
          {loading ? "Počítam..." : "🤖 Vypočítať nacenenie"}
        </button>

        {message && <p className="message">{message}</p>}
      </section>

      {items.length > 0 && (
        <section className="card">
          <div className="sectionTitle">
            <h2>Návrh kalkulácie</h2>
            <span>{editing ? "Úprava" : "AI návrh"}</span>
          </div>

          <div className="table">
            <div className="row head">
              <span>Položka</span>
              <span>Množstvo</span>
              <span>Cena</span>
              <span>Spolu</span>
            </div>

            {items.map((item, index) => (
              <div className="row" key={index}>
                {editing ? (
                  <>
                    <span>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          updateItem(index, "name", e.target.value)
                        }
                      />
                    </span>
                    <span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.qty}
                        onChange={(e) =>
                          updateItem(index, "qty", e.target.value)
                        }
                      />
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          updateItem(index, "unit", e.target.value)
                        }
                      />
                    </span>
                    <span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(index, "price", e.target.value)
                        }
                      />{" "}
                      €
                    </span>
                    <strong>{(item.qty * item.price).toFixed(2)} €</strong>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => removeItem(index)}
                    >
                      Zmazať
                    </button>
                  </>
                ) : (
                  <>
                    <span>{item.name}</span>
                    <span>
                      {item.qty} {item.unit}
                    </span>
                    <span>{Number(item.price).toFixed(2)} €</span>
                    <strong>{(item.qty * item.price).toFixed(2)} €</strong>
                  </>
                )}
              </div>
            ))}
          </div>

          {editing && (
            <button type="button" className="secondary" onClick={addItem}>
              + Pridať položku
            </button>
          )}

          <div className="total">
            <span>Predbežná cena</span>
            <strong>{total.toFixed(2)} €</strong>
          </div>

          <div className="actions">
            <button
              className="secondary"
              onClick={() => setEditing(!editing)}
              disabled={approving}
            >
              {editing ? "Uložiť úpravy" : "Upraviť kalkuláciu"}
            </button>

            <button onClick={approveEstimate} disabled={approving || !estimateId}>
              {approving ? "Ukladám..." : "✅ Schváliť a naučiť AI"}
            </button>
          </div>
        </section>
      )}

      <footer>
        Remeselník AI · Supabase
        {learnedFrom > 0 ? ` · ${learnedFrom} skúseností použitých` : ""}
      </footer>
    </main>
  );
}

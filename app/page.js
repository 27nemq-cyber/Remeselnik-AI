async function calculateDemo() {
  if (!description.trim()) {
    setMessage("Najprv opíš zákazku.");
    return;
  }

  setLoading(true);
  setMessage("");
  setEditing(false);

  try {
    const response = await fetch("/api/estimate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        description
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Nepodarilo sa vytvoriť kalkuláciu."
      );
    }

    setItems(data.items || []);

    setMessage(
      "AI vytvorila predbežnú kalkuláciu podľa tvojho cenníka."
    );

  } catch (error) {
    console.error(error);

    setMessage(
      error.message ||
      "Nepodarilo sa spojiť s AI."
    );

  } finally {
    setLoading(false);
  }
}
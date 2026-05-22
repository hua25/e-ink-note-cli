export function outputResult(data: unknown, json: boolean): void {
  if (json) {
    console.log(JSON.stringify({ ok: true, data }));
    return;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log("(empty)");
      return;
    }
    const item = data[0];
    if (typeof item === "object" && item !== null) {
      formatTable(data as Array<Record<string, unknown>>);
    } else {
      for (const entry of data) {
        console.log(String(entry));
      }
    }
    return;
  }

  if (typeof data === "object" && data !== null) {
    formatKeyValue(data as Record<string, unknown>);
    return;
  }

  console.log(String(data));
}

export function printError(message: string, code?: number, json = true): void {
  if (json) {
    const out: Record<string, unknown> = { ok: false, error: message };
    if (code !== undefined) out.code = code;
    console.error(JSON.stringify(out));
  } else {
    console.error(`✗ Error: ${message}`);
  }
}

// ── Internal formatters ──────────────────────────────────────────────────────

function formatTable(rows: Array<Record<string, unknown>>): void {
  const keys = Object.keys(rows[0]);
  const widths = keys.map((k) =>
    Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)),
  );

  const pad = (s: string, w: number) => s + " ".repeat(w - s.length);

  // header
  const header = keys.map((k, i) => pad(k, widths[i])).join("  ");
  console.log(header);
  // separator
  console.log(keys.map((_, i) => "─".repeat(widths[i])).join("  "));
  // rows
  for (const row of rows) {
    console.log(keys.map((k, i) => pad(String(row[k] ?? ""), widths[i])).join("  "));
  }
}

function formatKeyValue(obj: Record<string, unknown>): void {
  const entries = Object.entries(obj);
  const keyWidth = Math.max(...entries.map(([k]) => k.length));
  for (const [k, v] of entries) {
    const key = k + ":".padEnd(keyWidth - k.length + 1);
    if (typeof v === "object" && v !== null) {
      console.log(`${key} ${JSON.stringify(v)}`);
    } else {
      console.log(`${key} ${String(v ?? "")}`);
    }
  }
}

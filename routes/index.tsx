import { define } from "../utils.ts";

type PrimaryResultRow = {
  DeviceID: string;
  Room?: string;
  FermentationTemp: number;
  FermentationPressure: number;
  SpecificGravity: number;
  CO2ppm: number;
  KegLevelPercent: number;
  FlowRate: number;
  AmbientTemp: number;
  AmbientHumidity: number;
  VibrationLevel: number;
  EnqueuedTime: string;
};

type WarmQueryResponse = {
  primaryResults?: Array<{ name: string; data: PrimaryResultRow[] }>;
};

// TODO: move these credentials to configuration or environment for production use.
const JWT =
  "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3Njc4Nzc2NzYwMTgsIlVzZXJuYW1lIjoibWF0dGhldy5zbWl0aEBmYXRoeW0uY29tIiwiV29ya3NwYWNlTG9va3VwIjoiOGUwYTAwYjQtZTYwYi00YjkyLWI2NDMtYzc3NTBlZTM0ZmJiIiwiQWNjZXNzUmlnaHRzIjpbIkdvZG1pbiIsIldvcmtzcGFjZS5JbmZyYXN0cnVjdHVyZS5NYW5hZ2VkIiwiV29ya3NwYWNlLkluZnJhc3RydWN0dXJlLlByaXZhdGUiLCJXb3Jrc3BhY2UuRGVwbG95IiwiV29ya3NwYWNlLkV4cGVyaW1lbnRhbCJdfQ.nvw8BrsXX2QcE7QezzEws4ZKvtaVHOMBo2jD88ub23OqTmKzDVdnrIsIxHmsNExejTKYWJT90cl9Xsr2JL4-Cw";
const ENDPOINT =
  "https://www.openindustrial.co/api/workspaces/explorer/warm-queries/warmquery-1763525176427";

async function fetchBrewData(): Promise<{ latest: PrimaryResultRow | null; history: PrimaryResultRow[] }> {
  try {
    const response = await fetch(ENDPOINT, {
      headers: {
        "Authorization": `Bearer ${JWT}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `Warm query warmquery-1763525176427 failed: ${response.status} ${response.statusText}`,
      );
      return { latest: null, history: [] };
    }

    const payload = await response.json() as WarmQueryResponse;
    const primary = payload.primaryResults?.find((p) => p.name === "PrimaryResult");
    const rows = (primary?.data ?? []).sort((a, b) =>
      new Date(b.EnqueuedTime).getTime() - new Date(a.EnqueuedTime).getTime()
    );
    return {
      latest: rows[0] ?? null,
      history: rows,
    };
  } catch (error) {
    console.error("Failed to fetch brewery telemetry", error);
    return { latest: null, history: [] };
  }
}

export default define.page(async function Home(ctx) {
  const { latest: brew, history } = await fetchBrewData();

  ctx.state.title = "Brewery Dashboard";

  if (!brew) {
    return (
      <div class="min-h-screen bg-slate-900 text-slate-100 grid place-items-center px-6">
        <div class="max-w-xl text-center space-y-3">
          <h1 class="text-3xl font-bold">No telemetry available</h1>
          <p class="text-slate-300">
            We couldn&apos;t load brewery data right now. Please verify the warm query and credentials,
            then refresh.
          </p>
        </div>
      </div>
    );
  }

  const lastUpdated = brew?.EnqueuedTime
    ? new Date(brew.EnqueuedTime).toLocaleString()
    : "No data";

  return (
    <div class="min-h-screen bg-slate-900 text-slate-100">
      <div class="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-sm uppercase tracking-[0.2em] text-slate-400">
              Brewery Room Monitor
            </p>
            <h1 class="text-4xl font-bold text-white">Fermentation Dashboard</h1>
            <p class="text-slate-300 mt-2">
              Live device telemetry every 30 seconds for{" "}
              <span class="font-semibold text-white">
                {brew?.Room ?? "Unknown room"}
              </span>
            </p>
            <p class="text-slate-400 text-sm mt-1">
              Device: {brew?.DeviceID ?? "n/a"}
            </p>
          </div>
          <div class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-400">
              Last updated
            </p>
            <p class="text-lg font-semibold text-white">{lastUpdated}</p>
          </div>
        </header>

        <section class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card
            title="Fermentation Temp"
            value={fmt(brew?.FermentationTemp, 2)}
            unit="C"
            hint="Target 18-22 C"
          />
          <Card
            title="Fermentation Pressure"
            value={fmt(brew?.FermentationPressure, 2)}
            unit="psi"
            hint="Typical 12-15 psi"
          />
          <Card
            title="Specific Gravity"
            value={fmt(brew?.SpecificGravity, 3)}
            unit="SG"
            hint="Track attenuation"
          />
          <Card
            title="Flow Rate"
            value={fmt(brew?.FlowRate, 2)}
            unit="L/min"
            hint="Transfer stability"
          />
          <Card
            title="CO2 Concentration"
            value={brew?.CO2ppm?.toString()}
            unit="ppm"
            hint="Ventilation health"
          />
          <Card
            title="Keg Level"
            value={brew ? `${brew.KegLevelPercent}` : undefined}
            unit="%"
            hint="Remaining volume"
          />
        </section>

        <section class="grid gap-4 md:grid-cols-3">
          <MiniCard
            title="Ambient Temp"
            value={fmt(brew?.AmbientTemp, 2)}
            unit="C"
          />
          <MiniCard
            title="Ambient Humidity"
            value={fmt(brew?.AmbientHumidity, 2)}
            unit="%"
          />
          <MiniCard
            title="Vibration"
            value={fmt(brew?.VibrationLevel, 2)}
            unit="mm/s"
          />
        </section>

        <section class="rounded-xl border border-slate-800 bg-slate-800/70 p-5">
          <h2 class="text-xl font-semibold text-white">Notes</h2>
          <ul class="mt-3 space-y-2 text-slate-300 list-disc list-inside">
            <li>Data refreshes automatically every 30 seconds at the source.</li>
            <li>Temperature, pressure, and gravity are key for fermentation health.</li>
            <li>Vent CO2 if ppm trends upward; watch flow rate during transfers.</li>
          </ul>
        </section>

        <section class="rounded-xl border border-slate-800 bg-slate-800/70 p-5">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h2 class="text-xl font-semibold text-white">Recent readings</h2>
            <span class="text-sm text-slate-300">
              Showing {Math.min(history.length, 10)} of {history.length} rows
            </span>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-slate-200 text-sm">
              <thead>
                <tr class="text-slate-400">
                  <th class="py-2 pr-4">Timestamp</th>
                  <th class="py-2 pr-4">Temp (C)</th>
                  <th class="py-2 pr-4">Pressure (psi)</th>
                  <th class="py-2 pr-4">Gravity</th>
                  <th class="py-2 pr-4">CO2 (ppm)</th>
                  <th class="py-2 pr-4">Keg Level</th>
                  <th class="py-2 pr-4">Flow (L/min)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                {(history.slice(0, 10)).map((row) => (
                  <tr key={row.EnqueuedTime + row.KegLevelPercent}>
                    <td class="py-2 pr-4">
                      {new Date(row.EnqueuedTime).toLocaleString()}
                    </td>
                    <td class="py-2 pr-4">{fmt(row.FermentationTemp, 2)}</td>
                    <td class="py-2 pr-4">{fmt(row.FermentationPressure, 2)}</td>
                    <td class="py-2 pr-4">{fmt(row.SpecificGravity, 3)}</td>
                    <td class="py-2 pr-4">{row.CO2ppm}</td>
                    <td class="py-2 pr-4 font-semibold">
                      {row.KegLevelPercent}
                      <span class="text-slate-400 ml-1">%</span>
                    </td>
                    <td class="py-2 pr-4">{fmt(row.FlowRate, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="text-slate-400 text-xs mt-3">
            Metrics now populate from the warm query result; the table above shows the ten most recent rows.
          </p>
        </section>
      </div>
    </div>
  );
});

function fmt(value: number | undefined, digits = 2): string | undefined {
  if (value === undefined || Number.isNaN(value)) return undefined;
  return value.toFixed(digits);
}

function Card(
  props: { title: string; value?: string; unit: string; hint?: string },
) {
  const display = props.value ?? "-";
  return (
    <div class="rounded-xl border border-slate-800 bg-slate-800/60 p-5 shadow-sm">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.2em] text-slate-400">
            {props.title}
          </p>
          <p class="mt-2 text-3xl font-bold text-white">
            {display}
            <span class="text-lg text-slate-400 ml-1">{props.unit}</span>
          </p>
        </div>
        {props.hint && (
          <span class="text-xs text-slate-400 border border-slate-700 rounded-full px-2 py-1">
            {props.hint}
          </span>
        )}
      </div>
    </div>
  );
}

function MiniCard(props: { title: string; value?: string; unit: string }) {
  const display = props.value ?? "-";
  return (
    <div class="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">
        {props.title}
      </p>
      <p class="mt-2 text-2xl font-semibold text-white">
        {display}
        <span class="text-base text-slate-400 ml-1">{props.unit}</span>
      </p>
    </div>
  );
}

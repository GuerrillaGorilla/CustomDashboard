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

        <section class="grid gap-4 lg:grid-cols-2">
          <div class="rounded-xl border border-slate-800 bg-slate-800/70 p-5 space-y-4">
            <h2 class="text-lg font-semibold text-white">Fermentation trends</h2>
            <div class="grid gap-3 md:grid-cols-2">
              <ChartCard title="Temperature (C)" values={history.map((r) => r.FermentationTemp)} maxPoints={24} />
              <ChartCard title="Pressure (psi)" values={history.map((r) => r.FermentationPressure)} maxPoints={24} />
              <ChartCard title="Specific Gravity" values={history.map((r) => r.SpecificGravity)} maxPoints={24} />
              <ChartCard title="Flow (L/min)" values={history.map((r) => r.FlowRate)} maxPoints={24} />
            </div>
          </div>
          <div class="rounded-xl border border-slate-800 bg-slate-800/70 p-5 space-y-4">
            <h2 class="text-lg font-semibold text-white">CO2 & Flow snapshot</h2>
            <BarChart title="CO2 (ppm)" values={history.slice(0, 12).map((r) => r.CO2ppm)} />
            <Gauge title="Flow Rate" value={brew.FlowRate} unit="L/min" max={Math.max(50, brew.FlowRate * 1.2)} />
          </div>
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

function ChartCard(props: { title: string; values: number[]; maxPoints?: number }) {
  const series = props.values.slice(0, props.maxPoints ?? 20).reverse();
  return (
    <div class="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <p class="text-sm text-slate-300 mb-2">{props.title}</p>
      <Sparkline values={series} />
    </div>
  );
}

function Sparkline(props: { values: number[] }) {
  const { values } = props;
  const width = 320;
  const height = 120;
  if (values.length === 0) {
    return <div class="text-slate-500 text-sm">No data</div>;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const ticks = [min, min + span * 0.5, max];
  const points = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * (width - 36) + 24;
    const y = height - ((v - min) / span * (height - 30) + 18);
    return `${x},${y}`;
  }).join(" ");
  const lastPoint = points.split(" ").at(-1)?.split(",") ?? ["0", "0"];
  return (
    <div class="space-y-1">
      <div class="flex justify-between text-xs text-slate-400">
        <span>Min {min.toFixed(2)}</span>
        <span>Max {max.toFixed(2)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} class="w-full h-28 text-amber-300">
        <line x1="24" y1={height - 12} x2={width - 8} y2={height - 12} stroke="#334155" strokeWidth="1" />
        <line x1="24" y1={height - 12} x2="24" y2="12" stroke="#334155" strokeWidth="1" />
        {ticks.map((t, idx) => {
          const y = height - ((t - min) / span * (height - 30) + 18);
          return (
            <g key={idx}>
              <line x1="20" y1={y} x2={width - 8} y2={y} stroke="#1f2937" strokeWidth="1" strokeDasharray="2 4" />
              <text x="0" y={y + 4} fill="#94a3b8" fontSize="10">{t.toFixed(2)}</text>
            </g>
          );
        })}
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={points}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="3" fill="currentColor" />
      </svg>
      <p class="text-xs text-slate-400">
        Recent {values.length} points
      </p>
    </div>
  );
}

function BarChart(props: { title: string; values: number[] }) {
  const values = props.values;
  if (values.length === 0) {
    return (
      <div>
        <p class="text-sm text-slate-300 mb-1">{props.title}</p>
        <p class="text-slate-500 text-sm">No data</p>
      </div>
    );
  }
  const max = Math.max(...values, 1);
  const ticks = [0, max * 0.5, max];
  return (
    <div>
      <p class="text-sm text-slate-300 mb-1">{props.title}</p>
      <div class="flex">
        <div class="flex flex-col justify-between text-xs text-slate-500 pr-2 py-1">
          {ticks.slice().reverse().map((t) => <span key={t}>{t.toFixed(0)}</span>)}
        </div>
        <div class="flex items-end gap-1 h-32 flex-1 border-l border-slate-800 pl-2">
          {values.map((v, idx) => {
            const h = Math.max(6, (v / max) * 100);
            return (
              <div
                key={idx}
                class="flex-1 bg-amber-400/70 rounded-t"
                style={{ height: `${h}%` }}
                title={`${v.toFixed(0)} ppm`}
              />
            );
          })}
        </div>
      </div>
      <div class="flex justify-between text-[11px] text-slate-500 mt-1">
        <span>Last {values.length} readings</span>
        <span>Peak {max.toFixed(0)} ppm</span>
      </div>
    </div>
  );
}

function Gauge(props: { title: string; value: number; unit: string; max: number }) {
  const pct = Math.min(1, props.value / props.max);
  const angle = pct * 180 - 90;
  const radius = 42;
  const cx = 50;
  const cy = 50;
  const x = cx + radius * Math.cos(angle * Math.PI / 180);
  const y = cy + radius * Math.sin(angle * Math.PI / 180);
  const largeArc = pct > 0.5 ? 1 : 0;
  const path = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${x} ${y}`;
  return (
    <div class="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <p class="text-sm text-slate-300 mb-2">{props.title}</p>
      <svg viewBox="0 0 100 60" class="w-full">
        <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius} ${cy}`} fill="none" stroke="#1f2937" strokeWidth="8" />
        <path d={path} fill="none" stroke="#fbbf24" strokeWidth="8" />
        <circle cx={cx} cy={cy} r="4" fill="#fbbf24" />
      </svg>
      <p class="text-xl font-semibold text-white">
        {props.value.toFixed(2)} <span class="text-slate-400 text-sm">{props.unit}</span>
      </p>
    </div>
  );
}

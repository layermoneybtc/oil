import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        shortName?: string;
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        regularMarketTime?: number;
        exchangeName?: string;
        instrumentType?: string;
        currency?: string;
        currentTradingPeriod?: {
          regular?: {
            start?: number;
            end?: number;
          };
        };
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: {
      code?: string;
      description?: string;
    };
  };
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function parseStooqCsv(csv: string) {
  const [headerLine, valueLine] = csv.trim().split(/\r?\n/);
  if (!headerLine || !valueLine) return null;

  const headers = headerLine.split(",");
  const values = valueLine.split(",");
  const record = Object.fromEntries(
    headers.map((header, index) => [header, values[index]])
  );
  const price = Number(record.Close);
  const open = Number(record.Open);

  if (!Number.isFinite(price)) return null;

  const change = Number.isFinite(open) ? round(price - open) : null;
  const changePercent =
    Number.isFinite(open) && open !== 0
      ? round(((price - open) / open) * 100)
      : null;

  return {
    symbol: "CL=F",
    name: "Crude Oil WTI Futures",
    price: round(price),
    previousClose: Number.isFinite(open) ? round(open) : null,
    change,
    changePercent,
    currency: "USD",
    exchangeName: "NYMEX",
    instrumentType: "FUTURE",
    marketTime:
      record.Date && record.Time
        ? new Date(`${record.Date}T${record.Time}Z`).toISOString()
        : new Date().toISOString(),
    regularSession: {
      start: null,
      end: null
    },
    source: "Stooq (fallback when Yahoo Finance rate-limits requests)"
  };
}

async function fetchStooqFallback() {
  const response = await fetch(
    "https://stooq.com/q/l/?s=cl.f&f=sd2t2ohlcv&h&e=csv",
    {
      cache: "no-store",
      headers: {
        Accept: "text/csv"
      }
    }
  );

  if (!response.ok) return null;
  return parseStooqCsv(await response.text());
}

export async function GET() {
  const upstreamUrl =
    "https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1m&range=1d";

  try {
    const response = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const fallback = await fetchStooqFallback();

      if (fallback) {
        return NextResponse.json(fallback, {
          headers: {
            "Cache-Control": "no-store, max-age=0"
          }
        });
      }

      return NextResponse.json(
        { error: "Unable to connect to price data sources right now" },
        { status: response.status }
      );
    }

    const data = (await response.json()) as YahooChartResponse;
    const result = data.chart?.result?.[0];
    const meta = result?.meta;

    if (!result || !meta) {
      return NextResponse.json(
        {
          error:
            data.chart?.error?.description ??
            "No oil price data was returned by Yahoo Finance"
        },
        { status: 502 }
      );
    }

    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const latestClose = [...closes].reverse().find((price) => price != null);
    const price = meta.regularMarketPrice ?? latestClose;
    const previousClose = meta.previousClose ?? meta.chartPreviousClose;

    if (typeof price !== "number") {
      return NextResponse.json(
        { error: "The latest price is not available yet" },
        { status: 502 }
      );
    }

    const change =
      typeof previousClose === "number" ? round(price - previousClose) : null;
    const changePercent =
      typeof previousClose === "number" && previousClose !== 0
        ? round(((price - previousClose) / previousClose) * 100)
        : null;

    return NextResponse.json(
      {
        symbol: meta.symbol ?? "CL=F",
        name: meta.shortName ?? "Crude Oil WTI Futures",
        price: round(price),
        previousClose:
          typeof previousClose === "number" ? round(previousClose) : null,
        change,
        changePercent,
        currency: meta.currency ?? "USD",
        exchangeName: meta.exchangeName ?? "NYMEX",
        instrumentType: meta.instrumentType ?? "FUTURE",
        marketTime:
          typeof meta.regularMarketTime === "number"
            ? new Date(meta.regularMarketTime * 1000).toISOString()
            : new Date().toISOString(),
        regularSession: {
          start:
            typeof meta.currentTradingPeriod?.regular?.start === "number"
              ? new Date(
                  meta.currentTradingPeriod.regular.start * 1000
                ).toISOString()
              : null,
          end:
            typeof meta.currentTradingPeriod?.regular?.end === "number"
              ? new Date(
                  meta.currentTradingPeriod.regular.end * 1000
                ).toISOString()
              : null
        },
        source: "Yahoo Finance"
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  } catch {
    const fallback = await fetchStooqFallback();

    if (fallback) {
      return NextResponse.json(fallback, {
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      });
    }

    return NextResponse.json(
      { error: "An error occurred while fetching price data" },
      { status: 500 }
    );
  }
}

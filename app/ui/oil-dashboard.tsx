"use client";

import { useEffect, useMemo, useState } from "react";

type OilQuote = {
  symbol: string;
  name: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  exchangeName: string;
  instrumentType: string;
  marketTime: string;
  source: string;
};

type LoadState = "idle" | "loading" | "ready" | "error";

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Asia/Bangkok"
});

export default function OilDashboard() {
  const [quote, setQuote] = useState<OilQuote | null>(null);
  const [status, setStatus] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const trend = useMemo(() => {
    if (!quote?.change) return "flat";
    return quote.change > 0 ? "up" : "down";
  }, [quote]);

  async function loadQuote() {
    setStatus((current) => (current === "ready" ? "ready" : "loading"));
    setError("");

    try {
      const response = await fetch(`/api/oil?ts=${Date.now()}`, {
        cache: "no-store"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load price data");
      }

      setQuote(data);
      setLastChecked(new Date());
      setStatus("ready");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load price data"
      );
      setStatus("error");
    }
  }

  useEffect(() => {
    loadQuote();
    const intervalId = window.setInterval(loadQuote, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const marketTime = quote ? new Date(quote.marketTime) : null;
  const isLoadingFirst = status === "loading" && !quote;

  return (
    <main className="page-shell">
      <section className="ticker-panel" aria-labelledby="page-title">
        <div className="nav-bar">
          <div className="brand-mark">CL</div>
          <div>
            <p className="eyebrow">Yahoo Finance • WTI Futures</p>
            <h1 id="page-title">WTI Crude Oil Price</h1>
          </div>
        </div>

        <div className="hero-grid">
          <div className="price-zone">
            <p className="label">Latest price</p>
            <div className="price-row">
              <span className={isLoadingFirst ? "price skeleton" : "price"}>
                {quote ? numberFormatter.format(quote.price) : "Loading"}
              </span>
              {quote ? (
                <span className="currency">{quote.currency}/barrel</span>
              ) : null}
            </div>

            {quote ? (
              <div className={`change-pill ${trend}`}>
                <span>
                  {trend === "up"
                    ? "Up"
                    : trend === "down"
                      ? "Down"
                      : "Flat"}
                </span>
                <strong>
                  {quote.change != null
                    ? numberFormatter.format(Math.abs(quote.change))
                    : "-"}
                  {quote.changePercent != null
                    ? ` (${numberFormatter.format(Math.abs(quote.changePercent))}%)`
                    : ""}
                </strong>
              </div>
            ) : null}
          </div>

          <div className="status-panel">
            <div>
              <span className={`pulse ${status}`} />
              <p>
                {status === "error"
                  ? "Update failed"
                  : "Auto-updates every 60 seconds"}
              </p>
            </div>
            <button
              className="refresh-button"
              type="button"
              onClick={loadQuote}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Updating" : "Refresh"}
            </button>
          </div>
        </div>

        {error ? <p className="error-message">{error}</p> : null}

        <dl className="metric-grid">
          <div>
            <dt>Symbol</dt>
            <dd>{quote?.symbol ?? "CL=F"}</dd>
          </div>
          <div>
            <dt>Exchange</dt>
            <dd>{quote?.exchangeName ?? "NYMEX"}</dd>
          </div>
          <div>
            <dt>Previous close</dt>
            <dd>
              {quote?.previousClose != null
                ? numberFormatter.format(quote.previousClose)
                : "-"}
            </dd>
          </div>
          <div>
            <dt>Market time</dt>
            <dd>{marketTime ? timeFormatter.format(marketTime) : "-"}</dd>
          </div>
        </dl>

        <footer className="source-line">
          <span>Source: {quote?.source ?? "Yahoo Finance"}</span>
          <span>
            Last checked: {lastChecked ? timeFormatter.format(lastChecked) : "-"}
          </span>
        </footer>
      </section>
    </main>
  );
}

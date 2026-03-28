import React, { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader, Search } from 'lucide-react';

import { API_BASE_URL } from '../../constants';
import { themeClasses } from '@/theme/themeClasses';

interface SymbolOption {
  symbol: string;
  name: string;
}

interface DataPoint {
  time: string;
  price: number;
}

export default function YahooStockTrace() {
  const [symbol, setSymbol] = useState<SymbolOption | null>({
    symbol: 'AAP',
    name: 'Advance Auto Parts',
  });
  const [inputValue, setInputValue] = useState('AAP');
  const [options, setOptions] = useState<SymbolOption[]>([]);
  const [loadingSym, setLoadingSym] = useState(false);

  const [data, setData] = useState<DataPoint[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inputValue) {
      setOptions([]);
      return;
    }

    let active = true;
    setLoadingSym(true);

    void (async () => {
      try {
        const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(inputValue)}`;
        const proxyUrl = `${API_BASE_URL}/dashboard/proxy?url=${encodeURIComponent(searchUrl)}`;

        const res = await fetch(proxyUrl);
        const buf = await res.arrayBuffer();
        const txt = new TextDecoder('utf-8').decode(new Uint8Array(buf));
        const json = JSON.parse(txt);

        const list = (json.quotes || json.Result || []).slice(0, 10).map((result: any) => ({
          symbol: result.symbol,
          name: result.shortname || result.name || result.longname || '',
        }));

        if (active) {
          setOptions(list);
        }
      } catch {
        // ignore suggestion errors
      } finally {
        if (active) {
          setLoadingSym(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [inputValue]);

  useEffect(() => {
    if (!symbol) {
      return;
    }

    let cancelled = false;
    setLoadingData(true);
    setError(null);

    void (async () => {
      try {
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.symbol}?range=1mo&interval=1d`;
        const proxyUrl = `${API_BASE_URL}/dashboard/proxy?url=${encodeURIComponent(chartUrl)}`;

        const res = await fetch(proxyUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const buf = await res.arrayBuffer();
        const txt = new TextDecoder('utf-8').decode(new Uint8Array(buf));
        const payload = JSON.parse(txt);

        const result = payload.chart?.result?.[0];
        if (!result) {
          throw new Error('No data returned');
        }

        const timestamps: number[] = result.timestamp;
        const closeValues: number[] = result.indicators.quote[0].close;

        const points: DataPoint[] = timestamps.map((timestamp, index) => ({
          time: new Date(timestamp * 1000).toLocaleDateString(),
          price: closeValues[index],
        }));

        if (!cancelled) {
          setData(points);
        }
      } catch (caughtError: any) {
        if (!cancelled) {
          setError(caughtError.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="w-full p-4">
      <div className="relative mb-4 max-w-sm">
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value.toUpperCase())}
          placeholder="Ticker"
          className={`${themeClasses.field} w-full rounded p-2 pr-10 focus:outline-none`}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          {loadingSym ? (
            <Loader className="h-5 w-5 animate-spin ui-text-muted" />
          ) : (
            <Search className="h-5 w-5 ui-text-muted" />
          )}
        </div>

        {options.length > 0 && inputValue !== symbol?.symbol ? (
          <ul className="ui-panel absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl">
            {options.map((option) => (
              <li key={option.symbol}>
                <button
                  onClick={() => {
                    setSymbol(option);
                    setOptions([]);
                  }}
                  className="flex w-full items-center px-4 py-2 text-left hover:bg-[var(--surface-hover)] focus:outline-none"
                >
                  <span className="font-medium text-[var(--text-primary)]">{option.symbol}</span>
                  <span className="ml-2 text-sm ui-text-muted">{option.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {loadingData ? (
        <div className="text-[var(--text-secondary)]">Loading data for {symbol?.symbol}...</div>
      ) : null}
      {error ? <div className="text-red-400">Error: {error}</div> : null}

      {!loadingData && !error && data.length > 0 ? (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="color-mix(in srgb, var(--text-muted) 24%, transparent)"
              />
              <XAxis dataKey="time" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis domain={['dataMin', 'dataMax']} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <ReTooltip
                contentStyle={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  color: 'var(--text-primary)',
                }}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Line type="monotone" dataKey="price" stroke="var(--accent-primary)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}

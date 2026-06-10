'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ReceiptModal } from '@/components/dashboard/ReceiptModal';
import { DemoStats } from './DemoStats';
import { DemoTerminal, type LogEntry } from './DemoTerminal';
import { DemoReceiptGrid, type DemoReceipt } from './DemoReceiptGrid';

type RunState = 'idle' | 'running' | 'done';

const PUBLISHERS = [
  { id: 'pub_techNotes', units: 1 },
  { id: 'pub_researchDigest', units: 5 },
  { id: 'pub_devDocsCentral', units: 2 },
  { id: 'pub_mlPapers', units: 5 },
  { id: 'pub_theArchive', units: 1 },
] as const;

const TOTAL_STEPS = 60;
const HEX = '0123456789abcdef';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function nowStr(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function hex(len = 4): string {
  let s = '';
  for (let i = 0; i < len; i++) s += HEX[Math.floor(Math.random() * 16)];
  return s;
}
function fmtUsd(units: number): string {
  return `$${(units * 0.0001).toFixed(4)}`;
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
function publisherDomain(pubId: string): string {
  return (
    pubId
      .replace('pub_', '')
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '') + '.example.com'
  );
}

export function DemoRunner() {
  const [state, setState] = useState<RunState>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [receipts, setReceipts] = useState<DemoReceipt[]>([]);
  const [stats, setStats] = useState({ done: 0, totalUnits: 0, avg: '—' });
  const [pubsSeen, setPubsSeen] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<DemoReceipt | null>(null);
  const cancelRef = useRef(false);

  // Cancel any in-flight run on unmount.
  useEffect(() => () => { cancelRef.current = true; }, []);

  async function run() {
    if (state === 'running') return;
    cancelRef.current = false;
    setLogs([]);
    setReceipts([]);
    setStats({ done: 0, totalUnits: 0, avg: '—' });
    setPubsSeen(new Set());
    setState('running');

    let totalUnitsRunning = 0;
    const pubs = new Set<string>();

    for (let i = 0; i < TOTAL_STEPS; i++) {
      if (cancelRef.current) return;
      const p = PUBLISHERS[i % PUBLISHERS.length]!;
      const fail = Math.random() < 0.12;
      const ms = Math.floor(600 + Math.random() * 900);
      const tx = `0x${hex()}…`;
      const t = nowStr();

      if (fail) {
        setLogs((l) => [
          ...l,
          { ts: t, kind: 'fail', pub: p.id, amount: fmtUsd(p.units) },
        ]);
        await sleep(280);
        if (cancelRef.current) return;
        setLogs((l) => [
          ...l,
          { ts: nowStr(), kind: 'success', pub: p.id, amount: fmtUsd(p.units), tx, ms },
        ]);
      } else {
        setLogs((l) => [
          ...l,
          { ts: t, kind: 'success', pub: p.id, amount: fmtUsd(p.units), tx, ms },
        ]);
      }

      totalUnitsRunning += p.units;
      pubs.add(p.id);
      const avg = `${(1.2 + Math.random() * 0.9).toFixed(1)}s`;
      setStats({ done: i + 1, totalUnits: totalUnitsRunning, avg });
      setPubsSeen(new Set(pubs));

      // Push a receipt every 4th success, plus the first five.
      if ((i + 1) % 4 === 0 || i < 5) {
        const dom = publisherDomain(p.id);
        const wallet = `0x${hex()}…${hex()}`;
        setReceipts((rs) =>
          [
            { pubId: p.id, dom, units: p.units, tx, wallet, ts: Math.floor(Date.now() / 1000) },
            ...rs,
          ].slice(0, 5),
        );
      }

      await sleep(150 + Math.random() * 120);
    }

    if (cancelRef.current) return;
    setLogs((l) => [...l, { ts: nowStr(), kind: 'done', totalUnits: totalUnitsRunning }]);
    setState('done');
  }

  const buttonLabel =
    state === 'running'
      ? `Running… ${stats.done}/60`
      : state === 'done'
        ? 'Run it again'
        : 'Run the demo';

  return (
    <div>
      <header className="mb-10 text-center">
        <h1 className="mb-3 text-[36px] font-semibold tracking-[-0.03em] md:text-[48px]">
          Live demo
        </h1>
        <p className="mono mb-7 text-[14px] text-ink-secondary">
          5 publishers · 12 fetches each · 60 real Arc Testnet transactions
        </p>
        <Button
          onClick={run}
          size="lg"
          disabled={state === 'running'}
          className="min-w-[220px]"
        >
          {state === 'running' ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden />
          ) : (
            <Play className="h-3.5 w-3.5" fill="currentColor" stroke="none" aria-hidden />
          )}
          {buttonLabel}
        </Button>
      </header>

      <DemoStats
        done={stats.done}
        totalUnits={stats.totalUnits}
        avg={stats.avg}
        pubs={pubsSeen.size}
      />

      <DemoTerminal logs={logs} idle={state === 'idle'} />

      <h3 className="mb-3.5 mt-7 text-base font-semibold">Latest receipts</h3>
      <DemoReceiptGrid receipts={receipts} onSelect={setSelected} />

      <ReceiptModal
        receipt={
          selected
            ? {
                url: `https://${selected.dom}/articles/foo`,
                amount: `$${(selected.units * 0.0001).toFixed(4)}`,
                canonical: {
                  version: '1',
                  publisherId: selected.pubId,
                  crawlerWallet: selected.wallet.replace('…', '0000'),
                  url: `https://${selected.dom}/articles/foo`,
                  amountAtomic: (selected.units * 100).toString(),
                  currency: 'USDC',
                  network: 'eip155:5042002',
                  onchainTxHash: `${selected.tx}9f3c`,
                  issuedAt: selected.ts,
                  signature: `0xa3f${Math.random().toString(16).slice(2, 10)}…`,
                },
              }
            : null
        }
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

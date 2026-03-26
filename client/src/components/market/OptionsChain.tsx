import type { OptionsChain as OptionsChainType, OptionsContract } from '@optionsranker/shared';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { cn } from '@/lib/utils';
import { formatStrike, formatPremium, formatGreek, formatVolume, formatOI } from '@/lib/formatters';

interface OptionsChainProps {
  chain: OptionsChainType;
  selectedExpiration: string;
}

function ContractCells({ contract, isCall }: { contract: OptionsContract | undefined; isCall: boolean }) {
  if (!contract) {
    return (
      <>
        <TableCell className="text-center text-slate-600">-</TableCell>
        <TableCell className="text-center text-slate-600">-</TableCell>
        <TableCell className="text-center text-slate-600">-</TableCell>
        <TableCell className="text-center text-slate-600">-</TableCell>
        <TableCell className="text-center text-slate-600">-</TableCell>
        <TableCell className="text-center text-slate-600">-</TableCell>
        <TableCell className="text-center text-slate-600">-</TableCell>
      </>
    );
  }

  return (
    <>
      <TableCell className="text-center">{formatPremium(contract.bid)}</TableCell>
      <TableCell className="text-center">{formatPremium(contract.ask)}</TableCell>
      <TableCell className="text-center font-medium">{formatPremium(contract.last)}</TableCell>
      <TableCell className="text-center">{formatVolume(contract.volume)}</TableCell>
      <TableCell className="text-center">{formatOI(contract.openInterest)}</TableCell>
      <TableCell className="text-center">{(contract.impliedVolatility * 100).toFixed(1)}%</TableCell>
      <TableCell className="text-center">{formatGreek(contract.greeks.delta)}</TableCell>
    </>
  );
}

export function OptionsChainView({ chain, selectedExpiration }: OptionsChainProps) {
  const expirationData = chain.chain[selectedExpiration];
  if (!expirationData) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        No data available for this expiration
      </div>
    );
  }

  const { calls, puts } = expirationData;
  const underlyingPrice = chain.underlyingPrice;

  // Collect all strikes
  const strikesSet = new Set<number>();
  calls.forEach((c) => strikesSet.add(c.strike));
  puts.forEach((p) => strikesSet.add(p.strike));
  const strikes = Array.from(strikesSet).sort((a, b) => a - b);

  // Index contracts by strike for fast lookup
  const callByStrike = new Map(calls.map((c) => [c.strike, c]));
  const putByStrike = new Map(puts.map((p) => [p.strike, p]));

  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeader className="text-center text-emerald-400 text-xs" colSpan={7}>
            CALLS
          </TableHeader>
          <TableHeader className="text-center text-amber-400 text-xs bg-slate-700/30">
            STRIKE
          </TableHeader>
          <TableHeader className="text-center text-rose-400 text-xs" colSpan={7}>
            PUTS
          </TableHeader>
        </tr>
        <tr>
          {/* Call headers */}
          <TableHeader className="text-center text-xs">Bid</TableHeader>
          <TableHeader className="text-center text-xs">Ask</TableHeader>
          <TableHeader className="text-center text-xs">Last</TableHeader>
          <TableHeader className="text-center text-xs">Vol</TableHeader>
          <TableHeader className="text-center text-xs">OI</TableHeader>
          <TableHeader className="text-center text-xs">IV</TableHeader>
          <TableHeader className="text-center text-xs">Delta</TableHeader>
          {/* Strike */}
          <TableHeader className="text-center text-xs bg-slate-700/30">Strike</TableHeader>
          {/* Put headers */}
          <TableHeader className="text-center text-xs">Bid</TableHeader>
          <TableHeader className="text-center text-xs">Ask</TableHeader>
          <TableHeader className="text-center text-xs">Last</TableHeader>
          <TableHeader className="text-center text-xs">Vol</TableHeader>
          <TableHeader className="text-center text-xs">OI</TableHeader>
          <TableHeader className="text-center text-xs">IV</TableHeader>
          <TableHeader className="text-center text-xs">Delta</TableHeader>
        </tr>
      </TableHead>
      <TableBody>
        {strikes.map((strike) => {
          const callITM = strike < underlyingPrice;
          const putITM = strike > underlyingPrice;

          return (
            <TableRow
              key={strike}
              className={cn(
                callITM && 'bg-emerald-500/5',
                putITM && 'bg-rose-500/5',
              )}
            >
              <ContractCells contract={callByStrike.get(strike)} isCall={true} />
              <TableCell
                className={cn(
                  'text-center font-bold bg-slate-700/30',
                  strike === Math.round(underlyingPrice) && 'text-amber-400',
                )}
              >
                {formatStrike(strike)}
              </TableCell>
              <ContractCells contract={putByStrike.get(strike)} isCall={false} />
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

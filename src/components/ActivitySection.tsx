import type { Address } from "viem";
import Activity from "@/components/Activity";
import type { TrustRequest } from "@/lib/types";
import { usdcTransfers, type Transfer } from "@/lib/wallet";

// Reads the trust's USDC history from chain. Rendered inside Suspense so the
// rest of the page shows while the logs load.
export default async function ActivitySection({
  address,
  fromBlock,
  requests,
  labels,
}: {
  address: Address | null;
  fromBlock?: number;
  requests: TrustRequest[];
  labels: Record<string, string>;
}) {
  let transfers: Transfer[] = [];
  let error: string | undefined;
  // Without a readable wallet, fall back to the payouts the trustee recorded.
  if (!address) error = "wallet not connected";
  else {
    try {
      transfers = await usdcTransfers(address, fromBlock);
    } catch (e) {
      error = (e as Error).message.split("\n")[0];
    }
  }
  return <Activity transfers={transfers} requests={requests} labels={labels} error={error} />;
}

export function ActivitySkeleton() {
  return (
    <div className="card mt-4 grid gap-3 p-5" aria-label="Loading history">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="shimmer h-4 w-1/2" />
          <div className="shimmer h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

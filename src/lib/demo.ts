import type { Address } from "viem";
import { newKey } from "./access";
import { oneAtATime } from "./queue";
import { newId, saveTrust } from "./store";
import { TEMPLATES } from "./templates";
import type { Trust } from "./types";
import { TESTNET, currentBlock, payUsdc, requestTestUsdc, trustAddress, usdcBalance, walletConfigured } from "./wallet";

// "Try the demo": a ready-made trust anyone can use with no wallet. It is
// funded from a demo treasury (a CDP wallet the operator tops up with test
// USDC), and Ada's payouts go back to that treasury, so the demo keeps itself
// going. Test network only.

export const TREASURY = "demo-treasury";
const FUND = Number(process.env.DEMO_FUND_USDC ?? 2);

export const demoEnabled = () => TESTNET && walletConfigured();

export async function treasury() {
  const address = await trustAddress(TREASURY);
  return { address, balance: address ? await usdcBalance(address) : 0 };
}

export async function createDemoTrust(): Promise<{ trust: Trust; funded: boolean }> {
  const t = TEMPLATES["Education fund"];
  const payTo = (await trustAddress(TREASURY)) as Address;
  const trust: Trust = {
    id: newId(),
    name: t.name,
    settlor: "Ebere (demo)",
    protector: "Grace",
    settlorKey: newKey(),
    protectorKey: newKey(),
    deed: t.deed,
    perRequestMax: Number(t.perRequestMax),
    liquidBuffer: 0,
    beneficiaries: [{ id: newId(), key: newKey(), name: "Ada", relation: "daughter", wallet: payTo, yearlyCap: 100 }],
    demo: true,
    createdAt: new Date().toISOString(),
  };
  const [address, block] = await Promise.allSettled([trustAddress(trust.id), currentBlock()]);
  if (address.status === "fulfilled" && address.value) trust.address = address.value;
  if (block.status === "fulfilled") trust.fromBlock = Number(block.value);
  await saveTrust(trust);

  // Fund it: from the treasury if it can, otherwise from Coinbase's faucet.
  let funded = false;
  if (trust.address) {
    try {
      // One treasury payment at a time, so demos started together don't clash.
      funded = await oneAtATime(TREASURY, async () => {
        const { balance } = await treasury();
        if (balance < FUND) return false;
        await payUsdc(TREASURY, trust.address as Address, FUND);
        return true;
      });
    } catch {
      // Fall through to the faucet.
    }
    if (!funded) funded = await requestTestUsdc(trust.id).then(() => true, () => false);
  }
  return { trust, funded };
}

# Deed: an AI trustee for everyone

Write your wishes in plain words. Deed turns them into a trust: an AI trustee holds the money, reads every request against your wishes, and pays out only what they allow, only to the people you named.

Built for the OpenServ SERV Hackathon, Edition 01 (tracks: Coinbase AgentKit, IXS Vaults, Open).

## Why

Trusts are how wealthy families make sure money is spent the way they meant: school fees, not phones; medicine for grandparents, not loans to cousins. They cost thousands to set up and 0.5–2% a year to run, so almost nobody has one. And agent-managed money has no legal wrapper ("AI agents cannot hold a bank account", in IXS's words). A trust is the old answer to exactly that: money held for named people under written rules.

## How SERV Reasoning is used

The settlor's wishes **are** the system prompt. SERV compiles them once into a bounded reasoning graph (cached per organization) and a small model follows that graph for every request, so each trust's decisions stay consistent over time and cost very little.

| Step | SERV feature | Where |
| --- | --- | --- |
| Check the wishes for gaps before money goes in | `-serv-kronos` model suffix (audits the generated reasoning prompt) | `src/lib/serv.ts` `checkDeed` |
| Decide requests under branching rules (per person, per kind of payment, priorities) | `-serv-kronos-multipath` | `decide` |
| Requests are written by the person who gains from a yes | `serv_prompt_guard` | `decide` |
| Second check before money moves | `serv_shadow_agent` with a hint that the clause must exist and amounts must fit the limits | `decide` |

## Two locks on every payment

1. **Reasoning** (`src/lib/serv.ts`): verdict, amount, the clause relied on, reasons in plain words.
2. **Fixed rules** (`src/lib/rules.ts`): never more than asked, the per-payment limit, each person's yearly limit, what the wallet actually holds, only to a saved address, and a hard stop when a request tries to override the wishes. These can only lower an amount or turn a yes into a no.

Payouts are USDC transfers from the trust's own **Coinbase AgentKit** wallet (`CdpEvmWalletProvider`, one CDP server account per trust, `src/lib/wallet.ts`). Balances are read from chain; nothing is simulated.

## Run it

```bash
cp .env.example .env.local   # SERV key + CDP keys
npm install
npm run dev
```

- SERV key: console.openserv.ai. Turn on data collection under Organization settings.
- CDP keys: portal.cdp.coinbase.com (API key id, secret, and wallet secret).
- `TRUST_NETWORK` defaults to `base-sepolia`. Fund a trust by sending test USDC to the address shown on its page.
- Records are JSON files in `data/` locally, or Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set.

## Status

| Part | State |
| --- | --- |
| Wishes check (gaps + decision flowchart) | Live, SERV |
| Request decisions | Live, SERV |
| Fixed rules | Live |
| USDC payouts via AgentKit | Live on Base Sepolia; Base mainnet by setting `TRUST_NETWORK=base` |
| Idle money into IXS vaults | Next |
| Payouts to bank accounts (Paycrest) | Roadmap, needs business verification |

Deed is a trust-style account with an AI trustee and an optional human protector. It is not a court-registered trust or legal advice.

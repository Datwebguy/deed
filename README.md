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

## Try it

Tap **Try the demo** on the home page: it makes a trust funded with test USDC and opens it as Ada, with one-tap example requests and a switch to see the protector's and settlor's views. No wallet needed. Demo trusts are funded from a demo treasury (a CDP wallet; its address and balance are in `/api/health`), and Ada's payouts go back to it. Top it up with test USDC from faucet.circle.com.

## Two locks on every payment

1. **Reasoning** (`src/lib/serv.ts`): verdict, amount, the clause relied on, reasons in plain words.
   The trustee decides three times independently and the strictest answer stands (`SERV_RUNS`).
2. **Fixed rules** (`src/lib/rules.ts`): the quoted clause must really be in the wishes and the runs must agree, or the payment waits for the protector to approve or decline; never more than asked, the per-payment limit, each person's yearly limit, what the wallet actually holds, only to a saved address, and a hard stop when a request tries to override the wishes. These can only lower an amount or turn a yes into a no.

Payouts are USDC transfers from the trust's own **Coinbase AgentKit** wallet (`CdpEvmWalletProvider`, one CDP server account per trust, `src/lib/wallet.ts`). Balances are read from chain; nothing is simulated.

## Signed by the settlor

Creating a trust needs a connected wallet (any browser wallet, or a Base Account passkey) and a payout wallet for every person. The last step asks the settlor to sign the exact terms: the trust name, a fingerprint of the wishes, each person's payout address and yearly limit, the largest payment and the protector (`src/lib/deed-message.ts`). The server rebuilds that message and verifies the signature, including smart-wallet signatures, before saving anything, and the trust page shows the signing wallet.

## Private links and the protector

Creating a trust gives the settlor a set of private links (`src/lib/access.ts`):

- **Settlor**: fund the trust, share the other links, pause payouts.
- **Protector**: see requests that tried to override the wishes, and pause or resume all payouts.
- **One per named person**: the only way to ask the trustee as that person. The form is locked to them and they see only their own requests.

The trust's plain address is read-only. When a request tries to override the wishes it is stopped by the fixed rules, marked on the page, and, if `RESEND_API_KEY` is set and the settlor gave a protector email, the protector is emailed a link to review it. While paused, the trustee still decides requests but the fixed rules send nothing.

## Money flow

- **Funding:** on the trust page the settlor taps **Pay with Base**: a one-tap USDC payment from a Base Account (passkey wallet, `@base-org/account`), so it works in any phone or desktop browser with no app or extension, and network fees are covered. A wallet already in the browser (extension or a wallet app's own browser) can send directly; on phones without one, links open the page inside Coinbase Wallet, MetaMask or Trust Wallet (`src/components/FundPanel.tsx`). On the test network, "Send free test USDC" asks Coinbase's CDP faucet to fund the trust (`/api/trusts/[id]/faucet`).
- **Payouts:** after both locks pass, the trustee sends USDC from the trust's wallet to the saved address. On Base Sepolia the wallet tops itself up with faucet ETH for network fees; on Base mainnet it needs a little ETH sent to it once.
- **History:** "Money in and out" lists every USDC transfer to and from the trust's wallet, read from chain logs since the trust was created, with Basescan links.
- **Payout addresses:** "Use my wallet" fills a beneficiary's address from the connected wallet.

## Run it

```bash
cp .env.example .env.local   # SERV key + CDP keys
npm install
npm run dev
```

- SERV key: console.openserv.ai. Turn on data collection under Organization settings.
- CDP keys: portal.cdp.coinbase.com (API key id, secret, and wallet secret).
- Each trust chooses its money when it is made: **test money** (Base Sepolia, the default) or **real money** (USDC on Base). The choice is part of the terms the settlor signs. A real-money trust needs about $1 of ETH on Base in its wallet for network fees. `TRUST_NETWORK` only sets the site's default; the demo always uses test money.
- Optional RPCs per network: `BASE_SEPOLIA_RPC_URL`, `BASE_MAINNET_RPC_URL` (`BASE_RPC_URL` still applies to the default network).
- Records are JSON files in `data/` locally, or Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set.
- `/api/health` shows what is connected: SERV key, CDP keys, whether the wallet opens, gas balance, and whether the chain RPC answers.
- The public Base RPC is rate limited. For a demo, set `BASE_RPC_URL` to a dedicated endpoint (the history reads chain logs in 9,000-block windows; set `LOGS_WINDOW` lower if your provider caps ranges).

## Status

| Part | State |
| --- | --- |
| Wishes check (gaps + decision flowchart) | Live, SERV |
| Request decisions | Live, SERV |
| Fixed rules | Live |
| USDC payouts via AgentKit | Live on Base Sepolia (gas auto-topped from faucet); Base mainnet by setting `TRUST_NETWORK=base` |
| Funding from a connected wallet, test faucet, on-chain history | Live |
| Idle money into IXS vaults | Next |
| Payouts to bank accounts (Paycrest) | Roadmap, needs business verification |

Deed is a trust-style account with an AI trustee and an optional human protector. It is not a court-registered trust or legal advice.

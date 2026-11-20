# Aevum Invoices

Send invoices and get paid in **tUSD8** on **QDay Aevum testnet** (chain `44005`) — built for freelancers and small shops. Create an invoice with an amount, an optional payer and a due date; your client pays the exact amount, standard (approve + pay) or gasless (one EIP-3009 signature, a relayer submits it). Every invoice and payment is on-chain, with a receipt page and an activity feed to prove it.

- **Contracts (Foundry):** `Invoice.sol`, an invoice contract with exact-amount and named-payer rules, plus tests that run against the real tUSD8 on a local fork.
- **Web app (Next.js):** an invoice dashboard, a create-invoice form, invoice detail with standard and gasless payment, on-chain receipts, an activity feed and a setup checker. Connect with MetaMask, Rabby, any browser wallet, or WalletConnect.
- **TypeScript examples:** sign and relay a gasless payment, read events past the 1,000-block log limit, and check a wallet's setup.
- **`@aevum-kit/aevum`:** chain config, ABIs and helpers shared by all of the above. Import it in your own code.

Based on Aevum Starter Kit (MIT, PQA Labs).

> **Judging counts activity on Aevum.** Contracts, payments and transfers must happen on Aevum testnet. Settling only on another chain (for example x402 on Base) doesn't count.

## Live on Aevum testnet (deployed 20 Nov 2026)

- **Invoice contract:** [`0x535Cb84930079C7Cc6e4201BDcE6e3a5e01432cD`](https://explorer-test.qday.info/address/0x535Cb84930079C7Cc6e4201BDcE6e3a5e01432cD) (chain `44005`, deploy block `3633638`)
- **Deploy tx:** [`0x3b4b01530d57f75447e969efda4ebdbe7bbbb237791945275a0493393a0463b8`](https://explorer-test.qday.info/tx/0x3b4b01530d57f75447e969efda4ebdbe7bbbb237791945275a0493393a0463b8)
- **Deployed from commit:** `f0b012f` — [source](https://github.com/VexorHQ/aevum-invoices/tree/f0b012fa2e138d7622baf9105a2423d55c4c36f3/contracts/src/Invoice.sol)
- **First invoice, paid on-chain:** invoice `0x6d6d14c65f272fa0b731a3bb7b04c13d3097c7c0192459217b3acef94d6a2639` (1 tUSD8) — create [`0x84758cb504e7d5c2caee77c624c27c1c6a9f1c783f724f43eb7e869d4b5838d2`](https://explorer-test.qday.info/tx/0x84758cb504e7d5c2caee77c624c27c1c6a9f1c783f724f43eb7e869d4b5838d2) · pay [`0xdafc2b28b078e8aa0b8705107edcfd326601afa674e8a59e303f4d4efd9698d7`](https://explorer-test.qday.info/tx/0xdafc2b28b078e8aa0b8705107edcfd326601afa674e8a59e303f4d4efd9698d7) (`isPaid` = true)

The explorer's contract verifier is not working yet, so the contract is not verified on the explorer — the address, the exact commit above, and these transaction hashes are the proof instead.

---

## Contents

- [Quickstart (5 minutes, no funds needed)](#quickstart-5-minutes-no-funds-needed)
- [Network details](#network-details)
- [Get test tokens](#get-test-tokens)
- [Deploy to Aevum testnet](#deploy-to-aevum-testnet)
- [Deploy the web app to Vercel](#deploy-the-web-app-to-vercel)
- [How invoices work](#how-invoices-work)
- [Things that differ from Ethereum](#things-that-differ-from-ethereum)
- [Project layout](#project-layout)
- [Commands](#commands)
- [Submitting your project](#submitting-your-project)
- [FAQ](#faq)

---

## Quickstart (5 minutes, no funds needed)

You need [Node 22+](https://nodejs.org), [pnpm](https://pnpm.io/installation) and [Foundry](https://book.getfoundry.sh/getting-started/installation) (`foundryup`).

```bash
git clone --recursive https://github.com/qday-io/aevum-starter-kit.git
cd aevum-starter-kit
make install          # Solidity libs + JS packages
make check            # build, Shanghai opcode check, unit tests, fork tests
```

Run the whole app against a **local copy of Aevum**, with the real tUSD8 and free test balances:

```bash
# terminal 1: local copy of Aevum testnet on 127.0.0.1:8555 (chain 440050)
make fork

# terminal 2: deploy Invoice and give yourself test money
make deploy-fork                      # prints the Invoice address
make deal TO=<your wallet address>    # 100 tUSD8 + 10 tQDAY, on the fork only

cp web/.env.example web/.env.local
#   NEXT_PUBLIC_NETWORKS=fork,aevum
#   NEXT_PUBLIC_CHECKOUT_FORK=<address from deploy-fork>
#   RELAYER_PRIVATE_KEY=<a test key, see below>   (optional: enables gasless mode)
make dev                              # http://localhost:3000
```

Use the **Local fork / Aevum testnet** switcher in the app's header. The first time you pick the fork, your wallet offers to add "Aevum fork (local)" as a new network; after that, switching is one click and your real testnet network stays untouched.

**Why the fork has its own chain ID (440050):** it copies Aevum's state (accounts, balances, tUSD8) but anything you sign there, such as an EIP-3009 authorization or a permit, can't be replayed on the real testnet, and wallets never mix the two up. `make deploy-fork` also deploys from a random address nobody has the key to, so its contract addresses can't be claimed on the real testnet.

For a local relayer, any of anvil's [default test accounts](https://book.getfoundry.sh/anvil/#getting-started) works. Those keys are public, so the relayer refuses them on any chain but `make fork` and `make anvil`. When you add `aevum`, put a fresh test wallet's key in `RELAYER_PRIVATE_KEY` instead.

Want an empty chain instead of a fork? `make anvil` + `make deploy-local` deploys a `MockUSD8` (same decimals, EIP-712 domain and EIP-3009 functions as tUSD8) that anyone can mint with `make mint`.

---

## Network details

| | |
|---|---|
| Network | QDay Aevum Testnet |
| Chain ID | `44005` |
| RPC | `https://rpc-test.qday.info` (HTTPS only, no WebSocket) |
| Explorer | https://explorer-test.qday.info |
| Gas token | tQDAY (18 decimals) |
| Gas price | about 1 gwei. 1 tQDAY covers hundreds of contract calls. |
| EVM version | **Shanghai** |
| tUSD8 | [`0x456569838f1d43009A91ebA4263147Afd7233483`](https://explorer-test.qday.info/address/0x456569838f1d43009A91ebA4263147Afd7233483), 6 decimals, USDC-style (EIP-2612 `permit`, EIP-3009 signed transfers), EIP-712 domain `name: "tUSD8"`, `version: "2"` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |

All of this is in [`packages/aevum/src/chain.ts`](packages/aevum/src/chain.ts) and [`contracts.ts`](packages/aevum/src/contracts.ts).

---

## Get test tokens

- **Discord faucet (for Builder Challenge participants):** join the [QDay Discord](https://discord.gg/bYPhjmrSfK), react ✅ in `#verify`, then run `/faucet <your address>`. You get **1 tQDAY + 5 tUSD8**, once per Discord account and once per address. No Ethereum mainnet balance needed.
- **Web faucet:** https://faucet.qday.info. Check the page for its rules.
- **Local fork:** `make deal TO=<address>` for unlimited test balances. Nothing leaves your machine.

1 tQDAY is plenty for development: deploying `Invoice` costs well under 0.01 tQDAY.

---

## Deploy to Aevum testnet

Keep your deployer key out of files and shell history. Foundry's encrypted keystore asks for the key once and a password each time:

```bash
cast wallet import aevum-deployer --interactive   # paste the key of a TEST wallet
cast wallet address --account aevum-deployer      # fund this address from the faucet

make deploy-aevum ACCOUNT=aevum-deployer          # uses real tUSD8
```

Then set `NEXT_PUBLIC_CHECKOUT_AEVUM` to the Invoice address in `web/.env.local` (the variable name is kept from the starter kit) and add `aevum` to `NEXT_PUBLIC_NETWORKS`.

**Putting the web app online:** see [Deploy the web app to Vercel](#deploy-the-web-app-to-vercel). The same settings apply to any other host.

> Use a wallet made only for testing. Never paste a private key into chat, an issue, or a committed file.

**Contract verification:** the explorer's verifier isn't working yet, so `forge verify-contract` will fail for now. Put your contract addresses and a link to the source (the exact commit) in your README and submission instead. The command, for when it's back:

```bash
forge verify-contract <address> src/Invoice.sol:Invoice --chain-id 44005 \
  --verifier blockscout --verifier-url https://explorer-test.qday.info/api/
```

---

## Deploy the web app to Vercel

Deploy your contract first ([above](#deploy-to-aevum-testnet)), then:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FVexorHQ%2Faevum-invoices&root-directory=web&project-name=aevum-invoices&repository-name=aevum-invoices&env=NEXT_PUBLIC_NETWORKS%2CNEXT_PUBLIC_CHECKOUT_AEVUM%2CTRUSTED_IP_HEADER&envDefaults=%7B%22NEXT_PUBLIC_NETWORKS%22%3A%22aevum%22%2C%22TRUSTED_IP_HEADER%22%3A%22x-vercel-forwarded-for%22%7D&envDescription=Your%20Invoice%20address%20from%20%60make%20deploy-aevum%60.%20Add%20RELAYER_PRIVATE_KEY%20later%20in%20Project%20Settings%20to%20turn%20on%20gasless%20invoice%20payment.&envLink=https%3A%2F%2Fgithub.com%2FVexorHQ%2Faevum-invoices%23deploy-the-web-app-to-vercel)

The button copies this repo into your GitHub account and creates a Vercel project with **Root Directory** `web`. It asks for:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_NETWORKS` | `aevum` (prefilled). Keep it to `aevum` online: with `fork` or `local`, visitors get a "Local fork" option that points at *their own* 127.0.0.1. |
| `NEXT_PUBLIC_CHECKOUT_AEVUM` | Your Invoice address from `make deploy-aevum`. |
| `TRUSTED_IP_HEADER` | `x-vercel-forwarded-for` (prefilled). The relayer rate-limits on this header, which Vercel sets and visitors can't fake. |

Optional, in **Project Settings → Environment Variables** (then redeploy):

| Variable | Value |
|---|---|
| `RELAYER_PRIVATE_KEY` | Turns on gasless invoice payment. A **fresh** wallet with a little tQDAY, never one that holds anything else, and never an anvil key (the relayer refuses those on Aevum). Mark it Sensitive. |
| `NEXT_PUBLIC_DEPLOY_BLOCK_AEVUM` | Your deploy block. The dashboard and Activity page start scanning there. |
| `NEXT_PUBLIC_WC_PROJECT_ID` | Enables WalletConnect (mobile wallets). Free at [cloud.reown.com](https://cloud.reown.com). |
| `NEXT_PUBLIC_REPO_URL` | Your repo, for the Docs page's Source link. |

Doing it by hand instead: **Add New → Project**, import your repo, set **Root Directory** to `web`, add the variables above, and deploy. Keep the whole repo connected (not just `web/`): the app imports `packages/aevum` through the pnpm workspace, and Vercel reads `pnpm-lock.yaml` at the repo root.

> **The relayer's limits live in memory.** On Vercel each function instance has its own copy, so they slow down an attacker but don't stop one. Keep only a little tQDAY in the relayer, and move the limits to a shared store (for example Upstash Redis) if your app gets real traffic.

---

## How invoices work

`Invoice` is a bill book on-chain. The merchant calls `createInvoice(amount, payer, dueDate, memo)` and gets back an `invoiceId` (`bytes32`). Each invoice can be paid once, for exactly its amount: paying the wrong amount reverts with `WrongAmount`, and when the invoice names a payer, anyone else reverts with `NotPayer`. A blank payer means anyone can settle it. The money goes straight to the merchant, and the `InvoicePaid(invoiceId, payer, amount, paidAt)` event is the receipt. The due date is informational — a late invoice shows as overdue in the app, but the contract never blocks a late payment.

**Standard** (two transactions, buyer pays gas):

```
payer ── approve(Invoice, amount) ──▶ tUSD8
payer ── pay(invoiceId, amount) ───▶ Invoice ── transferFrom ──▶ merchant
```

**Gasless** (one signature, the buyer needs no tQDAY):

```
payer  ── signs ReceiveWithAuthorization(from, to=Invoice, value, validAfter, validBefore, nonce) ── off-chain
relayer ── payWithAuthorization(invoiceId, from, amount, …, nonce, v, r, s) ──▶ Invoice
           Invoice ── receiveWithAuthorization ──▶ tUSD8 ──▶ Invoice ──▶ merchant
```

Design choices you can reuse:

- The signed `nonce` must equal `Invoice.authorizationNonce(invoiceId)`. That binds the signature to one invoice, so a relayer can't reuse it to mark a different invoice as paid. The relayer reads the nonce from the contract and passes it to `payWithAuthorization`.
- `receiveWithAuthorization` (not `transferWithAuthorization`) means only the Invoice contract can pull the funds, so nobody can front-run the signature into a plain transfer.
- The amount lives in the invoice itself. The app and the relayer both read it from `Invoice.getInvoice(invoiceId)` and refuse anything else — never trust an amount that only came from a URL or a form. The dashboard derives the status (Open / Paid / Overdue) from `getInvoice` plus the due date.

The web relayer ([`web/src/app/api/relay/route.ts`](web/src/app/api/relay/route.ts)) pays gas for anyone who calls it, so it has rails. Keep them if you build on it:

- It only calls `payWithAuthorization` on your Invoice contract, never anything else.
- It only relays the exact amount the invoice asks for, read from `getInvoice` on-chain. Otherwise anyone could burn your gas with 0.000001 tUSD8 payments.
- It only relays for the payer the invoice names (if it names one).
- It skips invoices that are already paid or already being submitted, and simulates before sending.
- It refuses anvil's public keys on a real network, caps the signature window at 1 hour, and rate-limits per IP and per payer with a daily cap.
- **The limits live in memory.** That works for `next start` on one server. On serverless hosts each instance has its own copy, so move them to a shared store (Redis, your database) before going live. Set `TRUSTED_IP_HEADER` to your host's client-IP header (`x-vercel-forwarded-for` on Vercel, `cf-connecting-ip` behind Cloudflare).

Rules the contract enforces, and what the app still checks:

- **Exact amount, named payer.** `pay` and `payWithAuthorization` revert on the wrong amount (`WrongAmount`) or the wrong wallet (`NotPayer`), and on a second payment (`AlreadyPaid`). The app re-checks all three before asking you to sign or spend gas.
- **No invoice ids to guess.** `createInvoice` returns a fresh `bytes32` id; sequential invoice numbers would let anyone claim an invoice in advance.
- Tokens sent straight to the contract are stuck — always pay through `pay` / `payWithAuthorization`.

Code to read, in order:

1. [`contracts/src/Invoice.sol`](contracts/src/Invoice.sol)
2. [`contracts/test/Invoice.t.sol`](contracts/test/Invoice.t.sol): every rule above as a test
3. [`contracts/test/fork/AevumFork.t.sol`](contracts/test/fork/AevumFork.t.sol): the same flows against the real tUSD8
4. [`examples/src/pay-gasless.ts`](examples/src/pay-gasless.ts): sign + relay in about 40 lines
5. [`web/src/app/invoices/[invoiceId]/page.tsx`](web/src/app/invoices/[invoiceId]/page.tsx): both payment modes in the UI

---

## Things that differ from Ethereum

| | What happens | What to do |
|---|---|---|
| **Shanghai EVM** | Cancun opcodes (`MCOPY`, `TSTORE`/`TLOAD`, blob ops) don't exist. Code compiled for Cancun deploys fine, then reverts with `invalid opcode`. | Keep `evm_version = "shanghai"` in `foundry.toml` (already set). `make build` runs [`tools/check-shanghai.mjs`](tools/check-shanghai.mjs) to catch it. Don't use OpenZeppelin's `*Transient` contracts. |
| **anvil hides it** | A plain `anvil --fork-url` runs Cancun, so bad bytecode passes local tests. | Always add `--hardfork shanghai` (the Makefile does). |
| **1,000-block log limit** | `eth_getLogs` over more than 1,000 blocks fails. | Use `getLogsChunked` from `@aevum-kit/aevum`. Store your deploy block and start from there. |
| **No WebSocket RPC** | `watchContractEvent` over WS won't connect. | Poll over HTTPS (viem's default for `http()` transports). |
| **Explorer verification** | Not working yet. | See [Deploy](#deploy-to-aevum-testnet). |
| **Legacy transactions** | The kit's scripts and relayer send legacy (type 0) transactions, the same as QDay's own faucet. | `--legacy` in `forge script`, `type: "legacy"` in viem. |

---

## Project layout

```
contracts/            Foundry project
  src/Invoice.sol       the invoice contract
  src/mocks/MockUSD8.sol  local tUSD8 stand-in (anyone can mint)
  test/                 unit tests + test/fork (real tUSD8 on a fork)
  script/Deploy.s.sol   deploys to anvil, a fork or Aevum
packages/aevum/       chain config, ABIs, EIP-3009 typed data, getLogsChunked
web/                  Next.js app (wagmi + RainbowKit)
  src/app/page.tsx        Invoice dashboard (Open / Paid / Overdue)
  src/app/invoices/new    create an invoice
  src/app/invoices/[id]   invoice detail + standard and gasless payment
  src/app/receipts/       receipt read from the chain
  src/app/activity/       InvoiceCreated + InvoicePaid events, read in 1,000-block chunks
  src/app/setup/          setup check (wallet, network, balances, contract)
  src/app/api/relay/      gasless relayer (server-side)
  src/app/globals.css     every color and font; edit to rebrand
examples/             runnable TypeScript scripts
tools/check-shanghai.mjs  fails the build on Cancun-only opcodes
LICENSE, NOTICE.md     MIT license and third-party licenses
```

---

## Commands

```
make install        Fetch Solidity libs and JS packages
make build          Compile contracts and check they are Shanghai-safe
make test           Unit tests (local, no network)
make test-fork      Tests against the real tUSD8 on a local fork of Aevum
make check          Build, tests and typecheck (CI also runs pnpm build)
make anvil          Empty local chain (31337) with Aevum's EVM rules
make fork           Local copy of Aevum testnet on 127.0.0.1:8555 (chain 440050)
make deploy-local   Deploy MockUSD8 + Invoice to `make anvil`
make deploy-fork    Deploy Invoice (real tUSD8) to `make fork`
make deploy-aevum   Deploy Invoice to Aevum testnet (ACCOUNT=<keystore>)
make mint           `make anvil` only: mint MockUSD8 (TO=, CHECKOUT=, AMOUNT=)
make deal           `make fork` only: give TO tUSD8 and tQDAY
make dev            Start the web app on http://localhost:3000
```

Examples (copy `examples/.env.example` to `examples/.env` first):

```bash
pnpm example check-setup      # chain, block, gas price and balances of ADDRESS
pnpm example pay-gasless      # BUYER_KEY signs, RELAYER_KEY submits
pnpm example read-payments    # every Paid event, 1,000 blocks at a time
```

---

## Submitting your project

Make it easy for judges to check your on-chain activity:

- Contract addresses on Aevum testnet (`44005`), with explorer links.
- A link to the exact commit you deployed.
- A few transaction hashes that show your app working (the receipt page and the activity page show them).
- A short demo video or a live URL.

Read the official rules on the DoraHacks challenge page. They win over anything here.

### Licenses and credit

The organizers confirmed that boilerplate, scaffolding and templates are allowed, as long as their license permits the use. This kit is MIT licensed, so you can build on it.

- Put a permissive open-source license on your repo, usually MIT or Apache 2.0.
- If you start from this kit, keep its `LICENSE` file (or its copyright notice) and say so in your README, for example: "Based on Aevum Starter Kit (MIT, PQA Labs)".
- Keep the original copyright and license headers in any file you copy from another project.
- Put a short comment above any code snippet you borrow, naming the source repo, author and license.
- List your third-party dependencies and their licenses in your README or a `NOTICE` file. [NOTICE.md](NOTICE.md) shows one way to do it.
- If you copy a whole directory or library, keep its original `LICENSE` file in that folder.

---

## FAQ

**Do I have to use `Invoice`?** No — but it is the app now, not an example. Keep the parts you need (`packages/aevum`, the chunked log reader, the setup checker) and replace the rest.

**Can I use account abstraction?** It isn't required for this challenge, and there's no officially supported bundler or paymaster. A normal wallet plus tUSD8 payments is enough. To spare users gas, use the gasless payment in this kit (EIP-3009 with a relayer). For budgets, limits, expiry and revoke, write them into your own contract. You can deploy your own ERC-4337 setup if you want to, but the team won't support or debug it.

**Can I use Hardhat?** Yes. Set `evmVersion: "shanghai"` in the Solidity settings, and `hardfork: "shanghai"` for the Hardhat network.

**My transaction fails with `invalid opcode`.** You compiled for Cancun. See [Things that differ from Ethereum](#things-that-differ-from-ethereum).

**`eth_getLogs` errors on a big range.** Split it into 1,000-block chunks with `getLogsChunked`.

**Where do I ask for help?** In the [QDay Discord](https://discord.gg/bYPhjmrSfK)'s Builder Challenge channels (verify first to see them), Monday to Friday, 10:00 to 18:00 HKT.

**`pnpm audit` reports high advisories in `zod` and `decode-uri-component`.** Both come in through WalletConnect (`@reown/appkit-wallet` pins `zod` 3.22.4; `@walletconnect/utils` 2.21 uses `query-string`). They run only in the browser, are only reached when you set `NEXT_PUBLIC_WC_PROJECT_ID`, and at worst slow down the user's own tab. The relay route doesn't load them. The fix is upstream: RainbowKit moving to wagmi 3 brings WalletConnect 2.26, which drops `query-string`. Forcing newer versions with `pnpm.overrides` swaps in major versions WalletConnect wasn't tested with, so the kit doesn't.

---

MIT licensed, © 2026 PQA Labs. See [LICENSE](LICENSE). Third-party licenses are listed in [NOTICE.md](NOTICE.md).

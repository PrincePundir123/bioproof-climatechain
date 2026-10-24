# Optional Gemini and Sepolia setup

## Current local status

- Supabase is configured, including migration 003.
- PublicNode Sepolia RPC was checked against chain 11155111.
- A dedicated testnet signer was generated in ignored .env.local.
- Public signer address: 0x722aEA4101DFFF8b26711F3F2Ca36d4472681371
- Remaining: Gemini API key, Sepolia test ETH and registry deployment.
- No contract has been deployed and no AI provider call has been made.

## Gemini extraction

1. Open https://aistudio.google.com/apikey and create an API key for your project.
2. Open .env.local locally and set GEMINI_API_KEY to that key. Do not post it in chat.
3. Keep GEMINI_MODEL=gemini-2.5-flash initially; the check verifies access to that model.
4. Run npm run check:optional. The Gemini check reads model metadata without generating content.
5. Restart Next.js after changing environment variables (rebuild before npm start).
6. Sign in as the account that uploaded an evidence document, open it and select Request AI extraction.
7. Inspect every proposed field against the original and select Confirm reviewed fields.

Extraction is optional, quota-limited and never approves a batch or changes custody measurements automatically.
The account must have access to the model and sufficient provider quota.

## Sepolia anchoring

1. Request Ethereum Sepolia test ETH for the public signer address above.
   Find faucets at https://ethereum.org/developers/docs/networks/#sepolia .
2. Run npm run check:optional to confirm the balance.
3. Run npm run deploy:contract once. The script rejects other networks, checks estimated gas funding,
   and saves EVIDENCE_REGISTRY_ADDRESS and REGISTRY_DEPLOYMENT_TX to .env.local.
4. If confirmation times out, inspect the saved transaction rather than redeploying.
5. Restart/rebuild the app and run npm run check:optional again.
6. Sign in as the auditor, open an approved real record and select Request / check anchor.
7. Check again after mining. Public verification separately checks the transaction and matching proof.

The runtime also checks that the deployed registry authority matches the configured signing wallet.
The synthetic demo never broadcasts anchors.

## Commands

- npm run setup:optional: fill missing local settings and create a testnet signer only if absent.
- npm run check:optional: check Gemini model access, Sepolia chain, funds, contract and authority.
- npm run deploy:contract: deploy the registry using the configured signer.

The readiness command exits with code 1 while anything remains pending.
It prints public addresses and status only, never keys or authenticated RPC URLs.
All private credentials remain server-side; .env.local is ignored by Git.

## Official references

- Gemini key creation: https://ai.google.dev/gemini-api/docs/api-key
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Ethereum networks and Sepolia faucets: https://ethereum.org/developers/docs/networks/

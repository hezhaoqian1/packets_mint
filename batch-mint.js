import { config as loadEnv } from "dotenv";
import { ethers } from "ethers";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

loadEnv();

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NET_PACKETS_CONTRACT = "0x4daBb4f0BCEc4Ece9fE4a8F5d709DA9CDc78bAE1";

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

const NET_PACKETS_ABI = [
  "function mint() external"
];

const argv = yargs(hideBin(process.argv))
  .option("count", {
    alias: "c",
    type: "number",
    default: 1,
    describe: "Number of mint transactions to submit"
  })
  .option("usdc-per-mint", {
    alias: "p",
    type: "string",
    default: "1",
    describe: "USDC cost per mint in whole tokens (default 1 USDC)"
  })
  .option("skip-approval", {
    type: "boolean",
    default: false,
    describe: "Skip the approval step even if allowance is insufficient"
  })
  .option("approval-amount", {
    type: "string",
    default: "unlimited",
    describe: "Override approval amount in USDC (use 'unlimited' for MaxUint256)"
  })
  .option("delay-ms", {
    alias: "d",
    type: "number",
    default: 0,
    describe: "Delay in milliseconds between mint submissions"
  })
  .option("gas-limit", {
    type: "number",
    describe: "Optional gas limit override per mint transaction"
  })
  .option("approve-only", {
    type: "boolean",
    default: false,
    describe: "Only run the approval step and skip minting"
  })
  .strict()
  .help()
  .parse();

async function main() {
  const rpcUrl = process.env.BASE_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl) {
    throw new Error("Missing BASE_RPC_URL in environment.");
  }

  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY in environment.");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = await wallet.getAddress();

  console.log(`Using wallet ${address}`);
  const network = await provider.getNetwork();
  console.log(`Connected to chain ${network.chainId} (${network.name})`);

  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
  const netPackets = new ethers.Contract(NET_PACKETS_CONTRACT, NET_PACKETS_ABI, wallet);

  const usdcDecimals = await usdc.decimals();
  const usdcPerMint = ethers.parseUnits(argv["usdc-per-mint"], usdcDecimals);
  const totalRequired = usdcPerMint * BigInt(argv.count);

  const currentAllowance = await usdc.allowance(address, NET_PACKETS_CONTRACT);
  console.log(`Current USDC allowance: ${ethers.formatUnits(currentAllowance, usdcDecimals)} USDC`);

  const needsApproval = currentAllowance < totalRequired;

  if (needsApproval && argv["skip-approval"]) {
    console.warn("Warning: Allowance is below the required amount but --skip-approval was provided.");
  }

  if (!argv["skip-approval"] && (needsApproval || argv["approval-amount"] !== "unlimited")) {
    const approvalAmount = argv["approval-amount"].toLowerCase() === "unlimited"
      ? ethers.MaxUint256
      : ethers.parseUnits(argv["approval-amount"], usdcDecimals);

    console.log(`Sending approval for ${approvalAmount === ethers.MaxUint256 ? "MaxUint256" : ethers.formatUnits(approvalAmount, usdcDecimals) + " USDC"}`);
    const approveTx = await usdc.approve(NET_PACKETS_CONTRACT, approvalAmount);
    console.log(`Approval tx hash: ${approveTx.hash}`);
    const approveReceipt = await approveTx.wait();
    console.log(`Approval confirmed in block ${approveReceipt.blockNumber}`);
  } else {
    console.log("Approval step skipped.");
  }

  if (argv["approve-only"]) {
    console.log("approve-only flag set, skipping mint calls.");
    return;
  }

  for (let i = 0; i < argv.count; i += 1) {
    console.log(`Submitting mint ${i + 1} of ${argv.count}`);
    const overrides = {};
    if (argv["gas-limit"]) {
      overrides.gasLimit = ethers.toBigInt(argv["gas-limit"]);
    }

    const mintTx = await netPackets.mint(overrides);
    console.log(`Mint tx hash: ${mintTx.hash}`);
    const mintReceipt = await mintTx.wait();
    console.log(`Mint ${i + 1} confirmed in block ${mintReceipt.blockNumber}`);

    if (argv["delay-ms"] > 0 && i < argv.count - 1) {
      await new Promise((resolve) => setTimeout(resolve, argv["delay-ms"]));
    }
  }

  console.log("All mint transactions submitted and confirmed.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, clusterApiUrl, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import {
    getAllWallets,
    saveTransaction,
    topBalance,
    minusBalance,
    getBalance
} from '../db/wallets';
import { decryptPrivateKey } from '../utils/bcrypt';
import { convert } from '../utils/exchange';
import 'dotenv/config';

const MAIN_POOL_ADDRESS = process.env.SOL_MAIN_POOL_ADDRESS;
const SOL_MAIN_POOL_PK = process.env.SOL_MAIN_POOL_PK;

let wallets = [];

setInterval(async () => {
    wallets = await getAllWallets("Solana");
}, 10000);


export type ConsolidationResult = {
    secretBase58: string;
    publicKey: string;
    balanceLamports: number;
    transferredLamports: number;
    txSignature?: string;
    error?: string;
};

export async function consolidateAccountsToPool(
    opts?: {
        network?: "testnet" | "devnet" | "mainnet-beta";
        confirmOptions?: { commitment?: any; preflightCommitment?: any };
    }
): Promise<ConsolidationResult[]> {
    const network = opts?.network ?? "testnet";
    const confirmOptions = opts?.confirmOptions ?? { commitment: "confirmed", preflightCommitment: "confirmed" };

    const rpcUrl = clusterApiUrl(network);
    const connection = new Connection(rpcUrl, confirmOptions.commitment);
    const rentExempt = await connection.getMinimumBalanceForRentExemption(0);

    const poolPubkey = new PublicKey(MAIN_POOL_ADDRESS);

    const results: ConsolidationResult[] = [];

    for (const wallet of wallets) {


        try {

            const secretBuf = bs58.decode(decryptPrivateKey(wallet.privateKey));
            if (secretBuf.length !== 64) {
                throw new Error(`Invalid secret length ${secretBuf.length}. Expected 64-byte secret (full keypair).`);
            }

            const kp = Keypair.fromSecretKey(Uint8Array.from(secretBuf));

            const balance = await connection.getBalance(kp.publicKey, confirmOptions.commitment);

            const feeLamports = 5000;
            if (balance <= rentExempt + feeLamports) {
                continue;
            }
            const amountToSend = balance - (rentExempt + feeLamports);

            const tx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: kp.publicKey,
                    toPubkey: poolPubkey,
                    lamports: amountToSend,
                })
            );

            const signature = await sendAndConfirmTransaction(connection, tx, [kp], confirmOptions);
            const sol = balance / 1_000_000_000;
            const amountUSD = await convert(sol, "SOL", "USDT");
            await topBalance(wallet.userId, amountUSD, "USD");
            await saveTransaction(wallet.userId, wallet.publicKey, sol, "SOL", signature, "deposit");

        } catch (err: any) {
            console.log(err);
        }

    }

    return results;
}

export const startWatchSolana = async () => {
    setInterval(async () => {
        await consolidateAccountsToPool({
            network: "devnet",
        });
    }, 60000);
}
import { Wallet as EthWallet } from 'ethers';
import { encryptPrivateKey, decryptPrivateKey } from "../utils/bcrypt";
import axios from 'axios';
import 'dotenv/config';
import prisma from "./prisma";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
// Avoid importing blockchain modules at startup; require when needed
import { convert } from '../utils/exchange';


export const createWallet = async (userId: number) => {

    let tronAddress: string | null = null;
    let tronEncryptedPK: string | null = null;
    if (process.env.TRON_FULLNODE && /^https?:\/\//.test(process.env.TRON_FULLNODE)) {
        const tr = require('tronweb');
        const tronWeb = new tr.TronWeb({ fullHost: process.env.TRON_FULLNODE });
        const tronAccount = await tronWeb.createAccount();
        tronAddress = tronAccount.address.base58;
        tronEncryptedPK = encryptPrivateKey(tronAccount.privateKey);
    }

    const ethWallet = EthWallet.createRandom();
    const bnbWallet = EthWallet.createRandom();

    const keypair = Keypair.generate();

    await prisma.wallet.createMany({
        data: [
            {
                userId: userId,
                blockchain: 'Solana',
                network: 'mainnet',
                publicKey: keypair.publicKey.toBase58(),
                privateKey: encryptPrivateKey(bs58.encode(Buffer.from(keypair.secretKey))),
            },
            ...(tronAddress && tronEncryptedPK ? [{
                userId: userId,
                blockchain: 'Tron',
                network: 'mainnet',
                publicKey: tronAddress,
                privateKey: tronEncryptedPK,
            }] : []),
            {
                userId: userId,
                blockchain: 'Ethereum',
                network: 'mainnet',
                publicKey: ethWallet.address,
                privateKey: encryptPrivateKey(ethWallet.privateKey),
            },
            {
                userId: userId,
                blockchain: 'BNB',
                network: 'mainnet',
                publicKey: bnbWallet.address,
                privateKey: encryptPrivateKey(bnbWallet.privateKey),
            }
        ]
    });

    const supportedAssets = [
        {
            asset: "USD"
        }
        // ,
        // {
        //     asset: "USDT"
        // },
        // {
        //     asset: "ETH"
        // }
    ];
    await prisma.balance.createMany({
        data: supportedAssets.map(asset => ({
            userId: userId,
            currency: asset.asset,
            amount: 0
        }) as any),
    });

}

export const getWalletInfo = async (userId: number) => {

    const balances = await prisma.balance.findMany({
        where: { userId: userId }
    });

    const addresses = await prisma.wallet.findMany({
        where: { userId: userId },
        select: {
            blockchain: true,
            publicKey: true
        }
    });

    return { balances, addresses }

}

export const getBalance = async (userId: number, currency: string) => {

    const balance = await prisma.balance.findFirst({
        where: { userId, currency }
    });

    return balance;

}

export const getAllWallets = async (blockchain: string) => {

    const wallets = await prisma.wallet.findMany({ where: { blockchain: blockchain } });
    return wallets;
}

export const getPkTron = async (address: string) => {

    const wallet = await prisma.wallet.findFirst({
        where: { publicKey: address, blockchain: "Tron" }
    });

    return decryptPrivateKey(wallet.privateKey);

}

export const saveTransaction = async (userId: number, address: string, amount: number, currency: string, txId: string, type: string) => {

    await prisma.transaction.create({
        data: {
            userId: userId,
            address: address,
            currency: currency,
            amount: amount,
            txId,
            type
        },
    });

}

export const getTransactions = async (userId: null, currency: string) => {

    const transactions = await prisma.transaction.findMany({
        where: { userId: userId, currency: currency }
    });

    return transactions;

}

export const topBalance = async (userId: number, amount: number, currency: string) => {

    await prisma.balance.upsert({
        where: { userId_currency: { userId: userId, currency: currency } },
        update: { amount: { increment: amount } },
        create: { userId: userId, currency: currency, amount: amount },
    });

}

export const minusBalance = async (userId: number, amount: number, currency: string) => {

    await prisma.balance.updateMany({
        where: { userId: userId, currency: currency },
        data: {
            amount: { decrement: amount }
        }
    });

}

export const getWallet = async (userId: number, blockchain: string) => {

    const wallet = await prisma.wallet.findFirst({
        where: { userId, blockchain }
    });

    return wallet;
}

export const exchangeBalance = async (userId: number, fromCurrency: string, toCurrency: string, amount: number) => {

    if (fromCurrency === toCurrency) {
        throw new Error("Cannot exchange same currency");
    }

    const convertedAmount = await convert(amount, fromCurrency, toCurrency);

    const fromBalance = await prisma.balance.findUnique({
        where: { userId_currency: { userId, currency: fromCurrency } },
    });

    if (!fromBalance || fromBalance.amount.toNumber() < amount) {
        throw new Error('Insufficient balance');
    }

    await prisma.balance.update({
        where: { userId_currency: { userId, currency: fromCurrency } },
        data: { amount: { decrement: amount } },
    });

    await prisma.balance.update({
        where: { userId_currency: { userId, currency: toCurrency } },
        data: { amount: { increment: convertedAmount } },
    });

    await prisma.transaction.createMany({
        data: [
            {
                userId: userId,
                address: '-',
                currency: fromCurrency,
                amount: -amount,
                txId: "",
                type: "swap"
            },
            {
                userId: userId,
                address: '-',
                currency: toCurrency,
                amount: convertedAmount,
                txId: "",
                type: "swap"
            }
        ]
    });

}

export async function getUserBets(userId: number, limit = 10, offset = 0) {
    return prisma.bet.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
    });
}

export async function withdrawRequest(userId: number, to: string, currency: string, blockchain: string, amountUsd: number) {

    const fromBalance = await prisma.balance.findUnique({
        where: { userId_currency: { userId, currency: "USD" } },
    });

    if (!fromBalance || fromBalance.amount.toNumber() < amountUsd) {
        throw new Error('Insufficient balance');
    }

    if (amountUsd > 200) {
   
        await prisma.withdrawRequest.create({
            data: {
                userId,
                currency,
                blockchain,
                to,
                amount: amountUsd,
                status: "pending"
            }
        });

        await minusBalance(userId, amountUsd, "USD");
        
    } else {

        let amount = currency != "USDT" ? await convert(amountUsd, "USDT", currency) : amountUsd;
        
        if (blockchain == "Tron") {
            const { withdrawTrx, withdrawTokenTron } = require("../blockchain/tron");
            if (currency == "TRX") {
                await withdrawTrx(userId, to, amount);
            } else if (currency == "USDT") {
                await withdrawTokenTron(userId, to, amount);
            }
        } else if (blockchain == "Ethereum") {
            const { withdrawERC20, withdrawEth } = require("../blockchain/ether");
            if (currency == "ETH") {
                await withdrawEth(userId, to, amount);
            } else if (currency == "USDT") {
                await withdrawERC20(userId, to, amount);
            }
        }

        await minusBalance(userId, amountUsd, "USD");

    }

}

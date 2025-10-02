import express from 'express';
import {
    getWalletInfo,
    getTransactions,
    exchangeBalance,
    getUserBets,
    withdrawRequest
} from '../db/wallets';
import { convertReferralBonusToPayout } from '../db/bonus';
import isAuthenticated from '../utils/jwt';
import { BetBigSmall } from '../games/bigSmall';
import { BetLucky } from '../games/lucky';
import { BetNuiNui } from '../games/niuniu';
import { BetBankerPlayer } from "../games/bankerPlayer";
import { BetOddEven } from '../games/oddEven';

const router = express.Router();

router.get<{}, {}>('/info', isAuthenticated, async (req, res) => {

    let id = req['token'].id;

    try {
        const wallet = await getWalletInfo(id);
        res.json({
            code: 200,
            message: 'Ok',
            data: wallet
        });
    } catch (err) {
        res.status(400).json({ message: err.toString(), code: 400 });
    }

});

router.get<{}, {}>('/transactions', isAuthenticated, async (req, res) => {

    const id = req['token'].id;
    const currency = req.query.currency;

    if (!currency) {
        res.status(400).send({
            message: 'currency parametr required',
            code: 400
        });
        return;
    }

    try {
        const wallet = await getTransactions(id, currency.toString());
        res.json({
            code: 200,
            message: 'Ok',
            data: wallet
        });
    } catch (err) {
        res.status(400).json({ message: err.toString(), code: 400 });
    }

});

router.get<{}, {}>('/bets', isAuthenticated, async (req, res) => {

    const id = req['token'].id;
    
    try {
        const bets = await getUserBets(id);
        res.json({
            code: 200,
            message: 'Ok',
            data: bets
        });
    } catch (err) {
        res.status(400).json({ message: err.toString(), code: 400 });
    }

});

router.post<{}, {}>('/withdraw', isAuthenticated, async (req, res) => {

    const body = req.body;

    const id = req['token'].id;

    if (!body.blockchain) {
        res.status(400).send({
            message: 'blockchain parametr required',
            code: 400
        });
        return;
    }

    if (!body.currency) {
        res.status(400).send({
            message: 'currency parametr required',
            code: 400
        });
        return;
    }
    if (!body.to) {
        res.status(400).send({
            message: 'to parametr required',
            code: 400
        });
        return;
    }
    if (!body.amountUsd) {
        res.status(400).send({
            message: 'amountUsd parametr required',
            code: 400
        });
        return;
    }

    try {
        await withdrawRequest(id, body.to, body.currency, body.blockchain, body.amountUsd);
        res.json({
            code: 200,
            message: "Ok"
        });
    } catch (err) {
        res.status(400).json({ message: err.toString(), code: 400 });
    }

});

router.post<{}, {}>('/exchange', isAuthenticated, async (req, res) => {

    const body = req.body;

    const id = req['token'].id;

    if (!body.fromCurrency) {
        res.status(400).send({
            message: 'fromCurrency parametr required',
            code: 400
        });
        return;
    }
    if (!body.toCurrency) {
        res.status(400).send({
            message: 'toCurrency parametr required',
            code: 400
        });
        return;
    }
    if (!body.amount) {
        res.status(400).send({
            message: 'amount parametr required',
            code: 400
        });
        return;
    }

    try {

        await exchangeBalance(id, body.fromCurrency, body.toCurrency, body.amount);

        res.json({
            code: 200,
            message: 'Ok'
        });
    } catch (err) {
        res.status(400).json({ message: err.toString(), code: 400 });
    }

});

router.post<{}, {}>('/bet', isAuthenticated, async (req, res) => {

    const body = req.body;

    const id = req['token'].id;

    if (!body.game) {
        res.status(400).send({
            message: 'game parametr required',
            code: 400
        });
        return;
    }
    if (!body.currency) {
        res.status(400).send({
            message: 'currency parametr required',
            code: 400
        });
        return;
    }
    if (!body.amount) {
        res.status(400).send({
            message: 'amount parametr required',
            code: 400
        });
        return;
    }

    try {

        if (body.game == 1) {
            await BetBigSmall(body.amount, body.currency, id);
        }
        else if(body.game == 2){
            await BetLucky(id, body.amount, body.currency);
        }else if(body.game == 3){
            await BetNuiNui(id, body.amount, body.currency);
        }else if(body.game == 4){
            await BetBankerPlayer(id, body.amount, body.currency);
        }else if(body.game == 5){
            await BetOddEven(body.amount, body.currency, id);
        }

        res.json({
            code: 200,
            message: 'Ok'
        });

    } catch (err) {
        res.status(400).json({ message: err.toString(), code: 400 });
    }

});

router.post("/claim-reward", async (req, res) => {

    const { userId, amount, currency } = req.body;

    if (!userId || !amount) return res.status(400).json({ error: "Missing parameters" });

    const payout = await convertReferralBonusToPayout(userId, amount, currency || "USD");

    if (!payout) return res.status(400).json({ error: "Not enough bonus or error" });

    res.json({
        code: 200,
        message: 'Ok',
        data: { payout }
    });

});

export default router;

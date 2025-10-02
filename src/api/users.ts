import express from 'express';
import {
    register,
    login,
    getProfile,
    setTelegram,
    setWithdrawPassword,
    setAvatar,
    createEmailVerificationCode,
    verifyEmailCode,
    changePassword,
    setName,
    setPhone,
    getUserTeamByReferralCode
} from '../db/users';
import isAuthenticated from '../utils/jwt';
import fs from "fs";
import path from "path";
import { sendEmail } from "../utils/email";
import passport from "../auth/passport";
import 'dotenv/config';
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post<{}, {}>('/signup', async (req, res) => {

    const body = req.body;

    if (!body.email) {
        res.status(400).send({
            message: 'email parametr required',
            code: 400
        });
        return;
    }
    if (!body.password) {
        res.status(400).send({
            message: 'password parametr required',
            code: 400
        });
        return;
    }

    try {
        await register(body.email, body.password, body.referralCode);
        res.json({
            code: 200,
            message: 'Ok',
        });
    } catch (err) {
        res.status(400).json({ message: err.toString(), code: 400 });
    }

});

router.post<{}, {}>('/signin', async (req, res) => {

    const body = req.body;

    if (!body.email) {
        res.status(400).send({
            message: 'email parametr required',
            code: 400
        });
        return;
    }
    if (!body.password) {
        res.status(400).send({
            message: 'password parametr required',
            code: 400
        });
        return;
    }

    try {
        const token = await login(body.email, body.password);

        res.json({ code: 200, data: { token } });
    } catch (err) {
        res.status(400).json({ message: err.toString() });
    }

});

router.get<{}, {}>('/profile', isAuthenticated, async (req, res) => {

    let id = req['token'].id;

    try {

        const profile = await getProfile(id);
        res.json({
            code: 200,
            message: "Ok",
            data: profile
        });

    } catch (err) {
        res.status(400).json({ code: 400, message: err.toString() });
    }

});

router.get<{}, {}>('/referal-info', isAuthenticated, async (req, res) => {

    let id = req['token'].id;

    try {

        const info = await getUserTeamByReferralCode(id);
        res.json({
            code: 200,
            message: "Ok",
            data: info
        });

    } catch (err) {
        res.status(400).json({ code: 400, message: err.toString() });
    }

});

router.post<{}, {}>('/set-telegram', isAuthenticated, async (req, res) => {

    let id = req['token'].id;

    const body = req.body;

    if (!body.telegram) {
        res.status(400).send({
            code: 400,
            message: 'telegram parametr required',
        });
        return;
    }
    try {
        await setTelegram(id, body.telegram);

        res.json({ message: "Ok", code: 200 });

    } catch (err) {
        res.status(400).json({ message: err.toString() });
    }

});

router.post<{}, {}>('/set-withdrawal-password', isAuthenticated, async (req, res) => {

    let id = req['token'].id;

    const body = req.body;

    if (!body.password) {
        res.status(400).send({
            code: 400,
            message: 'password parametr required',
        });
        return;
    }
    try {
        await setWithdrawPassword(id, body.password);

        res.json({ message: "Ok", code: 200 });
    } catch (err) {
        res.status(400).json({ message: err.toString() });
    }

});

router.post<{}, {}>('/set-avatar', isAuthenticated, async (req, res) => {

    let id = req['token'].id;

    const { imageBase64 } = req.body;

    if (!imageBase64) {
        return res.status(400).json({ code: 400, error: "No image data provided" });
    }

    const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid base64 format" });
    }

    try {

        const ext = matches[1].split("/")[1];
        const buffer = Buffer.from(matches[2], "base64");

        const fileName = `img_${Date.now()}.${ext}`;
        const uploadDir = path.join(process.cwd(), "uploads");

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        const filePath = path.join("uploads", fileName);
        fs.writeFileSync(filePath, buffer);

        await setAvatar(id, filePath);

        res.json({ message: "Ok", code: 200 });
    } catch (err) {
        res.status(400).json({ message: err.toString() });
    }

});

router.post<{}, {}>('/verify-email', isAuthenticated, async (req, res) => {

    let id = req['token'].id;

    try {

        const data = await createEmailVerificationCode(id);

        await sendEmail(data.email, "Email verification code", data.code);

        res.json({ message: "Ok", code: 200 });
    } catch (err) {
        res.status(400).json({ message: err.toString() });
    }

});

router.post<{}, {}>('/confirm-email-code', isAuthenticated, async (req, res) => {

    let id = req['token'].id;

    const body = req.body;

    if (!body.code) {
        res.status(400).send({
            code: 400,
            message: 'code parametr required',
        });
        return;
    }

    try {
        await verifyEmailCode(id, body.code);

        res.json({ message: "Ok", code: 200 });

    } catch (err) {
        res.status(400).json({ message: err.toString(), code: 400 });
    }

});


router.post<{}, {}>('/change-password', isAuthenticated, async (req, res) => {

    let id = req['token'].id;

    const body = req.body;

    if (!body.password) {
        res.status(400).send({
            code: 400,
            message: 'password parametr required',
        });
        return;
    }

    if (!body.newPassword) {
        res.status(400).send({
            code: 400,
            message: 'newPassword parametr required',
        });
        return;
    }


    try {
        await changePassword(id, body.password, body.newPassword);

        res.json({ message: "Ok", code: 200 });

    } catch (err) {
        res.status(400).json({ message: err.toString(), code: 400 });
    }

});


router.post<{}, {}>('/set-name', isAuthenticated, async (req, res) => {

    let id = req['token'].id;

    const body = req.body;

    if (!body.name) {
        res.status(400).send({
            code: 400,
            message: 'name parametr required',
        });
        return;
    }
    try {
        await setName(id, body.name);

        res.json({ message: "Ok", code: 200 });
    } catch (err) {
        res.status(400).json({ message: err.toString() });
    }

});

router.post<{}, {}>('/set-phone', isAuthenticated, async (req, res) => {

    let id = req['token'].id;

    const body = req.body;

    if (!body.phone) {
        res.status(400).send({
            code: 400,
            message: 'phone parametr required',
        });
        return;
    }
    try {
        await setPhone(id, body.phone);

        res.json({ message: "Ok", code: 200 });
    } catch (err) {
        res.status(400).json({ code: 400, message: err.toString() });
    }

});

router.get("/auth/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/" }), (req, res) => {

    const user = req.user as any;
    const token = jwt.sign(
        {
            id: user.id,
            provider: user.provider,
            displayName: user.displayName,
            emails: user.emails,
        },
        process.env.JWTPRIVATEKEY as string,
        { expiresIn: "1h" }
    );

    res.json({ code: 200, data: { token } });

}
);


export default router;

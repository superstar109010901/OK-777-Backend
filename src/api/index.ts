import express from 'express';
import MessageResponse from '../interfaces/MessageResponse';
import users from './users';
import wallets from './wallets';
import admin from './admin';
import seamless from './seamless';
import operators from './operators';
import games from './games';

const router = express.Router();

router.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏',
  });
});

router.use('/users', users);
router.use('/wallets', wallets);
router.use('/admin', admin);
// router.use('/seamless', seamless);
router.use('/operators', operators);
router.use('/games', games);

export default router;

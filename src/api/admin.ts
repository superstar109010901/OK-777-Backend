import express from 'express';
import {
  login,
  changePassword,
  getPlatformStats,
  getUserBasicInfo,
  getUserAddresses,
  getUserGameRecords,
  getUserTransactions,
  suspendUser,
  updateUserInfo,
  getUsersWithBalances,
  topUpUserBalance,
  getLogs,
  readAllConfigs,
  updateConfigById,
  getGameSettings,
  updateGameSettings,
  getTransactions,
  getAllProducts, 
  toggleProductStatus,
  getPayouts,
  processPayout,
  getAllCategories,
  getGames,
  toggleGameEnabled,
  updateGameCategory,
  getWithdrawals,
  processWithdraw,
  createCategory,
  updateCategory,
  deleteCategory,
  updateGame,
  updateProduct, 
  deleteProduct,
  createProduct,
  addGame
} from '../db/admin';
import { isAdmin } from '../utils/jwt';
import fs from "fs"
import path from "path"

const router = express.Router();

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
    const data = await login(body.email, body.password);

    res.json({ code: 200, data: data });
  } catch (err) {
    res.status(400).json({ message: err.toString() });
  }

});

router.post<{}, {}>('/change-password', isAdmin, async (req, res) => {

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

router.get<{}, {}>('/stats', isAdmin, async (req, res) => {


  try {
    const stats = await getPlatformStats();

    res.json({ code: 200, data: stats });
  } catch (err) {
    res.status(400).json({ message: err.toString() });
  }

});

router.get<{}, {}>('/transactions', isAdmin, async (req, res) => {

  try {

    const { page = 1, limit = 50, search = null, type, currency } = req.query;
    const stats = await getTransactions(Number(limit), Number(page), search ? String(search) : null,  type ? String(type) : null,  currency ? String(currency) : null );

    res.json({ code: 200, data: stats });
  } catch (err) {
    res.status(400).json({ message: err.toString() });
  }

});

/* ================== USER MANAGEMENT ================== */

// Basic info
router.get('/users/:id', isAdmin, async (req, res) => {
  try {
    const user = await getUserBasicInfo(Number(req.params.id));
    res.json({ code: 200, data: user });
  } catch (err) {
    res.status(400).json({ message: err.toString(), code: 400 });
  }
});

// Addresses
router.get('/users/:id/addresses', isAdmin, async (req, res) => {
  try {
    const addresses = await getUserAddresses(Number(req.params.id));
    res.json({ code: 200, data: addresses });
  } catch (err) {
    res.status(400).json({ message: err.toString(), code: 400 });
  }
});

// Game records
router.get('/users/:id/games', isAdmin, async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  try {
    const games = await getUserGameRecords(Number(req.params.id), Number(limit), Number(page));
    res.json({ code: 200, data: games });
  } catch (err) {
    res.status(400).json({ message: err.toString(), code: 400 });
  }
});

// Deposits
router.get('/users/:id/transactions', isAdmin, async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  try {
    const deposits = await getUserTransactions(Number(req.params.id), Number(limit), Number(page));
    res.json({ code: 200, data: deposits });
  } catch (err) {
    res.status(400).json({ message: err.toString(), code: 400 });
  }
});

// Suspend user
router.post('/users/:id/suspend', isAdmin, async (req, res) => {
  try {
    const result = await suspendUser(Number(req.params.id));
    res.json({ code: 200, data: result });
  } catch (err) {
    res.status(400).json({ message: err.toString(), code: 400 });
  }
});

// Update user info
router.put('/users/:id', isAdmin, async (req, res) => {
  try {
    const result = await updateUserInfo(Number(req.params.id), req.body);
    res.json({ code: 200, data: result });
  } catch (err) {
    res.status(400).json({ message: err.toString(), code: 400 });
  }
});

router.get("/users", isAdmin, async (req, res) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);

    const result = await getUsersWithBalances(page, limit);

    res.json({ code: 200, data: result });
  } catch (err) {
    res.status(400).json({ message: err.toString(), code: 400 });
  }
});

router.post("/users/:id/topup", isAdmin, async (req, res) => {
  try {
    const adminId = req["token"].id; // JWT provides admin id
    const userId = parseInt(req.params.id, 10);
    const { currency, amount, description } = req.body;

    if (!currency || !amount || !description) {
      return res.status(400).json({
        code: 400,
        message: "currency, amount, and description are required",
      });
    }

    const balance = await topUpUserBalance(
      adminId,
      userId,
      currency,
      parseFloat(amount),
      description
    );

    res.json({ code: 200, data: balance });
  } catch (err) {
    res.status(400).json({ code: 400, message: err.toString() });
  }
});

router.get("/logs", isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const adminId = req.query.adminId ? parseInt(req.query.adminId as string) : undefined;

    const result = await getLogs({ page, pageSize, userId, adminId });
    res.json({ code: 200, ...result });
  } catch (err) {
    res.status(400).json({ code: 400, message: err.toString() });
  }
});

router.get("/hash-games-configs", isAdmin, async (req, res) => {
  try {
    const data = await readAllConfigs();
    res.json({ code: 200, data });
  } catch (err) {
    res.status(400).json({ code: 400, message: err.toString() });
  }
});

router.post("/hash-games-configs/update/:id", isAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ code: 400, message: "Invalid id" });

  try {
    const data = await updateConfigById(id, req.body);
    res.json({ code: 200, data });
  } catch (err) {
    console.log(err)
    res.status(400).json({ code: 400, message: err.toString() });
  }
});

// GET /api/game-settings
router.get("/game-settings", isAdmin, async (req, res) => {
  try {
    const data = await getGameSettings();
    res.json({ code: 200, data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch game settings" });
  }
});

// PUT /api/game-settings
router.post("/update-game-settings", isAdmin, async (req, res) => {
  try {
    const updated = await updateGameSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update game settings" });
  }
});

router.get("/products", isAdmin, async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ code: 200, data: products });
  } catch (err) {
    res.status(500).json({ code: 500, message: "Failed to fetch products" });
  }
});

router.post("/products/:code/toggle", isAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const { enabled } = req.body;

    const updated = await toggleProductStatus(Number(code), Boolean(enabled));
    res.json({ code: 200, data: updated });
  } catch (err) {
    res.status(500).json({ code: 500, message: "Failed to update product" });
  }
});

router.put("/products/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const data = req.body;

    if (data.image?.startsWith("data:image")) {
      // extract mime type and base64 data
      const matches = data.image.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!matches) throw new Error("Invalid base64 image")

      const ext = matches[1].split("/")[1] // e.g., png, jpeg
      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, "base64")
      const fileName = `product_${Date.now()}.${ext}`
      const filePath = path.join("uploads", fileName)

      fs.writeFileSync(filePath, buffer)
      data.image = `/uploads/${fileName}`;
    }

    const updated = await updateProduct(id, data)
    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.delete("/products/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const deleted = await deleteProduct(id)
    res.json({ success: true, data: deleted })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post("/products", isAdmin, async (req, res) => {
  try {
    const data = req.body;
    if (data.image?.startsWith("data:image")) {
      // extract mime type and base64 data
      const matches = data.image.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!matches) throw new Error("Invalid base64 image")

      const ext = matches[1].split("/")[1] // e.g., png, jpeg
      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, "base64")
      const fileName = `product_${Date.now()}.${ext}`
      const filePath = path.join("uploads", fileName)

      fs.writeFileSync(filePath, buffer)
      data.image = `/uploads/${fileName}`;
    }
    const created = await createProduct(data)
    res.json({ success: true, data: created })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get("/payouts", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const status = req.query.status as string | undefined;
    const currency = req.query.currency as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await getPayouts({ page, pageSize, status, currency, search });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/payouts/:id/process", isAdmin, async (req, res) => {
  try {
    const payoutId = parseInt(req.params.id);
    const result = await processPayout(payoutId);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

router.get("/games-categories", async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.json({ data: categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/provider-games", async (req, res) => {
  try {
    const { categoryId, providerId, page, limit, enabled, search } = req.query;

    const result = await getGames({
      categoryId: categoryId ? categoryId as string : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      enabled: enabled !== undefined ? enabled === "true" : undefined,
      search: search as string | undefined,
      providerId: providerId ? providerId as string : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/provider-games/:id/update", async (req, res) => {
  try {

    const id = parseInt(req.params.id, 10)
    let data = req.body

    if (data.imageUrl?.startsWith("data:image")) {
      // extract mime type and base64 data
      const matches = data.imageUrl.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!matches) throw new Error("Invalid base64 image")

      const ext = matches[1].split("/")[1] // e.g., png, jpeg
      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, "base64")
      const fileName = `game_${Date.now()}.${ext}`
      const filePath = path.join("uploads", fileName)

      fs.writeFileSync(filePath, buffer)
      data.imageUrl = `/uploads/${fileName}`;
    }


    const game = await updateGame(id, data);

    res.json({ success: true, data: game })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
})


router.post("/provider-games/:id/toggle", async (req, res) => {
  try {
    const gameId = parseInt(req.params.id, 10);
    if (isNaN(gameId)) return res.status(400).json({ error: "Invalid game ID" });

    const updatedGame = await toggleGameEnabled(gameId);
    res.json({ message: "Game toggled successfully", game: updatedGame });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.post("/provider-games/:id/category", async (req, res) => {
  try {
    const gameId = parseInt(req.params.id, 10);
    const { category } = req.body;

    if (isNaN(gameId)) return res.status(400).json({ error: "Invalid game ID" });
    if (typeof category !== "number") return res.status(400).json({ error: "Invalid category" });

    const updatedGame = await updateGameCategory(gameId, category);
    res.json({ message: "Category updated successfully", game: updatedGame });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.get("/withdrawals", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const status = req.query.status as string | undefined;
    const currency = req.query.currency as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await getWithdrawals({ page, pageSize, status, currency, search });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/withdrawals/:id/process", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await processWithdraw(id);
    res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

router.get("/game-categories", async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
});

router.post("/game-categories/add", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name required" });

    const category = await createCategory(name);
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create category" });
  }
});

// PUT update category
router.put("/game-categories/:id/update", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;

    const category = await updateCategory(id, name);
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update category" });
  }
});

// DELETE category
router.delete("/game-categories/:id/delete", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await deleteCategory(id);
    res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete category" });
  }
});

router.post("/games/add", isAdmin, async (req, res) => {
  try {
    const {
      gameCode,
      gameName,
      gameType,
      imageUrl,
      productId,
      productCode,
      supportCurrency,
      status,
      allowFreeRound,
      langName,
      langIcon,
    } = req.body

    if (!gameCode || !gameName || !productId || !productCode) {
      return res.status(400).json({ success: false, error: "Missing required fields" })
    }

    const game = await addGame({
      gameCode,
      gameName,
      gameType,
      imageUrl,
      productId,
      productCode,
      supportCurrency,
      status,
      allowFreeRound,
      langName,
      langIcon,
    })

    res.json({ success: true, data: game })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
});

export default router;

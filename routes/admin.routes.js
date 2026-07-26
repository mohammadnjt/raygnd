// const express = require('express');
// const router = express.Router();
// const userController = require('../controllers/user.controller');
// const productController = require('../controllers/product.controller');
// const videoController = require('../controllers/video.controller');
// const walletController = require('../controllers/wallet.controller');
// const orderController = require('../controllers/order.controller');
// const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// // دریافت لیست کاربران (فقط برای ادمین)
// router.get('/users', authenticate, requireAdmin, userController.getUsers);
// router.post('/users', authenticate, requireAdmin, userController.createUser);
// router.put('/users/:id', authenticate, requireAdmin, userController.updateUser);
// router.put('/users/:id/status', authenticate, requireAdmin, userController.updateUserStatus);
// router.delete('/users/:id', authenticate, requireAdmin, userController.deleteUser);

// // ارتقا سطح
// router.get('/users/levelups', authenticate, requireAdmin, userController.getPendingLevelUps);
// router.post('/users/review-levelup/:requestId', authenticate, requireAdmin, userController.reviewLevelUp);


// // محصولات
// router.post('/products', authenticate, requireAdmin, productController.createProduct);
// router.put('/products/:id', authenticate, requireAdmin, productController.updateProduct);
// router.delete('/products/:id', authenticate, requireAdmin, productController.deleteProduct);
// router.delete('/review/:reviewId', authenticate, requireAdmin, productController.deleteReview);

// // مدیریت ویدیو 
// router.get('/videos', videoController.getVideos);
// router.post('/videos', videoController.addVideo);
// router.delete('/videos/:id', videoController.deleteVideo);
// router.put('/videos/:id', videoController.updateVideo);


// // سفارشات



// router.get('/users/:id/wallets', authenticate, requireAdmin, walletController.getUserWallets);
// router.patch('/users/:id/wallets/:currency', authenticate, requireAdmin, walletController.updateWalletBalance);
// router.post('/users/:id/wallets/transfer', authenticate, requireAdmin, walletController.transferBetweenWallets);


// module.exports = router;
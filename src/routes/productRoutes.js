const express = require('express');
const {
  createProductController,
  listProductsController,
  getProductController,
  updateProductController,
  deleteProductController,
} = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createProductController);
router.get('/', listProductsController);
router.get('/:id', getProductController);
router.put('/:id', updateProductController);
router.delete('/:id', deleteProductController);

module.exports = router;
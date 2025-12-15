import express from 'express';
import { getCategoryStats, getMonthlySalesStats, getProductDetailedHistory, getProductSalesStats, getSalesTrend, getTopVariants } from '../controllers/stats';
import isExisted from '../middlewares/isExisted';
const router = express.Router();

router.get('/stats/product', isExisted, getProductSalesStats);
router.get('/stats/monthly', isExisted, getMonthlySalesStats);
router.get('/stats/top-variants', isExisted, getTopVariants);
router.get('/stats/trend', isExisted, getSalesTrend);
router.get('/stats/category', isExisted, getCategoryStats);
router.get('/history/product/:productId', isExisted, getProductDetailedHistory);

export default router;
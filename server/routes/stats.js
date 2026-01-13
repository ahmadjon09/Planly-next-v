import express from 'express';
import isExisted from '../middlewares/isExisted';
import { getCategoryStats, getDashboardStats, getMonthlySalesStats, getProductDetailedHistory, getProductMonthlyHistory, getProductSalesStats, getSalesTrend, getTopProducts } from '../controllers/stats';
const router = express.Router();

router.get('/stats/products', isExisted, getProductSalesStats);
router.get('/stats/monthly', isExisted, getMonthlySalesStats);
router.get('/stats/top-products', isExisted, getTopProducts);
router.get('/stats/trend', isExisted, getSalesTrend);
router.get('/stats/category', isExisted, getCategoryStats);
router.get('/stats/product/:productId/detailed', isExisted, getProductDetailedHistory);
router.get('/stats/dashboard', isExisted, getDashboardStats);
router.get('/stats/product/:productId/monthly', isExisted, getProductMonthlyHistory);

export default router;
import express from 'express';
import Product from '../models/product.js';
import Order from '../models/order.js';
import mongoose from 'mongoose';

const router = express.Router();

// Dashboard statistikalarini olish
router.get('/dashboard', async (req, res) => {
    try {
        // Bugungi sana
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Kecha sana
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dayBeforeYesterday = new Date(yesterday);
        dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);

        // Hozirgi oy
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);

        // O'tgan oy
        const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
        const lastMonthEnd = new Date(currentYear, currentMonth, 0);

        // 1. Bugungi statistikalar
        const todayOrders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: today, $lt: tomorrow }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    totalSold: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            }
        ]);

        const todayStats = todayOrders[0] || {
            totalRevenue: 0,
            orderCount: 0,
            totalSold: 0
        };

        // 2. Kechagi statistikalar
        const yesterdayOrders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: yesterday, $lt: today }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    totalSold: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            }
        ]);

        const yesterdayStats = yesterdayOrders[0] || {
            totalRevenue: 0,
            orderCount: 0,
            totalSold: 0
        };

        // 3. Hozirgi oy statistikasi
        const currentMonthOrders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: monthStart, $lt: monthEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    totalSold: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            }
        ]);

        const currentMonthStats = currentMonthOrders[0] || {
            totalRevenue: 0,
            orderCount: 0,
            totalSold: 0
        };

        // 4. O'tgan oy statistikasi
        const lastMonthOrders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    totalSold: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            }
        ]);

        const lastMonthStats = lastMonthOrders[0] || {
            totalRevenue: 0,
            orderCount: 0,
            totalSold: 0
        };

        // O'zgarishlarni hisoblash
        const calculateChange = (current, previous) => {
            if (!previous || previous === 0) return null;

            const percentage = ((current - previous) / previous * 100).toFixed(1);
            return {
                trend: current > previous ? 'up' : current < previous ? 'down' : 'stable',
                percentage: Math.abs(parseFloat(percentage)),
                value: current - previous
            };
        };

        const todayVsYesterday = {
            revenue: calculateChange(todayStats.totalRevenue, yesterdayStats.totalRevenue),
            orders: calculateChange(todayStats.orderCount, yesterdayStats.orderCount),
            sold: calculateChange(todayStats.totalSold, yesterdayStats.totalSold)
        };

        const currentMonthVsLastMonth = {
            revenue: calculateChange(currentMonthStats.totalRevenue, lastMonthStats.totalRevenue),
            orders: calculateChange(currentMonthStats.orderCount, lastMonthStats.orderCount),
            sold: calculateChange(currentMonthStats.totalSold, lastMonthStats.totalSold)
        };

        // Umumiy statistikalar
        const totalStats = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    totalOrders: { $sum: 1 },
                    totalProductsSold: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            }
        ]);

        const overallStats = totalStats[0] || {
            totalRevenue: 0,
            totalOrders: 0,
            totalProductsSold: 0
        };

        // Mahsulotlar statistikasi
        const productStats = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: '$count' },
                    totalSold: { $sum: '$sold' },
                    avgPrice: { $avg: { $ifNull: ['$price', 0] } }
                }
            }
        ]);

        const productOverallStats = productStats[0] || {
            totalProducts: 0,
            totalStock: 0,
            totalSold: 0,
            avgPrice: 0
        };

        res.json({
            success: true,
            data: {
                today: todayStats,
                yesterday: yesterdayStats,
                currentMonth: currentMonthStats,
                lastMonth: lastMonthStats,
                overall: overallStats,
                products: productOverallStats,
                changes: {
                    todayVsYesterday,
                    currentMonthVsLastMonth
                },
                analysis: {
                    avgOrderValue: todayStats.orderCount > 0 ? todayStats.totalRevenue / todayStats.orderCount : 0,
                    conversionRate: 0, // Agar user tracking bo'lsa
                    bestSellingTime: '09:00-12:00' // Time tracking bo'lsa
                }
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Top sotilgan mahsulotlar
router.get('/top-products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const topProducts = await Order.aggregate([
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$products.product',
                    productTitle: { $first: '$productDetails.title' },
                    category: { $first: '$productDetails.category' },
                    sku: { $first: '$productDetails.sku' },
                    totalSold: { $sum: '$products.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } },
                    avgPrice: { $avg: '$products.price' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: limit },
            {
                $project: {
                    _id: 1,
                    productTitle: 1,
                    category: 1,
                    sku: 1,
                    totalSold: 1,
                    totalRevenue: 1,
                    avgPrice: 1
                }
            }
        ]);

        res.json({
            success: true,
            data: topProducts
        });
    } catch (error) {
        console.error('Top products error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Trend ma'lumotlari (kunlik, haftalik, oylik)
router.get('/trend', async (req, res) => {
    try {
        const interval = req.query.interval || 'daily';
        const limit = parseInt(req.query.limit) || 30;

        let groupBy, dateFormat, matchFilter = {};

        // Vaqt oralig'ini aniqlash
        const now = new Date();
        let startDate = new Date();

        switch (interval) {
            case 'daily':
                startDate.setDate(startDate.getDate() - limit);
                groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                dateFormat = 'YYYY-MM-DD';
                break;
            case 'weekly':
                startDate.setDate(startDate.getDate() - (limit * 7));
                groupBy = {
                    $concat: [
                        { $toString: { $isoWeek: '$createdAt' } },
                        '-',
                        { $toString: { $isoWeekYear: '$createdAt' } }
                    ]
                };
                dateFormat = 'Week-WW-YYYY';
                break;
            case 'monthly':
                startDate.setMonth(startDate.getMonth() - limit);
                groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                dateFormat = 'YYYY-MM';
                break;
            default:
                startDate.setDate(startDate.getDate() - 30);
                groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                dateFormat = 'YYYY-MM-DD';
        }

        matchFilter.createdAt = { $gte: startDate };

        const trendData = await Order.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: groupBy,
                    period: { $first: groupBy },
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    totalItems: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    },
                    avgOrderValue: { $avg: '$total' }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    period: 1,
                    totalRevenue: 1,
                    orderCount: 1,
                    totalItems: 1,
                    avgOrderValue: 1
                }
            }
        ]);

        // Analysis qilish
        const analysis = {
            bestPeriod: trendData.reduce((max, item) =>
                item.totalRevenue > max.totalRevenue ? item : max,
                trendData[0] || {}
            ),
            worstPeriod: trendData.reduce((min, item) =>
                item.totalRevenue < min.totalRevenue ? item : min,
                trendData[0] || {}
            ),
            totalRevenue: trendData.reduce((sum, item) => sum + item.totalRevenue, 0),
            totalOrders: trendData.reduce((sum, item) => sum + item.orderCount, 0),
            averageDailyRevenue: trendData.length > 0 ?
                trendData.reduce((sum, item) => sum + item.totalRevenue, 0) / trendData.length : 0
        };

        res.json({
            success: true,
            data: trendData,
            analysis,
            interval,
            dateFormat
        });
    } catch (error) {
        console.error('Trend data error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Kategoriyalar bo'yicha statistikalar
router.get('/category', async (req, res) => {
    try {
        const categoryStats = await Order.aggregate([
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$productDetails.category',
                    category: { $first: '$productDetails.category' },
                    totalSold: { $sum: '$products.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } },
                    orderCount: { $sum: 1 },
                    avgPrice: { $avg: '$products.price' }
                }
            },
            { $sort: { totalSold: -1 } },
            {
                $addFields: {
                    percentage: {
                        $round: [
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            '$totalSold',
                                            { $sum: '$totalSold' }
                                        ]
                                    },
                                    100
                                ]
                            },
                            2
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    category: 1,
                    totalSold: 1,
                    totalRevenue: 1,
                    orderCount: 1,
                    avgPrice: 1,
                    percentage: 1
                }
            }
        ]);

        // Total sold ni hisoblash
        const totalSold = categoryStats.reduce((sum, cat) => sum + cat.totalSold, 0);

        // Percentage ni qayta hisoblash
        const statsWithPercentage = categoryStats.map(cat => ({
            ...cat,
            percentage: totalSold > 0 ? ((cat.totalSold / totalSold) * 100).toFixed(2) : 0
        }));

        res.json({
            success: true,
            data: statsWithPercentage,
            totalSold
        });
    } catch (error) {
        console.error('Category stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Oylik statistikalar
router.get('/monthly', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 12;
        const groupBy = req.query.groupBy || 'month'; // month, year, quarter

        let dateFormat;
        switch (groupBy) {
            case 'year':
                dateFormat = '%Y';
                break;
            case 'quarter':
                dateFormat = '%Y-Q%q';
                break;
            case 'month':
            default:
                dateFormat = '%Y-%m';
        }

        const monthlyStats = await Order.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
                    period: { $first: { $dateToString: { format: dateFormat, date: '$createdAt' } } },
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    totalItems: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    },
                    avgOrderValue: { $avg: '$total' },
                    maxOrderValue: { $max: '$total' },
                    minOrderValue: { $min: '$total' }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    period: 1,
                    totalRevenue: 1,
                    orderCount: 1,
                    totalItems: 1,
                    avgOrderValue: 1,
                    maxOrderValue: 1,
                    minOrderValue: 1
                }
            }
        ]);

        res.json({
            success: true,
            data: monthlyStats,
            groupBy,
            limit
        });
    } catch (error) {
        console.error('Monthly stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Mahsulotlar statistikasi
router.get('/products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const sortBy = req.query.sortBy || 'sold'; // sold, revenue, count
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        const productStats = await Product.aggregate([
            {
                $project: {
                    _id: 1,
                    title: 1,
                    sku: 1,
                    category: 1,
                    gender: 1,
                    season: 1,
                    count: 1,
                    sold: 1,
                    isAvailable: 1,
                    availabilityRate: {
                        $cond: [
                            { $eq: ['$count', 0] },
                            0,
                            {
                                $divide: [
                                    { $subtract: ['$count', { $ifNull: ['$sold', 0] }] },
                                    '$count'
                                ]
                            }
                        ]
                    },
                    createdAt: 1,
                    mainImages: { $arrayElemAt: ['$mainImages', 0] }
                }
            },
            { $sort: { [sortBy]: sortOrder } },
            { $limit: limit }
        ]);

        // Umumiy statistikalar
        const overallStats = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalInStock: { $sum: '$count' },
                    totalSold: { $sum: '$sold' },
                    avgStock: { $avg: '$count' },
                    outOfStock: {
                        $sum: {
                            $cond: [{ $eq: ['$count', 0] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: productStats,
            overall: overallStats[0] || {},
            pagination: {
                limit,
                sortBy,
                sortOrder,
                total: productStats.length
            }
        });
    } catch (error) {
        console.error('Products stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Real-time statistikalar (soniya sayin)
router.get('/realtime', async (req, res) => {
    try {
        const lastHour = new Date();
        lastHour.setHours(lastHour.getHours() - 1);

        const realtimeStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: lastHour }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d %H:%M', date: '$createdAt' }
                    },
                    timestamp: { $first: '$createdAt' },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                    items: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            },
            { $sort: { timestamp: 1 } },
            { $limit: 60 }
        ]);

        const currentStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                }
            },
            {
                $group: {
                    _id: null,
                    todayRevenue: { $sum: '$total' },
                    todayOrders: { $sum: 1 },
                    todayItems: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            }
        ]);

        const today = currentStats[0] || {
            todayRevenue: 0,
            todayOrders: 0,
            todayItems: 0
        };

        res.json({
            success: true,
            data: {
                realtime: realtimeStats,
                today,
                lastUpdated: new Date(),
                activeUsers: 0, // Agar user tracking bo'lsa
                pendingOrders: await Order.countDocuments({ status: 'pending' }),
                lowStockProducts: await Product.countDocuments({ count: { $lt: 5 } })
            }
        });
    } catch (error) {
        console.error('Realtime stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

export default router;
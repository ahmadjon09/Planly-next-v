import { useState } from 'react';
import useSWR from 'swr';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area, ComposedChart
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, ShoppingCart,
    Package, Users, Activity, Calendar, BarChart3,
    PieChart as PieChartIcon, Star, Target, Award,
    ShoppingBag, Clock, RefreshCw, Filter, Download,
    ChevronUp, ChevronDown, Eye, MoreVertical, TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon, Percent, Box, Grid, Layers
} from 'lucide-react';

import Fetch from "../middlewares/fetcher"

// Asosiy Dashboard komponenti
export default function DashboardPage() {
    const [timeRange, setTimeRange] = useState('monthly');
    const [activeChart, setActiveChart] = useState('sales');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Barcha API so'rovlarini yuklash
    const { data: dashboardData } = useSWR('/stats/dashboard', Fetch, {
        refreshInterval: 30000,
        revalidateOnFocus: false
    });

    const { data: topProducts } = useSWR('/stats/top-products?limit=10', Fetch);

    const { data: trendData } = useSWR(`/stats/trend?interval=${timeRange}`, Fetch);

    const { data: categoryData } = useSWR('/stats/category', Fetch);

    const { data: monthlyData } = useSWR('/stats/monthly?groupBy=month&limit=12', Fetch);

    const { data: productStats } = useSWR('/stats/products?limit=5', Fetch);

    // Loading holati
    const isLoading = !dashboardData || !topProducts || !trendData || !categoryData;

    // Format number function
    const formatNumber = (num) => {
        if (!num) return '0';
        return new Intl.NumberFormat('ru-RU').format(Math.round(num));
    };

    // Format price function
    const formatPrice = (price) => {
        if (!price) return '0 сум';
        return new Intl.NumberFormat('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price) + ' сум';
    };

    // Chart ranglari
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

    // O'zgarishlarni ko'rsatish uchun funksiya
    const renderTrendIndicator = (change) => {
        if (!change) return null;

        if (change.trend === 'up') {
            return (
                <div className="flex items-center text-green-600">
                    <ChevronUp className="w-4 h-4" />
                    <span className="text-sm font-medium">{change.percentage}%</span>
                </div>
            );
        } else if (change.trend === 'down') {
            return (
                <div className="flex items-center text-red-600">
                    <ChevronDown className="w-4 h-4" />
                    <span className="text-sm font-medium">{change.percentage}%</span>
                </div>
            );
        }
        return null;
    };

    // Statistik kartalar
    const StatCard = ({ title, value, icon, change, prefix = '', suffix = '' }) => (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                    {icon}
                </div>
                {change && renderTrendIndicator(change)}
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
            <p className="text-2xl font-bold text-gray-900">
                {prefix}{formatNumber(value)}{suffix}
            </p>
        </div>
    );

    if (!isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 md:p-6">
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Маълумотлар юкланмоқда...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Dashboard ma'lumotlarini olish
    const stats = dashboardData?.data || {};
    const trend = trendData?.data || [];
    const topProductsList = topProducts?.data || [];
    const categories = categoryData?.data || [];
    const monthlyStats = monthlyData?.data || [];
    const products = productStats?.data || [];

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            {/* Header */}
            <header className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Дашбоард</h1>
                        <p className="text-gray-600 mt-1">Сотув статистикаси ва таҳлиллар</p>
                    </div>

                    <div className="flex items-center space-x-3 mt-4 md:mt-0">
                        <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                            <Filter className="w-4 h-4 mr-2" />
                            Филтр
                        </button>
                        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                            <Download className="w-4 h-4 mr-2" />
                            Юклаб олиш
                        </button>
                        <button
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            onClick={() => {
                                // SWR refetch
                                window.location.reload();
                            }}
                        >
                            <RefreshCw className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Vaqt oralig'i filtrlari */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {['kunlik', 'haftalik', 'oylik', 'yillik'].map((range) => (
                        <button
                            key={range}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${timeRange === range ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            onClick={() => setTimeRange(range)}
                        >
                            {range === 'kunlik' && 'Кунлик'}
                            {range === 'haftalik' && 'Ҳафталик'}
                            {range === 'oylik' && 'Ойлик'}
                            {range === 'yillik' && 'Йиллик'}
                        </button>
                    ))}
                </div>
            </header>

            {/* Asosiy statistik kartalar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Бугунги даромад"
                    value={stats.today?.totalRevenue || 0}
                    icon={<DollarSign className="w-6 h-6 text-blue-600" />}
                    change={stats.changes?.todayVsYesterday?.revenue}
                    suffix=" сум"
                />

                <StatCard
                    title="Бугунги буюртмалар"
                    value={stats.today?.orderCount || 0}
                    icon={<ShoppingCart className="w-6 h-6 text-green-600" />}
                    change={stats.changes?.todayVsYesterday?.orders}
                />

                <StatCard
                    title="Бугун сотилган товарлар"
                    value={stats.today?.totalSold || 0}
                    icon={<Package className="w-6 h-6 text-purple-600" />}
                    change={stats.changes?.currentMonthVsLastMonth?.sold}
                />

                <StatCard
                    title="Уртача буюртма қиймати"
                    value={stats.today?.orderCount ? stats.today.totalRevenue / stats.today.orderCount : 0}
                    icon={<Activity className="w-6 h-6 text-orange-600" />}
                    prefix=""
                    suffix=" сум"
                />
            </div>

            {/* График ва диаграммалар */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Сотув тенденцияси */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Сотув тенденцияси</h2>
                            <p className="text-sm text-gray-500">Вақт оралиғи бўйича сотишлар</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                className={`p-2 rounded-lg ${activeChart === 'sales' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                                onClick={() => setActiveChart('sales')}
                            >
                                <BarChart3 className="w-5 h-5" />
                            </button>
                            <button
                                className={`p-2 rounded-lg ${activeChart === 'revenue' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                                onClick={() => setActiveChart('revenue')}
                            >
                                <TrendingUpIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="period"
                                    stroke="#666"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="#666"
                                    fontSize={12}
                                    tickFormatter={(value) => formatNumber(value)}
                                />
                                <Tooltip
                                    formatter={(value) => [formatNumber(value), 'Қиймат']}
                                    labelFormatter={(label) => `Период: ${label}`}
                                />
                                <Legend />
                                <Bar
                                    dataKey="totalRevenue"
                                    fill="#8884d8"
                                    name="Даромад"
                                    barSize={20}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="orderCount"
                                    stroke="#ff7300"
                                    name="Буюртмалар"
                                    strokeWidth={2}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Категориялар бўйича тақсимланиш */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Категориялар бўйича</h2>
                            <p className="text-sm text-gray-500">Товарлар тақсимланиши</p>
                        </div>
                        <PieChartIcon className="w-5 h-5 text-gray-400" />
                    </div>

                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categories.slice(0, 6)}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ category, percentage }) => `${category}: ${percentage}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="totalSold"
                                    nameKey="category"
                                >
                                    {categories.slice(0, 6).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name) => [formatNumber(value), name]}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {categories.slice(0, 4).map((cat, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center">
                                    <div
                                        className="w-3 h-3 rounded-full mr-2"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <span className="text-sm font-medium">{cat.category}</span>
                                </div>
                                <span className="text-sm font-semibold">{cat.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Ойлик статистика ва топ товарлар */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Ойлик статистика */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Ойлик статистика</h2>
                            <p className="text-sm text-gray-500">Ойлар бўйича сотишлар</p>
                        </div>
                        <Calendar className="w-5 h-5 text-gray-400" />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 text-sm font-medium text-gray-500">Ой</th>
                                    <th className="text-left py-3 text-sm font-medium text-gray-500">Сотилди</th>
                                    <th className="text-left py-3 text-sm font-medium text-gray-500">Даромад</th>
                                    <th className="text-left py-3 text-sm font-medium text-gray-500">Буюртма</th>
                                    <th className="text-left py-3 text-sm font-medium text-gray-500">Уртача</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyStats.slice(0, 6).map((month, index) => (
                                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3">
                                            <div className="font-medium">{month.period}</div>
                                        </td>
                                        <td className="py-3">
                                            <div className="font-semibold">{formatNumber(month.totalSold || month.totalItems)}</div>
                                        </td>
                                        <td className="py-3">
                                            <div className="font-semibold text-blue-600">{formatPrice(month.totalRevenue)}</div>
                                        </td>
                                        <td className="py-3">
                                            <div className="font-medium">{month.orderCount}</div>
                                        </td>
                                        <td className="py-3">
                                            <div className="font-medium">
                                                {formatPrice(month.avgOrderValue || (month.totalRevenue / month.orderCount))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Топ 5 товар */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Топ 5 товар</h2>
                            <p className="text-sm text-gray-500">Энг кўп сотиладиган товарлар</p>
                        </div>
                        <Award className="w-5 h-5 text-yellow-500" />
                    </div>

                    <div className="space-y-4">
                        {topProductsList.slice(0, 5).map((product, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg font-bold mr-3">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{product.productTitle}</div>
                                        <div className="text-xs text-gray-500">{product.category}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold">{formatNumber(product.totalSold)}</div>
                                    <div className="text-xs text-green-600">{formatPrice(product.totalRevenue)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Қўшимча статистика */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-50 rounded-lg mr-3">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Энг яхши ой</p>
                            <p className="font-semibold">
                                {trendData?.analysis?.bestPeriod?.period || 'Мавжуд эмас'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-50 rounded-lg mr-3">
                            <TrendingDown className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Энг ёмон ой</p>
                            <p className="font-semibold">
                                {trendData?.analysis?.worstPeriod?.period || 'Мавжуд эмас'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-50 rounded-lg mr-3">
                            <Percent className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Умумий ўзгариш</p>
                            <p className="font-semibold">
                                {stats.changes?.currentMonthVsLastMonth?.revenue?.percentage || 0}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-50 rounded-lg mr-3">
                            <Box className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Фаол товарлар</p>
                            <p className="font-semibold">{products?.length || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Футер статистика */}
            <div className="mt-6 text-center text-sm text-gray-500">
                <p>Маълумотлар {new Date().toLocaleDateString('uz-UZ')} соат {new Date().toLocaleTimeString('uz-UZ')} да янгиланди</p>
                <p className="mt-1">Жами буюртмалар: {formatNumber(stats.currentMonth?.orderCount || 0)} |
                    Жами даромад: {formatPrice(stats.currentMonth?.totalRevenue || 0)} |
                    Жами сотилган: {formatNumber(stats.currentMonth?.totalSold || 0)}</p>
            </div>
        </div>
    );
}
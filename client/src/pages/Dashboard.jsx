import { useState } from 'react';
import useSWR from 'swr';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area, ComposedChart,
    RadialBarChart, RadialBar
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, ShoppingCart,
    Package, Users, Activity, Calendar, BarChart3,
    PieChart as PieChartIcon, Star, Target, Award,
    ShoppingBag, Clock, RefreshCw, Filter, Download,
    ChevronUp, ChevronDown, Eye, MoreVertical, TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon, Percent, Box, Grid, Layers,
    ShoppingCart as CartIcon, Tag, User, CheckCircle,
    AlertCircle, Database, Smartphone, Monitor,
    BarChart as BarChartIcon, LineChart as LineChartIcon,
    Home, Settings, Bell, HelpCircle, Menu, X
} from 'lucide-react';

import Fetch from "../middlewares/fetcher";

// Asosiy Dashboard komponenti
export default function DashboardPage() {
    const [timeRange, setTimeRange] = useState('monthly');
    const [activeChart, setActiveChart] = useState('revenue');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Barcha API so'rovlarini yuklash
    const { data: dashboardData, mutate: mutateDashboard } = useSWR('/stats/dashboard', Fetch, {
        refreshInterval: 60000, // 1 daqiqada yangilash
        revalidateOnFocus: true
    });

    const { data: topProducts } = useSWR('/stats/top-products?limit=10', Fetch);
    const { data: trendData } = useSWR(`/stats/trend?interval=${timeRange}&limit=30`, Fetch);
    const { data: categoryData } = useSWR('/stats/category', Fetch);
    const { data: monthlyData } = useSWR('/stats/monthly?groupBy=month&limit=12', Fetch);
    const { data: productStats } = useSWR('/stats/products?limit=5&sortBy=sold&sortOrder=desc', Fetch);
    const { data: realtimeData } = useSWR('/stats/realtime', Fetch, {
        refreshInterval: 10000
    });

    // Format number function
    const formatNumber = (num) => {
        if (!num && num !== 0) return '0';
        const number = parseFloat(num);
        if (isNaN(number)) return '0';
        return new Intl.NumberFormat('uz-UZ').format(Math.round(number));
    };

    // Format price function
    const formatPrice = (price) => {
        if (!price && price !== 0) return '0 сум';
        const number = parseFloat(price);
        if (isNaN(number)) return '0 сум';
        return new Intl.NumberFormat('uz-UZ', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number) + ' сум';
    };

    // Chart ranglari
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const CATEGORY_COLORS = {
        'sneakers': '#3B82F6',
        'boots': '#10B981',
        'heels': '#EC4899',
        'sandals': '#F59E0B',
        'slippers': '#8B5CF6',
        'shoes': '#EF4444',
        'other': '#6B7280'
    };

    // O'zgarishlarni ko'rsatish uchun funksiya
    const renderTrendIndicator = (change) => {
        if (!change || change.percentage === undefined) return null;

        const isPositive = change.trend === 'up';
        const iconClass = isPositive ? 'text-green-600' : 'text-red-600';
        const bgClass = isPositive ? 'bg-green-100' : 'bg-red-100';

        return (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${bgClass} ${iconClass}`}>
                {isPositive ? (
                    <ChevronUp className="w-3 h-3" />
                ) : (
                    <ChevronDown className="w-3 h-3" />
                )}
                <span className="text-xs font-semibold">{change.percentage}%</span>
            </div>
        );
    };

    // Statistik kartalar
    const StatCard = ({ title, value, icon, change, prefix = '', suffix = '', loading = false }) => (
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${loading ? 'animate-pulse bg-gray-200' : 'bg-blue-50'}`}>
                    {loading ? (
                        <div className="w-6 h-6 bg-gray-300 rounded"></div>
                    ) : (
                        icon
                    )}
                </div>
                {!loading && change && renderTrendIndicator(change)}
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
            {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            ) : (
                <p className="text-2xl font-bold text-gray-900">
                    {prefix}{formatNumber(value)}{suffix}
                </p>
            )}
        </div>
    );

    // Loading holati
    const isLoading = !dashboardData || !topProducts || !trendData;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
                {/* Loading Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex gap-2">
                            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-10 w-10 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {['kunlik', 'haftalik', 'oylik', 'yillik'].map((_, i) => (
                            <div key={i} className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
                        ))}
                    </div>
                </div>

                {/* Loading Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-2xl p-6">
                            <div className="flex justify-between mb-4">
                                <div className="h-10 w-10 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    ))}
                </div>

                {/* Loading Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6">
                        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
                        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="bg-white rounded-2xl p-6">
                        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
                        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </div>

                {/* Loading Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl p-6">
                        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6">
                        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Dashboard ma'lumotlarini olish
    const stats = dashboardData?.data.data || {};
    const trend = trendData?.data.data || [];
    const topProductsList = topProducts?.data.data || [];
    const categories = categoryData?.data.data || [];
    const monthlyStats = monthlyData?.data.data || [];
    const products = productStats?.data.data || [];
    const realtime = realtimeData?.data.data || {};

    // Analysis funksiyalari
    const getBestCategory = () => {
        if (!categories.length) return null;
        return categories.reduce((max, cat) => cat.totalSold > max.totalSold ? cat : max);
    };

    const getRecentActivity = () => {
        // So'nggi 1 soatdagi faoliyat
        if (!realtime.realtime) return [];
        return realtime.realtime.slice(-5).reverse();
    };

    // Mobile responsive sidebar
    const MobileSidebar = () => (
        <div className={`lg:hidden fixed inset-0 z-50 ${mobileMenuOpen ? 'block' : 'hidden'}`}>
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-64 bg-white p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <BarChartIcon className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="space-y-2">
                    {[
                        { icon: Home, label: 'Асосий', active: true },
                        { icon: BarChartIcon, label: 'Статистика' },
                        { icon: ShoppingCart, label: 'Буюртмалар' },
                        { icon: Package, label: 'Маҳсулотлар' },
                        { icon: Users, label: 'Мижозлар' },
                        { icon: Settings, label: 'Созламалар' },
                        { icon: Bell, label: 'Хабарнома' },
                        { icon: HelpCircle, label: 'Ёрдам' },
                    ].map((item, index) => (
                        <button
                            key={index}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl ${item.active ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Mobile Sidebar */}
            <MobileSidebar />

            {/* Mobile Header */}
            <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="h-6 w-6 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <BarChartIcon className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-gray-800">Дашбоард</h1>
                    </div>
                    <button
                        onClick={() => mutateDashboard()}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <RefreshCw className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Asosiy kontent */}
            <div className="p-4 md:p-6">
                {/* Desktop Header */}
                <header className="hidden lg:block mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                                    <BarChartIcon className="h-6 w-6 text-white" />
                                </div>
                                Дашбоард Панели
                            </h1>
                            <p className="text-gray-600 mt-2 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Маълумотлар {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} да янгиланди
                                {realtimeData && (
                                    <span className="ml-2 text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                        Онлайн
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 mt-4 md:mt-0">
                            <button className="hidden md:flex items-center px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 active:scale-95 transition-transform">
                                <Filter className="w-4 h-4 mr-2" />
                                Филтр
                            </button>
                            <button className="hidden md:flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg active:scale-95 transition-all">
                                <Download className="w-4 h-4 mr-2" />
                                Хисобот
                            </button>
                            <button
                                onClick={() => mutateDashboard()}
                                className="p-2 hover:bg-gray-100 rounded-xl active:scale-95 transition-transform"
                                title="Янгилаш"
                            >
                                <RefreshCw className="w-5 h-5 text-gray-600" />
                            </button>
                            <div className="relative">
                                <button className="p-2 hover:bg-gray-100 rounded-xl active:scale-95 transition-transform">
                                    <Bell className="w-5 h-5 text-gray-600" />
                                </button>
                                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>
                            </div>
                        </div>
                    </div>

                    {/* Vaqt oralig'i filtrlari - Desktop */}
                    <div className="hidden lg:flex flex-wrap gap-2 mb-6">
                        {[
                            { key: 'kunlik', label: 'Кунлик', icon: Calendar },
                            { key: 'haftalik', label: 'Ҳафталик', icon: BarChart3 },
                            { key: 'oylik', label: 'Ойлик', icon: TrendingUp },
                            { key: 'yillik', label: 'Йиллик', icon: Target }
                        ].map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${timeRange === key
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                    }`}
                                onClick={() => setTimeRange(key)}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Mobile Filter Buttons */}
                <div className="lg:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['kunlik', 'haftalik', 'oylik', 'yillik'].map((range) => (
                        <button
                            key={range}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium ${timeRange === range
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300'
                                }`}
                            onClick={() => setTimeRange(range)}
                        >
                            {range === 'kunlik' && 'Кунлик'}
                            {range === 'haftalik' && 'Ҳафталик'}
                            {range === 'oylik' && 'Ойлик'}
                            {range === 'yillik' && 'Йиллик'}
                        </button>
                    ))}
                </div>

                {/* Asosiy statistik kartalar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                        title="Бугун сотилган"
                        value={stats.today?.totalSold || 0}
                        icon={<Package className="w-6 h-6 text-purple-600" />}
                        change={stats.changes?.todayVsYesterday?.sold}
                        suffix=" дона"
                    />

                    <StatCard
                        title="Уртача буюртма"
                        value={stats.today?.orderCount ? (stats.today.totalRevenue / stats.today.orderCount) : 0}
                        icon={<Activity className="w-6 h-6 text-orange-600" />}
                        suffix=" сум"
                    />
                </div>

                {/* График ва диаграммалар */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Сотув тенденцияси */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Сотув тенденцияси</h2>
                                <p className="text-sm text-gray-500">Вақт оралиғи бўйича сотишлар</p>
                            </div>
                            <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                                <button
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${activeChart === 'revenue' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    onClick={() => setActiveChart('revenue')}
                                >
                                    <TrendingUpIcon className="w-4 h-4" />
                                    Даромад
                                </button>
                                <button
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${activeChart === 'orders' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    onClick={() => setActiveChart('orders')}
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    Буюртмалар
                                </button>
                            </div>
                        </div>

                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={trend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                                    <XAxis
                                        dataKey="period"
                                        stroke="#666"
                                        fontSize={12}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        fontSize={12}
                                        tickFormatter={(value) => formatNumber(value)}
                                    />
                                    <Tooltip
                                        formatter={(value, name) => {
                                            if (name === 'Даромад') return [formatPrice(value), name];
                                            return [formatNumber(value), name];
                                        }}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                        }}
                                    />
                                    <Legend />
                                    <Area
                                        type="monotone"
                                        dataKey={activeChart === 'revenue' ? 'totalRevenue' : 'orderCount'}
                                        fill={activeChart === 'revenue' ? 'url(#colorRevenue)' : 'url(#colorOrders)'}
                                        fillOpacity={0.3}
                                        stroke={activeChart === 'revenue' ? '#3B82F6' : '#10B981'}
                                        strokeWidth={2}
                                        name={activeChart === 'revenue' ? 'Даромад' : 'Буюртмалар'}
                                    />
                                    <Bar
                                        dataKey="totalItems"
                                        fill="#8B5CF6"
                                        name="Сотилган маҳсулот"
                                        barSize={20}
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Категориялар бўйича тақсимланиш */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Категориялар бўйича</h2>
                                <p className="text-sm text-gray-500">Товарлар тақсимланиши</p>
                            </div>
                            <PieChartIcon className="w-5 h-5 text-gray-400" />
                        </div>

                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categories?.slice(0, 5)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="totalSold"
                                        nameKey="category"
                                        label={({ category, percentage }) => `${category}: ${percentage}%`}
                                    >
                                        {categories.slice(0, 5).map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={CATEGORY_COLORS[entry.category] || COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name, props) => [
                                            `${formatNumber(value)} дона`,
                                            props.payload.category
                                        ]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-6 space-y-3">
                            {categories.slice(0, 4).map((cat, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center">
                                        <div
                                            className="w-3 h-3 rounded-full mr-3"
                                            style={{ backgroundColor: CATEGORY_COLORS[cat.category] || COLORS[index] }}
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-gray-900">{cat.category}</span>
                                            <div className="text-xs text-gray-500">{cat.totalSold} дона</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold">{cat.percentage}%</span>
                                        <div className="text-xs text-gray-500">{formatPrice(cat.totalRevenue)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Ойлик статистика ва топ товарлар */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Ойлик статистика */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Ойлик статистика</h2>
                                <p className="text-sm text-gray-500">Ойлар бўйича сотишлар</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <span className="text-sm text-gray-500">{timeRange}</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ой</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Сотилди</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Даромад</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Буюртма</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Уртача</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyStats.slice(0, 6).map((month, index) => (
                                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-gray-900">{month.period}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold">{formatNumber(month.totalItems)}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-blue-600">{formatPrice(month.totalRevenue)}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium">{month.orderCount}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-gray-700">
                                                    {formatPrice(month.avgOrderValue)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Топ 5 товар */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Топ 5 товар</h2>
                                <p className="text-sm text-gray-500">Энг кўп сотиладиган товарлар</p>
                            </div>
                            <Award className="w-5 h-5 text-yellow-500" />
                        </div>

                        <div className="space-y-4">
                            {topProductsList.slice(0, 5).map((product, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-lg font-bold mr-3 group-hover:scale-110 transition-transform">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm text-gray-900">{product.productTitle}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <Tag className="w-3 h-3" />
                                                {product.category}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">{formatNumber(product.totalSold)} дона</div>
                                        <div className="text-xs text-green-600">{formatPrice(product.totalRevenue)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Mahsulot holati */}
                        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Мавжуд маҳсулот:</span>
                                <span className="font-semibold">{products.filter(p => p.count > 0).length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Тугаган маҳсулот:</span>
                                <span className="font-semibold text-red-600">{products.filter(p => p.count === 0).length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Қўшимча статистика ва Real-time */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200">
                        <div className="flex items-center">
                            <div className="p-3 bg-green-50 rounded-xl mr-4">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Энг яхши ой</p>
                                <p className="font-semibold text-gray-900">
                                    {trendData?.analysis?.bestPeriod?.period || 'Н/М'}
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                    {formatPrice(trendData?.analysis?.bestPeriod?.totalRevenue || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200">
                        <div className="flex items-center">
                            <div className="p-3 bg-red-50 rounded-xl mr-4">
                                <TrendingDown className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Энг ёмон ой</p>
                                <p className="font-semibold text-gray-900">
                                    {trendData?.analysis?.worstPeriod?.period || 'Н/М'}
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                    {formatPrice(trendData?.analysis?.worstPeriod?.totalRevenue || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200">
                        <div className="flex items-center">
                            <div className="p-3 bg-blue-50 rounded-xl mr-4">
                                <Percent className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Ойлик ўзгариш</p>
                                <p className="font-semibold text-gray-900">
                                    {stats.changes?.currentMonthVsLastMonth?.revenue?.percentage || 0}%
                                </p>
                                <p className={`text-xs ${(stats.changes?.currentMonthVsLastMonth?.revenue?.trend === 'up') ? 'text-green-600' : 'text-red-600'} mt-1`}>
                                    {stats.changes?.currentMonthVsLastMonth?.revenue?.trend === 'up' ? '↑ Ошиб' : '↓ Тушиб'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200">
                        <div className="flex items-center">
                            <div className="p-3 bg-purple-50 rounded-xl mr-4">
                                <Box className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Фаол товарлар</p>
                                <p className="font-semibold text-gray-900">{products?.length || 0}</p>
                                <p className="text-xs text-purple-600 mt-1">
                                    {stats.products?.totalStock || 0} дона омборда
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Real-time activity - Mobile uchun maxsus */}
                <div className="lg:hidden bg-white rounded-2xl shadow-sm p-6 border border-gray-200 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Соҳангӣ фаолият</h3>
                        <Clock className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="space-y-3">
                        {getRecentActivity().map((activity, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                    <span className="text-sm">{activity.timestamp}</span>
                                </div>
                                <span className="text-sm font-medium">{formatNumber(activity.orders)} буюртма</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Футер статистика */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center md:text-left">
                            <p className="text-sm text-gray-500 mb-1">Жами буюртмалар</p>
                            <p className="text-xl font-bold text-gray-900">{formatNumber(stats.overall?.totalOrders || 0)}</p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-sm text-gray-500 mb-1">Жами даромад</p>
                            <p className="text-xl font-bold text-gray-900">{formatPrice(stats.overall?.totalRevenue || 0)}</p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-sm text-gray-500 mb-1">Жами сотилган</p>
                            <p className="text-xl font-bold text-gray-900">{formatNumber(stats.overall?.totalProductsSold || 0)}</p>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
}
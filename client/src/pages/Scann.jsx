import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import Fetch from "../middlewares/fetcher";
import {
    Camera,
    X,
    RefreshCw,
    QrCode,
    Package,
    Tag,
    DollarSign,
    Info,
    AlertCircle,
    CheckCircle,
    Loader2,
    Users,
    Calendar,
    Grid,
    Shield,
    ShoppingBag,
    Hash,
    CreditCard,
    FileText
} from "lucide-react";

export default function QrScanner() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState("");
    const [status, setStatus] = useState("idle");
    const [product, setProduct] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    // Гендерлар таржимаси
    const genderTranslations = {
        "men": "Эркаклар",
        "women": "Аёллар",
        "kids": "Болалар",
        "unisex": "Унисекс"
    };

    // Категориялар таржимаси
    const categoryTranslations = {
        "sneakers": "Кроссовкалар",
        "boots": "Этик",
        "heels": "Туфли",
        "sandals": "Сандаллар",
        "slippers": "Шиппак",
        "shoes": "Оёқ кийим",
        "other": "Бошқа"
    };

    // Фасиллар таржимаси
    const seasonTranslations = {
        "summer": "Ёз",
        "winter": "Қиш",
        "spring": "Бахор",
        "autumn": "Куз",
        "all": "Ҳамма мавсум"
    };

    // ▶️ КАМЕРАНИ БОШЛАШ
    const startScan = async () => {
        try {
            setProduct(null);
            setErrorMessage("");
            setResult("");

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });

            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setScanning(true);
            scanLoop();
        } catch (err) {
            setErrorMessage("Камера очилмади. Илтимос, рухсат беринг.");
            console.error(err);
        }
    };

    // ⏹ КАМЕРАНИ ТОХТАТИШ
    const stopScan = () => {
        setScanning(false);
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        cancelAnimationFrame(rafRef.current);
    };

    // 🔁 QR КОД СКАНЕРЛАШ ЦИКЛИ
    const scanLoop = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (video.videoWidth === 0) {
            rafRef.current = requestAnimationFrame(scanLoop);
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, canvas.width, canvas.height);

        if (code?.data) {
            setResult(code.data);
            stopScan();
            sendToServer(code.data);
            return;
        }

        rafRef.current = requestAnimationFrame(scanLoop);
    };

    // 🌐 СЕРВЕРГА ЮБОРИШ ВА МАЪЛУМОТ ОЛИШ
    const sendToServer = async (value) => {
        try {
            setStatus("sending");
            setProduct(null);
            setErrorMessage("");

            const res = await Fetch.get(`products/qr/scann/${value}`);

            if (res && res.data) {
                setProduct(res.data.data);
                setStatus("success");
            } else {
                setErrorMessage("Маҳсулот топилмади");
                setStatus("error");
            }
        } catch (err) {
            console.error(err);
            setErrorMessage("Серверга уланишда хатолик");
            setStatus("error");
        }
    };

    // СКАНЕРНИ ҚАЙТА БОШЛАШ
    const restartScan = () => {
        setProduct(null);
        setResult("");
        setErrorMessage("");
        setStatus("idle");
        startScan();
    };

    // КОМПОНЕНТНИ ТОЗАЛАШ
    useEffect(() => {
        return () => stopScan();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                {/* ХЕДЕР */}
                <div className="text-center mb-8 md:mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                        <QrCode className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                        QR Код Сканер
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Маҳсулот маълумотларини сканерлаш учун қурилма
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* ЛЕВЫЙ КОЛОНКА - СКАНЕР */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* СКАНЕР КАРТОЧКА */}
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <Camera className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">
                                                Камера Сканери
                                            </h2>
                                            <p className="text-gray-500 text-sm">
                                                QR кодини камерага кўрсатинг
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {scanning && (
                                            <div className="flex items-center space-x-1">
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                <span className="text-sm text-red-600">Сканлаш жараёнида</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* ВИДЕО ПРЕВЬЮ */}
                                <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video mb-6">
                                    <video
                                        ref={videoRef}
                                        className="w-full h-full object-cover"
                                        playsInline
                                        muted
                                    />
                                    {!scanning && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
                                            <div className="text-center">
                                                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                                <p className="text-gray-300 text-lg">Камера фаоллаштирилмаган</p>
                                            </div>
                                        </div>
                                    )}
                                    {scanning && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-64 h-64 border-2 border-blue-400 border-dashed rounded-lg"></div>
                                        </div>
                                    )}
                                </div>

                                {/* КОНТРОЛЛАР */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {!scanning ? (
                                        <button
                                            onClick={startScan}
                                            className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                                        >
                                            <Camera className="w-5 h-5 mr-2" />
                                            Сканлашни Бошлаш
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopScan}
                                            className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                                        >
                                            <X className="w-5 h-5 mr-2" />
                                            Тўхтатиш
                                        </button>
                                    )}

                                    {product && (
                                        <button
                                            onClick={restartScan}
                                            className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                                        >
                                            <RefreshCw className="w-5 h-5 mr-2" />
                                            Яна Сканлаш
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* СТАТУС */}
                            {status === "sending" && (
                                <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
                                    <div className="flex items-center justify-center space-x-3">
                                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                        <span className="text-blue-700 font-medium">
                                            Маҳсулот маълумотлари олинмоқда...
                                        </span>
                                    </div>
                                </div>
                            )}

                            {errorMessage && (
                                <div className="px-6 py-4 bg-red-50 border-t border-red-100">
                                    <div className="flex items-center space-x-3">
                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                        <div>
                                            <p className="text-red-700 font-medium">Хатолик</p>
                                            <p className="text-red-600 text-sm">{errorMessage}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* СКАНЕРЛАНГАН QR КОД */}
                        {result && (
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="p-2 bg-green-50 rounded-lg">
                                        <QrCode className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Сканерланган QR Код
                                        </h3>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="font-mono text-gray-800 break-all">{result}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ПРАВЫЙ КОЛОНКА - МАХСУЛОТ МАЪЛУМОТЛАРИ */}
                    <div className="space-y-6">
                        {/* МАХСУЛОТ КАРТОЧКАСИ */}
                        {product ? (
                            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                {/* ХЕДЕР */}
                                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <Package className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900">{product.title}</h2>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                                        {product.isAvailable ? "Мавжуд" : "Мавжуд эмас"}
                                                    </div>
                                                    <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                                        {categoryTranslations[product.category] || product.category}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </div>

                                    {/* АСОСИЙ РАСМ */}
                                    {product.mainImages && product.mainImages.length > 0 && (
                                        <div className="mt-4">
                                            <img
                                                src={product.mainImages[0]}
                                                alt={product.title}
                                                className="w-full h-48 object-cover rounded-lg shadow-md"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* МАЪЛУМОТЛАР */}
                                <div className="p-6 space-y-6">
                                    {/* АСОСИЙ МАЪЛУМОТЛАР */}
                                    <div>
                                        <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-4">
                                            <Info className="w-5 h-5 mr-2 text-gray-500" />
                                            Асосий Маълумотлар
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <InfoCard
                                                icon={<Tag className="w-4 h-4" />}
                                                label="SKU Коди"
                                                value={product.sku}
                                                color="blue"
                                            />
                                            <InfoCard
                                                icon={<DollarSign className="w-4 h-4" />}
                                                label="Нархи"
                                                value={`${product.price?.toLocaleString()} UZS`}
                                                color="green"
                                            />
                                            <InfoCard
                                                icon={<Users className="w-4 h-4" />}
                                                label="Жинс"
                                                value={genderTranslations[product.gender] || product.gender}
                                                color="purple"
                                            />
                                            <InfoCard
                                                icon={<Calendar className="w-4 h-4" />}
                                                label="Фасил"
                                                value={seasonTranslations[product.season] || product.season}
                                                color="amber"
                                            />
                                            <InfoCard
                                                icon={<Grid className="w-4 h-4" />}
                                                label="Материал"
                                                value={product.material}
                                                color="gray"
                                            />
                                            <InfoCard
                                                icon={<ShoppingBag className="w-4 h-4" />}
                                                label="Сотилган"
                                                value={`${product.sold} та`}
                                                color="red"
                                            />
                                        </div>
                                    </div>

                                    {/* ТАВСИФ */}
                                    {product.description && product.description !== "empty" && (
                                        <div>
                                            <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-3">
                                                <FileText className="w-5 h-5 mr-2 text-gray-500" />
                                                Тавсиф
                                            </h3>
                                            <p className="text-gray-700 bg-gray-50 rounded-lg p-4">
                                                {product.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* ВАРИАНТЛАР */}
                                    {product.types && product.types.length > 0 && (
                                        <div>
                                            <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-4">
                                                <Hash className="w-5 h-5 mr-2 text-gray-500" />
                                                Модел Вариантлари
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {product.types.map((type, index) => (
                                                    <div
                                                        key={index}
                                                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <span className="font-medium text-gray-900">
                                                                    Ранг: {type.color}
                                                                </span>
                                                                <div className="text-sm text-gray-600 mt-1">
                                                                    Улчам: {type.size}
                                                                </div>
                                                            </div>
                                                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${type.count > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {type.count > 0 ? `${type.count} та` : "Йўқ"}
                                                            </div>
                                                        </div>
                                                        {type.style && type.style !== "classic" && (
                                                            <div className="text-sm text-gray-500">
                                                                Услуб: {type.style}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* QR КОД ССЫЛКА */}
                                    {product.qrCode && (
                                        <div className="pt-4 border-t border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <QrCode className="w-5 h-5 text-gray-500" />
                                                    <span className="font-medium text-gray-900">QR Код Ҳаволaси</span>
                                                </div>
                                                <a
                                                    href={product.qrCode}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    Кўриш
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* БУШ КАРТОЧКА */
                            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                                <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-gray-100 rounded-full">
                                    <Package className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Маҳсулот Маълумотлари
                                </h3>
                                <p className="text-gray-500 mb-6">
                                    QR кодини сканерланг, маҳсулот маълумотлари шу ерда кўринади
                                </p>
                                <div className="inline-flex items-center space-x-2 text-blue-600">
                                    <QrCode className="w-5 h-5" />
                                    <span className="text-sm font-medium">Сканерланг</span>
                                </div>
                            </div>
                        )}

                        {/* СТАТУС КАРТОЧКА */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-4">
                                <Shield className="w-5 h-5 mr-2 text-gray-500" />
                                Система Статуси
                            </h3>
                            <div className="space-y-3">
                                <StatusItem
                                    label="Камера Ҳолати"
                                    value={scanning ? "Фаол" : "Нофаол"}
                                    isActive={scanning}
                                />
                                <StatusItem
                                    label="Сервер Алоқаси"
                                    value={status === "error" ? "Хатолик" : "Нормал"}
                                    isActive={status !== "error"}
                                />
                                <StatusItem
                                    label="Маҳсулот Топилди"
                                    value={product ? "Ҳа" : "Йўқ"}
                                    isActive={!!product}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}

// ИНФО КАРТОЧКА КОМПОНЕНТИ
function InfoCard({ icon, label, value, color = "blue" }) {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-700",
        green: "bg-green-50 text-green-700",
        purple: "bg-purple-50 text-purple-700",
        amber: "bg-amber-50 text-amber-700",
        gray: "bg-gray-50 text-gray-700",
        red: "bg-red-50 text-red-700",
    };

    return (
        <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
                <div className={`p-1 rounded ${colorClasses[color]}`}>
                    {icon}
                </div>
                <span className="text-xs font-medium text-gray-500">{label}</span>
            </div>
            <p className="font-medium">{value}</p>
        </div>
    );
}

// СТАТУС ИТЕМ КОМПОНЕНТИ
function StatusItem({ label, value, isActive }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-gray-600">{label}</span>
            <div className="flex items-center space-x-2">
                <span className={`font-medium ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {value}
                </span>
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
        </div>
    );
}
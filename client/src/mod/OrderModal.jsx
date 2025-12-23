import {
  useState, useEffect, useContext, useCallback, useRef, useMemo
} from 'react'
import {
  Plus,
  Minus,
  Save,
  Search,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  MapPin,
  Users,
  Package,
  QrCode,
  Scan,
  Camera,
  Barcode,
  Hash,
  Maximize2,
  Minimize2,
  VideoOff,
  ArrowLeft,
  Trash2,
  Box,
  Upload,
  ImageIcon,
  FileImage
} from 'lucide-react'
import jsQR from 'jsqr'
import Fetch from '../middlewares/fetcher'
import { ContextData } from '../contextData/Context'
import { mutate } from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export const AddNewOrder = () => {
  const { user } = useContext(ContextData)
  const navigate = useNavigate()

  // State variables
  const [allOrders, setAllOrders] = useState([])
  const [selectedProducts, setSelectedProducts] = useState([])
  const [status, setStatus] = useState('Тасдиқланди')
  const [payType, setPayType] = useState('Нақд')
  const [totalPrice, setTotalPrice] = useState(0)
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [showClientsList, setShowClientsList] = useState(false)

  // Scanner states - yangi o'zgarishlar
  const [showScanner, setShowScanner] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scannerResult, setScannerResult] = useState('')
  const [scannerError, setScannerError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scannerFullscreen, setScannerFullscreen] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [scanningFor, setScanningFor] = useState('product') // yangi: product yoki model

  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const scannerContainerRef = useRef(null)
  const lastScannedRef = useRef(null)

  // Client data
  const [clientData, setClientData] = useState({
    clientId: '',
    name: '',
    phoneNumber: '',
    address: ''
  })

  // Fetch all orders for clients extraction
  const fetchAllOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const response = await Fetch.get('/orders')
      setAllOrders(response.data?.data || [])
    } catch (err) {
      console.error('❌ Буюртмаларни олишда хатолик:', err)
      setMessage({ type: 'error', text: 'Буюртмаларни юклашда хатолик!' })
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  // Extract clients from orders
  const clients = useMemo(() => {
    if (!allOrders.length) return []

    const clientsMap = {}
    allOrders.forEach(order => {
      if (order.client && order.client._id) {
        const clientId = order.client._id
        if (!clientsMap[clientId]) {
          clientsMap[clientId] = {
            ...order.client,
            _id: clientId,
            orders: []
          }
        }
        clientsMap[clientId].orders.push(order)
      }
    })
    return Object.values(clientsMap)
  }, [allOrders])

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const phoneMatch = !clientSearchQuery ||
        client.phoneNumber?.toLowerCase().includes(clientSearchQuery.toLowerCase())
      const nameMatch = !clientSearchQuery ||
        client.name?.toLowerCase().includes(clientSearchQuery.toLowerCase())
      return phoneMatch || nameMatch
    })
  }, [clients, clientSearchQuery])

  // ✅ YANGI: Scannerni boshlash funksiyasi (AddProduct dan)
  const startScan = useCallback(async () => {
    try {
      setScannerError('')
      setScannerResult('')
      stopScan() // Avvalgi streamlarni tozalash

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })

      videoRef.current.srcObject = stream
      videoRef.current.setAttribute('playsinline', true)

      videoRef.current.onloadedmetadata = async () => {
        try {
          await videoRef.current.play()
          setCameraActive(true)
          setScanning(true)
          scanLoop()
        } catch (playError) {
          console.error("Video play error:", playError)
          setScannerError("Камера видеоси ишлатилмади")
          stopScan()
        }
      }
    } catch (err) {
      console.error('Camera access error:', err)
      let errorMessage = 'Камера очилмади'

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Камерага рухсат берилмаган. Илтимос, браузер созламларида рухсат беринг.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Камера топилмади'
      }

      setScannerError(errorMessage)
    }
  }, [])

  // ✅ YANGI: Scan loop funksiyasi (AddProduct dan)
  const scanLoop = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }

    // Canvas o'lchamlarini o'rnatish
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, canvas.width, canvas.height)

      if (code?.data) {
        const scannedData = code.data
        setScannerResult(scannedData)

        // Agar bir xil kod qayta skanerlangan bo'lsa, e'tibor bermaslik
        if (scannedData !== lastScannedRef.current) {
          lastScannedRef.current = scannedData
          handleScannerSearch(scannedData)

          // Qisqa kutish va keyin scanning holatini o'chirish
          setTimeout(() => {
            setIsScanning(false)
            lastScannedRef.current = null
          }, 1000)
        }
        return
      }
    } catch (err) {
      console.error('QR scanning error:', err)
    }

    rafRef.current = requestAnimationFrame(scanLoop)
  }

  // ✅ YANGI: Scanner to'xtatish funksiyasi (AddProduct dan)
  const stopScan = () => {
    setScanning(false)
    setCameraActive(false)
    setIsScanning(false)
    setScannerError('')
    setScannerResult('')

    // requestAnimationFrame ni to'xtatish
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    // Video streamni to'xtatish
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }

  // ✅ YANGI: Scanner qidiruvi
  const handleScannerSearch = useCallback(async (modelId) => {
    if (!modelId.trim() || isScanning) return

    setScannerError('')
    setIsScanning(true)

    try {
      const response = await Fetch.get(`/products/qr/model/${modelId.trim()}`)

      if (response.data?.data) {
        const productTypeData = response.data.data
        const productInfo = response.data.productInfo

        // Mahsulot allaqachon tanlanganligini tekshirish
        const existingProduct = selectedProducts.find(
          (p) =>
            p.productId === productInfo._id &&
            p.model === productTypeData.model
        )

        if (existingProduct) {
          setSelectedProducts((prev) =>
            prev.map((p) =>
              p.productId === productInfo._id &&
                p.model === productTypeData.model
                ? { ...p, quantity: p.quantity + 1 }
                : p
            )
          )
          setMessage({
            type: 'success',
            text: `Махсулот миқдори ортди: ${existingProduct.title}`
          })
        } else {
          const newProduct = {
            _id: `${productInfo._id}-${productTypeData.model}`,
            productId: productInfo._id,
            title: productInfo.title,
            category: productInfo.category,
            model: productTypeData.model,
            color: productTypeData.color,
            size: productTypeData.size,
            style: productTypeData.style,
            price: 0,
            quantity: 1,
            count: productTypeData.count || 0,
            images: productTypeData.images || [],
            unit: 'дона'
          }

          setSelectedProducts((prev) => [...prev, newProduct])
          setMessage({
            type: 'success',
            text: `Махсулот қўшилди: ${productInfo.title}`
          })
        }

        setScannerResult('')
      }
    } catch (err) {
      console.error('❌ Сканнер хатолик:', err)
      setScannerError('Модель ID си бўйича махсулот топилмади')
      setMessage({ type: 'error', text: 'Махсулот топилмади!' })
      setIsScanning(false)
      lastScannedRef.current = null
    }
  }, [selectedProducts, isScanning])

  // ✅ YANGI: Manual scanner input
  const handleManualScanner = (e) => {
    e.preventDefault()
    if (scannerResult.trim() && !isScanning) {
      handleScannerSearch(scannerResult)
    }
  }

  // ✅ YANGI: Fullscreen toggle (AddProduct dan)
  const toggleScannerFullscreen = () => {
    if (!scannerContainerRef.current) return

    if (!scannerFullscreen) {
      if (scannerContainerRef.current.requestFullscreen) {
        scannerContainerRef.current.requestFullscreen()
      } else if (scannerContainerRef.current.webkitRequestFullscreen) {
        scannerContainerRef.current.webkitRequestFullscreen()
      } else if (scannerContainerRef.current.mozRequestFullScreen) {
        scannerContainerRef.current.mozRequestFullScreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen()
      }
    }
    setScannerFullscreen(!scannerFullscreen)
  }

  // ✅ YANGI: Fullscreen change event (AddProduct dan)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setScannerFullscreen(
        !!document.fullscreenElement ||
        !!document.webkitFullscreenElement ||
        !!document.mozFullScreenElement
      )
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Client functions...
  const handleSelectClient = client => {
    setClientData({
      clientId: client._id,
      name: client.name,
      phoneNumber: client.phoneNumber,
      address: client.address || ''
    })
    setShowClientsList(false)
    setClientSearchQuery('')
  }

  const handleClientChange = (field, value) => {
    setClientData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleClearClient = () => {
    setClientData({
      clientId: '',
      name: '',
      phoneNumber: '',
      address: ''
    })
    setClientSearchQuery('')
  }

  // Product functions...
  const handleQuantityChange = (id, delta) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p._id === id
          ? {
            ...p,
            quantity: Math.max(1, p.quantity + delta)
          }
          : p
      )
    )
  }

  const handlePriceChange = (id, price) => {
    const numPrice = Number(price) || 0
    setSelectedProducts(prev =>
      prev.map(p =>
        p._id === id
          ? { ...p, price: numPrice }
          : p
      )
    )
  }

  // Total price calculation
  useEffect(() => {
    const total = selectedProducts.reduce(
      (sum, item) => sum + (item.price || 0) * item.quantity,
      0
    )
    setTotalPrice(total)
  }, [selectedProducts])

  const handleInputQuantityChange = (id, value) => {
    const num = Number(value)
    if (isNaN(num) || num < 1) return

    setSelectedProducts(prev =>
      prev.map(p => {
        if (p._id === id) {
          return { ...p, quantity: num }
        }
        return p
      })
    )
  }

  const handleRemoveProduct = (id) => {
    setSelectedProducts(prev => prev.filter(p => p._id !== id))
  }

  // Submit order
  const handleSubmit = async e => {
    e.preventDefault()

    if (selectedProducts.length === 0) {
      return setMessage({
        type: 'error',
        text: 'Ҳеч қандай маҳсулот танланмаган! Сканнер ёрдамида маҳсулот қўшинг.'
      })
    }

    if (!clientData.name || !clientData.phoneNumber) {
      return setMessage({
        type: 'error',
        text: 'Мижоз маълумотларини тўлиқ киритинг!'
      })
    }

    const productsWithoutPrice = selectedProducts.filter(p => !p.price || p.price <= 0)
    if (productsWithoutPrice.length > 0) {
      return setMessage({
        type: 'error',
        text: `Ҳали нарх белгиланмаган маҳсулотлар бор: ${productsWithoutPrice.map(p => p.title).join(', ')}`
      })
    }

    setSubmitting(true)
    try {
      const orderData = {
        customer: user._id,
        products: selectedProducts.map(p => ({
          product: p.productId,
          model: p.model,
          amount: p.quantity,
          count: p.count || 0,
          unit: p.unit,
          price: p.price,
          variant: {
            color: p.color,
            size: p.size,
            style: p.style
          }
        })),
        ...(clientData.clientId ? { clientId: clientData.clientId } : {
          client: {
            name: clientData.name,
            phoneNumber: clientData.phoneNumber,
            address: clientData.address || '--'
          }
        }),
        status,
        payType,
        totalPrice: Number(totalPrice) || 0,
        orderDate: new Date()
      }

      await Fetch.post('/orders/new', orderData)

      setMessage({ type: 'success', text: 'Буюртма муваффақиятли яратилди ✅' })

      // SWR cache yangilash
      mutate('/orders')
      mutate('/products')
      mutate('/reports/daily')
      mutate('/reports/weekly')

      // Formani tozalash
      setSelectedProducts([])
      setStatus('Тасдиқланди')
      setPayType('Нақд')
      setTotalPrice(0)
      setClientData({
        clientId: '',
        name: '',
        phoneNumber: '',
        address: ''
      })
      setScannerResult('')

      // Scanner yopish
      if (showScanner) {
        stopScan()
        setShowScanner(false)
      }

      // Sahifani yangilash
      setTimeout(() => {
        navigate('/orders')
      }, 1500)
    } catch (err) {
      console.error('Buyurtma yaratish xatosi:', err)
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Буюртма яратишда хатолик ❌'
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    fetchAllOrders()

    return () => {
      // Scanner cleanup
      stopScan()

      // Fullscreen cleanup
      if (document.fullscreenElement) {
        document.exitFullscreen()
      }
    }
  }, [fetchAllOrders])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <ArrowLeft size={20} />
            Орқага
          </button>

          <div className='flex items-center gap-3'>
            <div className="bg-blue-100 p-3 rounded-xl">
              <Package size={28} className='text-blue-600' />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Янги буюртма яратиш
              </h1>
              <p className="text-gray-600">
                Сканнер ёрдамида маҳсулот қўшинг ва мижозни танланг
              </p>
            </div>
          </div>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 mb-6 p-4 rounded-xl border ${message.type === 'success'
              ? 'bg-green-100 text-green-700 border-green-200'
              : 'bg-red-100 text-red-700 border-red-200'
              }`}
          >
            {message.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className='font-medium'>{message.text}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className='space-y-8'>
          {/* Mijoz ma'lumotlari */}
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl border border-blue-200 p-6 shadow-sm">
            <div className='flex items-center justify-between mb-6'>
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Users size={20} className='text-blue-600' />
                Мижоз маълумотлари
              </h3>
              <button
                type='button'
                onClick={() => setShowClientsList(!showClientsList)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl transition-all duration-200"
              >
                <User size={16} />
                {showClientsList ? 'Янги мижоз' : 'Мавжуд мижоз'}
              </button>
            </div>

            {/* ... клиент формаси о'zgarmasdan ... */}
          </div>

          {/* ✅ YANGI: Camera Scanner Section - AddProduct ga o'xshab */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className='flex items-center justify-between mb-6'>
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Camera size={20} className='text-blue-600' />
                Камера Сканери
              </h3>
              <div className="flex items-center gap-3">
                {showScanner && (
                  <button
                    type="button"
                    onClick={toggleScannerFullscreen}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-200"
                  >
                    {scannerFullscreen ? (
                      <>
                        <Minimize2 size={16} />
                        Кичрайтириш
                      </>
                    ) : (
                      <>
                        <Maximize2 size={16} />
                        Катталаштириш
                      </>
                    )}
                  </button>
                )}

                {!showScanner ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowScanner(true)
                      setScanningFor('product')
                      setTimeout(() => startScan(), 100)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200"
                  >
                    <Camera size={16} />
                    Камерани очиш
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      stopScan()
                      setShowScanner(false)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200"
                  >
                    <VideoOff size={16} />
                    Камерани ёпиш
                  </button>
                )}
              </div>
            </div>

            {/* ✅ YANGI: Camera Preview - AddProduct style */}
            {showScanner ? (
              <div className="mb-6">
                <div
                  ref={scannerContainerRef}
                  className={`relative rounded-xl overflow-hidden ${scannerFullscreen
                    ? 'fixed inset-0 z-50 m-0 rounded-none bg-black'
                    : 'aspect-video bg-gray-900'
                    } mb-4 transition-all duration-300`}
                >
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />

                  {/* Loading indicator */}
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
                        <p className="text-white font-medium">Камера юкланмоқда...</p>
                      </div>
                    </div>
                  )}

                  {/* Scanning animation - AddProduct style */}
                  {scanning && cameraActive && (
                    <>
                      {/* Scanner border */}
                      <div className="absolute inset-0 border-2 border-blue-500/30 pointer-events-none"></div>

                      {/* Center scanning area */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                        {/* Corner borders */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-500"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-500"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500"></div>

                        {/* Scanning line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan">
                          <style jsx>{`
                            @keyframes scan {
                              0% { transform: translateY(0); }
                              50% { transform: translateY(256px); }
                              100% { transform: translateY(0); }
                            }
                            .animate-scan {
                              animation: scan 2s ease-in-out infinite;
                            }
                          `}</style>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="absolute bottom-4 left-0 right-0 text-center">
                        <div className="inline-block bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                          📷 QR кодни марказга келтиринг
                        </div>
                      </div>
                    </>
                  )}

                  {/* Scanning indicator */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                        <p className="text-gray-700 font-medium">Сканерлаш жараёнида...</p>
                      </div>
                    </div>
                  )}

                  {/* Camera controls */}
                  {scanning && (
                    <div className="absolute bottom-4 right-4">
                      <button
                        onClick={stopScan}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all hover:scale-105"
                      >
                        <VideoOff size={16} />
                        Тўхтатиш
                      </button>
                    </div>
                  )}
                </div>

                {/* Scanner info */}
                <div className="text-sm text-gray-600 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Scan size={16} />
                    <span>QR кодини камерага кўрсатинг</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <Barcode size={16} />
                    <span>Автоматик сканерлаш</span>
                  </div>
                </div>

                {/* Scanner status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  <div className='text-center p-3 bg-blue-50 rounded-lg'>
                    <div className='text-blue-600 text-xs mb-1'>СКАНЕР ҲОЛАТИ</div>
                    <div className='font-medium'>
                      {scanning ? (
                        <span className='text-green-600'>🟢 Фаол</span>
                      ) : (
                        <span className='text-yellow-600'>🟡 Ҳозирланмоқда</span>
                      )}
                    </div>
                  </div>

                  <div className='text-center p-3 bg-blue-50 rounded-lg'>
                    <div className='text-blue-600 text-xs mb-1'>СКАНЕРА ОЧИШ</div>
                    <button
                      onClick={scanning ? stopScan : startScan}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${scanning
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                    >
                      {scanning ? 'Тўхтатиш' : 'Бошлаш'}
                    </button>
                  </div>

                  <div className='text-center p-3 bg-blue-50 rounded-lg'>
                    <div className='text-blue-600 text-xs mb-1'>КАМЕРА РЕЖИМИ</div>
                    <div className='font-medium'>
                      {scannerFullscreen ? '📺 Тўлиқ экран' : '📱 Одатда'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200 mb-6">
                <Camera size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="font-medium text-gray-600">Камера очилмаган</p>
                <p className="text-sm text-gray-500 mt-1">
                  Камерани очиш учун тугмани босинг
                </p>
              </div>
            )}

            {/* ✅ YANGI: Manual Scanner Input - improved */}
            <div className="mb-6">
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={scannerResult}
                    onChange={(e) => setScannerResult(e.target.value)}
                    placeholder="QR код ёки модель ID сини киритинг..."
                    className="border bg-white border-gray-300 w-full p-4 rounded-xl pl-12 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    disabled={isScanning}
                  />
                  <QrCode
                    className='absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400'
                    size={20}
                  />
                  {scannerResult && (
                    <button
                      type='button'
                      onClick={() => setScannerResult('')}
                      className='absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  type='button'
                  onClick={handleManualScanner}
                  disabled={!scannerResult.trim() || isScanning}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Сканерлаш жараёнида...
                    </>
                  ) : (
                    <>
                      <Scan size={16} />
                      Қўлда киритиш
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Scanner Error */}
            {scannerError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle size={16} />
                  <span>{scannerError}</span>
                </div>
              </div>
            )}

            {/* Scanner Result */}
            {scannerResult && !scannerError && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-700 text-sm font-medium">
                      Сканланган натижа:
                    </p>
                    <p className="text-green-800 text-lg font-mono mt-1 break-all">
                      {scannerResult}
                    </p>
                  </div>
                  <button
                    onClick={() => setScannerResult('')}
                    className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                    title="Тозалаш"
                  >
                    <X size={16} className="text-green-600" />
                  </button>
                </div>
              </div>
            )}

            {/* ✅ YANGI: Selected Products */}
            {selectedProducts.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <CheckCircle size={20} className='text-green-600' />
                    Танланган маҳсулотлар ({selectedProducts.length})
                  </h4>
                  <div className="text-sm text-gray-600">
                    Жами: {totalPrice.toLocaleString()} сўм
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedProducts.map((item, index) => (
                    <ProductItem
                      key={item._id}
                      item={item}
                      index={index}
                      onQuantityChange={handleQuantityChange}
                      onInputQuantityChange={handleInputQuantityChange}
                      onPriceChange={handlePriceChange}
                      onRemove={handleRemoveProduct}
                    />
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Жами сумма:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {totalPrice.toLocaleString()} сўм
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for QR scanning */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Order Parameters */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Hash size={20} className='text-blue-600' />
              Буюртма параметрлари
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className='space-y-2'>
                <label className="text-sm font-semibold text-gray-800">
                  Ҳолат
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="border bg-white border-gray-300 w-full p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="Тасдиқланди">Тасдиқланди</option>
                  <option value="Юборилди">Юборилди</option>
                  <option value="Кутилмоқда">Кутилмоқда</option>
                  <option value="Бажарилган">Бажарилган</option>
                  <option value="Бекор қилинган">Бекор қилинган</option>
                </select>
              </div>

              <div className='space-y-2'>
                <label className="text-sm font-semibold text-gray-800">
                  Тўлов тури
                </label>
                <select
                  value={payType}
                  onChange={(e) => setPayType(e.target.value)}
                  className="border bg-white border-gray-300 w-full p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="Нақд">Нақд</option>
                  <option value="Карта">Карта</option>
                  <option value="Қарз">Қарз</option>
                  <option value="Бошқа">Бошқа</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit buttons */}
          <div className='flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200'>
            <button
              type='button'
              onClick={() => navigate(-1)}
              disabled={submitting}
              className='flex items-center justify-center gap-2 px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all duration-200 w-full sm:w-auto disabled:opacity-50'
            >
              <X size={20} />
              Бекор қилиш
            </button>

            <button
              type='submit'
              disabled={submitting || selectedProducts.length === 0}
              className='flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto flex-1'
            >
              {submitting ? (
                <Loader2 className='animate-spin' size={20} />
              ) : (
                <Save size={20} />
              )}
              {submitting ? 'Сақланмоқда...' : 'Буюртмани сақлаш'}
            </button>
          </div>
        </form>
      </div>

      {/* ✅ YANGI: Scanner Tips Modal */}
      <AnimatePresence>
        {showScanner && scannerFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[102]'
          >
            <div className='bg-black/70 text-white px-4 py-2 rounded-full text-sm'>
              📱 Камерани QR кодга қаратинг | 🌟 Ёруғроқ жойда сканлаш маъқул
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ProductItem component (o'zgarmasdan qoladi)
const ProductItem = ({
  item,
  index,
  onQuantityChange,
  onInputQuantityChange,
  onPriceChange,
  onRemove
}) => {
  const totalPrice = (item.price || 0) * item.quantity

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 transition-all duration-200 hover:bg-white hover:shadow-sm"
    >
      <div className='flex-1 min-w-0'>
        <div className='flex items-center justify-between mb-2'>
          <div className="font-medium text-gray-800 truncate mr-2">
            {item.title}
          </div>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            ID: {item.model}
          </span>
        </div>

        <div className='flex flex-wrap items-center gap-4 text-sm mb-3'>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Ранг:</span>
            <span className="font-medium text-gray-800">{item.color}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600">Ўлчам:</span>
            <span className="font-medium text-gray-800">{item.size}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600">Стиль:</span>
            <span className="font-medium text-gray-800">{item.style}</span>
          </div>
        </div>
      </div>

      <div className='flex flex-col md:flex-row items-center gap-4 ml-4'>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
            <input
              type="number"
              min="0"
              step="1000"
              value={item.price || ''}
              onChange={(e) => onPriceChange(item._id, e.target.value)}
              placeholder="Нарх"
              className="w-20 text-center border-0 bg-transparent outline-none text-gray-800"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">
              сўм
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
            <button
              type='button'
              onClick={() => onQuantityChange(item._id, -1)}
              className="p-1 bg-gray-100 hover:bg-gray-200 rounded-full transition disabled:opacity-50"
              disabled={item.quantity <= 1}
            >
              <Minus size={16} />
            </button>
            <input
              type='number'
              min='1'
              value={item.quantity}
              onChange={e => onInputQuantityChange(item._id, e.target.value)}
              className="w-16 text-center border-0 bg-transparent outline-none text-gray-800"
            />
            <button
              type='button'
              onClick={() => onQuantityChange(item._id, 1)}
              className="p-1 bg-gray-100 hover:bg-gray-200 rounded-full transition"
            >
              <Plus size={16} />
            </button>
            <span className="text-sm text-gray-500 whitespace-nowrap">
              дона
            </span>
          </div>

          <div className="text-sm text-gray-600 text-center">
            Жами: {totalPrice.toLocaleString()} сўм
          </div>
        </div>

        <button
          type='button'
          onClick={() => onRemove(item._id)}
          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition self-start md:self-center"
          title='Маҳсулотни ўчириш'
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  )
}
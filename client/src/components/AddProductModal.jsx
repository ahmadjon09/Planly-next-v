import {
  X,
  Loader2,
  Trash2,
  CheckCircle,
  Plus,
  Package,
  DollarSign,
  Ruler,
  Upload,
  Image as ImageIcon,
  Palette,
  Scissors,
  Layers,
  Eye,
  Grid,
  FileImage,
  IdCard,
  Camera,
  QrCode,
  Box,
  Maximize2, // Preview uchun
  Minimize2 // Preview uchun
} from 'lucide-react'
import { useState, useContext, useEffect, useRef } from 'react'
import Fetch from '../middlewares/fetcher'
import { ContextData } from '../contextData/Context'
import { motion, AnimatePresence } from 'framer-motion'
import jsQR from 'jsqr'

// Ranglar palettasi
const COLOR_PALETTE = [
  { name: 'Қора', value: '#000000', textColor: 'text-white' },
  { name: 'Оқ', value: '#FFFFFF', textColor: 'text-black' },
  { name: 'Қизил', value: '#FF0000', textColor: 'text-white' },
  { name: 'Кўк', value: '#0000FF', textColor: 'text-white' },
  { name: 'Яшил', value: '#00FF00', textColor: 'text-black' },
  { name: 'Сариқ', value: '#FFFF00', textColor: 'text-black' },
  { name: 'Қўнғир', value: '#8B4513', textColor: 'text-white' },
  { name: 'Кулранг', value: '#808080', textColor: 'text-white' },
  { name: 'Тилларанг', value: '#FFD700', textColor: 'text-black' },
  { name: 'Кумүш', value: '#C0C0C0', textColor: 'text-black' },
  { name: 'Қизил-қўк', value: '#800080', textColor: 'text-white' },
  { name: 'Тилла', value: '#FFA500', textColor: 'text-black' },
  { name: 'Кўк-яшил', value: '#008080', textColor: 'text-white' },
  { name: 'Мовий', value: '#000080', textColor: 'text-white' },
  { name: 'Малахит', value: '#00FF7F', textColor: 'text-black' },
  { name: 'Қизил-сариқ', value: '#FF4500', textColor: 'text-white' },
]

// Ўлчовлар
const SIZE_OPTIONS = [
  '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
  '46', '47', '48', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
  'One Size', '32', '34', '36-38', '38-40', '40-42', '42-44',
  '46-48', '48-50', '50-52', '52-54', '54-56'
]

// Стиллар
const STYLE_OPTIONS = [
  { value: 'classic', label: 'Классик' },
  { value: 'sport', label: 'Спорт' },
  { value: 'casual', label: 'Кэжуал' },
  { value: 'formal', label: 'Расмий' },
  { value: 'modern', label: 'Модерн' },
  { value: 'vintage', label: 'Винтаж' },
  { value: 'elegant', label: 'Элегант' },
  { value: 'street', label: 'Стрит' },
  { value: 'luxury', label: 'Люкс' },
  { value: 'minimal', label: 'Минимал' },
]

export default function AddProductModal({ open, setOpen, mutate }) {
  const { user, dark } = useContext(ContextData)

  const [productData, setProductData] = useState({
    title: '',
    sku: '',
    price: '',
    category: 'shoes',
    gender: 'men',
    season: 'all',
    material: 'Unknown',
    description: '',
    mainImages: [],
    types: []
  })

  const [variants, setVariants] = useState([
    {
      model: '', // Model maydoni qo'shildi
      color: '',
      size: '',
      style: 'classic',
      images: [],
      count: 0
    }
  ])

  const [mainImages, setMainImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedImages, setSelectedImages] = useState({})
  const [showImagePreview, setShowImagePreview] = useState(null)

  // QR Scanner states
  const [showScanner, setShowScanner] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState('')
  const [scanError, setScanError] = useState('')
  const [scanningFor, setScanningFor] = useState('') // 'sku' yoki 'model'
  const [cameraFullscreen, setCameraFullscreen] = useState(false) // Camera preview uchun

  const fileInputRef = useRef(null)
  const mainImagesInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const scannerContainerRef = useRef(null)
  const rafRef = useRef(null)

  // Tarjimalar
  const categories = [
    { value: 'sneakers', label: 'Сникерс' },
    { value: 'boots', label: 'Этик' },
    { value: 'heels', label: 'Каблук' },
    { value: 'sandals', label: 'Сандал' },
    { value: 'slippers', label: 'Тапоқ' },
    { value: 'shoes', label: 'Оёқ кийим' },
    { value: 'other', label: 'Бошқа' }
  ]

  const genders = [
    { value: 'men', label: 'Эркак' },
    { value: 'women', label: 'Аёл' },
    { value: 'kids', label: 'Болалар' },
    { value: 'unisex', label: 'Унисекс' }
  ]

  const seasons = [
    { value: 'summer', label: 'Ёз' },
    { value: 'winter', label: 'Қиш' },
    { value: 'spring', label: 'Баҳор' },
    { value: 'autumn', label: 'Күз' },
    { value: 'all', label: 'Барча фасл' }
  ]

  // Scanner functions
  const startScan = async (forWhat = 'sku') => {
    try {
      setScanningFor(forWhat)
      setScanError('')
      setScanResult('')
      setCameraFullscreen(false)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
      })

      videoRef.current.srcObject = stream
      videoRef.current.setAttribute('playsinline', true)
      await videoRef.current.play()
      setScanning(true)
      scanLoop()
    } catch (err) {
      console.error('Camera error:', err)
      setScanError('Камера очилмади. Илтимос, рухсат беринг.')
    }
  }

  const stopScan = () => {
    setScanning(false)
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => {
        t.stop()
      })
      videoRef.current.srcObject = null
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const scanLoop = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }

    // Canvas o'lchamlarini video o'lchamlariga moslashtirish
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, canvas.width, canvas.height)

      if (code?.data) {
        setScanResult(code.data)

        // Nima uchun scan qilinganligiga qarab malumotni joylashtirish
        if (scanningFor === 'sku') {
          setProductData(prev => ({ ...prev, sku: code.data }))
        } else if (scanningFor === 'model') {
          // Faqat joriy variant uchun modelni o'zgartirish
          const newVariants = [...variants]
          const lastIndex = newVariants.length - 1
          if (lastIndex >= 0) {
            newVariants[lastIndex].model = code.data
            setVariants(newVariants)
          }
        }

        // Scan qilinganidan keyin avtomatik stop
        setTimeout(() => {
          stopScan()
          setShowScanner(false)
        }, 1000)
        return
      }
    } catch (err) {
      console.error('QR scanning error:', err)
    }

    rafRef.current = requestAnimationFrame(scanLoop)
  }

  // Camera to'liq ekran rejimi
  const toggleCameraFullscreen = () => {
    if (!scannerContainerRef.current) return

    if (!cameraFullscreen) {
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
    setCameraFullscreen(!cameraFullscreen)
  }

  // Fullscreen o'zgarishlarini kuzatish
  useEffect(() => {
    const handleFullscreenChange = () => {
      setCameraFullscreen(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
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

  useEffect(() => {
    return () => {
      stopScan()
    }
  }, [])

  // 🔄 Asosiy maydonlarni o'zgartirish
  const handleChange = (field, value) => {
    if (field === 'price') {
      const filtered = value.replace(/[^\d]/g, '')
      setProductData(prev => ({
        ...prev,
        [field]: filtered
      }))
    } else {
      setProductData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  // 🔄 Variantni o'zgartirish
  const handleVariantChange = (index, field, value) => {
    const newVariants = [...variants]

    if (field === 'count') {
      newVariants[index][field] = Math.max(0, parseInt(value) || 0)
    } else if (field === 'color' || field === 'size' || field === 'model') {
      newVariants[index][field] = value.trim()
    } else {
      newVariants[index][field] = value
    }

    setVariants(newVariants)
  }

  // ➕ Yangi variant qo'shish
  const addVariant = () => {
    setVariants([...variants, {
      model: '',
      color: '',
      size: '',
      style: 'classic',
      images: [],
      count: 0
    }])
  }

  // ❌ Variantni o'chirish
  const removeVariant = (index) => {
    if (variants.length <= 1) {
      alert('Кам деганда битта вариант бўлиши керак!')
      return
    }

    if (!confirm('Бу вариантни ўчирмоқчимисиз?')) return

    const newVariants = [...variants]
    newVariants.splice(index, 1)
    setVariants(newVariants)

    setSelectedImages(prev => {
      const newSelected = { ...prev }
      delete newSelected[index]
      return newSelected
    })
  }

  // 📸 Rasm yuklash funksiyasi
  const uploadImage = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=955f1e37f0aa643262e734c080305b10`,
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await response.json();

      if (data && data.data && data.data.url) {
        return data.data.url;
      }

      throw new Error('Rasm yuklashda xatolik');
    } catch (error) {
      console.error('Rasm yuklashda xatolik:', error);
      throw error;
    }
  };

  // 📸 Asosiy rasmlarni yuklash
  const handleMainImagesUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    try {
      setImageUploading(true)
      const uploadedUrls = []

      for (const file of files) {
        try {
          const url = await uploadImage(file)
          uploadedUrls.push(url)
        } catch (error) {
          console.error(`Rasm yuklashda xatolik (${file.name}):`, error)
          alert(`"${file.name}" расмини юклашда хатолик`)
        }
      }

      if (uploadedUrls.length > 0) {
        setMainImages(prev => [...prev, ...uploadedUrls])
        setProductData(prev => ({
          ...prev,
          mainImages: [...prev.mainImages, ...uploadedUrls]
        }))
      }
    } catch (error) {
      console.error('Umumiy rasm yuklashda xatolik:', error)
      setError('❌ Расм юклашда хатолик!')
    } finally {
      setImageUploading(false)
      if (mainImagesInputRef.current) {
        mainImagesInputRef.current.value = ''
      }
    }
  }

  // 📸 Variant uchun rasmlarni yuklash
  const handleVariantImagesUpload = async (e, variantIndex) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    try {
      setImageUploading(true)
      const uploadedUrls = []

      for (const file of files) {
        try {
          const url = await uploadImage(file)
          uploadedUrls.push(url)
        } catch (error) {
          console.error(`Rasm yuklashda xatolik (${file.name}):`, error)
        }
      }

      if (uploadedUrls.length > 0) {
        const newVariants = [...variants]
        if (!newVariants[variantIndex].images) {
          newVariants[variantIndex].images = []
        }
        newVariants[variantIndex].images.push(...uploadedUrls)
        setVariants(newVariants)

        setSelectedImages(prev => ({
          ...prev,
          [variantIndex]: [...(prev[variantIndex] || []), ...uploadedUrls]
        }))
      }
    } catch (error) {
      console.error('Variant rasm yuklashda xatolik:', error)
      setError('❌ Расм юклашда хатолик!')
    } finally {
      setImageUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 🗑️ Asosiy rasmni o'chirish
  const removeMainImage = (imageIndex) => {
    setMainImages(prev => prev.filter((_, i) => i !== imageIndex))
    setProductData(prev => ({
      ...prev,
      mainImages: prev.mainImages.filter((_, i) => i !== imageIndex)
    }))
  }

  // 🗑️ Variant rasmini o'chirish
  const removeVariantImage = (variantIndex, imageIndex) => {
    const newVariants = [...variants]
    newVariants[variantIndex].images = newVariants[variantIndex].images.filter((_, i) => i !== imageIndex)
    setVariants(newVariants)

    setSelectedImages(prev => ({
      ...prev,
      [variantIndex]: (prev[variantIndex] || []).filter((_, i) => i !== imageIndex)
    }))
  }

  // ✅ Form validation - Asosiy qadam
  const validateStep1 = () => {
    if (!productData.title.trim()) {
      alert('❌ Маҳсулот номини киритинг')
      return false
    }

    if (!productData.price || Number(productData.price) <= 0) {
      alert('❌ Нархни тўғри киритинг')
      return false
    }

    return true
  }

  // ✅ Form validation - Variantlar qadami
  const validateStep2 = () => {
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i]

      if (!variant.model.trim()) {
        alert(`❌ ${i + 1}-вариант учун модель номини киритинг`)
        return false
      }

      if (!variant.color.trim()) {
        alert(`❌ ${i + 1}-вариант учун рангни киритинг`)
        return false
      }

      if (!variant.size.trim()) {
        alert(`❌ ${i + 1}-вариант учун ўлчамни киритинг`)
        return false
      }

      if (variant.count < 0) {
        alert(`❌ ${i + 1}-вариант учун сонини тўғри киритинг`)
        return false
      }
    }

    // Model nomlari takrorlanmasligi kerak
    const modelNames = variants.map(v => v.model.trim()).filter(Boolean)
    const uniqueModels = new Set(modelNames)

    if (modelNames.length !== uniqueModels.size) {
      alert('❌ Модель номлари такрорланмаслиги керак!')
      return false
    }

    return true
  }

  // 💾 Formani yuborish
  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return

    setLoading(true)
    try {
      const payload = {
        ...productData,
        price: Number(productData.price),
        types: variants.map(variant => ({
          model: variant.model, // Model qo'shildi
          color: variant.color,
          size: variant.size,
          style: variant.style,
          images: variant.images || [],
          count: Number(variant.count) || 0
        }))
      }

      const response = await Fetch.post('/products/create', payload)

      if (response.data.product) {
        mutate()
        resetForm()
        setOpen(false)
      }
    } catch (err) {
      console.error('Xatolik:', err)
      const errorMsg = err.response?.data?.message ||
        err.message ||
        '❌ Маҳсулот қўшишда хатолик юз берди'
      setError(errorMsg)
      alert(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // 🔄 Formani tozalash
  const resetForm = () => {
    setProductData({
      title: '',
      sku: '',
      price: '',
      category: 'shoes',
      gender: 'men',
      season: 'all',
      material: 'Unknown',
      description: '',
      mainImages: [],
      types: []
    })
    setVariants([{
      model: '',
      color: '',
      size: '',
      style: 'classic',
      images: [],
      count: 0
    }])
    setMainImages([])
    setSelectedImages({})
    setCurrentStep(1)
    setError('')
    setShowScanner(false)
    setCameraFullscreen(false)
    stopScan()
  }

  // Dark mode styles
  const modalBg = dark ? 'bg-gray-900' : 'bg-white'
  const textColor = dark ? 'text-white' : 'text-gray-800'
  const textMuted = dark ? 'text-gray-300' : 'text-gray-600'
  const borderColor = dark ? 'border-gray-700' : 'border-gray-200'
  const inputBg = dark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
  const cardBg = dark ? 'bg-gray-800/50 border-gray-700' : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
  const hoverBg = dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/60 backdrop-blur-sm z-[99]'
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className='fixed inset-0 flex items-center justify-center z-[100] px-3 sm:px-6 py-6'>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`${modalBg} w-full max-w-6xl rounded-3xl shadow-2xl p-6 sm:p-8 space-y-8 relative max-h-[95vh] overflow-y-auto ${borderColor} border`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b ${borderColor}`}>
                <div className='flex items-center gap-4'>
                  <div className='p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg'>
                    <Plus className='h-7 w-7 text-white' />
                  </div>
                  <div>
                    <h2 className={`text-2xl sm:text-3xl font-bold ${textColor}`}>
                      Янги маҳсулот қўшиш
                    </h2>
                    <p className={`text-sm ${textMuted} mt-2`}>
                      {currentStep === 1 ? 'Асосий маълумотлар' : 'Вариантлар (модель, ранг ва ўлчамлар)'}
                    </p>
                  </div>
                </div>

                {/* Progress Steps */}
                <div className='flex items-center gap-4'>
                  <div className='flex items-center gap-2'>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${currentStep === 1
                      ? 'bg-blue-500 text-white'
                      : dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                      }`}>
                      1. Асосий
                    </div>
                    <div className='w-4 h-px bg-gray-300 dark:bg-gray-700'></div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${currentStep === 2
                      ? 'bg-purple-500 text-white'
                      : dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                      }`}>
                      2. Вариантлар
                    </div>
                  </div>

                  <button
                    onClick={() => setOpen(false)}
                    className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Step 1: Asosiy ma'lumotlar */}
              {currentStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`rounded-3xl border p-6 sm:p-8 ${cardBg}`}
                >
                  <div className='flex items-center gap-4 mb-8'>
                    <div className='p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg'>
                      <Package className='h-6 w-6 text-white' />
                    </div>
                    <div>
                      <h3 className={`font-bold text-xl ${textColor}`}>
                        Асосий маълумотлар
                      </h3>
                      <p className={`text-sm ${textMuted}`}>
                        Маҳсулотнинг умумий параметрлари
                      </p>
                    </div>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {/* 🔹 Номи */}
                    <div className='space-y-3'>
                      <label className={`text-sm font-semibold flex items-center gap-2 ${textColor}`}>
                        <Package size={16} className='text-blue-500' />
                        Номи <span className='text-red-500'>*</span>
                      </label>
                      <input
                        type='text'
                        value={productData.title}
                        onChange={e => handleChange('title', e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${inputBg}`}
                        placeholder='Маҳсулот номи'
                        required
                      />
                    </div>

                    {/* 💰 Нархи */}
                    <div className='space-y-3'>
                      <label className={`text-sm font-semibold flex items-center gap-2 ${textColor}`}>
                        <DollarSign size={16} className='text-green-500' />
                        Нархи (сўм) <span className='text-red-500'>*</span>
                      </label>
                      <input
                        type='text'
                        value={productData.price}
                        onChange={e => handleChange('price', e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${inputBg}`}
                        placeholder='100000'
                        required
                      />
                    </div>

                    {/* 📦 SKU with Scanner */}
                    <div className='space-y-3'>
                      <label className={`text-sm font-semibold flex items-center justify-between ${textColor}`}>
                        <div className='flex items-center gap-2'>
                          <IdCard size={16} className='text-blue-500' />
                          SKU
                        </div>
                        <button
                          type='button'
                          onClick={() => setShowScanner(true)}
                          className='flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors'
                        >
                          <QrCode size={12} />
                          Сканер
                        </button>
                      </label>
                      <div className='relative'>
                        <input
                          type='text'
                          value={productData.sku}
                          onChange={e => handleChange('sku', e.target.value)}
                          className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-10 ${inputBg}`}
                          placeholder='SKU'
                        />
                        {productData.sku && (
                          <button
                            type='button'
                            onClick={() => handleChange('sku', '')}
                            className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 📂 Категория */}
                    <div className='space-y-3'>
                      <label className={`text-sm font-semibold ${textColor}`}>
                        Категория <span className='text-red-500'>*</span>
                      </label>
                      <select
                        value={productData.category}
                        onChange={e => handleChange('category', e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${inputBg}`}
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 👤 Жинс */}
                    <div className='space-y-3'>
                      <label className={`text-sm font-semibold ${textColor}`}>
                        Жинс
                      </label>
                      <select
                        value={productData.gender}
                        onChange={e => handleChange('gender', e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${inputBg}`}
                      >
                        {genders.map(g => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 🌸 Фасл */}
                    <div className='space-y-3'>
                      <label className={`text-sm font-semibold ${textColor}`}>
                        Фасл
                      </label>
                      <select
                        value={productData.season}
                        onChange={e => handleChange('season', e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${inputBg}`}
                      >
                        {seasons.map(s => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>
                  {/* Материал ва тавсиф */}
                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8'>
                    {/* Материал */}
                    <div className='space-y-3'>
                      <label className={`text-sm font-semibold flex items-center gap-2 ${textColor}`}>
                        <Scissors size={16} className='text-orange-500' />
                        Материал
                      </label>
                      <input
                        type='text'
                        value={productData.material}
                        onChange={e => handleChange('material', e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${inputBg}`}
                        placeholder='Чарм, мато, пластмасса...'
                      />
                    </div>

                    {/* Тавсиф */}
                    <div className='space-y-3'>
                      <label className={`text-sm font-semibold ${textColor}`}>
                        Қўшимча тавсиф
                      </label>
                      <textarea
                        value={productData.description}
                        onChange={e => handleChange('description', e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[120px] ${inputBg}`}
                        placeholder='Маҳсулот ҳақида қўшимча маълумот...'
                        rows={4}
                      />
                    </div>
                  </div>

                  {/* 📸 Асосий расмлар */}
                  <div className='mt-8'>
                    <div className='flex items-center justify-between mb-6'>
                      <div className='flex items-center gap-3'>
                        <div className='p-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500'>
                          <ImageIcon className='h-5 w-5 text-white' />
                        </div>
                        <div>
                          <h4 className={`font-semibold ${textColor}`}>
                            Асосий расмлар
                          </h4>
                          <p className={`text-xs ${textMuted}`}>
                            Маҳсулотнинг асосий кўриниш расмлари
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm ${textMuted}`}>
                        {mainImages.length} та расм
                      </span>
                    </div>

                    {/* File input */}
                    <div className='mb-6'>
                      <input
                        type="file"
                        id="main-images"
                        multiple
                        accept="image/*"
                        onChange={handleMainImagesUpload}
                        className="hidden"
                        disabled={imageUploading}
                        ref={mainImagesInputRef}
                      />
                      <label
                        htmlFor="main-images"
                        className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all hover:scale-[1.02] ${dark
                          ? 'border-gray-600 hover:border-blue-500 hover:bg-blue-900/20'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                          } ${imageUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {imageUploading ? (
                          <Loader2 className='h-5 w-5 animate-spin text-gray-400' />
                        ) : (
                          <Upload className='h-5 w-5 text-gray-400' />
                        )}
                        <span className='font-medium'>
                          {imageUploading ? 'Юкланмоқда...' : 'Расмларни юкланг (бир нечта танлаш мумкин)'}
                        </span>
                      </label>
                    </div>

                    {/* Preview images */}
                    {mainImages.length > 0 && (
                      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                        {mainImages.map((img, idx) => (
                          <div key={idx} className='relative group'>
                            <div className='aspect-square rounded-xl overflow-hidden border-2 border-transparent group-hover:border-blue-500 transition-all duration-300'>
                              <img
                                src={img}
                                alt={`Main ${idx + 1}`}
                                className='w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300'
                                onClick={() => setShowImagePreview(img)}
                              />
                            </div>
                            <button
                              onClick={() => removeMainImage(idx)}
                              className='absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:scale-110'
                              title='Ўчириш'
                            >
                              <X size={14} />
                            </button>
                            <div className='absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full'>
                              {idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className='flex justify-end gap-4 mt-10 pt-8 border-t border-gray-200 dark:border-gray-700'>
                    <button
                      onClick={() => setOpen(false)}
                      className={`px-8 py-3 rounded-xl border-2 transition-all font-medium ${dark
                        ? 'border-gray-600 hover:bg-gray-700 text-white'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                        } hover:scale-105`}
                    >
                      Бекор қилиш
                    </button>
                    <button
                      onClick={() => {
                        if (validateStep1()) {
                          setCurrentStep(2)
                        }
                      }}
                      className='flex items-center gap-3 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-medium'
                    >
                      <Layers className='h-5 w-5' />
                      Вариантларга ўтиш ({variants.length})
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Variantlar */}
              {currentStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className='space-y-6'
                >
                  <div className={`rounded-3xl border p-6 sm:p-8 ${cardBg}`}>
                    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
                      <div className='flex items-center gap-4'>
                        <div className='p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg'>
                          <Palette className='h-6 w-6 text-white' />
                        </div>
                        <div>
                          <h3 className={`font-bold text-xl ${textColor}`}>
                            Вариантлар (Модель, ранг ва ўлчамлар)
                          </h3>
                          <p className={`text-sm ${textMuted}`}>
                            Ҳар бир модель ранг-ўлчам жуфти учун алохида миқдор ва расм
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center gap-4'>
                        <span className={`text-sm ${textMuted}`}>
                          {variants.length} та вариант
                        </span>
                        <button
                          onClick={addVariant}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105 ${dark
                            ? 'bg-purple-700 hover:bg-purple-600 text-white'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                            }`}
                        >
                          <Plus size={16} />
                          Вариант қўшиш
                        </button>
                      </div>
                    </div>

                    {/* Variantlar ro'yxati */}
                    {variants.map((variant, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`rounded-2xl border p-6 mb-6 last:mb-0 transition-all duration-300 hover:shadow-xl ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}
                      >
                        {/* Variant header */}
                        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b ${borderColor}`}>
                          <div className='flex items-center gap-3'>
                            <div className='p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500'>
                              <Grid className='h-5 w-5 text-white' />
                            </div>
                            <div>
                              <h4 className={`font-semibold ${textColor}`}>
                                Вариант #{index + 1}
                              </h4>
                              <p className={`text-xs ${textMuted}`}>
                                Модель: {variant.model || '—'} | Ранг: {variant.color || '—'} | Ўлчам: {variant.size || '—'} | Сони: {variant.count}
                              </p>
                            </div>
                          </div>

                          <div className='flex items-center gap-2'>
                            {variants.length > 1 && (
                              <button
                                onClick={() => removeVariant(index)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 ${dark
                                  ? 'text-red-400 hover:bg-red-900/50'
                                  : 'text-red-600 hover:bg-red-50'
                                  }`}
                              >
                                <Trash2 size={16} />
                                Ўчириш
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Variant form */}
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6'>
                          {/* Модель номи */}
                          <div className='space-y-3 lg:col-span-2'>
                            <label className={`text-sm font-semibold flex items-center justify-between ${textColor}`}>
                              <div className='flex items-center gap-2'>
                                <Box size={16} className='text-purple-500' />
                                Модель номи <span className='text-red-500'>*</span>
                              </div>
                              <button
                                type='button'
                                onClick={() => {
                                  setScanningFor('model')
                                  setShowScanner(true)
                                }}
                                className='flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors'
                              >
                                <QrCode size={10} />
                                Сканер
                              </button>
                            </label>
                            <div className='relative'>
                              <input
                                type='text'
                                value={variant.model}
                                onChange={e => handleVariantChange(index, 'model', e.target.value)}
                                className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${inputBg}`}
                                placeholder='Модель номи (масалан: Air Max 270)'
                                required
                              />
                              {variant.model && (
                                <button
                                  type='button'
                                  onClick={() => handleVariantChange(index, 'model', '')}
                                  className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Ранг */}
                          <div className='space-y-3'>
                            <label className={`text-sm font-semibold ${textColor}`}>
                              Ранг <span className='text-red-500'>*</span>
                            </label>
                            <div className='relative'>
                              <input
                                type='text'
                                value={variant.color}
                                onChange={e => handleVariantChange(index, 'color', e.target.value)}
                                className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${inputBg}`}
                                placeholder='Қора, оқ, кўк...'
                                list={`colors-${index}`}
                                required
                              />
                              <datalist id={`colors-${index}`}>
                                {COLOR_PALETTE.map(color => (
                                  <option key={color.name} value={color.name} />
                                ))}
                              </datalist>
                            </div>
                            <div className='flex flex-wrap gap-2 mt-2'>
                              {COLOR_PALETTE.slice(0, 6).map(color => (
                                <button
                                  key={color.name}
                                  type='button'
                                  onClick={() => handleVariantChange(index, 'color', color.name)}
                                  className='h-6 w-6 rounded-full border-2 transition-transform hover:scale-110'
                                  style={{ backgroundColor: color.value }}
                                  title={color.name}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Ўлчам */}
                          <div className='space-y-3'>
                            <label className={`text-sm font-semibold ${textColor}`}>
                              Ўлчам <span className='text-red-500'>*</span>
                            </label>
                            <div className='relative'>
                              <select
                                value={variant.size}
                                onChange={e => handleVariantChange(index, 'size', e.target.value)}
                                className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${inputBg}`}
                                required
                              >
                                <option value=''>Танланг</option>
                                {SIZE_OPTIONS.map(size => (
                                  <option key={size} value={size}>{size}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Сони */}
                          <div className='space-y-3'>
                            <label className={`text-sm font-semibold ${textColor}`}>
                              Сони <span className='text-red-500'>*</span>
                            </label>
                            <div className='relative'>
                              <input
                                type='number'
                                min='0'
                                value={variant.count}
                                onChange={e => handleVariantChange(index, 'count', e.target.value)}
                                className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${inputBg}`}
                                placeholder='0'
                                required
                              />
                              <div className='absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1'>
                                <button
                                  type='button'
                                  onClick={() => handleVariantChange(index, 'count', Math.max(0, (variant.count || 0) - 1))}
                                  className={`p-1.5 rounded-lg ${dark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                                >
                                  <span className='h-3 w-3 flex items-center justify-center'>-</span>
                                </button>
                                <button
                                  type='button'
                                  onClick={() => handleVariantChange(index, 'count', (variant.count || 0) + 1)}
                                  className={`p-1.5 rounded-lg ${dark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Стиль (алохита қаторда) */}
                        <div className='mt-4'>
                          <label className={`text-sm font-semibold ${textColor}`}>
                            Стиль
                          </label>
                          <select
                            value={variant.style}
                            onChange={e => handleVariantChange(index, 'style', e.target.value)}
                            className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all mt-1 ${inputBg}`}
                          >
                            {STYLE_OPTIONS.map(style => (
                              <option key={style.value} value={style.value}>
                                {style.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Variant rasmlari */}
                        <div className='mt-6'>
                          <div className='flex items-center justify-between mb-4'>
                            <div className='flex items-center gap-3'>
                              <div className='p-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500'>
                                <FileImage className='h-4 w-4 text-white' />
                              </div>
                              <div>
                                <h5 className={`font-medium ${textColor}`}>
                                  Ушбу вариант учун расмлар
                                </h5>
                                <p className={`text-xs ${textMuted}`}>
                                  {variant.images?.length || 0} та расм
                                </p>
                              </div>
                            </div>
                            <div className='flex items-center gap-2'>
                              <input
                                type="file"
                                id={`variant-images-${index}`}
                                multiple
                                accept="image/*"
                                onChange={(e) => handleVariantImagesUpload(e, index)}
                                className="hidden"
                                disabled={imageUploading}
                                ref={fileInputRef}
                              />
                              <label
                                htmlFor={`variant-images-${index}`}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all hover:scale-105 ${dark
                                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                  }`}
                              >
                                <Upload size={14} />
                                Расм қўшиш
                              </label>
                            </div>
                          </div>

                          {/* Preview images */}
                          {variant.images && variant.images.length > 0 ? (
                            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3'>
                              {variant.images.map((img, imgIndex) => (
                                <div key={imgIndex} className='relative group'>
                                  <div className='aspect-square rounded-lg overflow-hidden border-2 border-transparent group-hover:border-purple-500 transition-all duration-300'>
                                    <img
                                      src={img}
                                      alt={`Variant ${index + 1} - ${imgIndex + 1}`}
                                      className='w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300'
                                      onClick={() => setShowImagePreview(img)}
                                    />
                                  </div>
                                  <button
                                    onClick={() => removeVariantImage(index, imgIndex)}
                                    className='absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:scale-110'
                                    title='Ўчириш'
                                  >
                                    <X size={12} />
                                  </button>
                                  <div className='absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full'>
                                    {imgIndex + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className='text-center py-8 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700'>
                              <FileImage className='h-12 w-12 mx-auto text-gray-400 mb-3' />
                              <p className={`text-sm ${textMuted}`}>
                                Ушбу вариант учун расмлар мавжуд эмас
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Navigation Buttons */}
                  <div className='flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200 dark:border-gray-700'>
                    <div className={`text-sm ${textMuted}`}>
                      Жами: {variants.length} та вариант |
                      Уникал модельлар: {new Set(variants.map(v => v.model).filter(Boolean)).size} |
                      Дона: {variants.reduce((sum, v) => sum + (v.count || 0), 0)} |
                      Расм: {variants.reduce((sum, v) => sum + (v.images?.length || 0), 0)}
                    </div>

                    <div className='flex flex-col sm:flex-row gap-4 w-full sm:w-auto'>
                      <button
                        onClick={() => setCurrentStep(1)}
                        className={`px-8 py-3 rounded-xl border-2 transition-all font-medium ${dark
                          ? 'border-gray-600 hover:bg-gray-700 text-white'
                          : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                          } hover:scale-105`}
                      >
                        Ортга қайтиш
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={loading || imageUploading}
                        className='flex items-center justify-center gap-3 px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-medium'
                      >
                        {loading ? (
                          <>
                            <Loader2 className='h-5 w-5 animate-spin' />
                            Сақланишда...
                          </>
                        ) : (
                          <>
                            <CheckCircle className='h-5 w-5' />
                            Маҳсулотни сақлаш ({variants.length} вариант)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl ${dark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'} border`}
                >
                  <p className='text-red-500 text-sm'>{error}</p>
                </motion.div>
              )}

              {/* Footer info */}
              <div className={`text-center text-sm pt-4 ${textMuted}`}>
                <div className={`p-4 rounded-lg ${dark ? 'bg-blue-900/20' : 'bg-blue-50/50'}`}>
                  <p className='font-semibold mb-2'>📝 Эслатма:</p>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-left'>
                    <div className='space-y-1'>
                      <li><span className='font-semibold'>Ном, нарх ва модель</span> мажбурий майдонлар</li>
                      <li>Ҳар бир вариант учун <span className='font-semibold'>модель, ранг, ўлчам ва сони</span> мажбурий</li>
                      <li>Модель номлари уникал бўлиши шарт</li>
                    </div>
                    <div className='space-y-1'>
                      <li>SKU ва модель номи учун QR сканер ишлатиш мумкин</li>
                      <li>Сони 0 бўлса, маҳсулот сотилган деб ҳисобланади</li>
                      <li>Бир вариантнинг бир нечта расми бўлиши мумкин</li>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* QR Scanner Modal */}
          <AnimatePresence>
            {showScanner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='fixed inset-0 bg-black/90 backdrop-blur-sm z-[101] flex items-center justify-center p-4'
                onClick={() => {
                  setShowScanner(false)
                  stopScan()
                }}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  ref={scannerContainerRef}
                  className={`relative ${cameraFullscreen ? 'w-screen h-screen' : 'max-w-4xl w-full'} bg-gray-900 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300`}
                  onClick={e => e.stopPropagation()}
                >
                  <div className='p-4 sm:p-6 bg-gradient-to-r from-blue-700 to-blue-900'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <Camera className='h-6 w-6 text-white' />
                        <h3 className='text-xl font-bold text-white'>
                          QR код сканер {scanningFor === 'model' ? '(Модель)' : '(SKU)'}
                        </h3>
                      </div>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={toggleCameraFullscreen}
                          className='p-2 hover:bg-blue-800 rounded-lg transition-colors text-white'
                          title={cameraFullscreen ? 'Кичрайтириш' : 'Катталаштириш'}
                        >
                          {cameraFullscreen ? (
                            <Minimize2 className='h-5 w-5' />
                          ) : (
                            <Maximize2 className='h-5 w-5' />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowScanner(false)
                            stopScan()
                          }}
                          className='p-2 hover:bg-blue-800 rounded-lg transition-colors'
                        >
                          <X className='h-5 w-5 text-white' />
                        </button>
                      </div>
                    </div>
                    <p className='text-blue-200 text-sm mt-2'>
                      {scanningFor === 'model'
                        ? 'Модель номи учун QR кодни камерага кўрсатинг'
                        : 'SKU учун QR кодни камерага кўрсатинг'}
                    </p>
                  </div>

                  <div className='p-4'>
                    {scanError && (
                      <div className='mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg'>
                        <p className='text-red-300 text-sm'>{scanError}</p>
                      </div>
                    )}

                    <div className='relative'>
                      <div className='relative rounded-xl overflow-hidden bg-black'>
                        <video
                          ref={videoRef}
                          className={`w-full ${cameraFullscreen ? 'h-[calc(100vh-180px)]' : 'h-[500px]'} object-cover`}
                          playsInline
                          autoPlay
                          muted
                        />

                        {/* Scanning overlay */}
                        {scanning && (
                          <>
                            {/* Scanner border */}
                            <div className='absolute inset-0 border-2 border-blue-500/30 pointer-events-none'></div>

                            {/* Center scanning area */}
                            <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64'>
                              {/* Corner borders */}
                              <div className='absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500'></div>
                              <div className='absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-500'></div>
                              <div className='absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-500'></div>
                              <div className='absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500'></div>

                              {/* Scanning line */}
                              <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan'>
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
                            <div className='absolute bottom-4 left-0 right-0 text-center'>
                              <div className='inline-block bg-black/70 text-white px-4 py-2 rounded-full text-sm'>
                                📷 QR кодни марказга келтиринг
                              </div>
                            </div>
                          </>
                        )}

                        {/* Camera controls */}
                        <div className='absolute bottom-4 right-4 flex items-center gap-2'>
                          {!scanning && (
                            <button
                              onClick={() => startScan(scanningFor)}
                              className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all hover:scale-105'
                            >
                              <Camera className='h-4 w-4' />
                              Сканерни бошлаш
                            </button>
                          )}
                        </div>
                      </div>

                      <canvas
                        ref={canvasRef}
                        className='hidden'
                      />
                    </div>

                    {scanResult && (
                      <div className='mt-4 p-4 bg-green-900/30 border border-green-700 rounded-xl'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-green-300 text-sm font-medium'>
                              Муваффақиятли сканланди:
                            </p>
                            <p className='text-green-400 text-lg font-mono mt-1 break-all'>
                              {scanResult}
                            </p>
                            <p className='text-green-400 text-xs mt-2'>
                              {scanningFor === 'model'
                                ? 'Модель майдонга автомат равишда киритилди'
                                : 'SKU майдонга автомат равишда киритилди'}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setScanResult('')
                              startScan(scanningFor)
                            }}
                            className='p-2 hover:bg-green-800 rounded-lg transition-colors'
                            title='Янги скан'
                          >
                            <Camera className='h-5 w-5 text-green-300' />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className='mt-4 space-y-3'>
                      <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                        <div className='text-center p-3 bg-blue-900/30 rounded-lg'>
                          <div className='text-blue-300 text-xs mb-1'>СКАНЕР ҲОЛАТИ</div>
                          <div className='text-white font-medium'>
                            {scanning ? (
                              <span className='text-green-400'>🟢 Фаол</span>
                            ) : (
                              <span className='text-yellow-400'>🟡 Ҳозирланмоқда</span>
                            )}
                          </div>
                        </div>

                        <div className='text-center p-3 bg-blue-900/30 rounded-lg'>
                          <div className='text-blue-300 text-xs mb-1'>СКАНЕРА ОЧИШ</div>
                          <button
                            onClick={() => scanning ? stopScan() : startScan(scanningFor)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${scanning
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                          >
                            {scanning ? 'Тўхтатиш' : 'Бошлаш'}
                          </button>
                        </div>

                        <div className='text-center p-3 bg-blue-900/30 rounded-lg'>
                          <div className='text-blue-300 text-xs mb-1'>КАМЕРА РЕЖИМИ</div>
                          <div className='text-white font-medium'>
                            {cameraFullscreen ? '📺 Тўлиқ экран' : '📱 Одатда'}
                          </div>
                        </div>
                      </div>

                      <div className='text-center p-3 bg-gray-800/50 rounded-lg'>
                        <p className='text-gray-400 text-sm'>
                          📱 Камерани QR кодга қаратинг |
                          🌟 Ёруғроқ жойда сканлаш маъқул |
                          ⚡ Автоматик таниш
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image Preview Modal */}
          <AnimatePresence>
            {showImagePreview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='fixed inset-0 bg-black/90 backdrop-blur-sm z-[101] flex items-center justify-center p-4'
                onClick={() => setShowImagePreview(null)}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className='relative max-w-4xl max-h-[90vh]'
                  onClick={e => e.stopPropagation()}
                >
                  <img
                    src={showImagePreview}
                    alt='Preview'
                    className='w-full h-full object-contain rounded-lg'
                  />
                  <button
                    onClick={() => setShowImagePreview(null)}
                    className='absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors'
                  >
                    <X size={20} />
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}


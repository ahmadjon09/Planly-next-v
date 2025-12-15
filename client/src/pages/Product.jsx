import { useState, useContext, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import {
  Boxes,
  Loader2,
  Plus,
  Save,
  Eye,
  Hash,
  Tag,
  DollarSign,
  Package,
  Ruler,
  Calendar,
  CheckCircle,
  XCircle,
  Circle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Image as ImageIcon,
  Palette,
  Edit,
  Layers,
  BarChart3,
  ShoppingBag
} from 'lucide-react'
import Fetch from '../middlewares/fetcher'
import AddProductModal from '../components/AddProductModal'
import { ContextData } from '../contextData/Context'
import { LoadingState } from '../components/loading-state'
import { motion, AnimatePresence } from 'framer-motion'
import VariantManagerModal from '../components/VariantManagerModal'

export const ProductsPage = () => {
  const { user, dark } = useContext(ContextData)
  const { type } = useParams()
  const navigate = useNavigate()

  // Pagination and search states
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('title')
  const [category, setCategory] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Modal states
  const [open, setOpen] = useState(false)
  const [viewData, setViewData] = useState(null)
  const [variantManagerOpen, setVariantManagerOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [editing, setEditing] = useState({})
  const [loading, setLoading] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Build API endpoint
  const apiEndpoint = useMemo(() => {
    const params = new URLSearchParams()
    params.append('page', page)
    params.append('limit', 50)
    params.append('search', debouncedSearch || '')
    params.append('searchField', searchField)
    if (category) params.append('category', category)
    if (searchDate) params.append('date', searchDate)
    return `/products?${params.toString()}`
  }, [page, debouncedSearch, searchField, category, searchDate])

  const { data, error, isLoading, mutate } = useSWR(apiEndpoint, Fetch, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true
  })

  // Format number
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "0"
    if (!Number.isInteger(num)) {
      return (Math.round(num * 10) / 10).toLocaleString('uz-UZ')
    }
    return num.toLocaleString('uz-UZ')
  }

  // Calculate total stock from variants
  const calculateTotalStock = (product) => {
    return product.types.reduce((sum, variant) => sum + (variant.count || 0), 0)
  }

  // Calculate total variants
  const calculateTotalVariants = (product) => {
    return product.types.length
  }

  // Handle edit changes
  const handleChange = (id, field, value) => {
    setEditing(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }))
  }

  // Save product
  const handleSave = async id => {
    try {
      setLoading(id)
      const updateData = {
        price: parseFloat(editing[id].price) || 0,
        title: editing[id].title,
        category: editing[id].category,
        gender: editing[id].gender,
        season: editing[id].season,
        material: editing[id].material,
        description: editing[id].description,
        sku: editing[id].sku
      }

      await Fetch.put(`/products/${id}`, updateData)
      setEditing(prev => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })
      mutate()
    } catch (err) {
      console.error('Update error:', err)
      alert('❌ Сақлашда хатолик юз берди')
    } finally {
      setLoading(null)
    }
  }

  // Delete product
  const handleDelete = async (id) => {
    try {
      setDeleting(id)
      await Fetch.delete(`/products/${id}`)
      mutate()
      setDeleteConfirm(null)
      // alert('✅ Маҳсулот муваффақиятли ўчирилди')
    } catch (err) {
      console.error('Delete error:', err)
      alert('❌ Ўчиришда хатолик юз берди')
    } finally {
      setDeleting(null)
    }
  }

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Open variant manager
  const handleOpenVariantManager = (product) => {
    setSelectedProduct(product)
    setVariantManagerOpen(true)
  }

  // Open product sales history
  const handleOpenHistory = (productId) => {
    navigate(`/products/${productId}/history`)
  }

  // Dark mode styles
  const bgGradient = dark
    ? 'from-gray-900 to-gray-800'
    : 'from-blue-50 to-indigo-50'
  const cardBg = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  const textColor = dark ? 'text-white' : 'text-gray-800'
  const textMuted = dark ? 'text-gray-300' : 'text-gray-600'
  const inputBg = dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
  const tableHeaderBg = dark ? 'from-gray-800 to-gray-700' : 'from-gray-100 to-gray-200'
  const tableHeaderText = dark ? 'text-gray-200' : 'text-gray-700'
  const tableRowHover = dark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
  const borderColor = dark ? 'border-gray-700' : 'border-gray-200'

  const products = data?.data?.data || []
  const pagination = data?.data?.pagination || {}

  // Categories for filter
  const categories = [
    "sneakers", "boots", "heels", "sandals", "slippers", "shoes", "other"
  ]

  // Genders for filter
  const genders = ["men", "women", "kids", "unisex"]

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} p-4 md:p-6 transition-colors duration-300`}>
      <div className='mx-auto space-y-4 md:space-y-6'>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl shadow-lg p-4 md:p-6 border ${cardBg} ${borderColor}`}
        >
          <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-2xl shadow-lg'>
                <ShoppingBag className='h-6 w-6 md:h-8 md:w-8 text-white' />
              </div>
              <div>
                <h1 className={`text-2xl md:text-3xl font-bold ${textColor}`}>
                  Маҳсулотлар
                </h1>
                <p className={`${textMuted} text-sm md:text-base mt-1`}>
                  {pagination.total || 0} та маҳсулот • {calculateTotalVariants({ types: products.reduce((acc, p) => acc.concat(p.types), []) })} та вариация
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2 md:gap-4'>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleOpenHistory('all')}
                className='flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300'
              >
                <BarChart3 size={18} />
                <span className='font-semibold text-sm md:text-base'>Статистика</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setOpen(true)}
                className='flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300'
              >
                <Plus size={18} />
                <span className='font-semibold text-sm md:text-base'>Янги маҳсулот</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl shadow-lg p-4 md:p-6 border ${cardBg} ${borderColor}`}
        >
          <div className='space-y-4'>
            {/* Main Search */}
            <div className='relative'>
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${dark ? 'text-gray-400' : 'text-gray-400'} h-5 w-5`} />
              <input
                type='text'
                placeholder='Қидириш...'
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 ${inputBg}`}
              />
              <select
                value={searchField}
                onChange={e => setSearchField(e.target.value)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 border ${dark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg px-2 py-1 text-sm outline-none`}
              >
                <option value="title">Номи бўйича</option>
                <option value="sku">SKU бўйича</option>
              </select>
            </div>

            {/* Filters Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              <div className='relative'>
                <Tag className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${dark ? 'text-gray-400' : 'text-gray-400'} h-5 w-5`} />
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 ${inputBg}`}
                >
                  <option value="">Барча категориялар</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className='relative'>
                <Calendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${dark ? 'text-gray-400' : 'text-gray-400'} h-5 w-5`} />
                <input
                  type='date'
                  value={searchDate}
                  onChange={e => {
                    setSearchDate(e.target.value)
                    setPage(1)
                  }}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 ${inputBg}`}
                />
              </div>

              <button
                onClick={() => {
                  setSearch('')
                  setCategory('')
                  setSearchDate('')
                  setSearchField('title')
                }}
                className={`w-full py-3 border rounded-xl font-medium transition-colors ${dark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300'
                  }`}
              >
                <Filter size={16} className='inline mr-2' />
                Тозалаш
              </button>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        {isLoading ? (
          <div className={`rounded-2xl shadow-lg p-8 md:p-12 ${cardBg}`}>
            <LoadingState />
          </div>
        ) : error ? (
          <div className={`rounded-2xl shadow-lg p-6 md:p-8 ${cardBg}`}>
            <div className='text-center text-red-500'>
              <XCircle className='h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-red-400' />
              <h3 className='text-lg font-semibold mb-2'>Хатолик юз берди</h3>
              <p className='text-sm'>{error.response?.data?.message || error.message}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className='block lg:hidden'>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className='grid grid-cols-1 md:grid-cols-2 gap-4'
              >
                {products.map((product, index) => (
                  <motion.div
                    key={product._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-2xl shadow-lg border ${cardBg} ${borderColor} p-4`}
                  >
                    {/* Product Image */}
                    <div className='mb-4'>
                      {product.mainImages && product.mainImages.length > 0 ? (
                        <div className='relative h-48 rounded-xl overflow-hidden'>
                          <img
                            src={product.mainImages[0]}
                            alt={product.title}
                            className='w-full h-full object-cover'
                          />
                          <div className='absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full'>
                            {product.mainImages.length} фото
                          </div>
                        </div>
                      ) : (
                        <div className='h-48 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center'>
                          <ImageIcon className='h-12 w-12 text-gray-400' />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className='space-y-3'>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`font-bold text-lg mb-1 ${textColor}`}>
                            {product.title}
                          </h3>
                          <div className='flex items-center gap-2 text-sm'>
                            <span className={`px-2 py-1 rounded-full ${dark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                              {product.category}
                            </span>
                            <span className={`px-2 py-1 rounded-full ${dark ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'}`}>
                              {product.gender}
                            </span>
                          </div>
                        </div>
                        <img className='w-10 h-10' src={product.qrCode} alt="qrcode" />
                      </div>

                      <div className='grid grid-cols-2 gap-2 text-sm'>
                        <div>
                          <p className={`${textMuted} text-xs`}>SKU</p>
                          <p className={`font-medium ${textColor}`}>{product.sku}</p>
                        </div>
                        <div>
                          <p className={`${textMuted} text-xs`}>Нарх</p>
                          <p className={`font-medium text-green-600`}>
                            {formatNumber(product.price)} сўм
                          </p>
                        </div>
                        <div>
                          <p className={`${textMuted} text-xs`}>Умумий дона</p>
                          <p className={`font-medium ${textColor}`}>
                            {calculateTotalStock(product)} дона
                          </p>
                        </div>
                        <div>
                          <p className={`${textMuted} text-xs`}>Вариациялар</p>
                          <p className={`font-medium ${textColor}`}>
                            {calculateTotalVariants(product)} та
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className='flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700'>
                        <button
                          onClick={() => setViewData(product)}
                          className='flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors'
                        >
                          <Eye size={16} className='inline mr-1' />
                          Кўриш
                        </button>
                        <button
                          onClick={() => handleOpenVariantManager(product)}
                          className='flex-1 bg-purple-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors'
                        >
                          <Layers size={16} className='inline mr-1' />
                          Вариация
                        </button>
                        <button
                          onClick={() => handleOpenHistory(product._id)}
                          className='flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors'
                        >
                          <BarChart3 size={16} className='inline mr-1' />
                          Тарих
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Desktop View - Table */}
            <div className='hidden lg:block'>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`rounded-2xl shadow-lg overflow-hidden border ${cardBg} ${borderColor}`}
              >
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className={`bg-gradient-to-r ${tableHeaderBg}`}>
                      <tr>
                        <th className='px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider'>
                          Маҳсулот
                        </th>
                        <th className='px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider'>
                          Категория
                        </th>
                        <th className='px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider'>
                          Нарх
                        </th>
                        <th className='px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider'>
                          Омбор
                        </th>
                        <th className='px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider'>
                          Вариациялар
                        </th>
                        <th className='px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider'>
                          QR
                        </th>
                        <th className='px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider'>
                          Амаллар
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                      {products.map((product, index) => (
                        <motion.tr
                          key={product._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`${tableRowHover}`}
                        >
                          {/* Product Info */}
                          <td className='px-6 py-4'>
                            <div className='flex items-center gap-3'>
                              {product.mainImages && product.mainImages.length > 0 ? (
                                <div className='relative h-12 w-12 rounded-lg overflow-hidden'>
                                  <img
                                    src={product.mainImages[0]}
                                    alt={product.title}
                                    className='w-full h-full object-cover'
                                  />
                                </div>
                              ) : (
                                <div className='h-12 w-12 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center'>
                                  <ImageIcon className='h-6 w-6 text-gray-400' />
                                </div>
                              )}
                              <div>
                                <p className={`font-semibold ${textColor}`}>
                                  {product.title}
                                </p>
                                <p className={`text-sm ${textMuted}`}>
                                  SKU: {product.sku}
                                </p>
                                <p className={`text-xs ${textMuted}`}>
                                  {product.gender} • {product.season}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className='px-6 py-4'>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${dark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                              {product.category}
                            </span>
                          </td>

                          {/* Price */}
                          <td className='px-6 py-4'>
                            <div className='flex items-center gap-2'>
                              <span className='text-green-500'>
                                <DollarSign size={16} />
                              </span>
                              <span className={`font-bold ${textColor}`}>
                                {formatNumber(product.price)} сўм
                              </span>
                            </div>
                          </td>

                          {/* Stock */}
                          <td className='px-6 py-4'>
                            <div className='flex items-center gap-2'>
                              <Package size={16} className={`${textMuted}`} />
                              <span className={`font-semibold ${textColor}`}>
                                {calculateTotalStock(product)} дона
                              </span>
                            </div>
                          </td>

                          {/* Variants */}
                          <td className='px-6 py-4'>
                            <button
                              onClick={() => handleOpenVariantManager(product)}
                              className='flex items-center gap-2 text-blue-500 hover:text-blue-700'
                            >
                              <Layers size={16} />
                              <span className='font-medium'>
                                {calculateTotalVariants(product)} та
                              </span>
                            </button>
                          </td>

                          {/* Status */}
                          <td className='px-6 py-4'>
                            <img className='w-10 h- 10' src={product.qrCode} alt="qrcde" />
                          </td>

                          {/* Actions */}
                          <td className='px-6 py-4'>
                            <div className='flex items-center justify-center gap-2'>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setViewData(product)}
                                className='bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors'
                                title='Кўриш'
                              >
                                <Eye size={16} />
                              </motion.button>

                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleOpenHistory(product._id)}
                                className='bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors'
                                title='Тарих'
                              >
                                <BarChart3 size={16} />
                              </motion.button>

                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setEditing({
                                    [product._id]: {
                                      title: product.title,
                                      price: product.price,
                                      category: product.category,
                                      gender: product.gender,
                                      season: product.season,
                                      material: product.material,
                                      description: product.description,
                                      sku: product.sku
                                    }
                                  })
                                  setViewData(product)
                                }}
                                className='bg-yellow-500 text-white p-2 rounded-lg hover:bg-yellow-600 transition-colors'
                                title='Таҳрирлаш'
                              >
                                <Edit size={16} />
                              </motion.button>

                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDeleteConfirm(product)}
                                className='bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors'
                                title='Ўчириш'
                              >
                                <Trash2 size={16} />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {products.length === 0 && (
                  <div className='text-center py-12'>
                    <Boxes size={48} className={`mx-auto mb-4 ${dark ? 'text-gray-600' : 'text-gray-300'}`} />
                    <h3 className={`text-lg font-semibold mb-2 ${textMuted}`}>
                      Маҳсулотлар топилмади
                    </h3>
                    <p className={`${textMuted} text-sm`}>
                      {search || category || searchDate
                        ? 'Қидирув шартларингизга мос келувчи маҳсулотлар топилмади'
                        : 'Ҳали маҳсулот қўшилмаган'}
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className={`px-6 py-4 border-t ${borderColor} ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
                      <div className={`text-sm ${textMuted}`}>
                        Кўрсатилган: {(page - 1) * 50 + 1}-{Math.min(page * 50, pagination.total)}/{pagination.total}
                      </div>

                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page <= 1}
                          className={`p-2 rounded-lg ${page <= 1
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                            } ${textColor}`}
                        >
                          <ChevronLeft size={20} />
                        </button>

                        <div className='flex items-center gap-1'>
                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pageNum
                            if (pagination.totalPages <= 5) {
                              pageNum = i + 1
                            } else if (page <= 3) {
                              pageNum = i + 1
                            } else if (page >= pagination.totalPages - 2) {
                              pageNum = pagination.totalPages - 4 + i
                            } else {
                              pageNum = page - 2 + i
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${page === pageNum
                                  ? 'bg-blue-500 text-white'
                                  : `${dark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} ${textColor}`
                                  }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                        </div>

                        <button
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page >= pagination.totalPages}
                          className={`p-2 rounded-lg ${page >= pagination.totalPages
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                            } ${textColor}`}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}

        {/* Modals */}
        <AddProductModal open={open} setOpen={setOpen} mutate={mutate} />

        {selectedProduct && (
          <VariantManagerModal
            open={variantManagerOpen}
            setOpen={setVariantManagerOpen}
            product={selectedProduct}
            mutate={mutate}
          />
        )}

        {/* Product Detail Modal */}
        <AnimatePresence>
          {viewData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewData(null)}
              className='fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4'
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}
              >
                <div className={`sticky z-10 top-0 border-b ${borderColor} px-4 md:px-6 py-4 rounded-t-2xl flex justify-between items-center ${dark ? 'bg-gray-800' : 'bg-white'}`}>
                  <h2 className={`text-lg md:text-xl font-bold flex items-center gap-2 ${textColor}`}>
                    <Tag size={20} className='text-blue-600' />
                    Маҳсулот маълумотлари
                  </h2>
                  <button
                    onClick={() => setViewData(null)}
                    className={`${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'} transition p-1 rounded-full hover:bg-gray-100' : 'hover:bg-gray-100'} transition p-1 rounded-full ${dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    ✖
                  </button>
                </div>

                <div className='p-4 md:p-6'>
                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                    {/* Left Column - Images & Basic Info */}
                    <div className='space-y-6'>
                      {/* Image Gallery */}
                      <div>
                        <h3 className={`text-sm font-semibold uppercase tracking-wider ${textMuted} mb-3`}>
                          Расмлар
                        </h3>
                        {viewData.mainImages && viewData.mainImages.length > 0 ? (
                          <div className='grid grid-cols-2 gap-3'>
                            {viewData.mainImages.slice(0, 4).map((img, index) => (
                              <div
                                key={index}
                                className='relative h-40 rounded-lg overflow-hidden cursor-pointer'
                                onClick={() => setImagePreview(img)}
                              >
                                <img
                                  src={img}
                                  alt={`${viewData.title} - ${index + 1}`}
                                  className=' w-full h-full object-cover hover:scale-105 transition-transform duration-300'
                                />
                                {index === 3 && viewData.mainImages.length > 4 && (
                                  <div className='absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold'>
                                    +{viewData.mainImages.length - 4}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className='h-48 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex flex-col items-center justify-center'>
                            <ImageIcon className='h-12 w-12 text-gray-400 mb-3' />
                            <p className={`text-sm ${textMuted}`}>Расмлар мавжуд эмас</p>
                          </div>
                        )}
                      </div>

                      {/* Basic Info */}
                      <div className='space-y-4'>
                        <div className='grid grid-cols-2 gap-4'>
                          <div>
                            <label className={`text-xs font-medium ${textMuted} block mb-1`}>
                              SKU
                            </label>
                            <p className={`font-medium ${textColor}`}>{viewData.sku}</p>
                          </div>
                          <div>
                            <label className={`text-xs font-medium ${textMuted} block mb-1`}>
                              Категория
                            </label>
                            {user.role === 'admin' ? (
                              <select
                                value={editing[viewData._id]?.category || viewData.category}
                                onChange={e => handleChange(viewData._id, 'category', e.target.value)}
                                className={`w-full border rounded-lg px-3 py-2 text-sm ${dark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                              >
                                {categories.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            ) : (
                              <p className={`font-medium ${textColor}`}>{viewData.category}</p>
                            )}
                          </div>
                        </div>

                        <div className='grid grid-cols-3 gap-3'>
                          <div>
                            <label className={`text-xs font-medium ${textMuted} block mb-1`}>
                              Жинс
                            </label>
                            {user.role === 'admin' ? (
                              <select
                                value={editing[viewData._id]?.gender || viewData.gender}
                                onChange={e => handleChange(viewData._id, 'gender', e.target.value)}
                                className={`w-full border rounded-lg px-3 py-2 text-sm ${dark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                              >
                                {genders.map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            ) : (
                              <p className={`font-medium ${textColor}`}>{viewData.gender}</p>
                            )}
                          </div>
                          <div>
                            <label className={`text-xs font-medium ${textMuted} block mb-1`}>
                              Фасл
                            </label>
                            <p className={`font-medium ${textColor}`}>{viewData.season}</p>
                          </div>
                          <div>
                            <label className={`text-xs font-medium ${textMuted} block mb-1`}>
                              Материал
                            </label>
                            {user.role === 'admin' ? (
                              <input
                                type='text'
                                value={editing[viewData._id]?.material || viewData.material}
                                onChange={e => handleChange(viewData._id, 'material', e.target.value)}
                                className={`w-full border rounded-lg px-3 py-2 text-sm ${dark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                              />
                            ) : (
                              <p className={`font-medium ${textColor}`}>{viewData.material}</p>
                            )}
                          </div>
                          <div>
                            <img className='w-12 h-12' src={viewData.qrCode} alt="qrcode" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Details & Variants */}
                    <div className='space-y-6'>
                      {/* Title & Price */}
                      <div>
                        <div className='mb-4'>
                          <label className={`text-xs font-medium ${textMuted} block mb-1`}>
                            Номи
                          </label>
                          {user.role === 'admin' ? (
                            <input
                              type='text'
                              value={editing[viewData._id]?.title || viewData.title}
                              onChange={e => handleChange(viewData._id, 'title', e.target.value)}
                              className={`w-full border rounded-lg px-3 py-3 text-lg font-semibold ${dark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                            />
                          ) : (
                            <h3 className={`text-xl font-bold ${textColor}`}>{viewData.title}</h3>
                          )}
                        </div>

                        <div>
                          <label className={`text-xs font-medium ${textMuted} block mb-1`}>
                            Нарх
                          </label>
                          {user.role === 'admin' ? (
                            <div className='flex items-center gap-2'>
                              <input
                                type='number'
                                value={editing[viewData._id]?.price || viewData.price}
                                onChange={e => handleChange(viewData._id, 'price', e.target.value)}
                                className={`flex-1 border rounded-lg px-3 py-3 text-lg font-bold ${dark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                              />
                              <span className='text-gray-500'>сўм</span>
                            </div>
                          ) : (
                            <p className={`text-2xl font-bold text-green-600`}>
                              {formatNumber(viewData.price)} сўм
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Stock & Variants Summary */}
                      <div className='grid grid-cols-2 gap-4'>
                        <div className={`rounded-xl p-4 ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div className='flex items-center gap-3 mb-2'>
                            <Package size={20} className='text-blue-500' />
                            <div>
                              <p className={`text-xs ${textMuted}`}>Умумий дона</p>
                              <p className={`text-2xl font-bold ${textColor}`}>
                                {calculateTotalStock(viewData)}
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className={`text-sm ${textMuted}`}>Вариациялар</span>
                            <span className='font-semibold'>{calculateTotalVariants(viewData)} та</span>
                          </div>
                        </div>

                        <div className={`rounded-xl p-4 ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div className='flex items-center gap-3 mb-2'>
                            <BarChart3 size={20} className='text-green-500' />
                            <div>
                              <p className={`text-xs ${textMuted}`}>Сотилган</p>
                              <p className={`text-2xl font-bold ${textColor}`}>
                                {viewData.sold || 0}
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className={`text-sm ${textMuted}`}>Ҳолат</span>
                            <span className={`font-semibold ${viewData.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                              {viewData.isAvailable ? 'Мавжуд' : 'Тугаган'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className={`text-xs font-medium ${textMuted} block mb-1`}>
                          Тавсиф
                        </label>
                        {user.role === 'admin' ? (
                          <textarea
                            value={editing[viewData._id]?.description || viewData.description || ''}
                            onChange={e => handleChange(viewData._id, 'description', e.target.value)}
                            rows={4}
                            className={`w-full border rounded-lg px-3 py-2 text-sm ${dark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                            placeholder='Маҳсулот тавсифи...'
                          />
                        ) : (
                          <p className={`text-sm ${textColor} whitespace-pre-wrap`}>
                            {viewData.description || 'Тавсиф мавжуд эмас'}
                          </p>
                        )}
                      </div>

                      {/* Variants List */}
                      <div>
                        <div className='flex items-center justify-between mb-3'>
                          <h4 className={`text-sm font-semibold uppercase tracking-wider ${textMuted}`}>
                            Вариациялар ({viewData.types?.length || 0})
                          </h4>
                          <button
                            onClick={() => {
                              setSelectedProduct(viewData)
                              setVariantManagerOpen(true)
                              setViewData(null)
                            }}
                            className='text-blue-500 hover:text-blue-700 text-sm font-medium'
                          >
                            Бошқариш →
                          </button>
                        </div>

                        <div className='space-y-2 max-h-60 overflow-y-auto'>
                          {viewData.types?.map((variant, index) => (
                            <div
                              key={index}
                              className={`flex items-center justify-between p-3 rounded-lg ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}
                            >
                              <div className='flex items-center gap-3'>
                                {variant.images?.[0] && (
                                  <div className='h-10 w-10 rounded overflow-hidden'>
                                    <img
                                      src={variant.images[0]}
                                      alt={`${variant.color} ${variant.size}`}
                                      className='w-full h-full object-cover'
                                    />
                                  </div>
                                )}
                                <div>
                                  <p className='font-medium'>
                                    {variant.color} • {variant.size}
                                  </p>
                                  <p className='text-xs text-gray-500'>
                                    {variant.style}
                                  </p>
                                </div>
                              </div>
                              <div className='text-right'>
                                <p className='font-bold'>{variant.count || 0} дона</p>
                                <p className='text-xs text-gray-500'>омборда</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {user.role === 'admin' && editing[viewData._id] && (
                  <div className={`sticky bottom-0 border-t ${borderColor} px-4 md:px-6 py-4 rounded-b-2xl flex justify-end gap-3 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
                    <button
                      onClick={() => {
                        setEditing(prev => {
                          const copy = { ...prev }
                          delete copy[viewData._id]
                          return copy
                        })
                      }}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${dark
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                    >
                      Бекор қилиш
                    </button>
                    <button
                      onClick={() => handleSave(viewData._id)}
                      disabled={loading === viewData._id}
                      className='flex items-center gap-2 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors shadow-sm'
                    >
                      {loading === viewData._id ? (
                        <Loader2 className='animate-spin' size={18} />
                      ) : (
                        <Save size={18} />
                      )}
                      Сақлаш
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Preview Modal */}
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setImagePreview(null)}
              className='fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4'
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className='relative max-w-4xl max-h-[90vh]'
              >
                <img
                  src={imagePreview}
                  alt='Preview'
                  className='w-full h-full object-contain rounded-lg'
                />
                <button
                  onClick={() => setImagePreview(null)}
                  className='absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70'
                >
                  ✖
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${dark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}
              >
                <div className='text-center'>
                  <Trash2 className='h-12 w-12 mx-auto mb-4 text-red-500' />
                  <h3 className={`text-xl font-bold mb-2 ${textColor}`}>
                    Маҳсулотни ўчириш
                  </h3>
                  <p className={`mb-6 ${textMuted}`}>
                    <strong>"{deleteConfirm.title}"</strong> маҳсулотини ўчирмоқчимисиз?
                    <br />
                    <span className='text-red-500'>Бу амални бекор қилиб бўлмайди!</span>
                  </p>

                  <div className='flex gap-3 justify-center'>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${dark
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                    >
                      Бекор қилиш
                    </button>
                    <button
                      onClick={() => handleDelete(deleteConfirm._id)}
                      disabled={deleting === deleteConfirm._id}
                      className='flex items-center gap-2 bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors'
                    >
                      {deleting === deleteConfirm._id ? (
                        <Loader2 className='animate-spin' size={18} />
                      ) : (
                        <Trash2 size={18} />
                      )}
                      Ўчириш
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
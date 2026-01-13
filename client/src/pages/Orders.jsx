import { useState, useContext, useMemo, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Loader2,
  Save,
  Trash2,
  ScrollText,
  Eye,
  X,
  User,
  MapPin,
  ShoppingCart,
  ChevronLeft,
  Package,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  ChevronRight,
  ChevronLeft as ChevronLeftIcon,
  RefreshCw,
} from 'lucide-react'
import Fetch from '../middlewares/fetcher'
import { AddNewOrder } from '../mod/OrderModal'
import { ContextData } from '../contextData/Context'
import { LoadingState } from '../components/loading-state'
import { Link } from 'react-router-dom'

export const Orders = () => {
  const { user } = useContext(ContextData)

  // State lar
  const [isOpen, setIsOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [hideButton, setHideButton] = useState(false)

  // Search state lar
  const [searchPhone, setSearchPhone] = useState('')
  const [searchName, setSearchName] = useState('')

  // Real-time update uchun timer
  const [lastUpdate, setLastUpdate] = useState(Date.now())

  // Pagination state lari
  const [clientPage, setClientPage] = useState(1)
  const [orderPage, setOrderPage] = useState(1)
  const [clientLimit] = useState(20)
  const [orderLimit] = useState(10)

  const {
    data: ordersData,
    error: ordersError,
    isLoading: ordersLoading,
    mutate: mutateOrders
  } = useSWR("/orders", Fetch)

  // Extract data - orders ni olish
  const allOrders = ordersData?.data?.data || []

  // Clientlarni orders dan ajratib olish
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

        // Add order to client's orders
        clientsMap[clientId].orders.push(order)
      }
    })

    return Object.values(clientsMap)
  }, [allOrders])

  // Client statistikasini hisoblash
  const calculateClientStats = (clientOrders) => {
    const orders = clientOrders || []
    const totalOrders = orders.length
    const totalAmount = orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const unpaidOrders = orders.filter(order => !order.paid).length

    return { totalOrders, totalAmount, unpaidOrders }
  }

  // Filtered clients (client-side search)
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const phoneMatch = !searchPhone || client.phoneNumber?.toLowerCase().includes(searchPhone.toLowerCase())
      const nameMatch = !searchName || client.fullName?.toLowerCase().includes(searchName.toLowerCase())
      return phoneMatch && nameMatch
    })
  }, [clients, searchPhone, searchName])

  // Paginated clients
  const paginatedClients = useMemo(() => {
    const startIndex = (clientPage - 1) * clientLimit
    const endIndex = startIndex + clientLimit
    return filteredClients.slice(startIndex, endIndex)
  }, [filteredClients, clientPage, clientLimit])

  // Clientning buyurtmalari uchun pagination
  const clientOrdersPagination = useMemo(() => {
    if (!selectedClient) return { orders: [], pagination: { page: 1, limit: orderLimit, total: 0, totalPages: 0 } }

    const clientOrders = selectedClient.orders || []
    const startIndex = (orderPage - 1) * orderLimit
    const endIndex = startIndex + orderLimit
    const paginatedOrders = clientOrders.slice(startIndex, endIndex)

    return {
      orders: paginatedOrders,
      pagination: {
        page: orderPage,
        limit: orderLimit,
        total: clientOrders.length,
        totalPages: Math.ceil(clientOrders.length / orderLimit)
      }
    }
  }, [selectedClient, orderPage, orderLimit])

  // Status iconlari va ranglari
  const getStatusConfig = status => {
    const statusLower = status?.toLowerCase()

    switch (statusLower) {
      case 'completed':
      case 'бажарилган':
        return {
          icon: <CheckCircle className='text-green-500' size={16} />,
          color: 'bg-green-100 text-green-800 border-green-200',
          text: 'Бажарилган'
        }
      case 'pending':
      case 'кутилмоқда':
      case 'янги':
        return {
          icon: <Clock className='text-yellow-500' size={16} />,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          text: 'Кутилмоқда'
        }
      case 'cancelled':
      case 'бекор қилинган':
        return {
          icon: <X className='text-red-500' size={16} />,
          color: 'bg-red-100 text-red-800 border-red-200',
          text: 'Бекор қилинган'
        }
      default:
        return {
          icon: <AlertCircle className='text-gray-500' size={16} />,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          text: status || '—'
        }
    }
  }

  // O'chirish funksiyasi
  const handleDelete = async id => {
    const confirmMessage = `⚠️ Сиз ростдан ҳам чиқимсини бекор қилмоқчимисиз?\n\nБу амални кейин тиклаб бўлмайди!`
    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) return

    try {
      setDeleting(id)
      await Fetch.delete(`/orders/${id}`)

      // Optimistic update
      if (selectedClient) {
        setSelectedClient(prev => ({
          ...prev,
          orders: prev.orders.filter(order => order._id !== id)
        }))
      }

      // Mutate data
      mutateOrders()

    } catch (err) {
      console.error('Cancel error:', err)
      alert('❌ чиқимни бекор қилишда хатолик юз берди.')
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteClient = async id => {
    const confirmMessage = `⚠️Сиз ростан ҳам бу клиентни ўчирмоқчимисиз?\n\nБу амални кейин тиклаб бўлмайди!`
    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) return

    try {
      // Delete all orders for this client
      const clientOrders = clients.find(c => c._id === id)?.orders || []

      for (const order of clientOrders) {
        await Fetch.delete(`/orders/${order._id}`)
      }

      // Optimistic update
      if (selectedClient?._id === id) {
        setSelectedClient(null)
      }

      // Mutate data
      mutateOrders()

      alert('✅ Мижоз ва унинг барча чиқимлари ўчирилди')
    } catch (err) {
      console.error('Delete client error:', err)
      alert('❌ Мижозни ўчиришда хатолик юз берди.')
    } finally {
      setDeleting(null)
    }
  }



  // Xato holati
  if (ordersError) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white'>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className='text-center p-8 rounded-2xl border max-w-md bg-red-50 border-red-200'
        >
          <AlertCircle className='mx-auto text-red-500 mb-4' size={48} />
          <h3 className='text-lg font-semibold mb-2 text-red-800'>
            Юклашда хатолик
          </h3>
          <p className='text-red-600'>
            чиқимлар маълумотларини юклашда хатолик юз берди. Илтимос, қайта уриниб кўринг.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6 transition-colors duration-300'>
      <div className='mx-auto space-y-6'>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='rounded-2xl shadow-lg p-6 border bg-white border-gray-200'
        >
          <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4'>
            <div className='flex items-center gap-4'>
              {selectedClient ? (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => {
                    setSelectedClient(null)
                    setOrderPage(1)
                  }}
                  className='flex fixed top-16 left-5 cursor-pointer z-50 items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100'
                >
                  <ChevronLeft size={20} />
                  Орқага
                </motion.button>
              ) : (
                <div className='bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl shadow-lg'>
                  <ShoppingCart className='text-white' size={28} />
                </div>
              )}
              <div>
                <h1 className='text-2xl md:text-3xl font-bold text-gray-800'>
                  {selectedClient ? `${selectedClient.fullName} чиқимлари` : 'Мижозлар'}
                </h1>
                <p className='text-gray-600 mt-1'>
                  {selectedClient
                    ? `${clientOrdersPagination.pagination.total} та чиқим топилди`
                    : `${clients.length} та мижоз топилди`}
                </p>
              </div>
            </div>

            <div className='flex flex-col sm:flex-row gap-3 w-full lg:w-auto'>
              <Link
                to={"/addorder"}
                className='flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold'
              >
                <Plus size={20} />
                Янги чиқим
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Search Section */}
        {!selectedClient && <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className='rounded-2xl shadow-lg p-6 border bg-white border-gray-200'
        >
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={20} />
              <input
                type='text'
                placeholder='Телефон рақам...'
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value)}
                className='w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 bg-gray-50 border-gray-300'
              />
            </div>

            <div className='relative'>
              <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={20} />
              <input
                type='text'
                placeholder='Мижоз Ф.И.Ш...'
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                className='w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 bg-gray-50 border-gray-300'
              />
            </div>
          </div>
        </motion.div>}

        {/* Loading state */}
        {ordersLoading && !allOrders.length && (
          <div className='flex justify-center py-12'>
            <Loader2 className='animate-spin text-blue-500' size={32} />
          </div>
        )}

        {/* Clients List */}
        {!selectedClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {filteredClients.length === 0 ? (
              <div className='rounded-2xl shadow-lg p-12 text-center border bg-white border-gray-200'>
                <User className='mx-auto mb-4 text-gray-400' size={64} />
                <h3 className='text-xl font-semibold mb-2 text-gray-600'>
                  Мижозлар топилмади
                </h3>
                <p className='text-gray-600 mb-6'>
                  {clients.length === 0
                    ? 'Ҳали ҳеч қандай чиқим мавжуд эмас'
                    : 'Қидирув шартларингизга мос келувчи мижозлар мавжуд эмас'
                  }
                </p>
                {clients.length > 0 && (
                  <button
                    onClick={() => { setSearchPhone(''); setSearchName('') }}
                    className='text-blue-500 hover:text-blue-700 font-semibold'
                  >
                    Филтрни тозалаш
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
                  {paginatedClients.map((client, index) => {
                    const stats = calculateClientStats(client.orders)

                    return (
                      <motion.div
                        key={client._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => {
                          setSelectedClient(client)
                          setOrderPage(1)
                        }}
                        className='rounded-2xl shadow-lg p-6 border hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white border-gray-200 hover:border-blue-300'
                      >
                        <div className='flex items-start justify-between mb-4'>
                          <div className='flex items-center gap-3'>
                            <div className='bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300'>
                              <User className='text-white' size={24} />
                            </div>
                            {user.role == "admin" &&
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex">
                                <button
                                  onClick={() => handleDeleteClient(client._id)}
                                  className='p-2 bg-red-500 text-white rounded cursor-pointer hover:bg-red-600'
                                ><Trash2 /></button>
                              </div>}
                            <div>
                              <h3 className='font-bold text-lg text-gray-800'>{client.fullName || 'Номаълум'}</h3>
                              <p className='text-sm text-gray-600'>{client.phoneNumber}</p>
                            </div>
                          </div>
                          <div className='text-right'>
                            <div className='flex items-center gap-1 text-green-600 font-semibold text-lg'>
                              <Package size={18} />
                              <span>{stats.totalOrders}</span>
                            </div>
                            <div className='text-xs text-gray-600'>чиқим</div>
                          </div>
                        </div>

                        <div className='flex items-center gap-2 text-sm mb-3'>
                          <MapPin size={16} className='text-gray-600' />
                          <span className='truncate text-gray-600'>{client.address || 'Манзил кўрсатилмаган'}</span>
                        </div>

                        <div className='space-y-2 mb-4'>
                          <div className='flex justify-between items-center'>
                            <span className='text-sm text-gray-600'>Жами сумма:</span>
                            <span className='font-bold text-green-600'>{stats.totalAmount.toLocaleString()} сўм</span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Clients Pagination */}
                {filteredClients.length > clientLimit && (
                  <div className='mt-6 p-4 rounded-2xl shadow-lg border bg-white border-gray-200'>
                    <div className='flex items-center justify-between'>
                      <div className='text-sm text-gray-600'>
                        Кўрсатилган: {((clientPage - 1) * clientLimit) + 1}-{Math.min(clientPage * clientLimit, filteredClients.length)}/{filteredClients.length}
                      </div>

                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => setClientPage(prev => Math.max(prev - 1, 1))}
                          disabled={clientPage <= 1}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg ${clientPage <= 1
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-200'
                            } text-gray-800`}
                        >
                          <ChevronLeft size={18} />
                          Олдинги
                        </button>

                        <div className='flex items-center gap-1'>
                          {Array.from({ length: Math.min(5, Math.ceil(filteredClients.length / clientLimit)) }, (_, i) => {
                            let pageNum
                            const totalPages = Math.ceil(filteredClients.length / clientLimit)

                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (clientPage <= 3) {
                              pageNum = i + 1
                            } else if (clientPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = clientPage - 2 + i
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setClientPage(pageNum)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${clientPage === pageNum
                                  ? 'bg-blue-500 text-white'
                                  : `hover:bg-gray-200 text-gray-800`
                                  }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                        </div>

                        <button
                          onClick={() => setClientPage(prev => Math.min(prev + 1, Math.ceil(filteredClients.length / clientLimit)))}
                          disabled={clientPage >= Math.ceil(filteredClients.length / clientLimit)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg ${clientPage >= Math.ceil(filteredClients.length / clientLimit)
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-200'
                            } text-gray-800`}
                        >
                          Кейинги
                          <ChevronRight size={18} />
                        </button>
                      </div>

                      <div className='flex items-center gap-2'>
                        <span className='text-sm text-gray-600'>Саҳифа:</span>
                        <select
                          value={clientPage}
                          onChange={(e) => setClientPage(parseInt(e.target.value))}
                          className='border border-gray-300 rounded-lg px-3 py-1 outline-none'
                        >
                          {Array.from({ length: Math.ceil(filteredClients.length / clientLimit) }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Client Orders */}
        {selectedClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Client Overview Section */}
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6'>
              {/* Client Info Card */}
              <div className='rounded-2xl shadow-lg p-6 border bg-white border-gray-200'>
                <div className='flex items-center justify-between mb-4'>
                  <div className='flex items-center gap-3'>
                    <div className='bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl'>
                      <User className='text-white' size={24} />
                    </div>
                    <div>
                      <h2 className='text-xl font-bold text-gray-800'>{selectedClient.fullName || 'Номаълум'}</h2>
                      <p className='text-gray-600'>{selectedClient.phoneNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      mutateOrders()
                      setLastUpdate(Date.now())
                    }}
                    className='p-2 rounded-lg bg-gray-100 hover:bg-gray-200'
                    title="Янгилаш"
                  >
                    <RefreshCw size={16} className='text-gray-800' />
                  </button>
                </div>

                <div className='space-y-3'>
                  <div className='flex items-center gap-2 text-sm text-gray-600'>
                    <MapPin size={16} />
                    <span>{selectedClient.address || 'Манзил кўрсатилмаган'}</span>
                  </div>
                </div>
              </div>

              {/* Statistics Card */}
              <div className='rounded-2xl shadow-lg p-6 border bg-white border-gray-200'>
                <h3 className='text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800'>
                  <ScrollText size={20} className='text-blue-500' />
                  Статистика
                </h3>
                <div className='space-y-3'>
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>Жами чиқим:</span>
                    <span className='font-bold text-blue-600'>{clientOrdersPagination.pagination.total} та</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>Жами сумма:</span>
                    <span className='font-bold text-green-600'>{clientOrdersPagination.orders.reduce((sum, order) => sum + (order.total || 0), 0).toLocaleString()} сўм</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            {clientOrdersPagination.orders.length === 0 ? (
              <div className='rounded-2xl shadow-lg p-12 text-center border bg-white border-gray-200'>
                <ScrollText className='mx-auto mb-4 text-gray-400' size={64} />
                <h3 className='text-xl font-semibold mb-2 text-gray-600'>
                  чиқимлар топилмади
                </h3>
                <p className='text-gray-600'>
                  Ушбу мижоз учун ҳеч қандай чиқим топилмади.
                </p>
              </div>
            ) : (
              <div className='rounded-2xl shadow-lg border overflow-hidden bg-white border-gray-200'>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-gradient-to-r from-gray-50 to-gray-100'>
                      <tr>
                        <th className='px-6 py-4 text-left text-sm font-semibold text-gray-700'>Маҳсулотлар</th>
                        <th className='px-6 py-4 text-left text-sm font-semibold text-gray-700'>Ҳолат</th>
                        <th className='px-6 py-4 text-left text-sm font-semibold text-gray-700'>Умумий нарх</th>
                        <th className='px-6 py-4 text-left text-sm font-semibold text-gray-700'>Сана</th>
                        <th className='px-6 py-4 text-center text-sm font-semibold text-gray-700'>Амалиёт</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200'>
                      {clientOrdersPagination.orders.map((order, index) => {
                        const total = order.total || 0
                        const statusConfig = getStatusConfig(order.status)

                        return (
                          <motion.tr
                            key={order._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <td className='px-6 py-4'>
                              <div className='space-y-1'>
                                {(order.products || []).slice(0, 3).map((item, i) => (
                                  <div key={i} className='text-sm text-gray-700'>
                                    <span className='font-medium'>{item.product?.title || 'Мавжуд эмас'}</span>
                                    <span className='ml-2 text-gray-500'>
                                      {item.amount} {item.unit} × {item.price?.toLocaleString() || 0} сўм
                                    </span>
                                  </div>
                                ))}
                                {(order.products || []).length > 3 && (
                                  <div className='text-xs text-blue-500 font-medium'>
                                    + {(order.products || []).length - 3} та бошқа маҳсулот
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className='px-6 py-4'>
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                {statusConfig.icon}
                                {statusConfig.text}
                              </div>
                            </td>

                            <td className='px-6 py-4'>
                              <div className='space-y-1'>
                                <div className='font-bold text-green-600 text-sm'>
                                  {total.toLocaleString()} сўм
                                </div>
                                {total === 0 && (
                                  <div className='text-red-500 text-sm font-medium'>
                                    Нарх белгиланмаган
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-600'>
                              {new Date(order.orderDate || order.createdAt).toLocaleDateString()}
                            </td>

                            <td className='px-6 py-4'>
                              <div className='flex items-center justify-center gap-2'>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setSelectedOrder(order)}
                                  className='flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200'
                                >
                                  <Eye size={16} />
                                </motion.button>

                                {user.role === 'admin' && !order.paid && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleDelete(order._id)}
                                    disabled={deleting === order._id}
                                    className='flex items-center gap-2 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors duration-200'
                                  >
                                    {deleting === order._id ? <Loader2 className='animate-spin' size={16} /> : <Trash2 size={16} />}
                                  </motion.button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Orders Pagination */}
                {clientOrdersPagination.pagination.totalPages > 1 && (
                  <div className='p-4 border-t border-gray-200 bg-gray-50'>
                    <div className='flex items-center justify-between'>
                      <div className='text-sm text-gray-600'>
                        Кўрсатилган: {((clientOrdersPagination.pagination.page - 1) * clientOrdersPagination.pagination.limit) + 1}-{Math.min(clientOrdersPagination.pagination.page * clientOrdersPagination.pagination.limit, clientOrdersPagination.pagination.total)}/{clientOrdersPagination.pagination.total}
                      </div>

                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => setOrderPage(prev => Math.max(prev - 1, 1))}
                          disabled={clientOrdersPagination.pagination.page <= 1}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg ${clientOrdersPagination.pagination.page <= 1
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-200'
                            } text-gray-800`}
                        >
                          <ChevronLeft size={18} />
                          Олдинги
                        </button>

                        <div className='flex items-center gap-1'>
                          {Array.from({ length: Math.min(5, clientOrdersPagination.pagination.totalPages) }, (_, i) => {
                            let pageNum
                            if (clientOrdersPagination.pagination.totalPages <= 5) {
                              pageNum = i + 1
                            } else if (clientOrdersPagination.pagination.page <= 3) {
                              pageNum = i + 1
                            } else if (clientOrdersPagination.pagination.page >= clientOrdersPagination.pagination.totalPages - 2) {
                              pageNum = clientOrdersPagination.pagination.totalPages - 4 + i
                            } else {
                              pageNum = clientOrdersPagination.pagination.page - 2 + i
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setOrderPage(pageNum)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${clientOrdersPagination.pagination.page === pageNum
                                  ? 'bg-blue-500 text-white'
                                  : `hover:bg-gray-200 text-gray-800`
                                  }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                        </div>

                        <button
                          onClick={() => setOrderPage(prev => Math.min(prev + 1, clientOrdersPagination.pagination.totalPages))}
                          disabled={clientOrdersPagination.pagination.page >= clientOrdersPagination.pagination.totalPages}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg ${clientOrdersPagination.pagination.page >= clientOrdersPagination.pagination.totalPages
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-200'
                            } text-gray-800`}
                        >
                          Кейинги
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailModal
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            selectedClient={selectedClient}
            user={user}
            hideButton={hideButton}
            setHideButton={setHideButton}
            mutateOrders={mutateOrders}
          />
        )}
      </AnimatePresence>

      {isOpen && <AddNewOrder onClose={() => setIsOpen(false)} isOpen={isOpen} />}
    </div>
  )
}

// Order Detail Modal komponenti
const OrderDetailModal = ({
  selectedOrder,
  setSelectedOrder,
  user,
  hideButton,
  setHideButton,
  mutateOrders
}) => {
  const [localOrder, setLocalOrder] = useState(selectedOrder)

  const handlePriceChange = (index, field, value) => {
    const updatedProducts = [...localOrder.products]
    if (field === 'price') {
      const numericValue = value === '' ? 0 : Number(value)
      updatedProducts[index] = {
        ...updatedProducts[index],
        price: numericValue
      }
    }
    setLocalOrder(prev => ({ ...prev, products: updatedProducts }))
  }

  const handleSave = async () => {
    try {
      setHideButton(true)

      // Calculate total
      const total = localOrder.products.reduce((sum, product) => {
        return sum + ((product.price || 0) * (product.quantity || 0))
      }, 0)

      await Fetch.put(`/orders/${localOrder._id}`, {
        products: localOrder.products.map(p => ({
          product: p.product?._id || p.product,
          quantity: p.quantity,
          price: p.price,
          unit: p.unit
        })),
        total: total
      })

      // Mutate data
      mutateOrders()

      alert('✅ Нархлар муваффақиятли янгиланди')
      setSelectedOrder(null)
    } catch (err) {
      console.error('Update error:', err)
      alert('❌ Нархларни янгилашда хатолик юз берди')
    } finally {
      setHideButton(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setSelectedOrder(null)}
      className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className='w-full max-w-2xl rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto bg-white'
      >
        <button
          onClick={() => setSelectedOrder(null)}
          className='absolute top-4 right-4 z-10 rounded-full p-2 shadow-lg transition-colors duration-200 bg-white hover:bg-gray-100'
        >
          <X size={20} className='text-gray-800' />
        </button>

        <div className='p-8'>
          <div className='text-center mb-8'>
            <div className='bg-gradient-to-r from-blue-500 to-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg'>
              <ShoppingCart className='text-white' size={28} />
            </div>
            <h2 className='text-2xl font-bold text-gray-800'>чиқим маълумотлари</h2>
          </div>

          {/* Mahsulotlar */}
          <div className='mb-8'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-semibold flex items-center gap-2 text-gray-800'>
                <Package className='text-indigo-600' size={20} />
                Маҳсулотлар ({localOrder.products?.length || 0})
              </h3>
              {user.role === 'admin' && localOrder.paid == false && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const updatedProducts = localOrder.products?.map(product => ({
                      ...product,
                      editing: !product.editing
                    }))
                    setLocalOrder(prev => ({ ...prev, products: updatedProducts }))
                  }}
                  className='flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200'
                >
                  <Edit size={16} />
                  Нархларни таҳрирлаш
                </motion.button>
              )}
            </div>

            <div className='space-y-3'>
              {localOrder.products?.map((product, index) => (
                <div key={index} className='flex justify-between items-center p-3 rounded-lg border bg-gray-50 border-gray-200'>
                  <div className='flex-1'>
                    <p className='font-medium text-gray-800'>{product.product?.title || ""}</p>
                    <p className='text-sm text-gray-600'>{product.quantity} дона</p>
                  </div>

                  {product.editing ? (
                    <div className='flex items-center gap-2'>
                      <input
                        type='number'
                        value={product.price || ''}
                        onChange={(e) => handlePriceChange(index, 'price', e.target.value)}
                        className='w-24 border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right border-gray-300'
                        placeholder='0'
                      />
                      <span className='text-gray-600'>сўм</span>
                    </div>
                  ) : (
                    <div className='text-right'>
                      <p className='font-semibold text-green-600'>
                        {((product.price || 0) * (product.quantity || 0)).toLocaleString()} сўм
                      </p>
                      <p className='text-xs text-gray-600'>
                        {(product.price || 0).toLocaleString()} сўм дан
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          {user.role === 'admin' && localOrder.products?.some(p => p.editing) && (
            <div className='mt-4 flex justify-end'>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={hideButton}
                className='flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200 disabled:opacity-50'
              >
                {hideButton ? (
                  <Loader2 className='animate-spin' size={16} />
                ) : (
                  <Save size={16} />
                )}
                {hideButton ? 'Сақланмоқда...' : 'Сақлаш'}
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
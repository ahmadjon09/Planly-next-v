import express from 'express'
import {
  CreateNewProduct,
  DeleteProduct,
  GetAllProducts,
  Scanner,
  UpdateProduct
} from '../controllers/product.js'
import isExisted from '../middlewares/isExisted.js'

const router = express.Router()

router.get('/', isExisted, GetAllProducts)
router.get('/qr/scann/:id', isExisted, Scanner)
router.post('/create', isExisted, CreateNewProduct)
router.put('/:id', isExisted, UpdateProduct)
router.delete('/:id', isExisted, DeleteProduct)


export default router

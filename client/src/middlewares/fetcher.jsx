import axios from 'axios'
import Cookies from 'js-cookie'

const origin = window.location.origin;
const BASE_URL = `https://shoemaster-cgo0.onrender.com/api`
// const BASE_URL = `${origin}/api`


const token = Cookies.get('user_token')
const instance = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${token}`
  }
})




export default instance;

import axios from 'axios'
import Cookies from 'js-cookie'

const origin = window.location.origin;
// const BASE_URL = `https://planly-x.onrender.com//api`
// const BASE_URL = `http://localhost:3828/api/`
const BASE_URL = `${origin}/api`


const token = Cookies.get('user_token')
const instance = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${token}`
  }
})




export default instance;

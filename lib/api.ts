import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
})
export const SOCKET_SERVER = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';

export default api

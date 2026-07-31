import axios from "axios";

const api = axios.create({
  baseURL: "https://finance-tracker-7gfm0vhj7-konstantin7.vercel.app/",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

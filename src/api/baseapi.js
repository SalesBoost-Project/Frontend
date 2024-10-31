import axios from "axios";

// Axios 인스턴스 생성
const baseApi = axios.create({
  //  baseURL: 'http://localhost:8080/api',
  //  baseURL: 'http://43.201.156.20/api',
    baseURL: 'https://api.samdasoo.click/api',
  });


export default baseApi;
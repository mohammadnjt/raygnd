import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { DEV_MODE, MOCK_DATA, MOCK_DELAY, MOCK_USERS } from './dev';

// آدرس پایه سرور
const baseUrl = "https://raygnd.blhgroups.ir/api";

const apiClient = axios.create({
  baseURL: baseUrl,
  timeout: 15000,
});

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return { headers, token };
};

const mockDelay = (data) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), MOCK_DELAY);
  });
};

export const sendRequest = async (endpoint, params = {}) => {
  try {
    const { headers } = await getAuthHeaders();
    const response = await apiClient.get(endpoint, {
      params,
      headers
    });
    return response.data;
  } catch (error) {
    console.error(`GET ${endpoint} Failed:`, error?.response?.data || error.message);
    if (error.response) return error.response.data || { success: false, message: `خطای سرور: ${error.response.status}` };
    return { success: false, message: error.message || "عدم اتصال به سرور" };
  }
};

export const sendPostRequest = async (endpoint, payload = {}) => {
  try {
    const { headers } = await getAuthHeaders();
    const response = await apiClient.post(endpoint, payload, {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    return response.data;
  } catch (error) {
    console.error(`POST ${endpoint} Failed:`, error?.response?.data || error.message);
    if (error.response) return error.response.data || { success: false, message: `خطای سرور: ${error.response.status}` };
    return { success: false, message: error.message || "عدم اتصال به سرور" };
  }
};

export const uploadFile = async (fileUri, fileName, fileType) => {
  try {
    const { headers } = await getAuthHeaders();
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName || `file_${Date.now()}.jpg`,
      type: fileType || 'image/jpeg',
    });

    const response = await apiClient.post('/upload', formData, {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      }
    });

    const data = response.data;
    if (data?.success) {
      return {
        success: true,
        file: data.data.path,
        message: data.message,
        fileUrl: data.data.url,
      };
    }
    return { success: false, message: data?.message || 'خطا در آپلود', ...data };
  } catch (error) {
    console.error("Upload Failed:", error);
    return { success: false, message: error.message || "خطا در آپلود" };
  }
};

export const useApi = () => {
  return {
    sendRequest,
    sendPostRequest,
    uploadFile
  };
};

export const api = {
  getVersion: () => DEV_MODE ? mockDelay(MOCK_DATA.version) : sendRequest('/version'),
  
  // Auth
  login: async (mobile) => {
    if (DEV_MODE) {
      await AsyncStorage.setItem('temp_mobile', mobile);
      const user = MOCK_USERS.find(u => u.mobile === mobile);
      return {
        success: !!user,
        message: user ? "کد ارسال شد" : "کاربر یافت نشد",
        user: user || null,
      };
    }
    return sendPostRequest('/auth/login', { mobile });
  },
  
  verify: async (mobile, code) => {
    if (DEV_MODE) {
      const user = MOCK_USERS.find(u => u.mobile === mobile) || MOCK_USERS[0];
      return { success: true, message: "ورود موفق", token: "mock_token", user };
    }
    return sendPostRequest('/auth/verify', { mobile, code });
  },
  
  getProfile: () => DEV_MODE ? mockDelay(MOCK_DATA.profile) : sendRequest('/auth/profile'),
  updateProfile: (data) => DEV_MODE ? mockDelay(MOCK_DATA.updateProfile) : sendPostRequest('/auth/profile', data),

  // Inquiry
  inquiry: (angCode) => DEV_MODE ? mockDelay(MOCK_DATA.inquiry) : sendRequest('/inquiry', { angCode }),
  getInquiryHistory: () => DEV_MODE ? mockDelay(MOCK_DATA.inquiryHistory) : sendRequest('/inquiry/history'),
  bookmarkInquiry: (angCode) => DEV_MODE ? mockDelay({ success: true }) : sendPostRequest('/inquiry/bookmarks/add', { angCode }),
  removeBookmark: (angCode) => DEV_MODE ? mockDelay({ success: true }) : sendPostRequest('/inquiry/bookmarks/remove', { angCode }),
  getBookmarks: () => DEV_MODE ? mockDelay(MOCK_DATA.bookmarks) : sendRequest('/inquiry/bookmarks'),

  // Admin
  getUsers: (page = 1, limit = 10) => DEV_MODE ? mockDelay({ success: true, data: [] }) : sendRequest('/admin/users', { page, limit }),
  createUser: (data) => DEV_MODE ? mockDelay({ success: true }) : sendPostRequest('/admin/users/create', data),

  // Ticket
  createTicket: (data) => DEV_MODE ? mockDelay(MOCK_DATA.submitSupportTicket) : sendPostRequest('/ticket/create', data),
  getTickets: (page = 1, limit = 10) => DEV_MODE ? mockDelay({ success: true, data: [] }) : sendRequest('/ticket/list', { page, limit }),
  getTicketDetail: (id) => DEV_MODE ? mockDelay({ success: true, data: {} }) : sendRequest('/ticket/detail', { id }),
  sendTicketMessage: (ticketId, message) => DEV_MODE ? mockDelay({ success: true }) : sendPostRequest('/ticket/message', { ticketId, message }),
  closeTicket: (ticketId) => DEV_MODE ? mockDelay({ success: true }) : sendPostRequest('/ticket/close', { ticketId, status: "closed" }),

  // General
  getOrders: () => DEV_MODE ? mockDelay(MOCK_DATA.orders) : sendRequest('/general/orders'),
  assignAngCode: (orderId, stampCode, purity) => DEV_MODE ? mockDelay(MOCK_DATA.assignAngCode) : sendPostRequest('/general/orders/assign-ang', { orderId, stampCode, purity }),
  deliverOrder: (orderId, deliveredWeight) => DEV_MODE ? mockDelay(MOCK_DATA.deliverOrder) : sendPostRequest('/general/orders/deliver', { orderId, deliveredWeight }),
  
  getLabs: () => DEV_MODE ? mockDelay(MOCK_DATA.labs) : sendRequest('/general/labs'),
  getNotifications: () => DEV_MODE ? mockDelay(MOCK_DATA.notifications) : sendRequest('/general/notifications'),
  
  submitProjectRequest: (data) => DEV_MODE ? mockDelay(MOCK_DATA.submitProjectRequest) : sendPostRequest('/general/requests/project', data),
  submitRentalRequest: (data) => DEV_MODE ? mockDelay(MOCK_DATA.submitRentalRequest) : sendPostRequest('/general/requests/rental', data),

  uploadFile: async (fileUri, fileName, fileType) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.uploadFile);
    return uploadFile(fileUri, fileName, fileType);
  }
};

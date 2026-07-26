// hooks/useApi.js - پروژه ری‌گیر (اصالت‌سنجی طلا) - ویژه سرور Node.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { DEV_MODE, MOCK_DATA, MOCK_DELAY, MOCK_USERS } from '../config/dev';

// آدرس پایه سرور Node.js (Express)
const baseUrl = "https://raygnd.blhgroups.ir/api";

// ایجاد instance از axios
const apiClient = axios.create({
  baseURL: baseUrl,
  timeout: 15000,
});

/**
 * دریافت توکن یا شناسه دستگاه (finger) از ذخیره‌ساز محلی
 */
const getAuthHeaders = async () => {
  const finger = await AsyncStorage.getItem('user_finger');
  const token = await AsyncStorage.getItem('auth_token');
  
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (finger) {
    headers['x-user-finger'] = finger;
  }
  return { headers, finger, token };
};

// تابع برای شبیه‌سازی تاخیر در حالت موک
const mockDelay = (data) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), MOCK_DELAY);
  });
};

/**
 * ارسال درخواست GET به سرور Node.js
 */
export const sendRequest = async (operation, additionalParams = {}) => {
  try {
    const { headers, finger } = await getAuthHeaders();
    
    // پارامترهای تمیز برای Node.js (دیگر نیازی به newdb, Icms, file=json مربوط به PHP نیست)
    const params = {
      op: operation,
      ...(finger ? { finger } : {}),
      ...additionalParams
    };

    const response = await apiClient.get('/', {
      params,
      headers
    });

    return response.data;
  } catch (error) {
    console.error("درخواست با خطا مواجه شد:", error?.response?.data || error.message);
    if (error.response) {
      return error.response.data || { success: false, message: `خطای سرور: ${error.response.status}` };
    }
    return { success: false, message: error.message || "عدم اتصال به سرور" };
  }
};

/**
 * ارسال درخواست POST به سرور Node.js
 */
export const sendPostRequest = async (operation, additionalParams = {}) => {
  try {
    const { headers, finger } = await getAuthHeaders();

    // در Node.js می‌توان مستقیماً داده‌ها را به صورت JSON یا FormData ارسال کرد
    const payload = {
      op: operation,
      ...(finger ? { finger } : {}),
      ...additionalParams
    };

    const response = await apiClient.post('/', payload, {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    return response.data;
  } catch (error) {
    console.error("ارسال اطلاعات با خطا مواجه شد:", error?.response?.data || error.message);
    if (error.response) {
      return error.response.data || { success: false, message: `خطای سرور: ${error.response.status}` };
    }
    return { success: false, message: error.message || "عدم اتصال به سرور" };
  }
};

/**
 * آپلود فایل به سرور Node.js با استفاده از FormData
 */
export const uploadFile = async (fingerParam, fileUri, fileName, fileType) => {
  try {
    const { headers, finger: storedFinger } = await getAuthHeaders();
    const activeFinger = fingerParam || storedFinger;

    const formData = new FormData();
    formData.append('ufile', {
      uri: fileUri,
      name: fileName || `file_${Date.now()}.jpg`,
      type: fileType || 'image/jpeg',
    });
    formData.append('op', 'm_upload');
    if (activeFinger) {
      formData.append('finger', activeFinger);
    }

    const response = await apiClient.post('/upload', formData, {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      }
    });

    const data = response.data;

    if (data?.success && data?.file) {
      return {
        success: true,
        file: data.file,
        message: data.message,
        fileUrl: data.fileUrl || `https://raygnd.blhgroups.ir/uploads/${data.file}`,
      };
    }

    return { success: false, message: data?.message || 'خطا در آپلود', ...data };
  } catch (error) {
    console.error("آپلود فایل با خطا مواجه شد:", error);
    return { success: false, message: error.message || "خطا در برقراری ارتباط با سرور" };
  }
};

// هوک اصلی جهت استفاده در کامپوننت‌های فرانت‌اند
export const useApi = () => {
  return {
    sendRequest,
    sendPostRequest,
    uploadFile
  };
};

/**
 * ============================================
 * توابع ساختاریافته API - ویژه فرانت پروژه ری‌گیر
 * ============================================
 */
export const api = {
  // ۱. احراز هویت
  getVersion: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.version);
    return sendRequest('m_version');
  },

  login: async (mobile) => {
    if (DEV_MODE) {
      await AsyncStorage.setItem('temp_mobile', mobile);
      const user = MOCK_USERS.find(u => u.mobile === mobile);
      return {
        success: !!user,
        message: user ? "کد تایید برای شما ارسال شد" : "کاربری با این شماره یافت نشد",
        code: 12345,
        user: user || null,
      };
    }
    return sendPostRequest('m_login', { username: mobile, mob: mobile });
  },

  verify: async (finger, code) => {
    if (DEV_MODE) {
      if (code !== '12345' && code !== 12345) {
        return { success: false, message: "کد وارد شده نامعتبر است." };
      }
      const tempMobile = await AsyncStorage.getItem('temp_mobile');
      const user = MOCK_USERS.find(u => u.mobile === tempMobile) || MOCK_USERS[0];
      const userFinger = `mock_finger_${user.id}`;
      await AsyncStorage.setItem('user_finger', userFinger);
      return {
        finger: userFinger,
        success: true,
        message: "ورود موفقیت‌آمیز",
        user
      };
    }
    return sendPostRequest('m_verify', { finger, code });
  },

  getProfile: async () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.profile);
    return sendRequest('m_profile');
  },

  updateProfile: async (data) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.updateProfile);
    return sendPostRequest('m_profile', data);
  },

  // ۲. استعلام اصالت طلا
  inquiry: (angCode) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.inquiry);
    return sendRequest('m_inquiry', { angCode });
  },

  getInquiryHistory: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.inquiryHistory);
    return sendRequest('m_inquiry_history');
  },

  bookmarkInquiry: (inquiryId) => {
    if (DEV_MODE) return mockDelay({ success: true, message: "استعلام با موفقیت نشان شد" });
    return sendPostRequest('m_bookmark_inquiry', { inquiryId });
  },

  getBookmarks: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.bookmarks);
    return sendRequest('m_bookmarks');
  },

  // ۳. آزمایشگاه‌ها
  getLabs: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.labs);
    return sendRequest('m_labs');
  },

  getTopLabs: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.topLabs);
    return sendRequest('m_top_labs');
  },

  getHomeBanners: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.homeBanners);
    return sendRequest('m_home_banners');
  },

  // ۴. مدیریت سفارش‌ها
  getOrders: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.orders);
    return sendRequest('m_orders');
  },

  getSellerOrders: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.sellerOrders);
    return sendRequest('m_seller_orders');
  },

  addOrder: (orderData) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.addOrder);
    return sendPostRequest('m_add_order', orderData);
  },

  confirmOrder: (orderId, wageData) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.confirmOrder);
    return sendPostRequest('m_confirm_order', { orderId, ...wageData });
  },

  receiveOrder: (orderId, receivedWeight) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.receiveOrder);
    return sendPostRequest('m_receive_order', { orderId, receivedWeight });
  },

  meltOrder: (orderId, meltData) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.meltOrder);
    return sendPostRequest('m_melt_order', { orderId, ...meltData });
  },

  deliverOrder: (orderId, deliveryData) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.deliverOrder);
    return sendPostRequest('m_deliver_order', { orderId, ...deliveryData });
  },

  archiveOrder: (orderId) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.archiveOrder);
    return sendPostRequest('m_archive_order', { orderId });
  },

  cancelOrder: (orderId, reason) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.cancelOrder);
    return sendPostRequest('m_cancel_order', { orderId, reason });
  },

  assignAngCode: (orderId, stampCode) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.assignAngCode);
    return sendPostRequest('m_assign_ang', { orderId, stampCode });
  },

  resolveTrust: (orderId, purity) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.resolveTrust);
    return sendPostRequest('m_resolve_trust', { orderId, purity });
  },

  // ۵. درخواست‌های کرایه
  getRentalRequests: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.rentalRequests);
    return sendRequest('m_rental_requests');
  },

  submitRentalRequest: (formData) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.submitRentalRequest);
    return sendPostRequest('m_submit_rental', formData);
  },

  removeForm: (formId) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.removeForm);
    return sendPostRequest('m_remove_form', { formId });
  },

  // ۶. درخواست‌های پروژه‌ای
  getProjectRequests: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.projectRequests);
    return sendRequest('m_project_requests');
  },

  submitProjectRequest: (formData) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.submitProjectRequest);
    return sendPostRequest('m_submit_project', formData);
  },

  // ۷. امور مالی
  getHesab: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.hesab);
    return sendRequest('m_hesab');
  },

  // ۸. سایر خدمات
  submitReferral: (referralData) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.submitReferral);
    return sendPostRequest('m_submit_referral', referralData);
  },

  submitSupportTicket: (ticketData) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.submitSupportTicket);
    return sendPostRequest('m_support_ticket', ticketData);
  },

  getNotifications: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.notifications);
    return sendRequest('m_notifications');
  },

  markNotificationRead: (notificationId) => {
    if (DEV_MODE) return mockDelay({ success: true, message: "اعلان به‌روزرسانی شد" });
    return sendPostRequest('m_mark_notification_read', { notificationId });
  },

  getDashboardData: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.dashboardData);
    return sendRequest('m_dashboard');
  },

  getAdminDashboard: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.adminDashboard);
    return sendRequest('m_admin_dashboard');
  },

  getWorkshops: () => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.workshops);
    return sendRequest('m_workshops');
  },

  uploadFile: async (finger, fileUri, fileName, fileType) => {
    if (DEV_MODE) return mockDelay(MOCK_DATA.uploadFile);
    return uploadFile(finger, fileUri, fileName, fileType);
  }
};

export const DEV_MODE = false;
export const MOCK_DELAY = 1000;

export const MOCK_USERS = [
  { id: 1, mobile: '09121112233', role: 'gold' },
  { id: 2, mobile: '09351112233', role: 'lab' },
  { id: 3, mobile: '09991112233', role: 'admin' },
];

export const MOCK_DATA = {
  version: { success: true, version: "1.0.0" },
  profile: { success: true, data: { name: "تست", mobile: "09121112233" } },
  updateProfile: { success: true, message: "پروفایل بروز شد" },
  inquiry: { success: true, data: { labName: "تست ریگیری", purity: "750", date: "1403/01/01" } },
  inquiryHistory: { success: true, data: [] },
  bookmarks: { success: true, data: [] },
  labs: { success: true, data: [] },
  topLabs: { success: true, data: [] },
  homeBanners: { success: true, data: [] },
  orders: { success: true, data: [] },
  sellerOrders: { success: true, data: [] },
  addOrder: { success: true, message: "سفارش ثبت شد" },
  confirmOrder: { success: true, message: "سفارش تایید شد" },
  receiveOrder: { success: true, message: "سفارش دریافت شد" },
  meltOrder: { success: true, message: "ذوب ثبت شد" },
  deliverOrder: { success: true, message: "سفارش تحویل شد" },
  archiveOrder: { success: true, message: "آرشیو شد" },
  cancelOrder: { success: true, message: "لغو شد" },
  assignAngCode: { success: true, message: "انگ ثبت شد" },
  resolveTrust: { success: true, message: "امانت تسویه شد" },
  rentalRequests: { success: true, data: [] },
  submitRentalRequest: { success: true, message: "درخواست ثبت شد" },
  removeForm: { success: true, message: "حذف شد" },
  projectRequests: { success: true, data: [] },
  submitProjectRequest: { success: true, message: "درخواست ثبت شد" },
  hesab: { success: true, data: [] },
  submitReferral: { success: true, message: "ثبت شد" },
  submitSupportTicket: { success: true, message: "تیکت ثبت شد" },
  notifications: { success: true, data: [] },
  dashboardData: { success: true, data: {} },
  adminDashboard: { success: true, data: {} },
  workshops: { success: true, data: [] },
  uploadFile: { success: true, file: "test.jpg", fileUrl: "https://raygnd.blhgroups.ir/uploads/test.jpg" }
};

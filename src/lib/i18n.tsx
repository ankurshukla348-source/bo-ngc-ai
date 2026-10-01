import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CATEGORIES, type Category } from "./catalog";
import { CATEGORY_LABELS_VI, TEXT } from "@/constants/text";

/** Bilingual (VI/EN) labels for the whole app. */

export type Lang = "vi" | "en";

const vi = {
  // ── Header / nav ─────────────────────────────────────────────
  // Locked store copy — sourced from src/constants/text.ts so it can never
  // reset or drift between renders/deployments.
  announce: TEXT.announce,
  seller: "Khu bán hàng",
  navShop: "Bộ sưu tập",
  navCategories: "Danh mục",
  navStory: "Câu chuyện",
  navContact: "Liên hệ",
  searchPlaceholder: "Tìm sản phẩm...",
  searchLabel: "Tìm kiếm",
  cartLabel: "Giỏ hàng",

  // ── Hero ─────────────────────────────────────────────────────
  heroEyebrow: "HÀNG MỚI VỀ MỖI NGÀY.",
  heroTitle: "Thoải Mái & Tự Tin Mỗi Ngày.",
  heroBody:
    "Những món đồ được tuyển chọn kỹ lưỡng cho tủ đồ hiện đại — được làm để mặc, được làm để yêu.",
  ctaShop: "Mua ngay",
  ctaLookbook: "Xem lookbook",
  heroTag: "Chỉnh sửa mùa Xuân 2026",

  // ── Value props ──────────────────────────────────────────────
  vp1Title: "Tuyển chọn kỹ lưỡng",
  vp1Sub: "Từng món đều được chọn bằng tay",
  vp2Title: "Đổi trả dễ dàng",
  vp2Sub: "Đổi trả trong 7 ngày",
  vp3Title: "Trả tiền khi nhận hàng",
  vp3Sub: "Trả tiền khi nhận hàng, không cần chuyển khoản trước",

  // ── Shop section ─────────────────────────────────────────────
  shopEyebrow: "MUA SẮM THEO DANH MỤC",
  shopTitle: "Tìm phong cách của bạn",
  shopViewAll: "Xem tất cả sản phẩm",
  allCategories: "Tất cả",
  productsUnit: "sản phẩm",
  productUnit: "sản phẩm",

  // ── Product card ─────────────────────────────────────────────
  addToCart: "Thêm vào giỏ",
  addedToast: "Đã thêm vào giỏ",
  soldOut: "Hết hàng",
  inStock: "Còn hàng",
  sizeLabel: "Kích cỡ",
  wishlistAdd: "Thêm vào yêu thích",
  wishlistRemove: "Bỏ yêu thích",
  emptyTitle: "Không tìm thấy sản phẩm",
  emptyBody: "Thử đổi danh mục hoặc từ khóa khác.",
  clearFilters: "Xóa bộ lọc",
  loadingProducts: "Đang tải sản phẩm...",

  // ── Story ────────────────────────────────────────────────────
  storyEyebrow: "CÂU CHUYỆN CỦA CHÚNG TÔI",
  storyTitle: "Chọn đồ nội y như chọn sự thấu hiểu.",
  storyBrand: "Shop Thời Trang & Mỹ Phẩm Bảo Ngọc.",
  storyP1:
    "Tại Shop Thời Trang & Mỹ Phẩm Bảo Ngọc, mỗi sản phẩm đều được chọn kỹ từ chất vải đến đường may — đồ lót mềm mại, mỹ phẩm chính hãng, tất cả để bạn thoải mái và tự tin mỗi ngày.",
  storyP2:
    "Chúng tôi tin rằng thời trang đẹp không cần ồn ào — chỉ cần vải tốt, phom dáng chuẩn và một người thật sự hiểu bạn.",
  statCustomers: "khách hàng tin dùng.",
  statRating: "điểm đánh giá",
  statDispatch: "xử lý đơn.",

  // ── Social proof ─────────────────────────────────────────────
  loveEyebrow: "KHÁCH HÀNG NÓI GÌ",
  loveTitle: "Được yêu mến ở Hà Nội",
  quote1:
    "Đầm vừa vặn như in, giao hàng đúng hẹn. Cửa hàng đóng gói rất chỉn chu.",
  quote1Name: "Minh Anh",
  quote1City: "Cầu Giấy, Hà Nội",
  quote2:
    "Mình mua chiếc cardigan ba lần trong mùa đông này — vải mềm, không xù.",
  quote2Name: "Thu Hà",
  quote2City: "Hải Châu, Đà Nẵng",
  quote3:
    "Chụp ảnh y như thật, ship COD tiện lắm. Sẽ còn quay lại mua thêm.",
  quote3Name: "Quỳnh Như",
  quote3City: "Quận 1, TP.HCM",

  // ── CTA band ─────────────────────────────────────────────────
  ctaTitle: "Sẵn sàng làm mới tủ đồ?",
  ctaBody: "Bộ sưu tập mới về mỗi tuần — giao toàn quốc.",
  ctaButton: "Mua chỉnh sửa mới",

  // ── Mockup sections (circles, cards, banners, newsletter) ────
  vp4Title: "Giao hàng nhanh",
  vp4Sub: "Toàn quốc 1–4 ngày",
  exploreNow: "Khám phá ngay",
  picksEyebrow: "MỌI NGƯỜI ĐỀU MÊ",
  picksTitle: "Những món được yêu nhất",
  banner1Tag: "SALE MÙA XUÂN",
  banner1Title: "GIẢM ĐẾN 50%",
  banner1Sub: "Một số mẫu đầm chọn lọc — số lượng giới hạn.",
  banner1Cta: "Săn deal ngay",
  banner2Tag: "VỪA VỀ KHO",
  banner2Title: "ĐỒ MỚI CỰC ĐẸP",
  banner2Sub: "Áo len & phụ kiện mới cập bến mỗi tuần.",
  banner2Cta: "Xem đồ mới",
  newsTitle: "Tham gia danh sách phong cách",
  newsBody: "Ưu đãi, BST mới và mẹo phối đồ — mỗi tuần một email, không spam.",
  newsPlaceholder: "Email của bạn",
  newsCta: "Đăng ký",
  newsThanks: "Cảm ơn! Bạn đã vào danh sách rồi nhé.",

  // ── Footer ───────────────────────────────────────────────────
  footerTagline: TEXT.locationTagline,
  footerShop: "DANH MỤC",
  footerSupport: "HỖ TRỢ",
  footerCompany: "CÔNG TY",
  supportShipping: "Miễn phí giao hàng từ 400.000 VND",
  supportReturns: "Hỗ trợ đổi trả hàng trong vòng 7 ngày.",
  supportPayment: "Thanh toán khi nhận hàng",
  supportLiveChat: "Hỗ trợ trực tuyến qua Live Chat",
  policyLabel: "Chính sách mua hàng",
  policyUpdatedNote:
    "Chính sách hiện hành, áp dụng cho mọi đơn hàng tại Shop Bảo Ngọc.",
  policyModalTitle: "Chính sách mua sắm & Đổi trả",
  policyModalDesc:
    "Vui lòng đọc kỹ chính sách của Shop Bảo Ngọc trước khi tiếp tục mua sắm.",
  policyAgreeLabel:
    "Tôi đã đọc và đồng ý với các chính sách mua hàng của Shop Bảo Ngọc",
  policyContinueCta: "Tiếp tục mua sắm",
  companyStory: "Câu chuyện",
  companyReviews: "Đánh giá khách hàng",
  rights: "© 2026 Shop Thời Trang & Mỹ Phẩm Bảo Ngọc. Mọi quyền được bảo lưu.",

  // ── Cart / checkout ──────────────────────────────────────────
  checkoutTitle: "Thanh toán",
  step1: "Địa chỉ giao hàng",
  step1Sub: "Nhập thông tin người nhận",
  fullName: "Họ và tên",
  phone: "Số điện thoại",
  province: "Tỉnh / Thành phố",
  district: "Quận / Huyện",
  ward: "Phường / Xã",
  street: "Địa chỉ (số nhà, đường)",
  orderNote: "Ghi chú cho shipper (không bắt buộc)",
  emailForReceipt: "Email nhận xác nhận đơn (không bắt buộc)",
  continuePayment: "Tiếp tục: Thanh toán",
  step2: "Phương thức thanh toán",
  step2Sub: "Chọn cách bạn muốn trả",
  payVietqr: "VietQR — chuyển khoản",
  payVietqrDesc: "Quét mã QR bằng app ngân hàng bất kỳ",
  payCod: "Tiền mặt khi nhận hàng",
  payCodDesc: "Trả trực tiếp cho người giao hàng",
  payWallet: "Ví điện tử",
  payWalletDesc: "MoMo / ZaloPay — sắp ra mắt",
  amountDue: "Số tiền cần chuyển",
  transferNote:
    "Quét mã, chuyển đúng số tiền. Đơn được xác nhận tự động khi shop nhận tiền.",
  bankDetails: "Thông tin tài khoản",
  continueReview: "Tiếp tục: Xác nhận",
  step3: "Xác nhận & đặt hàng",
  step3Sub: "Kiểm tra lại đơn hàng của bạn",
  orderSummary: "Tóm tắt đơn hàng",
  subtotal: "Tạm tính",
  shipping: "Phí vận chuyển",
  free: "Miễn phí",
  total: "Tổng cộng",
  qrUnavailable: "Mã QR không hiển thị được. Vui lòng chuyển khoản theo số tiền và mã đơn hàng bên dưới.",
  placeOrder: "Đặt hàng",
  placing: "Đang xử lý...",
  qtyLabel: "SL",
  emptyCartTitle: "Giỏ hàng trống",
  emptyCartBody:
    "Chưa có món nào trong giỏ. Khám phá bộ sưu tập mới nhé!",
  continueShopping: "Tiếp tục mua sắm",
  addressRequired: "Vui lòng điền đủ thông tin giao hàng.",
  checkoutError: "Không hoàn tất được đơn hàng.",
  reviewShipTo: "Giao đến",
  reviewPayment: "Thanh toán",
  yourCart: "Giỏ hàng của bạn",

  // ── Confirmation ─────────────────────────────────────────────
  confirmTitle: "Cảm ơn bạn!",
  confirmBody: "Đơn hàng của bạn đã được ghi nhận.",
  orderCode: "MÃ ĐƠN HÀNG",
  copy: "Sao chép",
  copied: "Đã sao chép",
  paymentInstructions: "Hướng dẫn thanh toán",
  codInstructions:
    "Bạn sẽ thanh toán bằng tiền mặt khi nhận hàng. Shop có thể gọi cho bạn để xác nhận trước khi giao.",
  orderDetail: "Chi tiết đơn hàng",
  orderPlacedAt: "Đặt lúc",

  // ── Admin ────────────────────────────────────────────────────
  adminTitle: "Khu bán hàng",
  adminSub: "Shop Thời Trang & Mỹ Phẩm Bảo Ngọc. · Seller Dashboard",
  backToStore: "Về cửa hàng",
  lock: "Khóa",
  newProduct: "Thêm sản phẩm",
  dropImage: "Thả ảnh vào đây",
  dropOr: "hoặc",
  chooseFile: "Chọn tệp",
  takePhoto: "Chụp ảnh",
  imageHint: "JPG/PNG · tối đa 4MB",
  nameVi: "Tên sản phẩm (Tiếng Việt)",
  nameEn: "Tên sản phẩm (Tiếng Anh)",
  category: "Danh mục",
  priceLabel: "Giá (VNĐ)",
  sizesLabel: "Kích cỡ",
  stockLabel: "Tồn kho",
  publish: "Đăng bán",
  publishing: "Đang đăng...",
  productsLabel: "Sản phẩm",
  edit: "Sửa",
  save: "Lưu",
  cancel: "Hủy",
  delete: "Xóa",
  confirmDelete: "Chắc chắn?",
  bankSettings: "Thông tin ngân hàng (VietQR)",
  bankSettingsSub:
    "Khách sẽ quét mã QR tới số tài khoản này. Để trống nếu chưa có.",
  bankNameL: "Ngân hàng",
  binL: "Mã BIN",
  accountNoL: "Số tài khoản",
  holderL: "Chủ tài khoản",
  saveSettings: "Lưu thông tin",
  settingsSaved: "Đã lưu thông tin ngân hàng",
  productPublished: "Đã đăng sản phẩm",
  productUpdated: "Đã cập nhật",
  productDeleted: "Đã xóa sản phẩm",
  uploadFailed: "Tải ảnh thất bại — thử lại",
  noProducts: "Chưa có sản phẩm nào.",
  fillNames: "Cần ít nhất một tên sản phẩm.",
  orderCodeLabel: "Đơn hàng",

  // ── Auth (customer / seller login) ─────────────────────────
  welcomeBackTitle: "Chào mừng trở lại",
  passwordLabel: "Mật khẩu",
  confirmPasswordLabel: "Nhập lại mật khẩu",
  signInCta: "Đăng nhập",
  continueCta: "Tiếp tục",
  saving: "Đang lưu...",
  otpTitle: "Nhập mã xác thực",
  otpSentToast: "Mã xác thực đã được gửi tới email của bạn.",
  forgotPassword: "Quên mật khẩu?",
  createPasswordTitle: "Tạo mật khẩu",
  createAccountCta: "Hoàn tất đăng ký",
  newPasswordTitle: "Đặt mật khẩu mới",
  savePasswordCta: "Lưu mật khẩu mới",
  passwordMismatch: "Hai mật khẩu không giống nhau.",
  accountCreatedToast: "Tạo tài khoản thành công — chào mừng bạn!",
  passwordResetToast: "Đã đổi mật khẩu. Đăng nhập lại nhé.",
  guestCheckoutNote: "Mua sắm không cần tài khoản — kiểm tra giỏ hàng và đặt hàng luôn.",
  authEyebrow: "Đăng nhập Shop Thời Trang & Phụ Kiện Nữ Bảo Ngọc.",
  authWelcome: "Chào mừng trở lại",
  authSub: "Đăng nhập để mua sắm nhanh hơn và theo dõi đơn hàng của bạn.",
  tabCustomer: "Khách hàng",
  tabSeller: "Người bán",
  emailLabel: "Địa chỉ email",
  sendCode: "Gửi mã đăng nhập",
  sending: "Đang gửi...",
  codeSent: "Nhập 6 chữ số we gửi tới",
  verify: "Xác nhận & đăng nhập",
  verifying: "Đang xác nhận...",
  orDivider: "hoặc",
  guestCta: "Tiếp tục với tư cách khách",
  guestHint: "Mua sắm không cần tài khoản",
  backToEmail: "Dùng email khác",
  authTerms:
    "Bằng việc tiếp tục, bạn đồng ý với điều khoản & chính sách của Shop Thời Trang Nữ Bảo Ngọc.",
  sellerTitle: "Đăng nhập dành cho Chủ shop",
  sellerSub:
    "Khu vực dành riêng cho chủ shop — quản lý sản phẩm và đơn hàng.",
  accessCodeLabel: "Mã truy cập",
  sellerEnter: "Vào bảng điều khiển",
  sellerError: "Mã truy cập không đúng.",
  sellerHint: "Đăng nhập dành cho Chủ shop — liên hệ chủ cửa hàng để nhận mã truy cập.",
  chooseAccount: "Chọn loại tài khoản",

  // ── Trust strip / mockup copy ──────────────────────────────
  trustShip: "Miễn phí vận chuyển",
  trustShipSub: "Đơn hàng từ 400.000 VNĐ",
  trustReturns: "Đổi trả linh hoạt",
  trustReturnsSub: "Hỗ trợ đổi size trong 7 ngày",
  trustPay: "Đóng gói kín đáo & Bảo mật",
  trustPaySub: "Giao hàng an toàn, che tên sản phẩm 100%",
  trustSupport: "Hỗ trợ nhanh chóng",
  trustSupportSub: "Nhắn tin trực tiếp qua Live Chat",
  heroTagline:
    "Khám phá các dòng đồ lót mềm mại, áo bra nâng dáng và váy ngủ lụa cao cấp — mang lại cảm giác dễ chịu tuyệt đối và nữ tính dành cho bạn.",
  slideLabel: "Slide",
  circleSale: "SALE",
  viewAllCategories: "Xem tất cả danh mục",
  viewAllProducts: "Xem tất cả sản phẩm",
  banner1Eyebrow: "ƯU ĐÃI GIỚI HẠN",
  banner2Eyebrow: "HÀNG MỚI VỀ",
  shopTheSale: "Mua sắm sale",
  exploreNewIn: "Khám phá đồ mới",
  newsOffer: "NHẬN GIẢM 10% CHO ĐƠN ĐẦU TIÊN",
  introEyebrow: "XUÂN — HÈ 2026",
  introTitle: "Những thiết kế sống cùng bạn",
  introBody:
    "Chất liệu tự nhiên, tông màu trung tính và phom dáng thoải mái — được chọn kỹ để dễ phối và mặc bền lâu.",
  signIn: "Đăng nhập",
  signOutLabel: "Đăng xuất",
  myAccount: "Tài khoản của tôi",
  footerNewsSub: "Đăng ký nhận tin và ưu đãi 10% cho đơn đầu tiên.",

  // ── Account page ───────────────────────────────────────────
  accountTitle: "Tài khoản của tôi",
  accountEmail: "Email",
  accountInfo: "Thông tin tài khoản",
  accountInfoHint:
    "Thông tin này dùng để gửi xác nhận đơn hàng và thông báo khi shop nhận hàng.",
  ordersTitle: "Đơn hàng của tôi",
  ordersEmpty: "Bạn chưa có đơn hàng nào.",
  ordersNote:
    "Lịch sử đơn hàng sẽ hiển thị tại đây ngay sau khi bạn đặt hàng lần đầu.",
  wishlistTitle: "Danh sách yêu thích",
  wishlistEmpty: "Chưa lưu món nào — chạm vào trái tim trên sản phẩm để lưu lại.",
  wishlistCount: "món đã lưu",
  // ── Seller PIN / orders / moderation ────────────────────────
  sellerPinTitle: "Mã truy cập chủ shop",
  sellerPinBody: "Nhập mã truy cập của chủ shop để mở khu bán hàng.",
  pinPlaceholder: "Nhập mã PIN",
  unlock: "Mở khoá",
  pinError: "Mã không đúng. Thử lại.",
  sellerTabOrders: "Đơn hàng",
  orderCustomer: "Khách hàng",
  shippingZoneLabel: "Khu vực giao hàng",
  trackOrderCta: "Tra đơn hàng",
  trackTitle: "Tra cứu đơn hàng",
  trackSubtitle:
    "Nhập mã đơn hàng và số điện thoại đã dùng khi đặt để xem trạng thái.",
  trackOrderCode: "Mã đơn hàng",
  trackPhone: "Số điện thoại",
  trackSearch: "Tra cứu",
  trackMissingFields: "Vui lòng nhập mã đơn hàng và số điện thoại.",
  trackNotFound:
    "Không tìm thấy đơn hàng. Kiểm tra lại mã đơn và số điện thoại.",
  trackHint: "Bạn có thể theo dõi đơn này bất cứ lúc nào tại",
  orderItems: "Sản phẩm",
  orderPayment: "Thanh toán",
  orderStatusLabel: "Trạng thái đơn hàng",
  orderStatusProcessing: "Đang xử lý",
  orderStatusShipped: "Đã gửi hàng",
  orderStatusOutForDelivery: "Đang giao hàng",
  orderStatusDelivered: "Đã giao",
  orderStatusCancelled: "Đã hủy",
  orderStatusSaved: "Đã cập nhật trạng thái đơn hàng",
  orderStatusSaveFailed: "Không cập nhật được trạng thái.",
  orderDeleteAddress: "Xóa thông tin giao hàng",
  orderDeleteAddressTitle: "Xóa thông tin giao hàng",
  orderDeleteAddressBody:
    "Bạn có chắc chắn muốn xóa thông tin địa chỉ giao hàng của đơn hàng này không? Hành động này không thể hoàn tác.",
  orderDeleteAddressDone: "Đã xóa thông tin giao hàng.",
  orderDeleteAddressFailed: "Không xóa được thông tin giao hàng.",
  orderAddressRedacted: "Thông tin giao hàng đã được xóa.",
  exportCsv: "Xuất CSV",
  exportCsvBusy: "Đang xuất…",
  exportCsvDone: "Đã tải file CSV.",
  exportCsvFailed: "Không xuất được file CSV.",
  noOrders: "Chưa có đơn hàng nào.",
  descriptionLabel: "Mô tả sản phẩm",
  descriptionPlaceholder: "Chất liệu, cách dùng, lưu ý bảo quản...",
  stockCountLabel: "Số lượng tồn kho",
  stockCountPlaceholder: "Để trống nếu không quản lý tồn kho",
  stockCountShort: "Tồn:",
  lockSellerSession: "Khoá phiên",
  replaceImageLabel: "Ảnh sản phẩm",
  replaceImageCta: "Đổi ảnh",
  replaceImageAgain: "Đổi ảnh khác",
  sellerDashboardTitle: "Khu bán hàng",
  sellerDashboardBody: "Quản lý sản phẩm, đơn hàng và tin nhắn khách hàng.",
  sellerDashboardCta: "Vào khu bán hàng",
  chatMessageUnit: "tin nhắn",
  chatDeleteMessage: "Xóa tin nhắn này",
  chatClearThread: "Xóa cuộc trò chuyện",
  chatClearConfirm: "Chắc chắn xóa?",
  chatCleared: "Đã xóa {n} tin nhắn.",
  chatActionFailed: "Không thực hiện được. Thử lại.",

  // ── Google Sign-In ──────────────────────────────────────────
  googleSignInCta: "Đăng nhập với Google",
  googleSignInHint: "Dùng tài khoản Google để mua sắm nhanh hơn — không cần mật khẩu.",

  // ── Search results view ─────────────────────────────────────
  searchResultsTitle: "KẾT QUẢ TÌM KIẾM",
  clearSearch: "Xóa tìm kiếm",

  // ── Quick view modal ────────────────────────────────────────
  quickView: "Xem nhanh",
  quickViewClose: "Đóng",
  inCartBadge: "ở trong giỏ",
  categoryLabel: "Danh mục",
  categoryFallback: "Khác",

  // ── Live chat (storefront widget) ───────────────────────────
  chatWidgetLabel: "Hỗ trợ trực tuyến qua Live Chat",
  chatTitle: "Live Chat — Shop Bảo Ngọc",
  chatIntro:
    "Chào bạn! Mình là Bảo Ngọc. Hỏi gì mình phản hồi ngay tại đây nhé 💬",
  chatYourName: "Tên của bạn (không bắt buộc)",
  chatPlaceholder: "Nhập tin nhắn của bạn...",
  chatSend: "Gửi",
  chatOpen: "Mở khung chat",
  chatClose: "Đóng chat",
  chatYou: "Bạn",
  chatShop: "Shop Bảo Ngọc",
  chatEmpty: "Chưa có tin nhắn nào. Hãy là người đầu tiên!",
  chatSendFailed: "Chưa gửi được tin nhắn. Thử lại nhé.",

  // ── Marketing opt-in ────────────────────────────────────────
  marketingOptInLabel: "Nhận thông báo khuyến mãi & quà tặng qua Email",
  marketingOptInSub: "Bạn có thể tắt bất kỳ lúc nào.",

  // ── Seller: live chat inbox ──────────────────────────────────
  sellerTabChat: "Tin nhắn khách hàng",
  sellerTabProducts: "Sản phẩm & cài đặt",
  sellerTabBroadcast: "Gửi Email Quảng Cáo",
  chatInboxEmpty: "Chưa có tin nhắn nào từ khách hàng.",
  chatInboxAnonymous: "Khách vãng lai",
  chatThreadLoad: "Chọn một cuộc trò chuyện để xem tin nhắn.",
  chatReplyPlaceholder: "Nhập câu trả lời...",
  chatReplySend: "Gửi trả lời",
  chatUnreadOne: "tin nhắn mới",
  chatMarkedRead: "Đã đánh dấu đã đọc",
  chatSenderBadge: "KH",

  // ── Seller: promo broadcast ──────────────────────────────────
  broadcastSubjectLabel: "Tiêu đề email",
  broadcastSubjectPlaceholder: "Ưu đãi mùa hè — giảm 30% toàn bộ phụ kiện",
  broadcastBodyLabel: "Nội dung email",
  broadcastBodyPlaceholder: "Chào bạn! Bộ sưu tập mới đã về cửa hàng...",
  broadcastFromLabel: "Địa chỉ gửi (tùy chọn)",
  broadcastFromPlaceholder: "Shop Bảo Ngọc <shop@yourdomain.com>",
  broadcastTestToLabel: "Gửi thử tới (không gửi cho khách)",
  broadcastTestToPlaceholder: "email của bạn để xem thử",
  broadcastTestCta: "Gửi thử cho tôi",
  broadcastSendCta: "Gửi email quảng cáo",
  broadcastSending: "Đang gửi...",
  broadcastAudience: "Số khách đã đồng ý nhận email",
  broadcastSub: "Gửi tới toàn bộ khách hàng đã bật “Nhận thông báo khuyến mãi”.",
  broadcastSent: "Đã gửi tới {n} khách hàng.",
  broadcastPartial: "Đã gửi {n}, thất bại {f}.",
  broadcastNoKey:
    "Chưa cấu hình RESEND_API_KEY. Thêm khoá API trong tab Keys/API keys rồi gửi lại.",
  broadcastNoRecipients: "Chưa có khách hàng nào bật nhận email quảng cáo.",
  broadcastEmptyCampaign: "Vui lòng nhập tiêu đề và nội dung email.",
  broadcastTestSent: "Đã gửi thử tới {n} địa chỉ.",
  broadcastBadTestAddress: "Địa chỉ gửi thử không hợp lệ.",
};

export type TKey = keyof typeof vi;

const en: Record<TKey, string> = {
  // Header / nav
  announce: "Free shipping over 400.000 VND · 7-day returns",
  seller: "Seller dashboard",
  navShop: "Collection",
  navCategories: "Categories",
  navStory: "Our story",
  navContact: "Contact",
  searchPlaceholder: "Search products...",
  searchLabel: "Search",
  cartLabel: "Cart",

  // Hero
  heroEyebrow: "NEW COLLECTION",
  heroTitle: "Elevate your everyday style",
  heroBody:
    "Handpicked pieces for the modern wardrobe — made to wear, made to love.",
  ctaShop: "Shop now",
  ctaLookbook: "Watch lookbook",
  heroTag: "Spring 2026 edit",

  // Value props
  vp1Title: "Handpicked quality",
  vp1Sub: "Every piece chosen by hand",
  vp2Title: "Easy returns",
  vp2Sub: "7-day returns",
  vp3Title: "Pay on delivery",
  vp3Sub: "Pay when it arrives — no upfront transfer",

  // Shop
  shopEyebrow: "SHOP BY CATEGORY",
  shopTitle: "Find your perfect style",
  shopViewAll: "View all products",
  allCategories: "All",
  productsUnit: "products",
  productUnit: "product",

  // Product card
  addToCart: "Add to cart",
  addedToast: "Added to cart",
  soldOut: "Sold out",
  inStock: "In stock",
  sizeLabel: "Size",
  wishlistAdd: "Add to wishlist",
  wishlistRemove: "Remove from wishlist",
  emptyTitle: "No products found",
  emptyBody: "Try another category or search term.",
  clearFilters: "Clear filters",
  loadingProducts: "Loading products...",

  // Story
  storyEyebrow: "OUR STORY",
  storyTitle: "Choosing lingerie is choosing to be understood.",
  storyBrand: "Shop Thời Trang & Mỹ Phẩm Bảo Ngọc.",
  storyP1:
    "At Shop Thời Trang & Mỹ Phẩm Bảo Ngọc, every piece is hand-picked from fabric to stitching — soft lingerie and genuine skincare, all to keep you comfortable and confident every day.",
  storyP2:
    "We believe great style doesn't need noise — just good fabric, an honest cut, and someone who truly understands you.",
  statCustomers: "happy customers",
  statRating: "average rating",
  statDispatch: "order processing.",

  // Social proof
  loveEyebrow: "KIND WORDS",
  loveTitle: "Loved in Hà Nội",
  quote1:
    "The dress fit like it was made for me, delivered on time. Beautifully packed, too.",
  quote1Name: "Minh Anh",
  quote1City: "Cầu Giấy, Hà Nội",
  quote2:
    "I've bought this cardigan three times this winter — soft fabric, zero pilling.",
  quote2Name: "Thu Hà",
  quote2City: "Hải Châu, Đà Nẵng",
  quote3:
    "Photos are true to life and cash on delivery is so easy. I'll be back.",
  quote3Name: "Quỳnh Như",
  quote3City: "District 1, HCMC",

  // CTA band
  ctaTitle: "Ready for a fresh wardrobe?",
  ctaBody: "New pieces land every week — shipped nationwide.",
  ctaButton: "Shop the new edit",

  // Mockup sections (circles, cards, banners, newsletter)
  vp4Title: "Fast delivery",
  vp4Sub: "Nationwide in 1–4 days",
  exploreNow: "Explore now",
  picksEyebrow: "MOST LOVED",
  picksTitle: "Our most loved picks",
  banner1Tag: "SPRING SALE",
  banner1Title: "UP TO 50% OFF",
  banner1Sub: "Selected dresses only — limited stock.",
  banner1Cta: "Grab the deal",
  banner2Tag: "JUST LANDED",
  banner2Title: "FRESH NEW STYLES",
  banner2Sub: "New knits & accessories every week.",
  banner2Cta: "Shop new arrivals",
  newsTitle: "Join our style list",
  newsBody: "Offers, new drops and styling tips — one email a week, no spam.",
  newsPlaceholder: "Your email",
  newsCta: "Subscribe",
  newsThanks: "Thanks! You're on the list.",

  // Footer
  footerTagline:
    "Trusted women's fashion shop of Diên Khánh. Elegant, natural, made for you.",
  footerShop: "SHOP",
  footerSupport: "SUPPORT",
  footerCompany: "COMPANY",
  supportShipping: "Free shipping over 400.000 VND",
  supportReturns: "Exchange support within 7 days.",
  supportPayment: "Cash on delivery",
  supportLiveChat: "Live chat support",
  policyLabel: "Store policy",
  policyUpdatedNote:
    "Current policy, applied to every order placed at Shop Bảo Ngọc.",
  policyModalTitle: "Purchase & Returns Policy",
  policyModalDesc:
    "Please read Shop Bảo Ngọc’s policy carefully before you continue shopping.",
  policyAgreeLabel:
    "I have read and agree to the purchasing policies of Shop Bảo Ngọc",
  policyContinueCta: "Continue shopping",
  companyStory: "Our story",
  companyReviews: "Customer reviews",
  rights: "© 2026 Shop Thời Trang & Mỹ Phẩm Bảo Ngọc. All rights reserved.",

  // Cart / checkout
  checkoutTitle: "Checkout",
  step1: "Shipping address",
  step1Sub: "Enter the recipient's details",
  fullName: "Full name",
  phone: "Phone number",
  province: "Province / City",
  district: "District",
  ward: "Ward",
  street: "Street address",
  orderNote: "Note for the courier (optional)",
  emailForReceipt: "Email for the order confirmation (optional)",
  continuePayment: "Continue to payment",
  step2: "Payment method",
  step2Sub: "Choose how you'd like to pay",
  payVietqr: "VietQR — bank transfer",
  payVietqrDesc: "Scan the QR with any banking app",
  payCod: "Cash on delivery",
  payCodDesc: "Pay the courier directly",
  payWallet: "E-wallet",
  payWalletDesc: "MoMo / ZaloPay — coming soon",
  amountDue: "Amount to transfer",
  transferNote:
    "Scan the code and transfer the exact amount. The order is confirmed once payment lands.",
  bankDetails: "Bank account",
  continueReview: "Continue to review",
  step3: "Review & place order",
  step3Sub: "Check your order before placing it",
  orderSummary: "Order summary",
  subtotal: "Subtotal",
  shipping: "Shipping",
  free: "Free",
  total: "Total",
  qrUnavailable: "The QR code could not be displayed. Please transfer using the amount and order reference below.",
  placeOrder: "Place order",
  placing: "Placing order...",
  qtyLabel: "Qty",
  emptyCartTitle: "Your cart is empty",
  emptyCartBody: "Nothing in the cart yet — explore the new collection!",
  continueShopping: "Continue shopping",
  addressRequired: "Please fill in your shipping details.",
  checkoutError: "We couldn't complete your order.",
  reviewShipTo: "Ship to",
  reviewPayment: "Payment",
  yourCart: "Your cart",

  // Confirmation
  confirmTitle: "Thank you!",
  confirmBody: "Your order has been placed.",
  orderCode: "ORDER ID",
  copy: "Copy",
  copied: "Copied",
  paymentInstructions: "Payment instructions",
  codInstructions:
    "You'll pay in cash when your order arrives. The shop may call to confirm before delivery.",
  orderDetail: "Order details",
  orderPlacedAt: "Placed at",

  // Admin
  adminTitle: "Seller dashboard",
  adminSub: "Shop Thời Trang Nữ Bảo Ngọc. · Khu bán hàng",
  backToStore: "Back to store",
  lock: "Lock",
  newProduct: "New product",
  dropImage: "Drop an image here",
  dropOr: "or",
  chooseFile: "Choose file",
  takePhoto: "Take photo",
  imageHint: "JPG/PNG · max 4MB",
  nameVi: "Product name (Vietnamese)",
  nameEn: "Product name (English)",
  category: "Category",
  priceLabel: "Price (VND)",
  sizesLabel: "Sizes",
  stockLabel: "Stock",
  publish: "Publish",
  publishing: "Publishing...",
  productsLabel: "Products",
  edit: "Edit",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  confirmDelete: "Confirm?",
  bankSettings: "Bank details (VietQR)",
  bankSettingsSub:
    "Customers scan the QR to this account. Leave blank if not set yet.",
  bankNameL: "Bank",
  binL: "BIN code",
  accountNoL: "Account number",
  holderL: "Account holder",
  saveSettings: "Save details",
  settingsSaved: "Bank details saved",
  productPublished: "Product published",
  productUpdated: "Product updated",
  productDeleted: "Product deleted",
  uploadFailed: "Image upload failed — try again",
  noProducts: "No products yet.",
  fillNames: "At least one product name is required.",
  orderCodeLabel: "Order",

  // Auth (customer / seller login)
  welcomeBackTitle: "Welcome back",
  passwordLabel: "Password",
  confirmPasswordLabel: "Confirm password",
  signInCta: "Sign in",
  continueCta: "Continue",
  saving: "Saving...",
  otpTitle: "Enter your verification code",
  otpSentToast: "A verification code was sent to your email.",
  forgotPassword: "Forgot password?",
  createPasswordTitle: "Create a password",
  createAccountCta: "Finish registration",
  newPasswordTitle: "Set a new password",
  savePasswordCta: "Save new password",
  passwordMismatch: "The two passwords don't match.",
  accountCreatedToast: "Account created — welcome!",
  passwordResetToast: "Password updated. Please sign in again.",
  guestCheckoutNote: "Shop without an account — go to your cart and order straight away.",
  authEyebrow: "Shop Thời Trang & Phụ Kiện Nữ Bảo Ngọc. sign in",
  authWelcome: "Welcome back",
  authSub: "Sign in for faster checkout and to track your orders.",
  tabCustomer: "Customer",
  tabSeller: "Seller",
  emailLabel: "Email address",
  sendCode: "Send login code",
  sending: "Sending...",
  codeSent: "Enter the 6 digits we sent to",
  verify: "Verify & sign in",
  verifying: "Verifying...",
  orDivider: "or",
  guestCta: "Continue as guest",
  guestHint: "Shop without an account",
  backToEmail: "Use a different email",
  authTerms:
    "By continuing you agree to Shop Thời Trang Nữ Bảo Ngọc.'s terms & privacy policy.",
  sellerTitle: "Shop Manager Access",
  sellerSub:
    "Restricted area for the shop owner — manage products and orders.",
  accessCodeLabel: "Access code",
  sellerEnter: "Open dashboard",
  sellerError: "Incorrect access code.",
  sellerHint: "Shop Manager Access — contact the store owner for your access code.",
  chooseAccount: "Choose account type",

  // Trust strip / mockup copy
  trustShip: "Free shipping",
  trustShipSub: "On orders over 400.000 VND",
  trustReturns: "Easy size exchange",
  trustReturnsSub: "Size exchange within 7 days.",
  trustPay: "Discreet & secure packaging",
  trustPaySub: "Delivered safely, product names hidden 100%",
  trustSupport: "Quick replies",
  trustSupportSub: "Message us on live chat",
  heroTagline:
    "Discover timeless pieces crafted for comfort and designed for elegance — made just for you.",
  slideLabel: "Slide",
  circleSale: "SALE",
  viewAllCategories: "View all categories",
  viewAllProducts: "View all products",
  banner1Eyebrow: "LIMITED TIME OFFER",
  banner2Eyebrow: "NEW ARRIVALS",
  shopTheSale: "Shop the sale",
  exploreNewIn: "Explore new in",
  newsOffer: "GET 10% OFF YOUR FIRST ORDER",
  introEyebrow: "SPRING — SUMMER 2026",
  introTitle: "Pieces made to be lived in",
  introBody:
    "Natural fabrics, neutral tones and relaxed cuts — hand-picked so they pair easily and last for years.",
  signIn: "Sign in",
  signOutLabel: "Sign out",
  myAccount: "My account",
  footerNewsSub: "Sign up for updates and get 10% off your first order.",

  // Account page
  accountTitle: "My account",
  accountEmail: "Email",
  accountInfo: "Account details",
  accountInfoHint:
    "We use this to confirm orders and notify you when your parcel ships.",
  ordersTitle: "My orders",
  ordersEmpty: "You have no orders yet.",
  ordersNote:
    "Your order history will appear here once you've placed your first order.",
  wishlistTitle: "Wishlist",
  wishlistEmpty: "Nothing saved yet — tap the heart on a product to save it.",
  wishlistCount: "items saved",


  // Seller PIN / orders / moderation
  sellerPinTitle: "Store owner access code",
  sellerPinBody:
    "Enter the store owner access code to open the seller dashboard.",
  pinPlaceholder: "Enter PIN",
  unlock: "Unlock",
  pinError: "Incorrect code. Try again.",
  sellerTabOrders: "Orders",
  orderCustomer: "Customer",
  shippingZoneLabel: "Delivery area",
  trackOrderCta: "Track an order",
  trackTitle: "Track your order",
  trackSubtitle:
    "Enter your order code and the phone number you ordered with to see its status.",
  trackOrderCode: "Order code",
  trackPhone: "Phone number",
  trackSearch: "Track",
  trackMissingFields: "Please enter your order code and phone number.",
  trackNotFound:
    "We could not find that order. Check the order code and phone number.",
  trackHint: "You can follow this order any time at",
  orderItems: "Items",
  orderPayment: "Payment",
  orderStatusLabel: "Order status",
  orderStatusProcessing: "Processing",
  orderStatusShipped: "Shipped",
  orderStatusOutForDelivery: "Out for delivery",
  orderStatusDelivered: "Delivered",
  orderStatusCancelled: "Cancelled",
  orderStatusSaved: "Order status updated",
  orderStatusSaveFailed: "Could not update the status.",
  orderDeleteAddress: "Delete address info",
  orderDeleteAddressTitle: "Delete delivery address",
  orderDeleteAddressBody:
    "Are you sure you want to delete the delivery address of this order? This action cannot be undone.",
  orderDeleteAddressDone: "Delivery details deleted.",
  orderDeleteAddressFailed: "Could not delete the delivery details.",
  orderAddressRedacted: "Delivery details have been deleted.",
  exportCsv: "Export CSV",
  exportCsvBusy: "Exporting…",
  exportCsvDone: "CSV downloaded.",
  exportCsvFailed: "Could not export the CSV.",
  noOrders: "No orders yet.",
  descriptionLabel: "Description",
  descriptionPlaceholder: "Fabric, how to use, care notes...",
  stockCountLabel: "Units in stock",
  stockCountPlaceholder: "Leave blank if not tracked",
  stockCountShort: "Stock:",
  lockSellerSession: "Lock session",
  replaceImageLabel: "Product photo",
  replaceImageCta: "Replace photo",
  replaceImageAgain: "Choose another",
  sellerDashboardTitle: "Seller dashboard",
  sellerDashboardBody: "Manage products, orders and customer messages.",
  sellerDashboardCta: "Open seller dashboard",
  chatMessageUnit: "messages",
  chatDeleteMessage: "Delete this message",
  chatClearThread: "Clear conversation",
  chatClearConfirm: "Really clear?",
  chatCleared: "Deleted {n} messages.",
  chatActionFailed: "That did not work. Try again.",

  // ── Google Sign-In ──────────────────────────────────────────
  googleSignInCta: "Sign in with Google",
  googleSignInHint: "Use your Google account for faster checkout — no password needed.",

  // ── Search results view ─────────────────────────────────────
  searchResultsTitle: "SEARCH RESULTS",
  clearSearch: "Clear search",

  // ── Quick view modal ────────────────────────────────────────
  quickView: "Quick view",
  quickViewClose: "Close",
  inCartBadge: "in cart",
  categoryLabel: "Category",
  categoryFallback: "Other",

  // Live chat
  chatWidgetLabel: "Live chat support",
  chatTitle: "Live Chat — Shop Bảo Ngọc",
  chatIntro: "Hi there! Ask anything about a product, size or order 💬",
  chatYourName: "Your name (optional)",
  chatPlaceholder: "Type your message...",
  chatSend: "Send",
  chatOpen: "Open chat",
  chatClose: "Close chat",
  chatYou: "You",
  chatShop: "Shop Bảo Ngọc",
  chatEmpty: "No messages yet — be the first!",
  chatSendFailed: "Could not send the message. Please try again.",

  // Marketing opt-in
  marketingOptInLabel: "Send me offers & gift news by email",
  marketingOptInSub: "You can turn this off at any time.",

  // Seller: live chat inbox
  sellerTabChat: "Customer messages",
  sellerTabProducts: "Products & settings",
  sellerTabBroadcast: "Send promo email",
  chatInboxEmpty: "No customer messages yet.",
  chatInboxAnonymous: "Guest customer",
  chatThreadLoad: "Pick a conversation to read it.",
  chatReplyPlaceholder: "Type your reply...",
  chatReplySend: "Send reply",
  chatUnreadOne: "new",
  chatMarkedRead: "Marked as read",
  chatSenderBadge: "KH",

  // Seller: promo broadcast
  broadcastSubjectLabel: "Email subject",
  broadcastSubjectPlaceholder: "Summer sale — 30% off all accessories",
  broadcastBodyLabel: "Email content",
  broadcastBodyPlaceholder: "Hi there! Our new collection has arrived...",
  broadcastFromLabel: "From address (optional)",
  broadcastFromPlaceholder: "Shop Bảo Ngọc <shop@yourdomain.com>",
  broadcastTestToLabel: "Send a test to (nobody else)",
  broadcastTestToPlaceholder: "your email to preview it",
  broadcastTestCta: "Send me a test",
  broadcastSendCta: "Send promo email",
  broadcastSending: "Sending...",
  broadcastAudience: "Customers who opted in",
  broadcastSub: "Sent to everyone who enabled “Send me offers & gift news”.",
  broadcastSent: "Sent to {n} customers.",
  broadcastPartial: "{n} sent, {f} failed.",
  broadcastNoKey: "RESEND_API_KEY is not configured yet — add it in the Keys/API keys tab.",
  broadcastNoRecipients: "No customer has opted in to promo emails yet.",
  broadcastEmptyCampaign: "Please enter a subject and email content.",
  broadcastTestSent: "Test sent to {n} address(es).",
  broadcastBadTestAddress: "That test address is not valid.",
};

const CATEGORY_LABELS: Record<Lang, Record<Category, string>> = {
  vi: { ...CATEGORY_LABELS_VI },
  en: {
    tops: "Bras & Lingerie",
    dresses: "Underwear",
    cardigans: "Lingerie Sets",
    trousers: "Beauty & Skincare",
    bestsellers: "Bestsellers",
  },
};

const DICTS: Record<Lang, Record<TKey, string>> = { vi, en };

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey) => string;
  categoryLabel: (category: Category) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

const LANG_KEY = "mama-lang";

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "vi" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  return "vi";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key: TKey) => DICTS[lang][key],
      categoryLabel: (category: Category) => CATEGORY_LABELS[lang][category],
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export { CATEGORIES };

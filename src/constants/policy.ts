/**
 * LOCKED POLICY COPY — the store's full purchasing / returns / shipping policy.
 *
 * Hardcoded on purpose and kept in one place so the first-login modal, the
 * `/policy` page and anything else that quotes the policy can never drift
 * apart. Both languages live here as parallel documents, so switching the site
 * to English switches the policy too.
 */

export type PolicySection = {
  heading: string;
  lead: string | null;
  bullets: readonly string[];
};

export type PolicyCopy = {
  title: string;
  greeting: string;
  story: string;
  bridge: string;
  sections: readonly PolicySection[];
};

/** Vietnamese — the store's original, legally-loaded wording. */
export const POLICY: PolicyCopy = {
  title: "GIỚI THIỆU VỀ SHOP & CHÍNH SÁCH MUA SẮM TOÀN DIỆN",
  greeting:
    "Chào mừng bạn đến với Shop Bảo Ngọc – Điểm đến mua sắm uy tín tại Diên Khánh.",
  story:
    "Khởi nguồn từ một sạp hàng nhỏ quen thuộc tại Diên Khánh, Khánh Hoà. Chúng tôi luôn tự hào là người bạn đồng hành, thấu hiểu và nâng niu vẻ đẹp tự nhiên của phái đẹp. Với mong muốn mang lại sự tự tin từ sâu bên trong và diện mạo rạng rỡ bên ngoài, shop chuyên cung cấp các dòng sản phẩm nội y giá tốt, áo bra nâng dáng, váy ngủ lụa mềm mại cùng các dòng mỹ phẩm chăm sóc da chính hãng. Mỗi một sản phẩm có mặt tại shop đều được chính tay shop tuyển chọn vô cùng kỹ lưỡng từ chất liệu vải, đường kim mũi chỉ cho đến nguồn gốc xuất xứ an toàn, lành tính cho làn da. Sự hài lòng và an tâm của quý khách chính là niềm hạnh phúc lớn nhất của chúng tôi.",
  bridge:
    "Để mang lại trải nghiệm mua sắm trực tuyến tuyệt vời và an tâm nhất như khi mua trực tiếp tại sạp hàng, shop xin gửi đến quý khách hàng các chính sách mua hàng, đổi trả và khuyến mãi chi tiết như sau:",
  sections: [
    {
      heading: "Chính sách mua hàng & Giao vận an toàn.",
      lead: null,
      bullets: [
        "Quy định giao nhận (Không xem hàng trước): Để đảm bảo tính bảo mật và giữ cho các sản phẩm mỹ phẩm luôn nguyên màng co, hộp giấy không bị móp méo, cũng như giữ vệ sinh tuyệt đối cho các sản phẩm nội y, shop áp dụng chính sách KHÔNG XEM HÀNG TRƯỚC khi thanh toán. Quý khách vui lòng thanh toán đầy đủ cho Shipper khi nhận hàng. Shop cam kết đóng gói đúng và đủ theo đơn đặt hàng của bạn.",
        "Đảm bảo quyền lợi sau nhận hàng: Quý khách hoàn toàn có thể yên tâm, ngay sau khi nhận hàng và thanh toán, nếu mở ra phát hiện sản phẩm bị lỗi, hư hỏng do vận chuyển hoặc sai mẫu mã, shop sẽ hỗ trợ đổi trả hoặc hoàn tiền ngay lập tức theo đúng chính sách đổi trả của shop.",
        "Bảo mật đơn hàng: Toàn bộ đơn hàng nội y của quý khách đều được đóng gói kín đáo, tinh tế và che tên sản phẩm 100% trên phiếu giao hàng để bảo vệ sự riêng tư tuyệt đối cho khách hàng.",
        "Thời gian giao hàng: Khách hàng tại khu vực Diên Khánh, Nha Trang sẽ nhận được hàng nhanh chóng trong vòng 1 - 2 ngày. Các tỉnh thành khác thời gian nhận hàng dao động từ 3 - 5 ngày làm việc.",
      ],
    },
    {
      heading: "Chính sách đổi trả linh hoạt trong 7 ngày.",
      lead: "Shop luôn mong muốn bạn nhận được những sản phẩm vừa vặn và ưng ý nhất. Nếu sản phẩm chưa vừa size hoặc có bất kỳ lỗi nào từ nhà sản xuất, shop hỗ trợ đổi trả với quy định như sau:",
      bullets: [
        "Thời gian áp dụng: Trong vòng 7 ngày kể từ ngày quý khách nhận được hàng thành công.",
        "Điều kiện sản phẩm: Sản phẩm đổi trả phải còn mới nguyên vẹn, chưa qua sử dụng, chưa qua giặt tẩy, còn đầy đủ tem mác và hóa đơn mua hàng (nếu có).",
        "Phân loại sản phẩm được đổi: Shop hỗ trợ đổi size hoặc đổi mẫu đối với các sản phẩm: Áo ngực (Bra), váy ngủ, đồ bộ mặc nhà và mỹ phẩm (Mỹ phẩm phải còn nguyên màng co, chưa mở nắp).",
        "Lưu ý đặc biệt: Để đảm bảo vệ sinh cá nhân tuyệt đối cho mọi khách hàng, shop KHÔNG áp dụng đổi trả đối với sản phẩm Quần lót (trừ trường hợp giao sai mẫu hoặc hàng bị lỗi từ phía shop).",
        "Chi phí đổi trả: Nếu lỗi do shop giao sai hoặc hàng lỗi, shop sẽ chịu 100% chi phí vận chuyển. Nếu quý khách muốn đổi size, đổi mẫu theo nhu cầu cá nhân, quý khách vui lòng thanh toán phí ship 2 chiều.",
      ],
    },
    {
      heading: "Chương trình ưu đãi & chính sách khuyến mãi.",
      lead: "Để tri ân sự ủng hộ của quý khách, shop thường xuyên mang đến những ưu đãi hấp dẫn giúp bạn mua sắm thả ga không lo về giá:",
      bullets: [
        "Ưu đãi Miễn phí vận chuyển (Freeship): Miễn phí giao hàng toàn quốc cho tất cả các đơn hàng có giá trị từ 400.000đ trở lên. Khách hàng tại nội thành Diên Khánh sẽ được hỗ trợ phí ship ưu đãi nhất.",
        "Chương trình Khách hàng thân thiết: Mọi đơn hàng của bạn trên website đều được tích điểm tự động qua số điện thoại mua hàng. Số điểm này sẽ được quy đổi thành các voucher giảm giá trực tiếp 5%, 10% hoặc các phần quà mỹ phẩm/nội y xinh xắn vào tháng sinh nhật của bạn.",
        "Săn sale các ngày lễ hoặc Lễ Tết: Vào các ngày lễ dành cho phái đẹp (8/3, 20/10), shop sẽ có các chương trình \"Mua 1 tặng 1\", \"Combo nội y giá hời\" hoặc \"Giảm giá mỹ phẩm lên đến 30%\". Quý khách đừng quên theo dõi mục \"Bán chạy/Khuyến mãi\" trên website để không bỏ lỡ nhé!",
      ],
    },
    {
      heading: "Biểu phí vận chuyển (Tiền Ship)",
      lead: null,
      bullets: [
        "Toàn huyện Diên Khánh (gồm khu vực nội thành gần Chợ Thành): Đồng giá 15.000đ / đơn hàng (Giao hàng hỏa tốc trong ngày).",
        "Khu vực Thành phố Nha Trang và các huyện lân cận (Diên Lạc, Cam Lâm, Ninh Hoà): Đồng giá 20.000đ / đơn hàng (1 - 2 ngày).",
        "Các tỉnh thành khác trên toàn quốc: Đồng giá 30.000đ / đơn hàng (3 - 5 ngày).",
        "FREESHIP: Miễn phí 100% tiền ship toàn quốc cho đơn hàng từ 400.000đ trở lên.",
      ],
    },
  ],
};

/** English — section order and terms mirror the Vietnamese document 1:1. */
export const POLICY_EN: PolicyCopy = {
  title: "ABOUT OUR SHOP & COMPLETE PURCHASING POLICY",
  greeting:
    "Welcome to Shop Bảo Ngọc – your trusted shopping destination in Diên Khánh.",
  story:
    "We started out as a small, familiar stall in Diên Khánh, Khánh Hoà. We have always been proud to be a companion who understands and cherishes women’s natural beauty. With the wish to bring you confidence from within and a radiant look from without, the shop specialises in affordable lingerie, lifting bras, soft silk sleepwear and authentic skincare products. Every product we stock is hand-picked with great care — from the fabric and stitching to its safe, gentle origin. Your satisfaction and peace of mind are our greatest joy.",
  bridge:
    "To make online shopping as pleasant and reassuring as shopping in person at the stall, we set out our purchasing, returns and promotion policies in detail below:",
  sections: [
    {
      heading: "Purchasing & Safe Delivery Policy.",
      lead: null,
      bullets: [
        "Delivery rules (no opening before payment): To keep beauty products fully sealed, their boxes from being crushed, and to guarantee absolute hygiene for lingerie items, the shop applies a NO OPENING BEFORE PAYMENT policy. Please pay the courier in full on delivery. We commit to packing every order exactly and completely as ordered.",
        "Your rights after delivery: Please rest assured — if, after receiving and paying for your order, you find an item defective, damaged in transit or not matching the sample, the shop will exchange it or refund you immediately under our returns policy.",
        "Order privacy: All of your lingerie orders are packed discreetly and tastefully, with 100% of the product names hidden on the delivery slip, so your privacy is fully protected.",
        "Delivery times: Customers in the Diên Khánh and Nha Trang areas receive their order quickly, within 1 – 2 days. Other provinces take 3 – 5 business days.",
      ],
    },
    {
      heading: "Flexible Returns Within 7 Days.",
      lead: "We always want you to receive products that fit and that you love. If an item does not fit or has any manufacturing fault, the shop supports exchanges under the following terms:",
      bullets: [
        "Timeframe: Within 7 days of the day you successfully received your order.",
        "Item condition: Items for exchange must be new and intact, unused and unwashed, with all tags and the purchase invoice (where issued) still attached.",
        "Eligible items: The shop can exchange sizes or samples for these products: bras, sleepwear, loungewear sets and skincare (skincare must still be sealed and unopened).",
        "Important note: To guarantee absolute personal hygiene for every customer, the shop does NOT accept exchanges or returns on underwear (except where the wrong item was sent or the goods are faulty on our side).",
        "Exchange costs: If we sent the wrong item or the goods are faulty, the shop covers 100% of the shipping cost. If you would like a different size or sample for personal reasons, please pay the return shipping both ways.",
      ],
    },
    {
      heading: "Offers & Promotions.",
      lead: "To thank you for your support, the shop regularly brings attractive offers so you can shop freely without worrying about price:",
      bullets: [
        "Free shipping offer (Freeship): Free delivery nationwide on every order worth 400,000 VND or more. Customers inside Diên Khánh receive our best possible shipping rate.",
        "Loyalty programme: Every order you place on the website is automatically credited with points using the phone number used to order. Those points are converted into direct discount vouchers of 5% or 10%, or into lovely skincare and lingerie gifts during your birthday month.",
        "Seasonal sales and holidays: On celebratory days for women (8 March, 20 October), the shop runs programmes such as “Buy 1 Get 1”, “Value lingerie combos” or “Up to 30% off skincare”. Do keep an eye on the “Bestsellers / Promotions” section of the website so you don’t miss out!",
      ],
    },
    {
      heading: "Shipping Rates",
      lead: null,
      bullets: [
        "Diên Khánh district (including the inner city near Chợ Thành): Flat 15,000 VND per order (same-day express delivery).",
        "Nha Trang city and neighbouring districts (Diên Lạc, Cam Lâm, Ninh Hoà): Flat 20,000 VND per order (1 – 2 days).",
        "All other provinces nationwide: Flat 30,000 VND per order (3 – 5 days).",
        "FREESHIP: 100% free shipping nationwide on orders from 400,000 VND or more.",
      ],
    },
  ],
};

export type PolicyLang = "vi" | "en";

/** The policy document for the active site language. */
export function policyFor(lang: PolicyLang): PolicyCopy {
  return lang === "en" ? POLICY_EN : POLICY;
}

/** localStorage key holding the signed-in customer's agreement. */
export const POLICY_AGREEMENT_KEY = "mama-policy-agreement-v1";

/**
 * Has this account already accepted the policy on this device?
 *
 * Scoped by email, so a shared computer can switch between accounts without
 * the second one skipping the notice (or inheriting the first one's consent).
 */
export function hasAgreedToPolicy(email: string | undefined): boolean {
  if (!email) return false;
  try {
    const raw = localStorage.getItem(POLICY_AGREEMENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { email?: string };
    return (
      (parsed?.email ?? "").toLowerCase() === email.trim().toLowerCase()
    );
  } catch {
    return false;
  }
}

export function rememberPolicyAgreement(email: string): void {
  try {
    localStorage.setItem(
      POLICY_AGREEMENT_KEY,
      JSON.stringify({ email: email.trim().toLowerCase(), at: Date.now() }),
    );
  } catch {
    // Private mode / storage disabled: the customer is asked again next visit,
    // which is the safe failure mode for a consent notice.
  }
}

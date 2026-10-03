/**
 * LOCKED POLICY COPY — the store's full purchasing / returns / shipping policy.
 *
 * Hardcoded on purpose and kept in one place so the first-login modal, the
 * `/policy` page and anything else that quotes the policy can never drift
 * apart. Both languages live here as parallel documents, so switching the site
 * to English switches the policy too.
 *
 * The Vietnamese text is the seller's official wording, reproduced verbatim.
 * Section numbering, the 50% deposit rule, the shipping table and the contact
 * block are all part of that text — do not paraphrase or renumber it.
 */

export type PolicySection = {
  heading: string;
  /** Short lead-in shown under the heading. */
  lead: string | null;
  /** Free prose paragraphs (no bullet marker). */
  paragraphs: readonly string[];
  /** Bulleted points. A "\n" inside one renders as a line break. */
  bullets: readonly string[];
};

export type PolicyCopy = {
  title: string;
  /** Opening paragraphs, before any numbered section. */
  intro: readonly string[];
  sections: readonly PolicySection[];
  /** Contact details / sign-off shown after the last section. */
  closing: readonly string[];
};

/** Vietnamese — the store's official policy wording, verbatim. */
export const POLICY: PolicyCopy = {
  title: "CHÍNH SÁCH MUA SẮM & ĐIỀU KHOẢN",
  intro: [
    "Chào mừng quý khách hàng đến với hệ thống mua sắm trực tuyến của Shop Bảo Ngọc. Website này được vận hành nhằm số hóa và mở rộng dịch vụ từ cửa hàng truyền thống tại Chợ Thành, Diên Khánh, Khánh Hoà. Chúng tôi chuyên cung cấp các sản phẩm thời trang nữ (đồ lót, áo bra, váy ngủ) chất lượng & giá cả tốt, đồng thời mang đến các dòng mỹ phẩm chính hãng được nhập và phân phối trực tiếp từ các nguồn hàng uy tín.",
    "Để bảo vệ quyền lợi hợp pháp của cả hai bên, xin quý khách vui lòng đọc kỹ các điều khoản và chính sách mua bán được quy định rõ ràng dưới đây trước khi tiến hành giao dịch.",
  ],
  sections: [
    {
      heading: "1. Chính sách về sản phẩm và nguồn gốc hàng hóa.",
      lead: null,
      paragraphs: [
        "Nhóm hàng thời trang nữ (Đồ lót, Bra, Váy ngủ): Toàn bộ sản phẩm được tuyển chọn kỹ lưỡng, đảm bảo chất liệu an toàn cho làn da, kiểu dáng đa dạng và đúng như hình ảnh hiển thị trên Website. Khách hàng tại khu vực Khánh Hòa có thể đến trực tiếp cửa hàng để xem & cảm nhận chất lượng sản phẩm.",
        "Nhóm hàng Mỹ phẩm: Shop Bảo Ngọc cam kết các sản phẩm mỹ phẩm được đăng tải trên hệ thống đều là hàng chính hãng 100%, có nguồn gốc xuất xứ rõ ràng, đầy đủ tem mác. Nói không với hàng giả, hàng nhái.",
      ],
      bullets: [],
    },
    {
      heading: "2. Quy trình đặt hàng và xác nhận đơn hàng.",
      lead: null,
      paragraphs: [
        "Khách hàng lựa chọn sản phẩm, kích cỡ, màu sắc hoặc chủng loại phù hợp trên hệ thống Website của Shop Bảo Ngọc và tiến hành nhập đầy đủ thông tin giao hàng bao gồm: Họ tên, số điện thoại, địa chỉ nhận hàng cụ thể.",
        "Sau khi nhận được yêu cầu đặt hàng của Quý khách, bộ phận chăm sóc khách hàng của chúng tôi sẽ liên hệ qua điện thoại hoặc Zalo để xác nhận lại thông tin đơn hàng, số lượng, hướng dẫn đặt cọc (nếu có) và tổng chi phí thanh toán trước khi tiến hành đóng gói, gửi hàng.",
      ],
      bullets: [],
    },
    {
      heading: "3. Phương thức thanh toán và quy định đi đơn (Giao nhận hàng hóa).",
      lead: "Để đảm bảo tính nghiêm túc trong việc giao nhận, tránh tình trạng hủy đơn ảo (bom hàng) gây thiệt hại cho cửa hàng, Shop Bảo Ngọc áp dụng quy trình thanh toán riêng biệt cho từng nhóm hàng với lý do cụ thể như sau:",
      paragraphs: [],
      bullets: [
        "Đối với các sản phẩm Thời trang (Đồ lót, Áo Bra, Váy ngủ): Quý khách vui lòng chuyển khoản trước 50% giá trị đơn hàng làm tiền cọc để hệ thống xác nhận đi đơn. Số tiền 50% còn lại cộng với phí vận chuyển (nếu có) sẽ được thanh toán bằng tiền mặt khi nhận hàng (COD).\nLý do áp dụng: Các sản phẩm nội y và váy ngủ mang tính chất cá nhân cao, đòi hỏi quy trình đóng gói và bảo quản nghiêm ngặt để đảm bảo vệ sinh khi đến tay khách hàng. Nếu đơn hàng bị từ chối nhận (bom hàng) và phải quay vòng vận chuyển nhiều ngày trên đường, sản phẩm rất dễ bị bám bẩn, mất phom dáng, hư hỏng mác và không thể bán lại cho khách hàng khác. Vì vậy, khoản cọc 50% là sự cam kết trách nhiệm giữa hai bên, giúp shop yên tâm chuẩn bị những sản phẩm hoàn hảo nhất đến bạn.",
        "Đối với các sản phẩm Mỹ phẩm: Khách hàng không cần đặt cọc trước, có thể lựa chọn thanh toán bằng tiền mặt 100% khi nhận hàng (COD) hoặc chuyển khoản trước tùy theo nhu cầu.\nLý do áp dụng: Các mặt hàng mỹ phẩm đều được đóng gói sẵn trong chai, lọ, hộp giấy của nhà sản xuất và có màng co bảo vệ rất chắc chắn. Trong trường hợp rủi ro bị hoàn hàng, sản phẩm bên trong vẫn được bảo vệ an toàn bởi lớp bao bì tiêu chuẩn, ít bị ảnh hưởng đến chất lượng và phom dáng như đồ vải vóc, thời trang. Do đó, shop hỗ trợ tối đa để khách hàng thoải mái mua sắm mà không cần thủ tục chuyển khoản trước.",
      ],
    },
    {
      heading: "Biểu phí vận chuyển (Tiền Ship):",
      lead: null,
      paragraphs: [],
      bullets: [
        "Toàn huyện Diên Khánh (gồm khu vực nội thành gần Chợ Thành): Đồng giá 15.000đ/đơn hàng (Giao hàng hỏa tốc trong ngày).",
        "Khu vực Thành phố Nha Trang và các huyện lân cận (Diên Lạc, Cam Lâm, Ninh Hoà): Đồng giá 20.000đ / đơn hàng (1 - 2 ngày).",
        "Các tỉnh thành khác trên toàn quốc: Đồng giá 30.000đ / đơn hàng (3 - 5 ngày).",
        "FREESHIP: Miễn phí 100% tiền ship toàn quốc cho đơn hàng từ 400.000đ trở lên.",
      ],
    },
    {
      heading: "4. Chính sách đổi trả và hoàn tiền.",
      lead: "Nhằm bảo đảm vệ sinh an toàn sức khỏe cũng như đặc thù của các nhóm hàng kinh doanh, chính sách đổi trả tại Shop Bảo Ngọc được quy định chi tiết như sau:",
      paragraphs: [],
      bullets: [
        "Đối với đồ lót (Quần lót, quần nâng mông...): Nhằm bảo vệ sức khỏe cộng đồng và vệ sinh cá nhân, chúng tôi không áp dụng chính sách đổi trả đối với mặt hàng quần lót dưới mọi hình thức, trừ trường hợp lỗi kỹ thuật nghiêm trọng từ phía nhà sản xuất hoặc giao sai mẫu, sai kích thước so với đơn đặt hàng.",
        "Đối với áo Bra, váy ngủ: Hỗ trợ đổi size hoặc đổi mẫu trong vòng 2 ngày kể từ ngày nhận hàng. Điều kiện sản phẩm phải còn nguyên nhãn mác, chưa qua sử dụng, chưa qua giặt là và không có mùi lạ.",
        "Đối với mỹ phẩm: Chỉ chấp nhận đổi trả trong trường hợp sản phẩm bị lỗi do vận chuyển (móp méo, bể vỡ, chảy đổ dung dịch) hoặc sản phẩm bị giao sai chủng loại so với đơn đặt hàng. Quý khách vui lòng quay video mở hộp sản phẩm (unboxing) để làm bằng chứng đối chiếu khi có khiếu nại xảy ra. Khách hàng sẽ được đổi sản phẩm mới hoặc hoàn lại 100% số tiền đã thanh toán nếu lỗi thuộc về chúng tôi hoặc phía đối tác vận chuyển.",
      ],
    },
    {
      heading: "5. Chương trình ưu đãi & chính sách khuyến mãi.",
      lead: null,
      paragraphs: [],
      bullets: [
        "Ưu đãi miễn phí vận chuyển (Freeship): Miễn phí giao hàng toàn quốc cho tất cả các đơn hàng có giá trị từ 400.000đ trở lên. Khách hàng tại nội thành Diên Khánh sẽ được hỗ trợ phí ship ưu đãi nhất.",
        "Chương trình Khách hàng thân thiết: Mọi đơn hàng của bạn trên website đều được tích điểm tự động qua số điện thoại mua hàng. Số điểm này sẽ được quy đổi thành các voucher giảm giá trực tiếp 5%, 10% hoặc các phần quà mỹ phẩm/nội y xinh xắn vào tháng sinh nhật của bạn.",
        "Săn sale các ngày lễ hoặc Lễ Tết: Vào các ngày lễ dành cho phái đẹp (8/3, 20/10), shop sẽ có các chương trình \"Mua 1 tặng 1\", \"Combo nội y giá hời\" hoặc \"Giảm giá mỹ phẩm lên đến 30%\". Quý khách đừng quên theo dõi mục \"Bán chạy/Khuyến mãi\" trên Website để không bỏ lỡ nhé.",
      ],
    },
  ],
  closing: [
    "SĐT liên hệ: 0793578058 - 0702307948",
    "ĐC cửa hàng: Chung Cư Chợ Thành, Xã Diên Khánh, Tỉnh Khánh Hoà.",
    "Shop Bảo Ngọc Xin Chân Thành Cảm Ơn Quý Khách.",
  ],
};

/** English — section order, numbering and terms mirror the Vietnamese 1:1. */
export const POLICY_EN: PolicyCopy = {
  title: "PURCHASING POLICY & TERMS",
  intro: [
    "Welcome to Shop Bảo Ngọc's online shopping system. This website exists to digitise and expand the services of our traditional store at Chợ Thành, Diên Khánh, Khánh Hoà. We specialise in women's clothing (underwear, bras, nightdresses) of good quality and price, and we also bring you authentic cosmetics imported and distributed directly from reputable sources.",
    "To protect the legitimate rights of both sides, please read the terms and purchasing policies set out below carefully before proceeding with a transaction.",
  ],
  sections: [
    {
      heading: "1. Product and origin policy.",
      lead: null,
      paragraphs: [
        "Women's clothing group (underwear, bras, nightdresses): All products are carefully selected to ensure the fabric is safe for your skin, with varied styles that match the images shown on the website. Customers in the Khánh Hòa area are welcome to visit the store in person to see and feel the product quality.",
        "Cosmetics group: Shop Bảo Ngọc commits that every cosmetic product listed on the system is 100% authentic, with a clear origin and complete labelling. We say no to fakes and counterfeits.",
      ],
      bullets: [],
    },
    {
      heading: "2. Ordering and order confirmation.",
      lead: null,
      paragraphs: [
        "The customer selects the product, size, colour or type that suits them on the Shop Bảo Ngọc website and enters their full delivery details: full name, phone number and specific delivery address.",
        "After receiving your order, our customer care team will contact you by phone or Zalo to confirm the order details and quantity, guide you through the deposit (if any) and the total payment, before packing and dispatching your order.",
      ],
      bullets: [],
    },
    {
      heading: "3. Payment methods and dispatch rules (goods handover).",
      lead: "To ensure the seriousness of every handover and avoid fake orders (bom hàng) causing losses to the store, Shop Bảo Ngọc applies a separate payment process for each product group, for the specific reasons below:",
      paragraphs: [],
      bullets: [
        "For clothing products (underwear, bras, nightdresses): Please transfer 50% of the order value in advance as a deposit so the system can confirm dispatch. The remaining 50%, plus shipping (if any), is paid in cash on delivery (COD).\nReason: Underwear and nightdresses are highly personal items that require strict packing and handling to ensure hygiene when they reach you. If an order is refused on delivery (bom hàng) and has to travel back for days in transit, the product easily gets soiled, loses its shape, has its labels damaged and can no longer be sold to another customer. The 50% deposit is therefore a commitment from both sides that lets the shop confidently prepare the finest products for you.",
        "For cosmetics: No deposit is needed. You may pay 100% in cash on delivery (COD) or transfer in advance, whichever you prefer.\nReason: Cosmetics are all pre-packed by the manufacturer in bottles, jars and cardboard boxes with strong shrink-wrap film. In the event of a returned order, the product inside is still safely protected by standard packaging and is far less affected in quality and shape than fabric and clothing items. The shop therefore supports you as much as possible so you can shop comfortably with no advance transfer procedure.",
      ],
    },
    {
      heading: "Shipping rates:",
      lead: null,
      paragraphs: [],
      bullets: [
        "All of Diên Khánh district (including the inner city near Chợ Thành): Flat 15,000đ per order (same-day express delivery).",
        "Nha Trang city and neighbouring districts (Diên Lạc, Cam Lâm, Ninh Hoà): Flat 20,000đ per order (1 – 2 days).",
        "Other provinces and cities nationwide: Flat 30,000đ per order (3 – 5 days).",
        "FREESHIP: 100% free shipping nationwide on orders from 400,000đ and above.",
      ],
    },
    {
      heading: "4. Returns and refund policy.",
      lead: "To guarantee safe hygiene and to respect the specific nature of each product group we sell, the returns policy at Shop Bảo Ngọc is set out in detail below:",
      paragraphs: [],
      bullets: [
        "For underwear (panties, shaping briefs...): To protect community health and personal hygiene, we do not accept any form of return or exchange on underwear, except in the case of a serious manufacturing defect or where the wrong item or wrong size was sent compared with the order.",
        "For bras and nightdresses: We support size or item exchange within 2 days of receiving your order. The item must still have its original tags, be unused, unwashed and free of any strange smell.",
        "For cosmetics: Returns are only accepted where the product is damaged in transit (dented, cracked or leaking) or where the wrong product type was sent. Please record an unboxing video as evidence for any complaint. Customers will receive a replacement product or a 100% refund if the fault is ours or the courier's.",
      ],
    },
    {
      heading: "5. Offers and promotions.",
      lead: null,
      paragraphs: [],
      bullets: [
        "Free shipping offer (Freeship): Free delivery nationwide on every order worth 400,000đ and above. Customers inside Diên Khánh receive our best possible shipping rate.",
        "Loyalty programme: Every order you place on the website is automatically credited with points using the phone number used to order. Those points are converted into direct discount vouchers of 5% or 10%, or into lovely cosmetics and lingerie gifts during your birthday month.",
        "Holiday sales: On celebratory days for women (8 March, 20 October), the shop runs programmes such as \"Buy 1 Get 1\", \"Value lingerie combos\" or \"Up to 30% off cosmetics\". Please keep an eye on the \"Bestsellers / Promotions\" section of the website so you don't miss out.",
      ],
    },
  ],
  closing: [
    "Contact: 0793578058 - 0702307948",
    "Store address: Chung Cư Chợ Thành, Xã Diên Khánh, Tỉnh Khánh Hoà.",
    "Shop Bảo Ngọc would like to sincerely thank you.",
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
import type { Brand, CatalogItem } from "../brand-types";

/** 制作系メニュー。SODATSUの作業ポイント表に合わせている。営業資料の数字と必ず一致させること。 */
const catalog: CatalogItem[] = [
  { name: "ショート動画編集", points: 10, group: "動画まわり", size: "TikTok・リール・ショート", days: "3日〜" },
  { name: "台本作成（ショート）", points: 10, group: "動画まわり", size: "フック→本編→CTA", days: "2日〜" },
  { name: "動画編集（3分）", points: 20, group: "動画まわり", size: "会社紹介・商品説明", days: "5日〜" },
  { name: "台本作成（長尺）", points: 15, group: "動画まわり", size: "3分以上の構成台本", days: "3日〜" },
  { name: "サムネイル作成", points: 5, group: "動画まわり", size: "16:9", days: "2日〜" },
  { name: "カルーセル投稿", points: 15, group: "SNS・Webまわり", size: "Instagram複数枚", days: "4日〜" },
  { name: "投稿文＋画像", points: 7, group: "SNS・Webまわり", size: "SNS投稿1本ぶん", days: "3日〜" },
  { name: "LPファーストビュー", points: 30, group: "SNS・Webまわり", size: "訴求・デザイン込み", days: "1週間〜" },
  { name: "軽微な修正", points: 2, group: "SNS・Webまわり", size: "テロップ差し替えなど", days: "1日〜" },
  // ── Web・集客まわり（FOODハッチのメニューを業種を問わない形で展開） ──
  // 値付けの根拠: 定価は「世間の相場の約2割引き」（P ≒ 相場 × 0.8 ÷ 1,200円）。
  // 「実質1/3」は補助金（2/3補助）で実現する話なので、定価そのものは相場に寄せる。
  //   HP1p: 相場15万→100P / SEO記事: 1.8万→12P / 掲載文: 2.2万→15P / LINE構築: 7万→45P
  //   チラシ: 5万→35P / HP保守: 月1.8万→12P/月 / 求人原稿: 1.5万→10P / 求人リライト: 1.5万→10P
  //   例外: 採用向けショート動画は「動画まわり」の特別価格に揃える（プランの月8本・MAX20本の設計を崩さないため）
  { name: "HP制作（1ページ）", points: 100, group: "SNS・Webまわり", size: "スマホ対応・問い合わせ導線・地図", days: "2週間〜",
    questions: [
      { key: "現状", label: "いまのHP", type: "select", required: true, options: ["ない", "ある（作り直したい）", "ある（このまま改善したい）"] },
      { key: "現HP", label: "いまのHPやSNSのURL", type: "text" },
      { key: "載せたいこと", label: "載せたいこと", type: "multi", required: true, options: ["サービス・料金", "予約・問い合わせ（電話・LINE・フォーム）", "アクセス・地図", "会社・お店の想い", "お客様の声", "採用", "実績・事例"] },
      { key: "問い合わせ先", label: "予約・問い合わせの受け口", type: "text", placeholder: "電話番号、LINE公式、予約サイトなど" },
      { key: "参考", label: "参考にしたいサイト（URL）", type: "textarea" },
      { key: "素材", label: "ロゴ・写真", type: "file" },
      { key: "ドメイン", label: "ドメイン（URL）", type: "select", required: true, options: ["持っている", "新しく取りたい（取得代行）", "相談したい"] },
    ] },
  { name: "SEO記事作成", points: 12, group: "SNS・Webまわり", size: "検索されるブログ1本", days: "3日〜",
    questions: [
      { key: "狙う言葉", label: "検索されたい言葉", type: "text", required: true, placeholder: "例: 福岡 外壁塗装 相場" },
      { key: "掲載先", label: "掲載先", type: "select", required: true, options: ["自社HPのブログ", "note", "Googleビジネスプロフィール", "その他"] },
      { key: "ネタ", label: "書いてほしいネタ・自社の強み", type: "textarea", required: true },
    ] },
  { name: "グルメサイト掲載文リライト", points: 15, group: "SNS・Webまわり", size: "食べログ・ホットペッパー等の掲載文を強く", days: "3日〜",
    questions: [
      { key: "媒体", label: "直したい媒体", type: "multi", required: true, options: ["食べログ", "ぐるなび", "ホットペッパーグルメ", "ホットペッパービューティー", "楽天ビューティ", "Googleマップ", "その他"] },
      { key: "ページURL", label: "掲載ページのURL", type: "textarea", required: true },
      { key: "推し", label: "もっと伝えたい強み", type: "textarea", required: true },
    ] },
  { name: "LINE公式アカウント構築", points: 45, group: "SNS・Webまわり", size: "リッチメニュー・あいさつ・クーポン設計", days: "1週間〜",
    questions: [
      { key: "現状", label: "LINE公式アカウント", type: "select", required: true, options: ["まだない（開設から）", "ある（整えたい）"] },
      { key: "やりたいこと", label: "やりたいこと", type: "multi", required: true, options: ["クーポン配信", "予約受付", "サービス案内", "ポイントカード", "友だち追加特典"] },
      { key: "友だち特典", label: "友だち追加の特典", type: "text", placeholder: "例: 初回10%オフ" },
      { key: "素材", label: "ロゴ・写真", type: "file" },
    ] },
  { name: "チラシ（A4片面）", points: 35, group: "SNS・Webまわり", size: "ポスティング・店頭/展示会配布", days: "5日〜",
    questions: [
      { key: "目的", label: "チラシの目的", type: "select", required: true, options: ["新規オープン・リニューアル", "新サービス・キャンペーン", "イベント集客", "採用", "その他"] },
      { key: "載せる内容", label: "載せたい内容（サービス・価格・特典など）", type: "textarea", required: true },
      { key: "配り方", label: "配り方", type: "select", options: ["ポスティング", "店頭・手配り", "新聞折込", "展示会・イベント", "まだ決めていない"] },
      { key: "素材", label: "ロゴ・写真", type: "file" },
      { key: "参考", label: "参考にしたいチラシ", type: "textarea" },
      { key: "印刷", label: "印刷", type: "select", required: true, options: ["データ納品のみ", "印刷も手配してほしい（実費別）"] },
    ] },
  { name: "HP保守・更新（月額）", points: 12, group: "SNS・Webまわり", size: "月2回までの更新＋動作チェック", days: "月単位", monthly: true,
    questions: [
      { key: "サイトURL", label: "サイトのURL", type: "text", required: true },
      { key: "更新内容", label: "今月の更新内容", type: "textarea", required: true, placeholder: "例: 料金ページの改定、お知らせ2本、写真の差し替え" },
      { key: "更新方法", label: "更新のしかた", type: "select", required: true, options: ["管理画面ごと代行（ログイン情報は別途安全に共有）", "修正データを納品（反映は自社で）"] },
    ] },
  // ── 営業まわり（テレアポは「台本」「リスト」「架電」の3つに分けて、それぞれ別料金） ──
  {
    name: "テレアポ台本作成",
    points: 5,
    group: "営業まわり",
    size: "受付突破〜切り返しまでのトークスクリプト",
    days: "2日〜",
    questions: [
      { key: "商材", label: "案内する商材・サービス", type: "textarea", required: true, placeholder: "何を、誰に、いくらで。強みも一言" },
      { key: "ターゲット", label: "架電先のターゲット（業種・規模・役職）", type: "textarea", required: true, placeholder: "例: 福岡市内の美容室のオーナー" },
      { key: "ゴール", label: "電話のゴール", type: "select", required: true, options: ["商談アポの取得", "資料送付の許可", "アンケート・ヒアリング", "セミナー・イベント集客"] },
      { key: "よくある断り文句", label: "よくある断り文句（分かれば）", type: "textarea", placeholder: "例: 今は間に合ってる／忙しい／資料だけ送って" },
      { key: "NG事項", label: "言ってはいけないこと", type: "textarea" },
    ],
    agreements: [
      "スクリプトは法人向けの案内を前提に作成します（個人宅への電話勧誘用には作成しません）",
      "修正は原則2回まで無料、それ以降は別途お見積りになります",
    ],
  },
  {
    name: "営業リスト作成",
    points: 20,
    group: "営業まわり",
    size: "200件・会社名/電話/住所/URLをCSVで",
    days: "5日〜",
    questions: [
      { key: "ターゲット", label: "集めたい会社の条件（業種・地域・規模）", type: "textarea", required: true, placeholder: "例: 福岡県内の美容室、スタッフ3名以上、HPあり" },
      { key: "必要な項目", label: "必要な項目", type: "multi", required: true, options: ["会社名", "電話番号", "住所", "HPのURL", "代表者名", "メールアドレス", "SNSアカウント"] },
      { key: "除外", label: "除外したい会社（既存客・競合など）", type: "textarea" },
      { key: "既存リスト", label: "手元にあるリスト（重複を避けるため）", type: "file" },
    ],
    agreements: [
      "公開されている情報（HP・地図・業界サイトなど）から作成します。非公開の個人情報は収集しません",
      "件数は200件を目安とし、条件が狭い場合は下回ることがあります（その場合は事前にご相談します）",
    ],
  },
  {
    name: "テレアポ架電",
    points: 50,
    group: "営業まわり",
    size: "200コール・法人向けにアポ取得",
    days: "1週間〜",
    questions: [
      { key: "トークスクリプト", label: "トークスクリプト", type: "select", required: true, options: ["手元にある（下に貼り付け）", "別途「テレアポ台本作成」を発注する", "担当者におまかせ（簡易版で架電）"] },
      { key: "スクリプト本文", label: "スクリプト本文（あれば貼り付け）", type: "textarea" },
      { key: "架電リスト", label: "架電リスト", type: "select", required: true, options: ["手元にある（CSV・スプレッドシートを添付）", "別途「営業リスト作成」を発注する"] },
      { key: "リストファイル", label: "架電リストのファイル", type: "file", hint: "会社名・電話番号・担当者名が入ったCSVかExcel" },
      { key: "商材", label: "案内する商材・サービス", type: "textarea", required: true },
      { key: "ゴール", label: "架電のゴール", type: "select", required: true, options: ["商談アポの取得", "資料送付の許可", "アンケート・ヒアリング", "セミナー・イベント集客", "その他"] },
      { key: "架電時間帯", label: "架電してよい時間帯", type: "multi", required: true, options: ["平日 10〜12時", "平日 13〜15時", "平日 15〜18時", "土曜", "指定なし"] },
      { key: "アポ候補日時", label: "アポの候補日時", type: "textarea", required: true, placeholder: "例: 9/8(月)〜9/19(金) の平日14〜17時、各日1枠" },
      { key: "NG事項", label: "NG事項（競合・かけてはいけない先）", type: "textarea" },
      { key: "報告頻度", label: "報告の頻度", type: "select", required: true, options: ["毎日", "週2回", "週1回", "終了時にまとめて"] },
    ],
    agreements: [
      "架電先は法人・事業者に限ります（個人宅への電話勧誘は特定商取引法の規制対象のため受け付けません）",
      "「今後かけないでほしい」と言われた先には再架電しません（NGリストとして共有します）",
      "架電リストに含まれる個人情報は案件終了後に破棄します",
      "アポの成立数は先方の事情にも左右されるため、件数の保証はできません",
      "200コールを超える場合は、もう1件（200コール）として追加で発注してください",
    ],
  },
  // ── 採用まわり（営業の隣に並べる） ──
  { name: "求人原稿作成", points: 10, group: "採用まわり", size: "Indeed・タウンワーク向け1職種", days: "2日〜",
    questions: [
      { key: "職種", label: "募集する職種", type: "text", required: true, placeholder: "例: 営業スタッフ（正社員）" },
      { key: "条件", label: "給与・勤務時間・待遇", type: "textarea", required: true },
      { key: "職場の良さ", label: "職場の良さ（本音でOK）", type: "textarea", required: true },
      { key: "掲載先", label: "掲載先", type: "multi", options: ["Indeed", "タウンワーク", "バイトル", "自社HP・SNS", "ハローワーク"] },
    ] },
  { name: "採用向けショート動画", points: 10, group: "採用まわり", size: "働く様子・先輩の声を30秒に", days: "3日〜",
    questions: [
      { key: "職種", label: "募集する職種", type: "text", required: true },
      { key: "見せたいこと", label: "見せたいこと", type: "multi", required: true, options: ["職場の雰囲気", "先輩スタッフの声", "1日の流れ", "社長・店主の人柄", "仕事のやりがい"] },
      { key: "素材", label: "素材動画（URL）", type: "text" },
      { key: "素材ファイル", label: "素材ファイル", type: "file", hint: "スマホで撮った縦動画でOK" },
      { key: "掲載先", label: "使う場所", type: "multi", options: ["TikTok", "Instagram", "Indeed", "自社HP", "説明会"] },
    ] },
  { name: "求人媒体の掲載文リライト", points: 10, group: "採用まわり", size: "応募が来る書き方に直す", days: "2日〜",
    questions: [
      { key: "現原稿", label: "いまの求人原稿（貼り付けかURL）", type: "textarea", required: true },
      { key: "応募状況", label: "いまの応募状況", type: "select", required: true, options: ["ほぼ来ない", "来るが定着しない", "ミスマッチが多い"] },
      { key: "職場の良さ", label: "職場の良さ（本音でOK）", type: "textarea", required: true },
    ] },
];

export const bridge: Brand = {
  id: "bridge",
  name: "BRIDGE HATCH",
  tagline: "中小企業のSNS運用・制作発注を、ハッチと一緒に。",
  hero: { title: "ショート動画をつくる", sub: "参考動画を選んで、台本から編集まで一気通貫で" },
  industries: [
    "美容クリニック", "美容サロン", "美容室", "ネイル", "マツエク", "飲食", "フィットネス",
    "医療・介護", "不動産", "建設・工務店", "買取・リユース", "製造業", "人材・転職",
  ],
  commonQuestions: [],
  catalog,
  orderStyle: "full",
  // 発注トップの見出しに添える説明（順番の並べ替えには使わない）
  groups: [
    { name: "営業まわり", sub: "台本 → リスト → 架電の3ステップ。必要なものだけ頼めます", examples: ["3つまとめて 75🍯"] },
    { name: "採用まわり", sub: "求人原稿・採用動画・掲載文の見直しで応募を増やします", examples: [] },
  ],
  defaultAgreements: [],
  demoProjects: [
    { title: "秋の新商品ショート動画", category: "ショート動画編集", description: "秋の新商品を紹介する30秒動画", points: 10, deadline: "2026-08-30", status: "募集中" },
    { title: "採用ショート動画 台本", category: "台本作成（ショート）", description: "エンジニア採用向けTikTok台本", points: 10, deadline: "2026-09-05", status: "制作待ち" },
    { title: "新商品LPファーストビュー修正", category: "LPファーストビュー", description: "CVR改善のためのFV差し替え", points: 30, deadline: "2026-09-10", status: "フィードバック" },
    { title: "会社紹介動画編集", category: "動画編集（3分）", description: "展示会用90秒動画の編集", points: 20, deadline: "2026-08-25", status: "完了" },
  ],
  orderable: ["ショート動画編集", "台本作成（ショート）"],
  agent: {
    system: `あなたはBRIDGE HATCHのマスコット、ハチの「ハッチ」。名前を聞かれたら「ハッチ」と答える。中小企業のSNS運用・制作発注を支援するアシスタントです。
主な仕事: ショート動画の台本作成、構成案の提案、発注内容の整理、競合分析のアドバイス、テレアポ営業のトークスクリプト作成。
テレアポのスクリプトを作るときは「受付突破→担当者への一言→用件（30秒）→切り返し3パターン→アポ打診→締め」の順で、法人向けの丁寧な口調にする。`,
    quickActions: [
      { label: "伸びてる動画をさがす", hint: "「◯◯で伸びてる動画見せて」", prompt: "美容室で伸びてる動画を見せて" },
      { label: "台本をつくる", hint: "ショート動画の構成から", prompt: "ショート動画の台本を作りたいです。まず何を教えればいいか質問してください。" },
      { label: "競合を分析する", hint: "伸びてる理由を分解", prompt: "競合アカウントを分析したいです。どんな情報が必要か質問してください。" },
      { label: "テレアポの台本", hint: "受付突破から切り返しまで", prompt: "テレアポのトークスクリプトを作りたいです。商材と架電先について質問してください。" },
    ],
    promptLibrary: [
      "美容室で伸びてる動画を見せて",
      "飲食店で伸びてる動画を見せて",
      "フィットネスで伸びてる動画を見せて",
      "採用向けのショート動画の台本を作りたい",
      "集客につながる動画の企画を3案出して",
      "ショート動画の構成（フック→本編→CTA）を提案して",
      "競合アカウントの伸びている理由を分析して",
      "自社の強みが伝わる自己紹介動画の台本を作って",
      "テレアポのトークスクリプトを作って（商材と相手を質問して）",
      "発注したい内容を整理するのを手伝って",
      "InstagramリールとTikTokの使い分けを教えて",
    ],
    searchEmptyHint: "業種を変えて探すか、TikTokのURLを動画分析に貼っていただく方法もあります。",
  },
};

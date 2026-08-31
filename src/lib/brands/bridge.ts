import type { Brand, CatalogItem } from "../brand-types";

/** 制作系メニュー。SODATSUの作業ポイント表に合わせている。営業資料の数字と必ず一致させること。 */
const catalog: CatalogItem[] = [
  { name: "ショート動画編集", points: 7, group: "動画まわり", size: "TikTok・リール・ショート", days: "3日〜" },
  { name: "台本作成（ショート）", points: 4, group: "動画まわり", size: "フック→本編→CTA", days: "2日〜" },
  { name: "動画編集（3分）", points: 14, group: "動画まわり", size: "会社紹介・商品説明", days: "5日〜" },
  { name: "台本作成（長尺）", points: 10, group: "動画まわり", size: "3分以上の構成台本", days: "3日〜" },
  { name: "サムネイル作成", points: 7, group: "動画まわり", size: "16:9", days: "2日〜" },
  { name: "カルーセル投稿", points: 14, group: "SNS・Webまわり", size: "Instagram複数枚", days: "4日〜" },
  { name: "投稿文＋画像", points: 10, group: "SNS・Webまわり", size: "SNS投稿1本ぶん", days: "3日〜" },
  { name: "LPファーストビュー", points: 20, group: "SNS・Webまわり", size: "訴求・デザイン込み", days: "1週間〜" },
  { name: "軽微な修正", points: 2, group: "SNS・Webまわり", size: "テロップ差し替えなど", days: "1日〜" },
  // ── 営業まわり（テレアポは「台本」「リスト」「架電」の3つに分けて、それぞれ別料金） ──
  {
    name: "テレアポ用トークスクリプト作成",
    points: 5,
    group: "営業まわり",
    size: "受付突破→用件→切り返し3パターン→アポ打診",
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
    name: "営業リスト作成（200件）",
    points: 20,
    group: "営業まわり",
    size: "会社名・電話・住所・URLをCSVで",
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
    name: "テレアポ架電（200コール）",
    points: 40,
    group: "営業まわり",
    size: "法人向けに200件架電・アポ取得",
    days: "1週間〜",
    questions: [
      { key: "トークスクリプト", label: "トークスクリプト", type: "select", required: true, options: ["手元にある（下に貼り付け）", "別途「テレアポ用トークスクリプト作成」を発注する", "担当者におまかせ（簡易版で架電）"] },
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
];

export const bridge: Brand = {
  id: "bridge",
  name: "BRIDGE HATCH",
  tagline: "中小企業のSNS運用・制作発注を、ハチと一緒に。",
  hero: { title: "ショート動画をつくる", sub: "参考動画を選んで、台本から編集まで一気通貫で" },
  industries: [
    "美容クリニック", "美容サロン", "美容室", "ネイル", "マツエク", "飲食", "フィットネス",
    "医療・介護", "不動産", "建設・工務店", "買取・リユース", "製造業", "人材・転職",
  ],
  commonQuestions: [],
  catalog,
  orderStyle: "full",
  // 発注トップの見出しに添える説明（順番の並べ替えには使わない）
  groups: [{ name: "営業まわり", sub: "台本 → リスト → 架電の順。必要なものだけ頼めます（3つ合わせて65pt）", examples: [] }],
  defaultAgreements: [],
  demoProjects: [
    { title: "秋の新商品ショート動画", category: "ショート動画編集", description: "秋の新商品を紹介する30秒動画", points: 7, deadline: "2026-08-30", status: "募集中" },
    { title: "採用ショート動画 台本", category: "台本作成（ショート）", description: "エンジニア採用向けTikTok台本", points: 4, deadline: "2026-09-05", status: "制作待ち" },
    { title: "新商品LPファーストビュー修正", category: "LPファーストビュー", description: "CVR改善のためのFV差し替え", points: 20, deadline: "2026-09-10", status: "フィードバック" },
    { title: "会社紹介動画編集", category: "動画編集（3分）", description: "展示会用90秒動画の編集", points: 14, deadline: "2026-08-25", status: "完了" },
  ],
  orderable: ["ショート動画編集", "台本作成（ショート）"],
  agent: {
    system: `あなたは「BRIDGE HATCHエージェント」。中小企業のSNS運用・制作発注を支援するアシスタントです。
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

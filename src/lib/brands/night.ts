import type { Brand, CatalogItem, Question } from "../brand-types";

/**
 * NIGHT HATCH（夜のお店専用）の看板。
 * バー・ガールズバー・スナック・キャバクラ・ラウンジ・会員制クラブ向け。
 * 事業設計: NIGHT_HATCH_DESIGN.md（2026-09-28 初版）。
 *  - 補助金の話は一切しない（風営法の営業は補助金の対象外）
 *  - 2025年改正風営法に触れる制作（色恋営業・料金の誤認・スカウト）はしない
 *  - 求人には必ず「18歳未満・高校生不可」を入れる
 */

// ── よく使う質問の部品 ──
const q = {
  purpose: (opts: string[]): Question => ({ key: "目的", label: "いちばんの目的", type: "select", required: true, options: opts }),
  ref: (label = "参考にしたいもの（URLや店名）"): Question => ({ key: "参考", label, type: "textarea", placeholder: "「こんな感じ」が伝わるものを。なければ空欄で構いません" }),
  files: (label: string, hint?: string): Question => ({ key: label, label, type: "file", hint }),
  ng: (): Question => ({ key: "NG事項", label: "NG事項（避けたい表現・写してはいけない人や場所など）", type: "textarea" }),
  print: (): Question => ({ key: "印刷", label: "印刷", type: "select", required: true, options: ["データ納品のみ", "印刷も手配してほしい（実費別）"] }),
  tone: (): Question => ({ key: "口調", label: "口調", type: "select", required: true, options: ["丁寧・上品", "親しみやすい", "ママ・オーナーの人柄が出る感じ"] }),
};

/** 出演者の扱い（動画・写真を使うメニュー共通） */
const CAST_CONSENT: Question = {
  key: "出演",
  label: "出演する人の扱い",
  type: "select",
  required: true,
  options: ["出演者全員の同意を取っている（顔出しあり）", "顔は出さない（手元・後ろ姿・スタンプ）", "人は映さない（店内・ドリンクのみ）", "相談したい"],
  hint: "出演するキャスト・スタッフは全員18歳以上で、ご本人の同意が必要です",
};

// ── 同意事項（メニュー別。全メニュー共通の7項目は defaultAgreements で必ず付く） ──
const AGREE_RECRUIT = [
  "求人には必ず「18歳未満・高校生不可」を記載します（この記載を外すご依頼はお受けできません）",
  "職業安定法の的確表示に沿って、仕事内容・給与・待遇は事実どおりに書きます（実態と違う条件や誇大な表現は載せません）",
  "応募者の年齢確認（身分証の確認）は、面接・体入の前にお店側で必ず行ってください",
  "スカウト・引き抜き・路上での声かけの代行はしません",
];
const AGREE_VIDEO = [
  "出演するキャスト・スタッフは全員18歳以上で、顔出しの範囲を含めてご本人の同意を取っています",
  "露出や性的な演出を売りにした構成・編集はしません（SNSの規約違反によるアカウント停止も防ぎます）",
];
const AGREE_PRICE = [
  "載せる料金（セット・延長・指名・TAX／サービス料など）は、実際にいただく金額と一致させてください",
  "「〜円ポッキリ」など、実際のお会計と違って見える表現は使いません",
];

const VIDEO_QUESTIONS: Question[] = [
  { key: "用途", label: "動画の用途", type: "multi", required: true, options: ["TikTok", "Instagramリール", "YouTubeショート", "X", "店内・店頭サイネージ"] },
  { key: "見せたいもの", label: "いちばん見せたいもの", type: "select", required: true, options: ["お店の雰囲気・内装", "キャスト・スタッフの人柄", "ドリンク・カクテル", "イベントの様子", "開店準備・裏側"] },
  CAST_CONSENT,
  { key: "素材", label: "素材動画（URL）", type: "text", placeholder: "ギガファイル便・Googleドライブなど" },
  q.files("素材ファイル", "スマホで撮った縦動画でOK"),
  { key: "字幕", label: "字幕", type: "select", options: ["セリフすべて表示", "要点のみ表示", "テロップ不要"] },
  q.ref("参考にしたい動画（URL）"),
  q.ng(),
];

const SNS_MONTHLY_QUESTIONS: Question[] = [
  { key: "アカウント", label: "アカウントのURLまたはID", type: "text", required: true },
  { key: "現状", label: "いまの運用状況", type: "select", required: true, options: ["アカウントがない", "あるが更新が止まっている", "週1未満で投稿", "週1以上で投稿"] },
  { key: "撮影", label: "撮影について", type: "select", required: true, options: ["店側で撮る（撮影指示書がほしい）", "撮影から頼みたい（別途交通費）", "手元の写真・動画を使う"] },
  CAST_CONSENT,
  { key: "推し", label: "推したいこと・お店の強み（3つまで）", type: "textarea", required: true, placeholder: "例: 落ち着いた内装、20代後半中心の在籍、カクテルの種類" },
  { key: "投稿権限", label: "投稿の方法", type: "select", required: true, options: ["投稿まで代行（ログイン情報は別途安全に共有）", "投稿は店側で行う（データ納品）"] },
  q.ng(),
];

const JOB_BASE: Question[] = [
  { key: "雇用形態", label: "雇用形態", type: "multi", required: true, options: ["アルバイト", "正社員", "業務委託"] },
  { key: "給与", label: "時給・日給・バックなど（実際の条件）", type: "textarea", required: true, placeholder: "例: 時給3,000円〜（体入時給3,500円）、ドリンクバック10%、終電上がりOK" },
  { key: "勤務", label: "勤務日・時間", type: "text", required: true, placeholder: "例: 週1日・1日3時間〜、20時〜翌1時" },
  { key: "待遇", label: "待遇・働きやすさ", type: "multi", options: ["日払い・週払い", "送りあり", "ノルマなし", "ヘアメイクあり", "衣装貸出", "WワークOK", "寮・住宅補助", "未経験歓迎"] },
  { key: "お店の良さ", label: "お店の良さ（本音でOK）", type: "textarea", required: true, placeholder: "例: 客層が落ち着いている、ママが面倒見がいい" },
];

const catalog: CatalogItem[] = [
  // ── キャスト採用 ──
  { name: "キャスト求人原稿", points: 6, group: "キャスト採用", size: "ナイトワーク求人媒体向け1本（的確表示・18歳未満不可を明記）", days: "2日〜",
    questions: [
      ...JOB_BASE,
      { key: "掲載先", label: "掲載先", type: "multi", options: ["ナイトワーク専門の求人サイト", "Indeed", "自社HP・採用LP", "Instagram・X", "店頭・店内掲示"] },
      { key: "求める人", label: "来てほしい人（年齢は18歳以上で）", type: "textarea", placeholder: "例: 20〜30代、落ち着いた接客が好きな方" },
    ],
    agreements: AGREE_RECRUIT },
  { name: "体入・求人ショート動画", points: 10, group: "キャスト採用", size: "店内の雰囲気・スタッフの声・待遇を30秒に", days: "3日〜",
    questions: [
      { key: "見せたいこと", label: "見せたいこと", type: "multi", required: true, options: ["店内の雰囲気", "先輩キャスト・スタッフの声", "体入当日の流れ", "待遇（送り・ヘアメイク・日払い）", "ママ・オーナーの人柄"] },
      CAST_CONSENT,
      { key: "素材", label: "素材動画（URL）", type: "text" },
      q.files("素材ファイル", "スマホで撮った縦動画でOK"),
      { key: "掲載先", label: "使う場所", type: "multi", options: ["TikTok", "Instagram", "求人サイト", "採用LP"] },
      q.ng(),
    ],
    agreements: [...AGREE_RECRUIT.slice(0, 2), ...AGREE_VIDEO] },
  { name: "求人媒体の掲載文リライト", points: 5, group: "キャスト採用", size: "応募が来る書き方に直す", days: "2日〜",
    questions: [
      { key: "現原稿", label: "いまの求人原稿（貼り付けかURL）", type: "textarea", required: true },
      { key: "応募状況", label: "いまの応募状況", type: "select", required: true, options: ["ほぼ来ない", "来るが体入で終わる", "イメージと違う人が多い"] },
      { key: "お店の良さ", label: "お店の良さ（本音でOK）", type: "textarea", required: true },
    ],
    agreements: AGREE_RECRUIT },
  { name: "採用LP（1ページ）", points: 40, group: "キャスト採用", size: "応募フォーム・LINE応募ボタンつき", days: "2週間〜",
    questions: [
      ...JOB_BASE,
      { key: "応募先", label: "応募の受け口", type: "multi", required: true, options: ["応募フォーム", "LINE応募", "電話", "Instagram DM"] },
      q.files("店内写真・ロゴ", "キャストの写真は本人の同意があるものだけ"),
      q.ref("参考にしたい採用ページ（URL）"),
      { key: "ドメイン", label: "ドメイン（URL）", type: "select", required: true, options: ["持っている", "新しく取りたい（取得代行）", "相談したい"] },
    ],
    agreements: AGREE_RECRUIT },
  { name: "採用SNSアカウント運用（月額）", points: 30, group: "キャスト採用", size: "採用専用アカで月8投稿", days: "月単位", monthly: true,
    questions: [
      { key: "アカウント", label: "採用アカウントのURL（なければ「新規」）", type: "text", required: true },
      { key: "媒体", label: "運用する媒体", type: "multi", required: true, options: ["TikTok", "Instagram", "X"] },
      CAST_CONSENT,
      { key: "伝えたいこと", label: "伝えたい働きやすさ", type: "textarea", required: true, placeholder: "例: 未経験から始めた先輩が多い、終電上がりOK" },
      { key: "投稿権限", label: "投稿の方法", type: "select", required: true, options: ["投稿まで代行（ログイン情報は別途安全に共有）", "投稿は店側で行う（データ納品）"] },
    ],
    agreements: [...AGREE_RECRUIT, ...AGREE_VIDEO] },
  { name: "面接・体入対応マニュアル", points: 12, group: "キャスト採用", size: "身分証・年齢確認の手順から体入当日の流れまで", days: "1週間〜",
    questions: [
      { key: "範囲", label: "載せたい範囲", type: "multi", required: true, options: ["問い合わせへの返信", "面接の流れ", "身分証・年齢確認の手順", "体入当日の流れ", "体入後のフォロー", "よくある質問"] },
      { key: "いまのやり方", label: "いまのやり方・困っていること", type: "textarea", required: true },
      { key: "資料", label: "いまある資料・メモ", type: "file" },
    ],
    agreements: AGREE_RECRUIT },
  { name: "黒服・バーテンダー求人原稿", points: 4, group: "キャスト採用", size: "男性スタッフ・バーテンダー1職種", days: "2日〜",
    questions: [
      { key: "職種", label: "募集する職種", type: "text", required: true, placeholder: "例: ホールスタッフ（黒服）、バーテンダー（経験者）" },
      ...JOB_BASE.slice(0, 3),
      { key: "お店の良さ", label: "職場の良さ（本音でOK）", type: "textarea", required: true },
    ],
    agreements: AGREE_RECRUIT },

  // ── 集客・指名 ──
  { name: "ポータル掲載文リライト", points: 8, group: "集客・指名", size: "ナイト系ポータル・Googleマップの店舗紹介", days: "3日〜",
    questions: [
      { key: "媒体", label: "直したい媒体", type: "multi", required: true, options: ["ナイト系ポータルサイト", "Googleマップ", "自社HP", "その他"] },
      { key: "ページURL", label: "掲載ページのURL", type: "textarea", required: true },
      { key: "推し", label: "もっと伝えたい強み", type: "textarea", required: true, placeholder: "例: 明朗会計、駅から1分、個室あり" },
    ],
    agreements: AGREE_PRICE },
  { name: "ポータル・Googleマップ運用（月額）", points: 12, group: "集客・指名", size: "更新・写真・口コミ返信", days: "月単位", monthly: true,
    questions: [
      { key: "媒体", label: "運用する媒体", type: "multi", required: true, options: ["Googleマップ", "ナイト系ポータルサイト", "その他"] },
      { key: "管理画面", label: "管理画面の使い方", type: "select", required: true, options: ["更新まで代行（ログイン情報は別途安全に共有）", "更新は店側で行う（文章と写真を納品）"] },
      { key: "今月の推し", label: "今月押したいこと（イベント・新メニューなど）", type: "textarea", required: true },
      { key: "口コミ返信", label: "口コミへの返信", type: "select", required: true, options: ["代行してほしい（下書き確認あり）", "代行してほしい（おまかせ）", "自分で返す"] },
      q.files("今月使う写真"),
    ],
    agreements: AGREE_PRICE },
  { name: "MEO対策（初期整備）", points: 15, group: "集客・指名", size: "Googleマップの整備（バー向け）", days: "1週間〜",
    questions: [
      { key: "プロフィールURL", label: "GoogleビジネスプロフィールのURL（Googleマップの店舗ページ）", type: "text", required: true },
      { key: "管理権限", label: "オーナー確認", type: "select", required: true, options: ["オーナー確認済み（管理者を追加できる）", "未確認（確認から手伝ってほしい）", "わからない"] },
      { key: "狙う言葉", label: "検索されたい言葉（3つまで）", type: "textarea", required: true, placeholder: "例: 新橋 バー / 中洲 ショットバー / 恵比寿 カクテル" },
      q.files("店内・ドリンクの写真", "10枚以上あると効きます"),
    ] },
  { name: "HP制作（1ページ）", points: 40, group: "集客・指名", size: "料金表・アクセス・予約/LINEボタン", days: "2週間〜",
    questions: [
      { key: "現状", label: "いまのHP", type: "select", required: true, options: ["ない", "ある（作り直したい）", "ある（このまま改善したい）"] },
      { key: "現HP", label: "いまのHPやSNSのURL", type: "text" },
      { key: "載せたいこと", label: "載せたいこと", type: "multi", required: true, options: ["料金システム", "ドリンクメニュー", "店内の写真", "アクセス・地図", "予約（電話・LINE）", "イベント情報", "求人"] },
      { key: "料金", label: "料金システム（セット・延長・TAXなど）", type: "textarea", required: true, hint: "サイトにはこのとおりに載せます" },
      q.ref("参考にしたいサイト（URL）"),
      q.files("ロゴ・写真"),
      { key: "ドメイン", label: "ドメイン（URL）", type: "select", required: true, options: ["持っている", "新しく取りたい（取得代行）", "相談したい"] },
    ],
    agreements: AGREE_PRICE },
  { name: "HP制作（5ページ）", points: 80, group: "集客・指名", size: "トップ・システム・キャスト・求人・アクセス", days: "3週間〜",
    questions: [
      { key: "現状", label: "いまのHP", type: "select", required: true, options: ["ない", "ある（作り直したい）"] },
      { key: "現HP", label: "いまのHPやSNSのURL", type: "text" },
      { key: "ページ構成", label: "ほしいページ", type: "multi", required: true, options: ["トップ", "料金システム", "キャスト紹介", "求人", "アクセス", "イベント・お知らせ", "ドリンクメニュー"] },
      { key: "料金", label: "料金システム（セット・延長・指名・TAXなど）", type: "textarea", required: true, hint: "サイトにはこのとおりに載せます" },
      CAST_CONSENT,
      q.ref("参考にしたいサイト（URL）"),
      q.files("ロゴ・写真"),
      { key: "ドメイン", label: "ドメイン（URL）", type: "select", required: true, options: ["持っている", "新しく取りたい（取得代行）", "相談したい"] },
      { key: "更新", label: "公開後の更新", type: "select", required: true, options: ["自分で更新したい（更新画面つき）", "更新は都度依頼する"] },
    ],
    agreements: [...AGREE_PRICE, AGREE_VIDEO[0]] },
  { name: "LINE公式アカウント構築", points: 20, group: "集客・指名", size: "リッチメニュー・あいさつ・イベント配信の設計", days: "1週間〜",
    questions: [
      { key: "現状", label: "LINE公式アカウント", type: "select", required: true, options: ["まだない（開設から）", "ある（整えたい）"] },
      { key: "やりたいこと", label: "やりたいこと", type: "multi", required: true, options: ["イベントのお知らせ", "予約・席の問い合わせ", "料金システムの案内", "求人の応募受付", "友だち追加特典"] },
      { key: "友だち特典", label: "友だち追加の特典", type: "text", placeholder: "例: 初回ワンドリンクサービス" },
      q.files("ロゴ・写真"),
    ] },
  { name: "店頭看板デザイン", points: 8, group: "集客・指名", size: "看板・ウィンドウ・料金表示入り（設置は条例に沿って店側で）", days: "5日〜",
    questions: [
      { key: "種類", label: "種類", type: "select", required: true, options: ["スタンド看板", "袖看板・壁面", "ウィンドウシート", "エレベーター前・ビル案内", "その他"] },
      { key: "サイズ", label: "サイズ（わかれば）", type: "text" },
      { key: "内容", label: "載せたい内容（料金表示・営業時間など）", type: "textarea", required: true },
      q.files("ロゴ・写真"),
      { key: "印刷", label: "制作", type: "select", required: true, options: ["データ納品のみ", "印刷・製作も手配してほしい（実費別）"] },
    ],
    agreements: [...AGREE_PRICE, "看板の設置場所・大きさ・照明は、各自治体の条例や屋外広告物のルールに沿ってお店側でご確認ください"] },

  // ── SNS・動画 ──
  { name: "ショート動画編集", points: 10, group: "SNS・動画", size: "TikTok・リール・ショート", days: "3日〜", questions: VIDEO_QUESTIONS, agreements: AGREE_VIDEO },
  { name: "台本＋動画編集（ショート）", points: 15, group: "SNS・動画", size: "何を撮るかの台本から編集まで。撮って送るだけ", days: "5日〜",
    questions: [
      { key: "媒体", label: "使う媒体", type: "multi", required: true, options: ["TikTok", "Instagramリール", "YouTubeショート", "X"] },
      q.purpose(["新規のお客さまを増やす", "指名・リピートを増やす", "イベントを知らせる", "キャスト・スタッフの採用", "お店の格・雰囲気を伝える"]),
      { key: "題材", label: "題材にしたいこと", type: "textarea", required: true, placeholder: "例: 開店前の準備、バーテンダーのカクテルづくり、周年イベントの告知" },
      { key: "雰囲気", label: "雰囲気", type: "multi", options: ["上品・落ち着き", "明るい・親しみ", "ストーリー仕立て", "笑い", "職人・こだわり"] },
      { key: "字幕", label: "字幕", type: "select", options: ["セリフすべて表示", "要点のみ表示", "テロップ不要"] },
      q.ref("参考にしたい動画（URL）"),
      q.ng(),
    ],
    agreements: [...AGREE_VIDEO, "台本が届いたら、その通りにスマホで撮影して「担当とのやりとり」から素材を送ってください。素材が届いてから編集に入ります"] },
  { name: "台本作成（ショート）", points: 5, group: "SNS・動画", size: "撮れば同じ動画になるレベルの台本", days: "2日〜",
    questions: [
      { key: "媒体", label: "使う媒体", type: "multi", required: true, options: ["TikTok", "Instagramリール", "YouTubeショート", "X"] },
      q.purpose(["新規のお客さまを増やす", "指名・リピートを増やす", "イベントを知らせる", "キャスト・スタッフの採用", "お店の格・雰囲気を伝える"]),
      { key: "題材", label: "題材にしたいこと", type: "textarea", required: true, placeholder: "例: 開店前の準備、バーテンダーのカクテルづくり、周年イベントの告知" },
      { key: "雰囲気", label: "雰囲気", type: "multi", options: ["上品・落ち着き", "明るい・親しみ", "ストーリー仕立て", "笑い", "職人・こだわり"] },
      q.ref("参考にしたい動画（URL）"),
      q.ng(),
    ],
    agreements: AGREE_VIDEO },
  { name: "キャスト紹介動画", points: 12, group: "SNS・動画", size: "キャスト1名のプロフィール動画", days: "3日〜",
    questions: [
      { key: "キャスト", label: "キャストの源氏名・紹介したいこと", type: "textarea", required: true, placeholder: "例: ゆいさん／お酒に詳しい、聞き上手、趣味はサウナ" },
      CAST_CONSENT,
      { key: "素材", label: "素材動画（URL）", type: "text" },
      q.files("素材ファイル"),
      { key: "用途", label: "使う場所", type: "multi", options: ["TikTok", "Instagram", "HPのキャスト紹介", "X"] },
      q.ng(),
    ],
    agreements: AGREE_VIDEO },
  { name: "キャスト個人アカウント立ち上げ", points: 15, group: "SNS・動画", size: "コンセプト・プロフィール文・最初の9投稿の企画", days: "1週間〜",
    questions: [
      { key: "キャスト", label: "キャストの源氏名・人柄・得意なこと", type: "textarea", required: true },
      { key: "媒体", label: "媒体", type: "multi", required: true, options: ["Instagram", "TikTok", "X"] },
      { key: "方向性", label: "発信の方向性", type: "select", required: true, options: ["お店の雰囲気・お酒", "美容・ファッション", "日常・趣味", "相談したい"] },
      { key: "本人の同意", label: "本人の同意", type: "select", required: true, options: ["本人が希望している・同意済み", "これから確認する"] },
    ],
    agreements: AGREE_VIDEO },
  { name: "出勤・イベント告知テンプレ", points: 6, group: "SNS・動画", size: "ストーリーズ/X用の告知画像テンプレ1ヶ月分", days: "3日〜",
    questions: [
      { key: "媒体", label: "使う媒体", type: "multi", required: true, options: ["Instagramストーリーズ", "X", "LINE", "TikTok"] },
      { key: "種類", label: "ほしいテンプレ", type: "multi", required: true, options: ["本日の出勤", "週間スケジュール", "イベント告知", "空席あり・本日オープン", "バースデー"] },
      q.files("ロゴ・お店の写真"),
      { key: "雰囲気", label: "雰囲気", type: "select", options: ["上品・シック", "華やか", "かわいい", "おまかせ"] },
    ] },
  { name: "投稿文＋画像", points: 7, group: "SNS・動画", size: "SNS投稿1本ぶん", days: "3日〜",
    questions: [
      { key: "媒体", label: "投稿する媒体", type: "multi", required: true, options: ["Instagram", "X", "TikTok", "LINE VOOM", "Googleビジネスプロフィール"] },
      { key: "内容", label: "知らせたい内容", type: "textarea", required: true, placeholder: "例: 10月の周年イベント、新しいカクテル、本日オープン" },
      q.files("使ってほしい写真"),
      q.ng(),
    ] },
  { name: "TikTok運用おまかせ（月額）", points: 60, group: "SNS・動画", size: "企画4本＋編集4本＋投稿代行", days: "月単位", monthly: true, questions: SNS_MONTHLY_QUESTIONS, agreements: AGREE_VIDEO },
  { name: "Instagram運用（月額）", points: 30, group: "SNS・動画", size: "月8投稿＋ストーリーズ案", days: "月単位", monthly: true, questions: SNS_MONTHLY_QUESTIONS, agreements: AGREE_VIDEO },
  { name: "X 出勤・イベント告知代行（月額）", points: 12, group: "SNS・動画", size: "出勤・空き状況・イベントの告知", days: "月単位", monthly: true,
    questions: [
      { key: "アカウント", label: "XのアカウントID", type: "text", required: true },
      { key: "共有方法", label: "出勤・空き状況の共有方法", type: "select", required: true, options: ["LINEで毎日送る", "シフト表を週1で送る", "相談したい"] },
      { key: "投稿時間", label: "投稿してほしい時間帯", type: "multi", required: true, options: ["開店前（18〜20時）", "営業中（20〜24時）", "深夜（24時以降）"] },
      { key: "投稿権限", label: "投稿の方法", type: "select", required: true, options: ["投稿まで代行（ログイン情報は別途安全に共有）", "投稿は店側で行う（文面を納品）"] },
    ],
    agreements: ["恋愛感情をあおる文面や、来店・注文を迫る文面は投稿しません"] },

  // ── イベント・売上 ──
  { name: "イベント企画", points: 12, group: "イベント・売上", size: "バースデー・周年・季節イベント1本（内容・告知・当日の流れ）", days: "1週間〜",
    questions: [
      { key: "種類", label: "イベントの種類", type: "select", required: true, options: ["キャストのバースデー", "周年", "季節イベント（ハロウィン・クリスマスなど）", "新人・新メニューのお披露目", "その他"] },
      { key: "日程", label: "日程", type: "text", required: true, placeholder: "例: 10月31日（金）" },
      { key: "予算", label: "装飾・特典の予算（おおよそ）", type: "text" },
      { key: "ねらい", label: "ねらい", type: "multi", required: true, options: ["新規のお客さま", "常連さまへの感謝", "客単価アップ", "SNSでの話題づくり"] },
    ],
    agreements: ["お客さまに注文や高額なボトルを強いる演出、恋愛感情に乗じた企画は作りません"] },
  { name: "イベント告知セット", points: 10, group: "イベント・売上", size: "ポスター＋SNS画像＋告知文", days: "5日〜",
    questions: [
      { key: "イベント", label: "イベント名・日程・内容", type: "textarea", required: true },
      { key: "料金", label: "イベント時の料金（通常と違えば）", type: "text" },
      { key: "媒体", label: "使う場所", type: "multi", required: true, options: ["店内ポスター", "Instagram", "X", "LINE", "TikTok"] },
      q.files("ロゴ・写真"),
      q.print(),
    ],
    agreements: AGREE_PRICE },
  { name: "料金システム表（明朗会計）", points: 8, group: "イベント・売上", size: "セット料金・延長・指名・TAX/サービス料を1枚に", days: "5日〜",
    questions: [
      { key: "料金", label: "いまの料金（セット・延長・指名・同伴・TAX/サービス料・カード手数料など）", type: "textarea", required: true },
      { key: "形", label: "形", type: "multi", required: true, options: ["卓上・メニューブック", "店頭・入口の掲示", "HP・ポータル用の画像", "LINEで送る画像"] },
      { key: "現データ", label: "いまの料金表", type: "file" },
      q.print(),
    ],
    agreements: AGREE_PRICE },
  { name: "ドリンク・ボトルメニュー表", points: 12, group: "イベント・売上", size: "ボトル・シャンパン・カクテルのメニュー表", days: "1週間〜",
    questions: [
      { key: "形", label: "形", type: "select", required: true, options: ["A4 1枚", "A3 二つ折り", "メニューブック（数ページ）", "タブレット表示用"] },
      { key: "メニュー内容", label: "メニューと価格", type: "textarea", required: true, placeholder: "テキストで貼り付けるか、下でファイル添付" },
      q.files("ボトル写真・いまのメニュー表"),
      q.ref("参考にしたいメニュー表"),
      q.print(),
    ],
    agreements: AGREE_PRICE },
  { name: "オリジナルカクテル開発", points: 8, group: "イベント・売上", size: "5品（レシピ・原価・売価案）※バー向け", days: "5日〜",
    questions: [
      { key: "テーマ", label: "テーマ・使いたいお酒", type: "textarea", required: true, placeholder: "例: 店名にちなんだ一杯、秋のフルーツ、ノンアルも1品" },
      { key: "価格帯", label: "想定する売価", type: "text", required: true, placeholder: "例: 1,200〜1,800円" },
      { key: "設備", label: "使える設備", type: "multi", options: ["ブレンダー", "製氷機（クラッシュ）", "スモーカー", "炭酸サーバー", "特になし"] },
    ] },
  { name: "名刺デザイン", points: 4, group: "イベント・売上", size: "キャスト・店舗の名刺1デザイン", days: "3日〜",
    questions: [
      { key: "種類", label: "種類", type: "select", required: true, options: ["キャスト名刺（共通デザイン）", "お店のショップカード", "スタッフ・黒服の名刺"] },
      { key: "内容", label: "載せたい内容（店名・住所・電話・SNSなど）", type: "textarea", required: true },
      q.files("ロゴ"),
      q.print(),
    ] },

  // ── 営業（法人・貸切） ──
  {
    name: "貸切・二次会の法人テレアポ",
    points: 20,
    group: "営業",
    size: "近隣企業に貸切・二次会・接待利用を案内（法人のみ）",
    days: "1週間〜",
    quantity: { key: "架電件数", unit: "件", pointsPer: 0.25, min: 100, max: 2000, step: 50, hint: "1件0.25ハニーP。200件=50ハニーP、400件=100ハニーP" },
    questions: [
      { key: "案内したいこと", label: "案内したいこと", type: "multi", required: true, options: ["歓送迎会・忘年会の二次会", "貸切パーティー", "接待・会食後のご利用", "法人の定期利用", "その他"] },
      { key: "ターゲット", label: "架電先（エリア・業種・規模）", type: "textarea", required: true, placeholder: "例: 店から徒歩10分圏内の従業員30名以上の会社" },
      { key: "架電リスト", label: "架電リスト", type: "select", required: true, options: ["手元にある（CSVを添付）", "リスト作成も依頼する（1件0.1ハニーPを追加でご相談）"] },
      { key: "リストファイル", label: "架電リストのファイル", type: "file" },
      { key: "プラン", label: "案内するプランと料金", type: "textarea", required: true, placeholder: "例: 貸切2時間 飲み放題 1名6,000円（税・サービス料込み）、20名〜" },
      { key: "架電時間帯", label: "架電してよい時間帯", type: "multi", required: true, options: ["平日 10〜12時", "平日 13〜15時", "平日 15〜18時", "指定なし"] },
      { key: "NG事項", label: "NG事項（かけてはいけない先など）", type: "textarea" },
      { key: "報告頻度", label: "報告の頻度", type: "select", required: true, options: ["毎日", "週2回", "週1回", "終了時にまとめて"] },
    ],
    agreements: [
      "架電先は法人・事業者に限ります（個人宅や個人の携帯への電話勧誘は受け付けません）",
      "「今後かけないでほしい」と言われた先には再架電しません",
      "架電リストに含まれる個人情報は案件終了後に破棄します",
      "予約の成立数は先方の事情にも左右されるため、件数の保証はできません",
    ],
  },
  { name: "貸切・パーティープラン企画", points: 8, group: "営業", size: "料金・時間・特典の設計", days: "5日〜",
    questions: [
      { key: "時期", label: "時期", type: "text", required: true, placeholder: "例: 12月の忘年会二次会、3〜4月の歓送迎会" },
      { key: "人数", label: "貸切にできる人数・席数", type: "text", required: true },
      { key: "価格帯", label: "想定する1人あたりの料金", type: "text", required: true },
      { key: "いまの料金", label: "いまの料金システム", type: "file" },
    ],
    agreements: AGREE_PRICE },
  { name: "法人向け案内資料（A4）", points: 8, group: "営業", size: "貸切・接待利用の案内PDF", days: "5日〜",
    questions: [
      { key: "内容", label: "載せたい内容（プラン・料金・特典・連絡先）", type: "textarea", required: true },
      { key: "使い方", label: "使い方", type: "multi", required: true, options: ["メール添付（PDF）", "近隣企業へ手渡し", "FAX", "店頭"] },
      q.files("ロゴ・店内写真"),
    ],
    agreements: AGREE_PRICE },

  // ── 運営 ──
  { name: "お礼・来店案内の定型文", points: 6, group: "運営", size: "お礼・イベント案内の文面20本（色恋営業NG）", days: "3日〜",
    questions: [
      { key: "使う場面", label: "使う場面", type: "multi", required: true, options: ["来店のお礼", "イベント・周年のご案内", "季節のごあいさつ", "久しぶりの方へのごあいさつ", "予約の確認"] },
      { key: "送る手段", label: "送る手段", type: "multi", required: true, options: ["LINE", "SMS", "メール", "手書きカード"] },
      q.tone(),
      { key: "お店らしさ", label: "お店らしさ・入れたい言葉", type: "textarea" },
    ],
    agreements: [
      "恋愛感情に乗じて来店・注文を求める文面、料金を誤認させる文面は作りません",
      "送る相手の同意がない一斉配信や、しつこい来店の催促に使う文面は作りません",
    ] },
  { name: "口コミ返信文（10件）", points: 3, group: "運営", size: "Googleマップ・ポータル", days: "2日〜",
    questions: [
      { key: "口コミ", label: "返信したい口コミ（貼り付け）", type: "textarea", required: true, hint: "スクショの添付でも構いません" },
      q.files("口コミのスクショ"),
      q.tone(),
    ] },
  { name: "クレーム・トラブル対応の返信文", points: 2, group: "運営", size: "1件", days: "当日〜",
    questions: [
      { key: "内容", label: "クレーム・トラブルの内容（原文）", type: "textarea", required: true },
      { key: "事実", label: "実際にあったこと・お店側の事情", type: "textarea", required: true },
      { key: "対応", label: "対応方針", type: "select", required: true, options: ["謝罪して改善を約束", "事実と違う点をやんわり訂正", "返金・再来店の提案", "相談したい"] },
    ],
    agreements: ["法的な判断が必要なもの（料金トラブル・けがなど）は、弁護士など専門家へのご相談をおすすめします"] },
  { name: "キャスト・スタッフ接客マニュアル", points: 15, group: "運営", size: "接客・酔客対応・未成年確認・NG行為", days: "1週間〜",
    questions: [
      { key: "範囲", label: "載せたい範囲", type: "multi", required: true, options: ["接客の流れ", "会計・料金の説明", "酔ったお客さまへの対応", "未成年の確認とお断り", "NG行為（色恋営業・強引な注文のすすめなど）", "開店・閉店作業"] },
      { key: "資料", label: "いまある資料・メモ", type: "file" },
      { key: "こだわり", label: "お店として絶対に守ってほしいこと", type: "textarea", required: true },
    ] },
  { name: "店内掲示物セット", points: 4, group: "運営", size: "料金表示・年齢確認・未成年お断りの掲示", days: "3日〜",
    questions: [
      { key: "種類", label: "ほしい掲示", type: "multi", required: true, options: ["料金表示", "20歳未満の飲酒お断り", "18歳未満の入店お断り", "年齢確認のお願い", "カード・電子マネーの案内", "撮影・SNS投稿のルール"] },
      { key: "料金", label: "料金表示に載せる内容", type: "textarea" },
      q.print(),
    ],
    agreements: AGREE_PRICE },
  { name: "軽微な修正", points: 2, group: "運営", size: "文言・価格の差し替え", days: "1日〜",
    questions: [{ key: "修正内容", label: "直したい箇所", type: "textarea", required: true }] },
];

export const night: Brand = {
  id: "night",
  name: "NIGHT HATCH",
  tagline: "夜のお店の採用と集客を、ハッチと一緒に。",
  hero: { title: "お店のショート動画をつくる", sub: "伸びている夜のお店の動画を選んで、台本から編集まで一気通貫で" },
  industries: ["バー", "ガールズバー", "スナック", "キャバクラ", "ラウンジ", "クラブ"],
  commonQuestions: [
    { key: "店名", label: "店名", type: "text", required: true },
    { key: "業態", label: "業態", type: "select", required: true, options: ["バー", "ガールズバー", "スナック", "キャバクラ", "ラウンジ", "クラブ", "その他"] },
    { key: "エリア", label: "最寄り駅・エリア", type: "text", required: true, placeholder: "例: 新橋駅 徒歩3分" },
    {
      key: "営業許可・届出",
      label: "営業許可・届出",
      type: "select",
      required: true,
      options: ["風俗営業1号許可あり", "深夜酒類提供飲食店の届出あり", "両方なし（深夜0時までの営業）", "わからない"],
      hint: "接待を伴う営業は1号許可、深夜0時以降にお酒を出す営業は深夜酒類提供飲食店の届出が必要です",
    },
    { key: "店のURL", label: "HP・SNS・Googleマップのいずれか", type: "text" },
  ],
  catalog,
  orderStyle: "simple",
  defaultAgreements: [
    "風営法の許可（接待を伴う営業は1号許可）や深夜酒類提供飲食店の届出など、必要な許可・届出を受けて営業している店舗です",
    "18歳未満の方の出演・採用に関わる制作はお受けできません。求人には必ず「18歳未満・高校生不可」を記載します",
    "性的な表現や露出を売りにした制作はお受けできません",
    "客引き・スカウト行為の代行はしません。恋愛感情に乗じた営業や、料金を誤認させる表現の文面も作りません",
    "出演するキャスト・スタッフご本人の同意（顔出しの範囲を含む）は、お店側で取っていただきます",
    "反社会的勢力とは一切関係がありません（契約書の暴力団排除条項に同意します）",
    "修正は2回まで無料です。集客・採用の結果（来店数・応募数など）は保証できません",
  ],
  demoProjects: [
    { title: "テストラウンジのキャスト求人原稿", category: "キャスト求人原稿", description: "秋の体入シーズンに向けた求人原稿（18歳未満・高校生不可を明記）", points: 6, deadline: "2026-10-10", status: "募集中" },
    { title: "テストラウンジの体入・求人ショート動画", category: "体入・求人ショート動画", description: "店内の雰囲気と先輩スタッフの声を30秒に", points: 10, deadline: "2026-10-03", status: "制作待ち" },
    { title: "テストラウンジの料金システム表（明朗会計）", category: "料金システム表（明朗会計）", description: "セット・延長・指名・TAXを1枚に整理", points: 8, deadline: "2026-09-30", status: "フィードバック" },
    { title: "テストラウンジのMEO対策（初期整備）", category: "MEO対策（初期整備）", description: "Googleマップの写真・営業時間・料金の整備", points: 15, deadline: "2026-09-20", status: "完了" },
  ],
  groups: [
    { name: "キャスト採用", sub: "キャスト・スタッフを採用したい", examples: ["求人原稿", "体入動画", "採用LP", "採用SNS"] },
    { name: "集客・指名", sub: "新規のお客さまを呼びたい", examples: ["Googleマップ", "ポータル掲載", "ホームページ", "LINE公式"] },
    { name: "SNS・動画", sub: "お店とキャストを発信したい", examples: ["ショート動画", "キャスト紹介", "出勤告知"] },
    { name: "イベント・売上", sub: "イベントで売上をつくりたい", examples: ["イベント企画", "料金システム表", "ボトルメニュー"] },
    { name: "営業", sub: "法人・貸切のお客さまをとりたい", examples: ["法人テレアポ", "貸切プラン", "案内資料"] },
    { name: "運営", sub: "お店の運営をラクにしたい", examples: ["お礼の定型文", "口コミ返信", "接客マニュアル"] },
  ],
  orderable: [
    "ショート動画編集", "台本＋動画編集（ショート）", "台本作成（ショート）", "キャスト求人原稿", "体入・求人ショート動画",
    "出勤・イベント告知テンプレ", "投稿文＋画像", "イベント企画", "料金システム表（明朗会計）", "口コミ返信文（10件）",
  ],
  agent: {
    system: `あなたはNIGHT HATCHのマスコット、ハチの「ハッチ」。名前を聞かれたら「ハッチ」と答える。バー・ガールズバー・スナック・キャバクラ・ラウンジ・会員制クラブなど、夜のお店の「キャスト採用」と「集客・指名」を同じ重さで支援するアシスタントです。
主な仕事: キャスト・黒服・バーテンダーの求人原稿、出勤・イベントの告知文、キャスト紹介文、イベント企画、料金システム表（明朗会計）の整理、口コミへの返信文、来店のお礼・イベント案内の定型文、ショート動画の台本。
求人原稿は「仕事内容→給与（実際の条件）→勤務時間→待遇→お店の雰囲気→応募方法」の順で、職業安定法の的確表示に沿って事実どおりに書き、最後に必ず「18歳未満・高校生不可」を入れる。数字が足りなければ1つずつ質問する。
料金システム表は、セット料金・延長・指名・同伴・TAX／サービス料・カード手数料を表にし、お客さまが会計前に総額を想像できる書き方にする。
口コミ返信は、感謝→具体的な点に触れる→次回への一言、の順で、ママ・オーナーの言葉として自然な文にする。低評価には言い訳をせず、事実確認と改善を約束する。
告知文は、見出し（15文字以内）・本文（80文字以内）・ハッシュタグ3つの形で出す。

【必ず守るルール】
1. 18歳未満の人が出演・応募・来店する内容、未成年に見せる演出は一切作らない。求人には必ず「18歳未満・高校生不可」を入れる。
2. 性的な表現、露出や身体を売りにした文面・台本・企画は作らない。
3. 色恋営業（恋愛感情に乗じて来店・注文・ボトルを求める文面）、来店や注文を迫る文面、料金を実際と違って見せる表現（「〜円ポッキリ」など）は作らない。
4. 客引き・スカウト・引き抜きの文面や方法は作らない。
5. 給与・待遇・料金を実態より良く見せる誇大な表現は使わない。
これらを頼まれたら、一言で断り（例:「その内容はお手伝いできません」）、すぐにルールの範囲でできる代わりの案（感謝を伝えるお礼文、イベントの案内、明朗会計の料金表、事実どおりの求人原稿など）を出す。説教はしない。`,
    quickActions: [
      { label: "求人原稿をつくる", hint: "18歳未満不可も自動で入る", prompt: "キャスト求人の原稿を作りたいです。業態・給与・勤務時間・お店の雰囲気を1つずつ質問してください。" },
      { label: "伸びてる夜のお店の動画", hint: "「ラウンジで伸びてる動画見せて」", prompt: "ラウンジで伸びてる動画を見せて" },
      { label: "イベントを企画する", hint: "告知文までセットで", prompt: "イベントを企画したいです。時期・ねらい・予算・お店の業態を質問してください。" },
      { label: "口コミに返信する", hint: "貼り付けるだけ", prompt: "口コミに返信したいです。口コミの文章を貼るので、ママ・オーナーらしい返信文を作ってください。" },
    ],
    promptLibrary: [
      "キャバクラで伸びてる動画を見せて",
      "バーで伸びてる動画を見せて",
      "体入募集のショート動画の台本を作って",
      "キャスト求人の原稿を作って",
      "黒服・バーテンダーの求人原稿を作って",
      "今週の出勤告知をXとストーリーズ用に作って",
      "キャストのバースデーイベントの企画と告知文を考えて",
      "セット・延長・指名・TAXが一目で分かる料金システム表を整理して",
      "来店のお礼メッセージを5パターン作って",
      "キャスト紹介文を作って（プロフィールを伝えます）",
      "Googleマップの口コミに返信する文を作って",
      "「新橋 バー」で検索される店になるためのMEO対策を教えて",
      "発注したい内容を整理するのを手伝って",
    ],
    searchEmptyHint: "業態を変えて探すか、TikTokのURLを動画分析に貼っていただく方法もあります（お手本動画は管理画面の「TikTok取り込み」から追加できます）。",
  },
};

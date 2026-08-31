import type { Brand, CatalogItem, Question } from "../brand-types";

// ── よく使う質問の部品 ──
const q = {
  purpose: (opts: string[]): Question => ({ key: "目的", label: "いちばんの目的", type: "select", required: true, options: opts }),
  ref: (label = "参考にしたいもの（URLや店名）"): Question => ({ key: "参考", label, type: "textarea", placeholder: "「こんな感じ」が伝わるものを。なければ空欄で構いません" }),
  files: (label: string, hint?: string): Question => ({ key: label, label, type: "file", hint }),
  ng: (): Question => ({ key: "NG事項", label: "NG事項（避けたい表現・使えない写真など）", type: "textarea" }),
  deadlineNote: (): Question => ({ key: "使う時期", label: "いつから使いたいか", type: "text", placeholder: "例: 10月のメニュー改定から" }),
};

const VIDEO_QUESTIONS: Question[] = [
  { key: "用途", label: "動画の用途", type: "multi", required: true, options: ["TikTok", "Instagramリール", "YouTubeショート", "店頭サイネージ", "その他"] },
  { key: "見せたいもの", label: "いちばん見せたいもの", type: "select", required: true, options: ["料理のシズル", "店の雰囲気", "スタッフ・店主の人柄", "お客さんの反応", "作り方・裏側"] },
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
  { key: "推し", label: "推したい商品・強み（3つまで）", type: "textarea", required: true },
  { key: "投稿権限", label: "投稿の方法", type: "select", required: true, options: ["投稿まで代行（ログイン情報は別途安全に共有）", "投稿は店側で行う（データ納品）"] },
  q.ng(),
];

const catalog: CatalogItem[] = [
  // ── 動画・SNS ──
  { name: "ショート動画編集", points: 7, group: "SNS・動画", size: "TikTok・リール・ショート", days: "3日〜", questions: VIDEO_QUESTIONS },
  { name: "台本作成（ショート）", points: 4, group: "SNS・動画", size: "フック→本編→CTA", days: "2日〜",
    questions: [
      { key: "媒体", label: "使う媒体", type: "multi", required: true, options: ["TikTok", "Instagramリール", "YouTubeショート", "その他"] },
      q.purpose(["新規のお客さんを増やす", "リピーターを増やす", "新メニューを知らせる", "採用", "認知・話題づくり"]),
      { key: "題材", label: "題材にしたい料理・出来事", type: "textarea", required: true, placeholder: "例: 看板メニューの牛すじ煮込み、仕込みの様子" },
      { key: "雰囲気", label: "雰囲気", type: "multi", options: ["ゆるい・親しみ", "シズル重視", "ストーリー仕立て", "笑い", "職人・こだわり"] },
      q.ref("参考にしたい動画（URL）"),
      q.ng(),
    ] },
  { name: "投稿文＋画像", points: 10, group: "SNS・動画", size: "SNS投稿1本ぶん", days: "3日〜",
    questions: [
      { key: "媒体", label: "投稿する媒体", type: "multi", required: true, options: ["Instagram", "X", "Facebook", "LINE VOOM", "Googleビジネスプロフィール"] },
      { key: "内容", label: "知らせたい内容", type: "textarea", required: true, placeholder: "例: 9月の限定パフェ、金曜のハッピーアワー" },
      q.files("使ってほしい写真"),
      q.ng(),
    ] },
  { name: "LINE配信文＋画像", points: 4, group: "SNS・動画", size: "1配信ぶん", days: "2日〜",
    questions: [
      { key: "内容", label: "配信したい内容", type: "textarea", required: true, placeholder: "例: 雨の日クーポン、予約開始のお知らせ" },
      { key: "特典", label: "つける特典（あれば）", type: "text", placeholder: "例: ドリンク1杯無料" },
      q.files("使ってほしい写真"),
    ] },
  { name: "インフルエンサー来店企画", points: 8, group: "SNS・動画", size: "候補5名＋依頼文", days: "5日〜",
    questions: [
      { key: "エリア", label: "呼びたい人の活動エリア", type: "text", required: true },
      { key: "規模", label: "希望するフォロワー規模", type: "select", required: true, options: ["1万未満（ご近所インフルエンサー）", "1〜5万", "5万以上"] },
      { key: "お礼", label: "お礼の内容", type: "select", required: true, options: ["飲食無料", "飲食無料＋謝礼", "相談したい"] },
      { key: "推し", label: "食べてほしいメニュー", type: "textarea", required: true },
    ] },
  { name: "TikTok運用おまかせ（月額）", points: 40, group: "SNS・動画", size: "企画4本＋編集4本＋投稿代行", days: "月単位", monthly: true, questions: SNS_MONTHLY_QUESTIONS },
  { name: "Instagram運用（月額）", points: 30, group: "SNS・動画", size: "月8投稿＋ストーリーズ案", days: "月単位", monthly: true, questions: SNS_MONTHLY_QUESTIONS },

  // ── 集客 ──
  { name: "MEO対策（初期整備）", points: 15, group: "集客", size: "Googleマップの整備", days: "1週間〜",
    questions: [
      { key: "プロフィールURL", label: "GoogleビジネスプロフィールのURL（Googleマップの店舗ページ）", type: "text", required: true },
      { key: "管理権限", label: "オーナー確認", type: "select", required: true, options: ["オーナー確認済み（管理者を追加できる）", "未確認（確認から手伝ってほしい）", "わからない"] },
      { key: "狙う言葉", label: "検索されたい言葉（3つまで）", type: "textarea", required: true, placeholder: "例: 博多駅 居酒屋 個室 / 天神 ランチ" },
      q.files("店内・料理の写真", "10枚以上あると効きます"),
    ] },
  { name: "MEO月次運用（月額）", points: 10, group: "集客", size: "投稿4本＋口コミ返信＋写真更新", days: "月単位", monthly: true,
    questions: [
      { key: "プロフィールURL", label: "GoogleビジネスプロフィールのURL", type: "text", required: true },
      { key: "今月の推し", label: "今月押したいこと", type: "textarea", required: true },
      { key: "口コミ返信", label: "口コミへの返信", type: "select", required: true, options: ["代行してほしい（下書き確認あり）", "代行してほしい（おまかせ）", "自分で返す"] },
    ] },
  { name: "HP制作（1ページ）", points: 40, group: "集客", size: "スマホ対応・予約ボタン・地図", days: "2週間〜",
    questions: [
      { key: "現状", label: "いまのHP", type: "select", required: true, options: ["ない", "ある（作り直したい）", "ある（このまま改善したい）"] },
      { key: "現HP", label: "いまのHPやSNSのURL", type: "text" },
      { key: "載せたいこと", label: "載せたいこと", type: "multi", required: true, options: ["メニュー", "予約（電話・LINE・予約サイト）", "アクセス・地図", "店の想い・こだわり", "お客様の声", "採用", "テイクアウト・デリバリー"] },
      { key: "予約先", label: "予約の受け口", type: "text", placeholder: "電話番号、LINE公式、食べログ予約など" },
      q.ref("参考にしたいサイト（URL）"),
      q.files("ロゴ・写真"),
      { key: "ドメイン", label: "ドメイン（URL）", type: "select", required: true, options: ["持っている", "新しく取りたい（取得代行）", "相談したい"] },
    ] },
  { name: "HP制作（5ページ）", points: 80, group: "集客", size: "トップ・メニュー・店舗・採用・お知らせ", days: "3週間〜",
    questions: [
      { key: "現状", label: "いまのHP", type: "select", required: true, options: ["ない", "ある（作り直したい）"] },
      { key: "現HP", label: "いまのHPやSNSのURL", type: "text" },
      { key: "ページ構成", label: "ほしいページ", type: "multi", required: true, options: ["トップ", "メニュー", "店舗情報・アクセス", "店の想い", "採用", "お知らせ・ブログ", "テイクアウト・通販", "予約"] },
      q.ref("参考にしたいサイト（URL）"),
      q.files("ロゴ・写真"),
      { key: "ドメイン", label: "ドメイン（URL）", type: "select", required: true, options: ["持っている", "新しく取りたい（取得代行）", "相談したい"] },
      { key: "更新", label: "公開後の更新", type: "select", required: true, options: ["自分で更新したい（更新画面つき）", "更新は都度依頼する"] },
    ] },
  { name: "SEO記事作成", points: 5, group: "集客", size: "検索されるブログ1本", days: "3日〜",
    questions: [
      { key: "狙う言葉", label: "検索されたい言葉", type: "text", required: true, placeholder: "例: 博多 もつ鍋 おすすめ" },
      { key: "掲載先", label: "掲載先", type: "select", required: true, options: ["自社HPのブログ", "note", "Googleビジネスプロフィール", "その他"] },
      { key: "ネタ", label: "書いてほしいネタ・店の強み", type: "textarea", required: true },
    ] },
  { name: "グルメサイト掲載文リライト", points: 6, group: "集客", size: "食べログ・ぐるなび・ホットペッパー", days: "3日〜",
    questions: [
      { key: "媒体", label: "直したい媒体", type: "multi", required: true, options: ["食べログ", "ぐるなび", "ホットペッパーグルメ", "Retty", "Googleマップ", "その他"] },
      { key: "ページURL", label: "掲載ページのURL", type: "textarea", required: true },
      { key: "推し", label: "もっと伝えたい強み", type: "textarea", required: true },
    ] },
  { name: "グルメサイト運用（月額）", points: 12, group: "集客", size: "食べログ・ぐるなび・ホットペッパーの更新と口コミ返信", days: "月単位", monthly: true,
    questions: [
      { key: "媒体", label: "運用する媒体", type: "multi", required: true, options: ["食べログ", "ぐるなび", "ホットペッパーグルメ", "Retty", "Googleマップ", "その他"] },
      { key: "管理画面", label: "管理画面の使い方", type: "select", required: true, options: ["更新まで代行（ログイン情報は別途安全に共有）", "更新は店側で行う（文章と写真を納品）"] },
      { key: "今月の推し", label: "今月押したいこと（新メニュー・クーポン・季節フェアなど）", type: "textarea", required: true },
      { key: "口コミ返信", label: "口コミへの返信", type: "select", required: true, options: ["代行してほしい（下書き確認あり）", "代行してほしい（おまかせ）", "自分で返す"] },
      { key: "予約", label: "ネット予約の設定", type: "select", options: ["設定済み", "設定したい（手伝ってほしい）", "使わない"] },
      q.files("今月使う写真"),
    ] },
  { name: "LINE公式アカウント構築", points: 20, group: "集客", size: "リッチメニュー・あいさつ・クーポン設計", days: "1週間〜",
    questions: [
      { key: "現状", label: "LINE公式アカウント", type: "select", required: true, options: ["まだない（開設から）", "ある（整えたい）"] },
      { key: "やりたいこと", label: "やりたいこと", type: "multi", required: true, options: ["クーポン配信", "予約受付", "メニュー案内", "ポイントカード", "友だち追加特典"] },
      { key: "友だち特典", label: "友だち追加の特典", type: "text", placeholder: "例: 初回ドリンク1杯無料" },
      q.files("ロゴ・写真"),
    ] },
  { name: "チラシ（A4片面）", points: 15, group: "集客", size: "ポスティング・店頭配布", days: "5日〜",
    questions: [
      q.purpose(["新規オープン・リニューアル", "新メニュー・季節フェア", "ランチ・テイクアウト案内", "宴会・貸切", "デリバリー"]),
      { key: "載せる内容", label: "載せたい内容（メニュー・価格・クーポンなど）", type: "textarea", required: true },
      { key: "配り方", label: "配り方", type: "select", options: ["ポスティング", "店頭・手配り", "新聞折込", "まだ決めていない"] },
      q.files("ロゴ・写真"),
      q.ref("参考にしたいチラシ"),
      { key: "印刷", label: "印刷", type: "select", required: true, options: ["データ納品のみ", "印刷も手配してほしい（実費別）"] },
    ] },
  { name: "求人原稿作成", points: 4, group: "採用", size: "Indeed・タウンワーク向け1職種", days: "2日〜",
    questions: [
      { key: "職種", label: "募集する職種", type: "text", required: true, placeholder: "例: ホールスタッフ（アルバイト）" },
      { key: "条件", label: "時給・シフト・待遇", type: "textarea", required: true },
      { key: "職場の良さ", label: "職場の良さ（本音でOK）", type: "textarea", required: true },
      { key: "掲載先", label: "掲載先", type: "multi", options: ["Indeed", "タウンワーク", "バイトル", "自社HP・SNS", "店頭貼り紙"] },
    ] },

  // ── 店内・売上 ──
  { name: "メニュー開発", points: 15, group: "メニュー・売上", size: "新メニュー3品（レシピ・原価・売価案）", days: "1週間〜",
    questions: [
      q.purpose(["客単価を上げたい", "看板メニューを作りたい", "季節感を出したい", "原価を下げたい", "SNS映えするものがほしい"]),
      { key: "価格帯", label: "想定する売価", type: "text", required: true, placeholder: "例: 780〜980円" },
      { key: "原価率", label: "目標の原価率", type: "select", required: true, options: ["25%以下", "30%前後", "35%前後", "気にしない"] },
      { key: "制約", label: "厨房の制約（設備・人手・仕込み時間）", type: "textarea", placeholder: "例: フライヤーなし、ワンオペの時間帯あり" },
      { key: "食材", label: "使いたい食材・仕入れ先の強み", type: "textarea" },
      { key: "現メニュー", label: "いまのメニュー表", type: "file", hint: "写真やPDFで" },
      q.ng(),
    ] },
  { name: "季節・限定メニュー企画", points: 12, group: "メニュー・売上", size: "1シーズン5品", days: "1週間〜",
    questions: [
      { key: "時期", label: "時期・イベント", type: "text", required: true, placeholder: "例: 秋（9〜11月）、クリスマス、忘年会" },
      { key: "価格帯", label: "想定する売価", type: "text", required: true },
      { key: "制約", label: "厨房の制約", type: "textarea" },
      { key: "現メニュー", label: "いまのメニュー表", type: "file" },
    ] },
  { name: "ドリンクメニュー開発", points: 8, group: "メニュー・売上", size: "5品（レシピ・原価・売価案）", days: "5日〜",
    questions: [
      { key: "種類", label: "ほしい種類", type: "multi", required: true, options: ["アルコール", "ノンアル・モクテル", "ソフトドリンク", "コーヒー・紅茶", "季節限定"] },
      { key: "価格帯", label: "想定する売価", type: "text", required: true },
      { key: "設備", label: "使える設備", type: "multi", options: ["ビールサーバー", "エスプレッソマシン", "ブレンダー", "製氷機", "特になし"] },
    ] },
  { name: "原価率の見直し", points: 15, group: "メニュー・売上", size: "既存20品の原価計算と売価提案", days: "1週間〜",
    questions: [
      { key: "現メニュー", label: "いまのメニュー表（価格入り）", type: "file", required: true },
      { key: "仕入れ", label: "主な食材の仕入れ価格がわかる資料", type: "file", hint: "納品書・仕入れ台帳など。なければ概算でヒアリングします" },
      { key: "現原価率", label: "いまの原価率（わかれば）", type: "text", placeholder: "例: 35%くらい" },
      { key: "目標", label: "目標", type: "select", required: true, options: ["原価率を下げたい", "値上げの根拠がほしい", "赤字メニューを知りたい", "全部"] },
    ] },
  { name: "メニュー表デザイン", points: 12, group: "メニュー・売上", size: "グランドメニュー1面", days: "1週間〜",
    questions: [
      { key: "形", label: "形", type: "select", required: true, options: ["A4 1枚", "A3 二つ折り", "卓上スタンド", "壁掛け・黒板風", "タブレット表示用"] },
      { key: "品数", label: "掲載する品数", type: "text", required: true, placeholder: "例: フード30品、ドリンク20品" },
      { key: "メニュー内容", label: "メニューと価格", type: "textarea", required: true, placeholder: "テキストで貼り付けるか、下でファイル添付" },
      q.files("料理写真・現メニュー"),
      q.ref("参考にしたいメニュー表"),
      { key: "印刷", label: "印刷", type: "select", required: true, options: ["データ納品のみ", "印刷も手配してほしい（実費別）"] },
    ] },
  { name: "メニュー表の差し替え修正", points: 3, group: "メニュー・売上", size: "価格・品目の差し替え", days: "2日〜",
    questions: [
      { key: "修正内容", label: "直したい箇所", type: "textarea", required: true },
      { key: "現データ", label: "いまのメニュー表のデータ", type: "file", required: true, hint: "AI・PDF・PowerPointなど" },
    ] },
  { name: "メニュー表の並び改善", points: 8, group: "メニュー・売上", size: "売れる並び・見せ方の提案", days: "5日〜",
    questions: [
      { key: "現メニュー", label: "いまのメニュー表", type: "file", required: true },
      { key: "売りたい", label: "いちばん売りたい品（利益が出る品）", type: "textarea", required: true },
      { key: "売上データ", label: "品目別の売上（わかれば）", type: "file", hint: "POSの集計など" },
    ] },
  { name: "POP作成", points: 4, group: "メニュー・売上", size: "卓上・店頭 1点", days: "2日〜",
    questions: [
      { key: "種類", label: "POPの種類", type: "select", required: true, options: ["卓上POP", "店頭ポスター", "レジ横", "トイレ・壁", "メニューブック差し込み"] },
      { key: "内容", label: "推したい内容", type: "textarea", required: true, placeholder: "例: 本日のおすすめ、飲み放題、LINE友だち追加" },
      { key: "サイズ", label: "サイズ", type: "select", options: ["A6", "A5", "A4", "A3", "おまかせ"] },
      q.files("使ってほしい写真・ロゴ"),
      { key: "印刷", label: "印刷", type: "select", required: true, options: ["データ納品のみ（店で印刷）", "印刷も手配してほしい（実費別）"] },
    ] },
  { name: "料理写真レタッチ", points: 4, group: "メニュー・売上", size: "5枚（明るさ・色・切り抜き）", days: "2日〜",
    questions: [
      { key: "写真", label: "写真（5枚まで）", type: "file", required: true },
      { key: "用途", label: "使う場所", type: "multi", required: true, options: ["メニュー表", "SNS", "グルメサイト", "HP", "デリバリーアプリ"] },
      { key: "希望", label: "仕上がりの希望", type: "textarea", placeholder: "例: もっとシズル感を、背景を白に" },
    ] },
  { name: "店頭看板デザイン", points: 6, group: "メニュー・売上", size: "A型看板・のぼり・ウィンドウ", days: "5日〜",
    questions: [
      { key: "種類", label: "種類", type: "select", required: true, options: ["A型看板", "のぼり", "ウィンドウシート", "タペストリー", "その他"] },
      { key: "サイズ", label: "サイズ（わかれば）", type: "text" },
      { key: "内容", label: "載せたい内容", type: "textarea", required: true },
      q.files("ロゴ・写真"),
      { key: "印刷", label: "制作", type: "select", required: true, options: ["データ納品のみ", "印刷・製作も手配してほしい（実費別）"] },
    ] },
  { name: "デリバリー用メニュー登録", points: 10, group: "メニュー・売上", size: "10品の写真＋説明文", days: "5日〜",
    questions: [
      { key: "サービス", label: "登録するサービス", type: "multi", required: true, options: ["Uber Eats", "出前館", "Wolt", "menu", "自社テイクアウト"] },
      { key: "品目", label: "登録したい品と価格", type: "textarea", required: true },
      q.files("料理写真", "なければレタッチ込みでご相談"),
    ] },
  { name: "ショップカード・ポイントカード", points: 4, group: "メニュー・売上", size: "名刺サイズ 1点", days: "3日〜",
    questions: [
      { key: "種類", label: "種類", type: "select", required: true, options: ["ショップカード", "ポイントカード", "クーポン券", "その他"] },
      { key: "内容", label: "載せたい内容（店名・住所・SNS・特典など）", type: "textarea", required: true },
      q.files("ロゴ"),
      { key: "印刷", label: "印刷", type: "select", required: true, options: ["データ納品のみ", "印刷も手配してほしい（実費別）"] },
    ] },

  // ── 採用 ──
  { name: "採用向けショート動画", points: 7, group: "採用", size: "働く様子・先輩の声を30秒に", days: "3日〜",
    questions: [
      { key: "職種", label: "募集する職種", type: "text", required: true },
      { key: "見せたいこと", label: "見せたいこと", type: "multi", required: true, options: ["店の雰囲気", "先輩スタッフの声", "まかない", "1日の流れ", "店主の人柄"] },
      { key: "素材", label: "素材動画（URL）", type: "text" },
      q.files("素材ファイル", "スマホで撮った縦動画でOK"),
      { key: "掲載先", label: "使う場所", type: "multi", options: ["TikTok", "Instagram", "Indeed", "店頭サイネージ"] },
    ] },
  { name: "求人媒体の掲載文リライト", points: 4, group: "採用", size: "応募が来る書き方に直す", days: "2日〜",
    questions: [
      { key: "現原稿", label: "いまの求人原稿（貼り付けかURL）", type: "textarea", required: true },
      { key: "応募状況", label: "いまの応募状況", type: "select", required: true, options: ["ほぼ来ない", "来るが定着しない", "ミスマッチが多い"] },
      { key: "職場の良さ", label: "職場の良さ（本音でOK）", type: "textarea", required: true },
    ] },

  // ── 営業（宴会・法人） ──
  {
    name: "宴会・法人向けテレアポ営業",
    points: 20,
    group: "営業",
    size: "近隣企業に宴会・仕出しを案内",
    days: "1週間〜",
    quantity: { key: "架電件数", unit: "件", pointsPer: 0.2, min: 100, max: 2000, step: 50, hint: "1件0.2pt。100件=20pt、300件=60pt" },
    questions: [
      { key: "案内したいこと", label: "案内したいこと", type: "multi", required: true, options: ["忘年会・歓送迎会の宴会", "貸切", "仕出し・ケータリング", "法人の定期利用（接待・ランチ）", "その他"] },
      { key: "ターゲット", label: "架電先（エリア・業種・規模）", type: "textarea", required: true, placeholder: "例: 店から徒歩10分圏内の従業員20名以上の会社" },
      { key: "架電リスト", label: "架電リスト", type: "select", required: true, options: ["手元にある（CSVを添付）", "リスト作成も依頼する（1件0.1ptを追加でご相談）"] },
      { key: "リストファイル", label: "架電リストのファイル", type: "file" },
      { key: "プラン", label: "案内するプランと価格", type: "textarea", required: true, placeholder: "例: 飲み放題付き4,500円コース、幹事無料" },
      { key: "架電時間帯", label: "架電してよい時間帯", type: "multi", required: true, options: ["平日 10〜12時", "平日 13〜15時", "平日 15〜18時", "指定なし"] },
      { key: "NG事項", label: "NG事項（かけてはいけない先など）", type: "textarea" },
      { key: "報告頻度", label: "報告の頻度", type: "select", required: true, options: ["毎日", "週2回", "週1回", "終了時にまとめて"] },
    ],
    agreements: [
      "架電先は法人・事業者に限ります（個人宅への電話勧誘は受け付けません）",
      "「今後かけないでほしい」と言われた先には再架電しません",
      "架電リストに含まれる個人情報は案件終了後に破棄します",
      "予約の成立数は先方の事情にも左右されるため、件数の保証はできません",
    ],
  },
  { name: "宴会プラン企画", points: 8, group: "営業", size: "コース内容・価格・幹事特典の設計", days: "5日〜",
    questions: [
      { key: "時期", label: "時期", type: "text", required: true, placeholder: "例: 12月の忘年会、3〜4月の歓送迎会" },
      { key: "価格帯", label: "想定する1人あたりの価格", type: "text", required: true },
      { key: "席数", label: "受けられる人数・席数", type: "text", required: true },
      { key: "現メニュー", label: "いまのメニュー表", type: "file" },
    ] },
  { name: "法人向け案内資料（A4）", points: 8, group: "営業", size: "宴会・仕出しの案内チラシ・FAX用", days: "5日〜",
    questions: [
      { key: "内容", label: "載せたい内容（プラン・価格・特典・連絡先）", type: "textarea", required: true },
      { key: "使い方", label: "使い方", type: "multi", required: true, options: ["近隣企業へ手配り", "FAX", "メール添付（PDF）", "店頭"] },
      q.files("ロゴ・写真"),
    ] },

  // ── 運営 ──
  { name: "口コミ返信文（10件）", points: 3, group: "運営", size: "Googleマップ・食べログ", days: "2日〜",
    questions: [
      { key: "口コミ", label: "返信したい口コミ（貼り付け）", type: "textarea", required: true, hint: "スクショの添付でも構いません" },
      q.files("口コミのスクショ"),
      { key: "口調", label: "口調", type: "select", required: true, options: ["丁寧", "親しみやすい", "店主の人柄が出る感じ"] },
    ] },
  { name: "口コミ返信の月次代行（月額）", points: 6, group: "運営", size: "月30件まで", days: "月単位", monthly: true,
    questions: [
      { key: "媒体", label: "対象の媒体", type: "multi", required: true, options: ["Googleマップ", "食べログ", "ぐるなび", "ホットペッパー", "Instagramのコメント"] },
      { key: "確認", label: "投稿前の確認", type: "select", required: true, options: ["毎回確認したい", "低評価だけ確認したい", "おまかせ"] },
      { key: "口調", label: "口調", type: "select", required: true, options: ["丁寧", "親しみやすい", "店主の人柄が出る感じ"] },
    ] },
  { name: "クレーム対応の返信文", points: 2, group: "運営", size: "1件", days: "当日〜",
    questions: [
      { key: "内容", label: "クレームの内容（原文）", type: "textarea", required: true },
      { key: "事実", label: "実際にあったこと・店側の事情", type: "textarea", required: true },
      { key: "対応", label: "対応方針", type: "select", required: true, options: ["謝罪して改善を約束", "事実と違う点をやんわり訂正", "返金・再来店の提案", "相談したい"] },
    ] },
  { name: "アルバイト向けマニュアル", points: 15, group: "採用", size: "接客・調理手順 A4 10ページ", days: "1週間〜",
    questions: [
      { key: "範囲", label: "載せたい範囲", type: "multi", required: true, options: ["接客の流れ", "レジ・会計", "調理・盛り付け", "開店・閉店作業", "衛生・清掃", "クレーム初動"] },
      { key: "資料", label: "いまある資料・メモ", type: "file" },
      { key: "こだわり", label: "店として絶対に守ってほしいこと", type: "textarea", required: true },
    ] },
  { name: "補助金申請書ドラフト", points: 20, group: "運営", size: "持続化補助金などの事業計画", days: "2週間〜",
    questions: [
      { key: "補助金", label: "検討している補助金", type: "select", required: true, options: ["小規模事業者持続化補助金", "IT導入補助金", "ものづくり補助金", "自治体の補助金", "どれが合うか相談したい"] },
      { key: "使い道", label: "補助金で何をしたいか", type: "textarea", required: true, placeholder: "例: 店頭看板とHPを作って新規客を増やしたい" },
      { key: "規模", label: "従業員数・年商（おおよそ）", type: "text", required: true },
      { key: "決算", label: "直近の決算書・確定申告書", type: "file", hint: "あれば。なくても下書きは作れます" },
    ] },
  { name: "軽微な修正", points: 2, group: "運営", size: "文言・価格の差し替えなど", days: "1日〜",
    questions: [{ key: "修正内容", label: "直したい箇所", type: "textarea", required: true }] },
];

export const food: Brand = {
  id: "food",
  name: "FOOD HATCH",
  tagline: "飲食店の集客・メニュー・SNSを、ハチと一緒に。",
  hero: { title: "お店のショート動画をつくる", sub: "伸びている飲食店の動画を選んで、台本から編集まで一気通貫で" },
  industries: [
    "居酒屋", "カフェ", "ラーメン", "焼肉", "寿司・和食", "イタリアン・フレンチ", "中華", "バー",
    "スイーツ・ベーカリー", "定食・食堂", "カレー・エスニック", "テイクアウト・デリバリー", "キッチンカー",
  ],
  commonQuestions: [
    { key: "店名", label: "店名", type: "text", required: true },
    { key: "業態", label: "業態", type: "text", required: true, placeholder: "例: 居酒屋、カフェ、ラーメン" },
    { key: "エリア", label: "最寄り駅・エリア", type: "text", required: true, placeholder: "例: 博多駅 徒歩5分" },
    { key: "客単価", label: "客単価（おおよそ）", type: "text", placeholder: "例: 昼1,000円 / 夜4,000円" },
    { key: "店のURL", label: "HP・SNS・Googleマップのいずれか", type: "text" },
  ],
  catalog,
  orderStyle: "simple",
  defaultAgreements: [
    "修正は原則2回まで無料、それ以降は別途お見積りになります",
    "提案内容（メニュー・価格・文言）の最終判断はお店側でお願いします。売上や集客の結果は保証できません",
    "写真・ロゴ・メニュー表などの素材は、お店が使用権を持つものをご提供ください",
    "ご提供いただいた情報は制作の目的にだけ使い、案件終了後は外部に出しません",
  ],
  demoProjects: [
    { title: "テスト食堂の季節・限定メニュー企画", category: "季節・限定メニュー企画", description: "秋の限定定食5品の企画", points: 12, deadline: "2026-09-20", status: "募集中" },
    { title: "テスト食堂のショート動画編集", category: "ショート動画編集", description: "看板メニューの仕込み動画", points: 7, deadline: "2026-09-05", status: "制作待ち" },
    { title: "テスト食堂のPOP作成", category: "POP作成", description: "本日のおすすめ卓上POP", points: 4, deadline: "2026-09-10", status: "フィードバック" },
    { title: "テスト食堂のMEO対策（初期整備）", category: "MEO対策（初期整備）", description: "Googleマップの写真・営業時間・メニュー登録", points: 15, deadline: "2026-08-25", status: "完了" },
  ],
  groups: [
    { name: "集客", sub: "新しいお客さんを呼びたい", examples: ["Googleマップ対策", "食べログ等の運用", "ホームページ", "チラシ"] },
    { name: "メニュー・売上", sub: "客単価と利益を上げたい", examples: ["メニュー開発", "原価の見直し", "POP"] },
    { name: "SNS・動画", sub: "TikTok・Instagramで知ってもらいたい", examples: ["ショート動画", "運用おまかせ", "投稿文"] },
    { name: "営業", sub: "宴会・法人のお客さんをとりたい", examples: ["テレアポ営業", "宴会プラン", "案内資料"] },
    { name: "採用", sub: "スタッフを採用したい", examples: ["求人原稿", "採用動画", "マニュアル"] },
    { name: "運営", sub: "日々の面倒を減らしたい", examples: ["口コミ返信", "クレーム対応", "補助金"] },
  ],
  orderable: ["ショート動画編集", "台本作成（ショート）", "POP作成", "投稿文＋画像", "口コミ返信文（10件）", "メニュー開発"],
  agent: {
    system: `あなたは「FOOD HATCHエージェント」。飲食店の集客・メニュー開発・SNS運用を支援するアシスタントです。
主な仕事: 店の動画の台本作成、メニュー開発の壁打ち、POPやSNS投稿の文言づくり、口コミへの返信文、原価率の計算、MEO（Googleマップ）やHPのアドバイス。
原価率を聞かれたら「原価率 = 原価 ÷ 売価」で計算し、飲食店の目安（フード30%前後、ドリンク20%前後、全体で30〜35%）と比べて一言添える。数字が足りなければ、必要な数字を1つずつ質問する。
メニュー開発では、業態・客単価・厨房の制約を聞いてから、料理名・ひとこと説明・想定原価・売価・原価率・SNSでの見せ方をセットで提案する。
口コミ返信は、まず感謝→具体的な点に触れる→次回への一言、の順で、店主の言葉として自然な文にする。低評価には言い訳をせず、事実確認と改善を約束する。
POPの文言は、見出し（10文字以内）・サブ（20文字以内）・本文（40文字以内）の3段で出す。`,
    quickActions: [
      { label: "伸びてる飲食店の動画", hint: "「居酒屋で伸びてる動画見せて」", prompt: "居酒屋で伸びてる動画を見せて" },
      { label: "メニューを考える", hint: "原価と売価もセットで", prompt: "新メニューを考えたいです。業態と客単価、厨房の制約を質問してください。" },
      { label: "口コミに返信する", hint: "貼り付けるだけ", prompt: "口コミに返信したいです。口コミの文章を貼るので、店主らしい返信文を作ってください。" },
      { label: "原価率を出す", hint: "原価と売価から", prompt: "メニューの原価率を計算したいです。必要な数字を質問してください。" },
    ],
    promptLibrary: [
      "居酒屋で伸びてる動画を見せて",
      "カフェで伸びてる動画を見せて",
      "ラーメン店で伸びてる動画を見せて",
      "看板メニューを紹介するショート動画の台本を作って",
      "客単価を上げる新メニューを3品提案して",
      "季節限定メニューの企画を5つ出して",
      "このメニューの原価率を計算して",
      "本日のおすすめPOPの文言を作って",
      "Googleマップの口コミに返信する文を作って",
      "「博多駅 居酒屋」で検索される店になるためのMEO対策を教えて",
      "LINE公式の友だち追加クーポンの文面を作って",
      "アルバイト募集の原稿を作って",
      "発注したい内容を整理するのを手伝って",
    ],
    searchEmptyHint: "業態を変えて探すか、TikTokのURLを動画分析に貼っていただく方法もあります。",
  },
};

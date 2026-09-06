/** 今月のおすすめ（季節の提案を1つ）。月で切り替える。リンク先は困りごとグループ */
export function seasonalPick(month: number): { title: string; body: string; group: string; cta: string } {
  if (month === 9 || month === 10) return { title: "秋メニュー、もう決まりましたか？", body: "きのこ・さつまいも・新米の季節。限定5品の企画を12ハニーで。写真映えする盛り付けまで一緒に考えます。", group: "メニュー・売上", cta: "季節メニューを頼む" };
  if (month === 11 || month === 12) return { title: "忘年会の予約、近くの会社に声をかけましょう", body: "徒歩10分圏内の会社へ宴会プランを案内。テレアポは1件0.25ハニーから。", group: "営業", cta: "宴会の営業を頼む" };
  if (month === 1 || month === 2) return { title: "歓送迎会シーズンの前に、宴会プランを整えましょう", body: "コース内容・幹事特典・案内資料をセットで。3月の予約は2月に決まります。", group: "営業", cta: "宴会プランを頼む" };
  if (month === 3 || month === 4) return { title: "新生活のお客さんに、お店を知ってもらう季節", body: "Googleマップの整備とLINE公式の立ち上げで、引っ越してきた人の「近くの店」に入りましょう。", group: "集客", cta: "集客のメニューを見る" };
  if (month === 5 || month === 6) return { title: "夏に向けて、スタッフを増やしませんか", body: "応募が来る求人原稿と、働く様子のショート動画。まずは原稿4ハニーから。", group: "採用", cta: "採用のメニューを見る" };
  return { title: "夏限定メニューと、涼しげなドリンク", body: "ドリンク5品の開発は8ハニー。SNS投稿用の写真と一緒に頼むと反応が違います。", group: "メニュー・売上", cta: "夏メニューを頼む" };
}


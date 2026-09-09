/**
 * 十二篇範文資料結構（可擴充）。
 * 主頁目前只顯示 collections 中的項目；日後加入詞三首、散文時
 * 於 CURRICULUM 加一筆即可，遊戲邏輯不用改。
 */
(function (global) {
  function couplet(line1, punct1, line2, punct2) {
    return {
      lines: [line1, line2],
      puncts: [punct1, punct2],
    };
  }

  const shanju = {
    id: "shanju-qiuming",
    title: "山居秋暝",
    author: "王維",
    form: "五律",
    couplets: [
      couplet("空山新雨後", "，", "天氣晚來秋", "。"),
      couplet("明月松間照", "，", "清泉石上流", "。"),
      couplet("竹喧歸浣女", "，", "蓮動下漁舟", "。"),
      couplet("隨意春芳歇", "，", "王孫自可留", "。"),
    ],
  };

  const yuexia = {
    id: "yuexia-duzhuo",
    title: "月下獨酌",
    subtitle: "其一",
    author: "李白",
    form: "五古",
    couplets: [
      couplet("花間一壺酒", "，", "獨酌無相親", "。"),
      couplet("舉杯邀明月", "，", "對影成三人", "。"),
      couplet("月既不解飲", "，", "影徒隨我身", "。"),
      couplet("暫伴月將影", "，", "行樂須及春", "。"),
      couplet("我歌月徘徊", "，", "我舞影零亂", "。"),
      couplet("醒時同交歡", "，", "醉後各分散", "。"),
      couplet("永結無情遊", "，", "相期邈雲漢", "。"),
    ],
  };

  const denglou = {
    id: "denglou",
    title: "登樓",
    author: "杜甫",
    form: "七律",
    couplets: [
      couplet("花近高樓傷客心", "，", "萬方多難此登臨", "。"),
      couplet("錦江春色來天地", "，", "玉壘浮雲變古今", "。"),
      couplet("北極朝廷終不改", "，", "西山寇盜莫相侵", "。"),
      couplet("可憐後主還祠廟", "，", "日暮聊為梁甫吟", "。"),
    ],
  };

  const CURRICULUM = [
    {
      id: "shi-san-shou",
      title: "詩三首",
      subtitle: "王維 · 李白 · 杜甫",
      items: [shanju, yuexia, denglou],
    },
    // 預留：詞三首、論仁、岳陽樓記……
  ];

  function findWork(workId) {
    for (const collection of CURRICULUM) {
      const found = collection.items.find((item) => item.id === workId);
      if (found) return { collection, work: found };
    }
    return null;
  }

  function coupletChars(couplet) {
    return Array.from(couplet.lines[0] + couplet.lines[1]);
  }

  global.FanwenData = {
    CURRICULUM,
    findWork,
    coupletChars,
  };
})(window);

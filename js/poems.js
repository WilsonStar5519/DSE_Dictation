/**
 * 香港中學文憑試「指定文言經典學習材料」十二篇的背默素材。
 *
 * 散文篇章只收錄常考名句（節錄），並在 note 標明，避免誤會為全文。
 * 每個 segment 是一組（通常兩句）對照句，遊戲以 segment 為一關。
 */
(function (global) {
  function seg() {
    const lines = [];
    const puncts = [];
    for (let i = 0; i < arguments.length; i += 2) {
      lines.push(arguments[i]);
      puncts.push(arguments[i + 1] || "");
    }
    return { lines: lines, puncts: puncts };
  }

  const lunyu = {
    id: "lunyu",
    title: "論仁、論孝、論君子",
    author: "《論語》",
    form: "語錄",
    note: "常考名句節錄",
    segments: [
      seg("不仁者不可以久處約", "，", "不可以長處樂", "。"),
      seg("富與貴，是人之所欲也", "；", "不以其道得之，不處也", "。"),
      seg("貧與賤，是人之所惡也", "；", "不以其道得之，不去也", "。"),
      seg("今之孝者，是謂能養", "；", "至於犬馬，皆能有養", "。"),
      seg("父母之年，不可不知也", "。", "一則以喜，一則以懼", "。"),
      seg("君子坦蕩蕩", "，", "小人長戚戚", "。"),
      seg("君子求諸己", "，", "小人求諸人", "。"),
    ],
  };

  const yuwo = {
    id: "yuwo",
    title: "魚我所欲也",
    author: "《孟子》",
    form: "議論",
    note: "常考名句節錄",
    segments: [
      seg("魚，我所欲也", "；", "熊掌，亦我所欲也", "。"),
      seg("二者不可得兼", "，", "舍魚而取熊掌者也", "。"),
      seg("生，亦我所欲也", "；", "義，亦我所欲也", "。"),
      seg("二者不可得兼", "，", "舍生而取義者也", "。"),
      seg("所欲有甚於生者", "，", "故不為苟得也", "。"),
      seg("所惡有甚於死者", "，", "故患有所不辟也", "。"),
    ],
  };

  const xiaoyao = {
    id: "xiaoyao",
    title: "逍遙遊",
    subtitle: "節錄",
    author: "《莊子》",
    form: "寓言",
    note: "常考名句節錄",
    segments: [
      seg("北冥有魚", "，", "其名為鯤", "。"),
      seg("鯤之大", "，", "不知其幾千里也", "。"),
      seg("化而為鳥", "，", "其名為鵬", "。"),
      seg("怒而飛", "，", "其翼若垂天之雲", "。"),
      seg("水之積也不厚", "，", "則其負大舟也無力", "。"),
      seg("風之積也不厚", "，", "則其負大翼也無力", "。"),
      seg("至人無己，神人無功", "，", "聖人無名", "。"),
    ],
  };

  const quanxue = {
    id: "quanxue",
    title: "勸學",
    subtitle: "節錄",
    author: "《荀子》",
    form: "議論",
    note: "常考名句節錄",
    segments: [
      seg("君子曰", "：", "學不可以已", "。"),
      seg("青，取之於藍，而青於藍", "；", "冰，水為之，而寒於水", "。"),
      seg("木受繩則直", "，", "金就礪則利", "。"),
      seg("積土成山", "，", "風雨興焉", "。"),
      seg("積水成淵", "，", "蛟龍生焉", "。"),
      seg("鍥而舍之，朽木不折", "；", "鍥而不舍，金石可鏤", "。"),
    ],
  };

  const lianpo = {
    id: "lianpo",
    title: "廉頗藺相如列傳",
    subtitle: "節錄",
    author: "司馬遷",
    form: "史傳",
    note: "常考名句節錄",
    segments: [
      seg("今兩虎共鬥", "，", "其勢不俱生", "。"),
      seg("吾所以為此者", "，", "以先國家之急而後私仇也", "。"),
      seg("強秦之所以不敢加兵於趙者", "，", "徒以吾兩人在也", "。"),
      seg("鄙賤之人", "，", "不知將軍寬之至此也", "。"),
      seg("卒相與歡", "，", "為刎頸之交", "。"),
    ],
  };

  const chushi = {
    id: "chushi",
    title: "出師表",
    author: "諸葛亮",
    form: "章表",
    note: "常考名句節錄",
    segments: [
      seg("先帝創業未半", "，", "而中道崩殂", "。"),
      seg("今天下三分", "，", "益州疲弊", "。"),
      seg("宮中府中", "，", "俱為一體", "。"),
      seg("親賢臣，遠小人", "，", "此先漢所以興隆也", "。"),
      seg("臣本布衣", "，", "躬耕於南陽", "。"),
      seg("苟全性命於亂世", "，", "不求聞達於諸侯", "。"),
      seg("受任於敗軍之際", "，", "奉命於危難之間", "。"),
    ],
  };

  const shishuo = {
    id: "shishuo",
    title: "師說",
    author: "韓愈",
    form: "議論",
    note: "常考名句節錄",
    segments: [
      seg("古之學者必有師", "。", "師者", "，"),
      seg("所以傳道、受業、解惑也", "。"),
      seg("人非生而知之者", "，", "孰能無惑", "？"),
      seg("是故無貴無賤，無長無少", "，", "道之所存，師之所存也", "。"),
      seg("弟子不必不如師", "，", "師不必賢於弟子", "。"),
      seg("聞道有先後", "，", "術業有專攻", "。"),
    ],
  };

  const xishan = {
    id: "xishan",
    title: "始得西山宴遊記",
    author: "柳宗元",
    form: "遊記",
    note: "常考名句節錄",
    segments: [
      seg("自余為僇人", "，", "居是州，恆惴慄", "。"),
      seg("其高下之勢", "，", "岈然洼然", "。"),
      seg("悠悠乎與顥氣俱", "，", "而莫得其涯", "。"),
      seg("洋洋乎與造物者遊", "，", "而不知其所窮", "。"),
      seg("心凝形釋", "，", "與萬化冥合", "。"),
      seg("然後知吾嚮之未始遊", "，", "遊於是乎始", "。"),
    ],
  };

  const yueyang = {
    id: "yueyang",
    title: "岳陽樓記",
    author: "范仲淹",
    form: "記",
    note: "常考名句節錄",
    segments: [
      seg("銜遠山，吞長江", "，", "浩浩湯湯，橫無際涯", "。"),
      seg("朝暉夕陰", "，", "氣象萬千", "。"),
      seg("予嘗求古仁人之心", "，", "或異二者之為", "。"),
      seg("不以物喜", "，", "不以己悲", "。"),
      seg("居廟堂之高則憂其民", "，", "處江湖之遠則憂其君", "。"),
      seg("先天下之憂而憂", "，", "後天下之樂而樂", "。"),
    ],
  };

  const liuguo = {
    id: "liuguo",
    title: "六國論",
    author: "蘇洵",
    form: "議論",
    note: "常考名句節錄",
    segments: [
      seg("六國破滅", "，", "非兵不利，戰不善", "，"),
      seg("弊在賂秦也", "。"),
      seg("賂秦而力虧", "，", "破滅之道也", "。"),
      seg("思厥先祖父", "，", "暴霜露，斬荊棘", "。"),
      seg("以地事秦", "，", "猶抱薪救火", "。"),
      seg("薪不盡", "，", "火不滅", "。"),
      seg("日削月割", "，", "以趨於亡", "。"),
    ],
  };

  const shanju = {
    id: "shanju-qiuming",
    title: "山居秋暝",
    author: "王維",
    form: "五律",
    segments: [
      seg("空山新雨後", "，", "天氣晚來秋", "。"),
      seg("明月松間照", "，", "清泉石上流", "。"),
      seg("竹喧歸浣女", "，", "蓮動下漁舟", "。"),
      seg("隨意春芳歇", "，", "王孫自可留", "。"),
    ],
  };

  const yuexia = {
    id: "yuexia-duzhuo",
    title: "月下獨酌",
    subtitle: "其一",
    author: "李白",
    form: "五古",
    segments: [
      seg("花間一壺酒", "，", "獨酌無相親", "。"),
      seg("舉杯邀明月", "，", "對影成三人", "。"),
      seg("月既不解飲", "，", "影徒隨我身", "。"),
      seg("暫伴月將影", "，", "行樂須及春", "。"),
      seg("我歌月徘徊", "，", "我舞影零亂", "。"),
      seg("醒時同交歡", "，", "醉後各分散", "。"),
      seg("永結無情遊", "，", "相期邈雲漢", "。"),
    ],
  };

  const denglou = {
    id: "denglou",
    title: "登樓",
    author: "杜甫",
    form: "七律",
    segments: [
      seg("花近高樓傷客心", "，", "萬方多難此登臨", "。"),
      seg("錦江春色來天地", "，", "玉壘浮雲變古今", "。"),
      seg("北極朝廷終不改", "，", "西山寇盜莫相侵", "。"),
      seg("可憐後主還祠廟", "，", "日暮聊為梁甫吟", "。"),
    ],
  };

  const niannu = {
    id: "niannujiao",
    title: "念奴嬌",
    subtitle: "赤壁懷古",
    author: "蘇軾",
    form: "詞",
    segments: [
      seg("大江東去，浪淘盡", "，", "千古風流人物", "。"),
      seg("亂石穿空，驚濤拍岸", "，", "捲起千堆雪", "。"),
      seg("江山如畫", "，", "一時多少豪傑", "。"),
      seg("羽扇綸巾，談笑間", "，", "檣櫓灰飛煙滅", "。"),
      seg("人生如夢", "，", "一尊還酹江月", "。"),
    ],
  };

  const shengsheng = {
    id: "shengshengman",
    title: "聲聲慢",
    subtitle: "秋情",
    author: "李清照",
    form: "詞",
    segments: [
      seg("尋尋覓覓，冷冷清清", "，", "悽悽慘慘戚戚", "。"),
      seg("三杯兩盞淡酒", "，", "怎敵他晚來風急", "？"),
      seg("雁過也", "，", "正傷心，卻是舊時相識", "。"),
      seg("梧桐更兼細雨", "，", "到黃昏、點點滴滴", "。"),
      seg("這次第", "，", "怎一箇愁字了得", "！"),
    ],
  };

  const qingyu = {
    id: "qingyuan",
    title: "青玉案",
    subtitle: "元夕",
    author: "辛棄疾",
    form: "詞",
    segments: [
      seg("東風夜放花千樹", "，", "更吹落、星如雨", "。"),
      seg("寶馬雕車香滿路", "。", "鳳簫聲動", "，"),
      seg("玉壺光轉", "，", "一夜魚龍舞", "。"),
      seg("蛾兒雪柳黃金縷", "，", "笑語盈盈暗香去", "。"),
      seg("眾裏尋他千百度", "。", "驀然回首", "，"),
      seg("那人卻在", "，", "燈火闌珊處", "。"),
    ],
  };

  const CURRICULUM = [
    { id: "c01", no: "壹", title: "論仁、論孝、論君子", subtitle: "《論語》", works: [lunyu] },
    { id: "c02", no: "貳", title: "魚我所欲也", subtitle: "《孟子》", works: [yuwo] },
    { id: "c03", no: "參", title: "逍遙遊", subtitle: "《莊子》節錄", works: [xiaoyao] },
    { id: "c04", no: "肆", title: "勸學", subtitle: "《荀子》節錄", works: [quanxue] },
    { id: "c05", no: "伍", title: "廉頗藺相如列傳", subtitle: "司馬遷", works: [lianpo] },
    { id: "c06", no: "陸", title: "出師表", subtitle: "諸葛亮", works: [chushi] },
    { id: "c07", no: "柒", title: "師說", subtitle: "韓愈", works: [shishuo] },
    { id: "c08", no: "捌", title: "始得西山宴遊記", subtitle: "柳宗元", works: [xishan] },
    { id: "c09", no: "玖", title: "岳陽樓記", subtitle: "范仲淹", works: [yueyang] },
    { id: "c10", no: "拾", title: "六國論", subtitle: "蘇洵", works: [liuguo] },
    {
      id: "c11",
      no: "拾壹",
      title: "唐詩三首",
      subtitle: "王維 · 李白 · 杜甫",
      works: [shanju, yuexia, denglou],
    },
    {
      id: "c12",
      no: "拾貳",
      title: "詞三首",
      subtitle: "蘇軾 · 李清照 · 辛棄疾",
      works: [niannu, shengsheng, qingyu],
    },
  ];

  function allWorks() {
    const out = [];
    CURRICULUM.forEach(function (col) {
      col.works.forEach(function (work) {
        out.push({ collection: col, work: work });
      });
    });
    return out;
  }

  function findWork(workId) {
    return (
      allWorks().find(function (entry) {
        return entry.work.id === workId;
      }) || null
    );
  }

  function segmentChars(segment) {
    return Array.from(segment.lines.join(""));
  }

  function segmentText(segment) {
    let out = "";
    segment.lines.forEach(function (line, i) {
      out += line + (segment.puncts[i] || "");
    });
    return out;
  }

  function workChars(work) {
    const out = [];
    work.segments.forEach(function (segment) {
      segmentChars(segment).forEach(function (ch) {
        out.push(ch);
      });
    });
    return out;
  }

  function workLabel(work) {
    const inner = work.title + (work.subtitle ? "・" + work.subtitle : "");
    return work.form === "詞" || work.form === "五律" || work.form === "七律" || work.form === "五古"
      ? "〈" + inner + "〉"
      : "《" + inner + "》";
  }

  global.FanwenData = {
    CURRICULUM: CURRICULUM,
    allWorks: allWorks,
    findWork: findWork,
    segmentChars: segmentChars,
    segmentText: segmentText,
    workChars: workChars,
    workLabel: workLabel,
  };
})(window);

// =====================================================================
// TAKTİK TESTLERİ — oyuncunun bota öğrettiği taktikler.
// Oyun sayfası açıkken (localhost) tarayıcı konsolunda çalıştırılır.
// Her değişiklikten sonra HEPSİ geçmeli. Yeni öğretilen her taktik buraya eklenir.
// Her test 40 kez çalışır (botlarda rastgelelik olduğu için her seferinde doğru olmalı).
// =====================================================================
(() => {
  // Testler her zaman ZOR botlarla çalışır (öğretilen taktikler zor botlarda)
  const eskiZorluk = state.difficulty, eskiMod = state.mode;
  state.difficulty = 'zor';
  state.mode = 'esli';   // taktik senaryoları eşli oyun için kurulu
  const P = s => s.split(' ').filter(Boolean).map(t => ({ suit: t[0], rank: ({ A: 14, K: 13, Q: 12, J: 11 })[t.slice(1)] || Number(t.slice(1)) }));
  // Verilen elleri kur; elde olmayan kartlar oynanmış sayılır. trick: yerdeki kartlar [oturma, kart]
  // fill: true ise kalan kartlar, eli 13'ten az olan oyunculara sırayla dağıtılır (yerdeki kartlar hariç)
  const scene = ({ hands, contract, trick = [], won = [0, 0, 0, 0], scores = [0, 0], fill = false, size = 13 }) => {
    state.hands = [0, 1, 2, 3].map(s => P(hands[s] || ''));
    if (fill) {
      const used = new Set([...state.hands.flat().map(keyOf), ...trick.map(([, c]) => keyOf(P(c)[0]))]);
      const rest = [];
      for (const su of SUIT_ORDER) for (let r = 2; r <= 14; r++) if (!used.has(su + r)) rest.push({ suit: su, rank: r });
      for (let s = 0; s < 4; s++) {
        const need = size - state.hands[s].length - (trick.some(([p]) => p === s) ? 1 : 0);
        for (let i = 0; i < need && rest.length; i++) state.hands[s].push(rest.shift());
      }
    }
    state.hands = state.hands.map(sortHand);
    state.contract = contract;
    state.open = [false, false, false, false];
    state.open[partnerOf(contract.seat)] = true;
    const inHand = new Set(state.hands.flat().map(keyOf));
    const tr = trick.map(([seat, c]) => ({ seat, card: P(c)[0] }));
    state.played = new Set();
    for (const su of SUIT_ORDER) for (let r = 2; r <= 14; r++) if (!inHand.has(su + r)) state.played.add(su + r);
    state.play = { trick: [], trickNo: 0, won, know: newKnowledge() };
    state.scores = scores;
    for (const t of tr) { observe(t.seat, t.card, state.play.trick); state.play.trick.push(t); }
  };
  const bidScene = (scores) => {
    state.scores = scores;
    state.hands = [[], [], [], []];
    newDeck().forEach((c, j) => state.hands[j % 4].push(c));
    state.bid = { opener: 1, high: 0, highSeat: -1, passed: [false, false, false, false], bidders: [false, false, false, false] };
  };

  // Oturma: 0 = sen (alt), 1 = sağ, 2 = eşin (üst), 3 = sol
  const TESTS = [
    {
      ad: 'Batma sınırında risk al: yerde ♠A ♠Q, ♠K soldaki rakipte olabilir → ♠Q oyna',
      kur: () => scene({ contract: { seat: 3, bid: 7, trump: 'H' }, won: [4, 2, 2, 1],
        hands: { 0: 'SK DA DK', 1: 'SA SQ C2 C3', 2: 'S5 CA CK DQ', 3: 'D7 D8 D9' }, trick: [[3, 'S4'], [0, 'S10']] }),
      oynayan: 1, dogru: k => k === 'S12',
    },
    {
      ad: 'Batma tehlikesi yoksa garanti oyna: aynı durumda ♠A',
      kur: () => scene({ contract: { seat: 3, bid: 7, trump: 'H' }, won: [1, 5, 1, 1],
        hands: { 0: 'SK DA DK', 1: 'SA SQ C2 C3', 2: 'S5 CA CK DQ', 3: 'D7 D8 D9' }, trick: [[3, 'S4'], [0, 'S10']] }),
      oynayan: 1, dogru: k => k === 'S14',
    },
    {
      ad: 'Kaçarken rakibin kartını durduran kartı sakla: ♦Q tut (bende ♦10 var), işe yaramayan ♣A at',
      kur: () => scene({ contract: { seat: 0, bid: 8, trump: 'S' }, won: [8, 1, 1, 1],
        hands: { 0: 'D10', 1: 'DQ CA', 2: 'H5 H6', 3: 'H7 H8' }, trick: [[0, 'S2']] }),
      oynayan: 1, dogru: k => k === 'C14',
    },
    {
      ad: 'K–A çakışması: eşimde (açık el) ♣A varken ♣K açma, küçük sinekle eşine aldır',
      kur: () => scene({ contract: { seat: 1, bid: 8, trump: 'S' }, won: [0, 4, 0, 0],
        hands: { 1: 'CK C4 C3 S9 S8', 3: 'CA C2 S7 S6 S5', 0: 'CQ CJ D4 D5 D6', 2: 'C10 C9 H4 H5 H6' } }),
      oynayan: 1, dogru: k => k === 'C3' || k === 'C4',
    },
    {
      ad: 'K–A çakışması (devamı): ♣A çıktıktan sonra açık elden küçük sinek gelince ♣K ile al',
      kur: () => scene({ contract: { seat: 1, bid: 8, trump: 'S' }, won: [0, 4, 0, 0],
        hands: { 1: 'CK C4 S9 S8', 3: 'C2 S7 S6 S5', 0: 'D2 D3 D4 C5', 2: 'H2 H3 H4 C6' }, trick: [[3, 'C2'], [0, 'C5']] }),
      oynayan: 1, dogru: k => k === 'C13',
    },
    {
      ad: 'Savunmada batırmak kesin değilse alır kartı (♥A) hemen çekme, rakipte yakalanacak büyük kart var',
      kur: () => scene({ contract: { seat: 0, bid: 9, trump: 'S' }, won: [2, 0, 1, 0],
        hands: { 1: 'HA D7 D8 C9 C8 C7 S3 S4 D9 C10', 0: 'SA SK SQ SJ D2 D3 C2 C3 H2 H3', 2: 'S10 S9 D4 D5 D6 C4 C5 C6 H4 H5', 3: 'HK HQ HJ H10 DA DK DQ DJ CA CK' } }),
      oynayan: 1, dogru: k => k !== 'H14',
    },
    {
      ad: 'Savunmada batırmak kesinse alır kartları hemen çek',
      kur: () => scene({ contract: { seat: 0, bid: 9, trump: 'S' }, won: [2, 2, 1, 3],
        hands: { 1: 'HA DA D8 C9 S3', 0: 'SA SK D2 C2 H2', 2: 'S10 D4 C4 C5 H4', 3: 'HK HQ DK CA CK' } }),
      oynayan: 1, dogru: k => k === 'D14' || k === 'H14',
    },
    {
      ad: 'Kozla kesme: bende 3 küçük sinek, açık elde 1 sinek ve kozlar var → önce sinek oyna',
      kur: () => scene({ contract: { seat: 1, bid: 8, trump: 'S' },
        hands: { 1: 'C2 C3 C4 SA SK SQ DA DK DQ HA HK HQ H2', 3: 'C9 SJ S10 S9 S8 D2 D3 D4 D5 H3 H4 H5 H6', 0: 'CA CK CQ CJ C10 C8 S7 S6 D6 D7 D8 D9 H7', 2: 'C7 C6 C5 S5 S4 S3 S2 D10 DJ H8 H9 H10 HJ' } }),
      oynayan: 1, dogru: k => k[0] === 'C',
    },
    {
      ad: 'Kozla kesme (devamı): açık elde sinek bitti → sinek açıp kozla al',
      kur: () => scene({ contract: { seat: 1, bid: 8, trump: 'S' }, won: [0, 1, 0, 0],
        hands: { 1: 'C2 C3 SA SK SQ DA DK DQ HA HK HQ H2', 3: 'SJ S10 S9 S8 D2 D3 D4 D5 H3 H4 H5 H6', 0: 'CA CK CQ CJ C10 S7 S6 D6 D7 D8 D9 H7', 2: 'C7 C6 C5 S5 S4 S3 S2 D10 DJ H8 H9 H10' } }),
      oynayan: 1, dogru: k => k[0] === 'C',
    },
    {
      ad: 'Kozla kesme (açık el uzun): ihaleyi alanda tek küçük sinek, açık elde ♣A ve 5 sinek → önce ♣A oyna',
      kur: () => scene({ contract: { seat: 3, bid: 9, trump: 'S' }, fill: true,
        hands: { 1: 'CA C9 C8 C7 C6 C5 D2 D3 D4 H2 H3 H4 S2', 3: 'C3 SA SK SQ SJ S10 D5 D6 D7 H5 H6 H7 H8' } }),
      oynayan: 1, dogru: k => k === 'C14',
    },
    {
      ad: 'Kozla kesme (açık el uzun, devamı): ♣A çıktı, ihaleyi alanda sinek kalmadı → küçük sinek aç, kozla kes',
      kur: () => scene({ contract: { seat: 3, bid: 9, trump: 'S' }, won: [0, 1, 0, 0], fill: true, size: 12,
        hands: { 1: 'C9 C8 C7 C6 C5 D2 D3 D4 H2 H3 H4 S2', 3: 'SA SK SQ SJ S10 D5 D6 D7 H5 H6 H7 H8', 0: 'CK', 2: 'C4' } }),
      oynayan: 1, dogru: k => k[0] === 'C',
    },
    {
      ad: 'En ucuz kartla al: yerde ♥3 ♥5 ♥10, son oyuncuda ♥J ♥A (♥Q ♥K dışarıda) → ♥J',
      kur: () => scene({ contract: { seat: 1, bid: 8, trump: 'S' }, fill: true,
        hands: { 3: 'HJ HA C2 C3 C4 C5 C6 D2 D3 D4 D5 D6 D7', 0: 'HK', 2: 'HQ' }, trick: [[0, 'H3'], [1, 'H5'], [2, 'H10']] }),
      oynayan: 3, dogru: k => k === 'H11',
    },
    {
      ad: 'As–papaz: eşimde ♣A, açık rakipte (Sağ) ♣K ve küçük kart → eşim ası açmaz',
      kur: () => scene({ contract: { seat: 3, bid: 8, trump: 'S' },
        hands: { 2: 'CA C9 D9 D8 D7 H9 H8 H7 S3 S4 S5 S6 S7', 1: 'CK C4 D2 D3 D4 H2 H3 H4 S2 SJ D5 D6 H5', 0: 'C5 C2 C3 D10 DJ DQ DK DA HA HK HQ HJ H10', 3: 'C6 C7 C8 C10 CJ CQ S8 S9 S10 SQ SK SA' } }),
      oynayan: 2, dogru: k => k !== 'C14',
    },
    {
      ad: 'As–papaz (devamı): ben ♣5 açınca açık el ♣K atmak zorunda, eşim ♣A ile alır',
      kur: () => scene({ contract: { seat: 3, bid: 8, trump: 'S' },
        hands: { 0: 'C2 C3 D10 DJ DQ DK DA HA HK HQ HJ H10', 2: 'CA C9 D9 D8 D7 H9 H8 H7 S3 S4 S5 S6 S7', 1: 'C4 D2 D3 D4 H2 H3 H4 S2 SJ D5 D6 H5', 3: 'C6 C7 C8 C10 CJ CQ S8 S9 S10 SQ SK SA' },
        trick: [[0, 'C5'], [1, 'CK']] }),
      oynayan: 2, dogru: k => k === 'C14',
    },
    {
      ad: 'Dürtme: açık rakipte (Sol) ♦K ♦Q var → eşim küçük karo açar',
      kur: () => scene({ contract: { seat: 1, bid: 8, trump: 'S' }, fill: true,
        hands: { 2: 'D3 D7 C9 C8 C7 H9 H8 H7 S3 S4 C2 C3 H2', 3: 'DK DQ C4 C5 C6 H3 H4 H5 S2 S5 S6 S7 S8' } }),
      oynayan: 2, dogru: k => k === 'D3' || k === 'D7',
    },
    {
      ad: 'Kart sayma: 8 kupa çıktı, kalan kupalar bizde → rakipte kupa yok, önce kozları çek',
      kur: () => scene({ contract: { seat: 2, bid: 9, trump: 'S' },
        hands: { 2: 'HA HK HQ SA SK SQ S9 C10 CJ', 0: 'HJ H10 S8 S7 CQ CK CA D6 D7', 1: 'S2 S3 S4 S5 C6 C7 C8 C9 D8', 3: 'S6 S10 SJ D9 D10 DJ DQ DK DA' } }),
      oynayan: 2, dogru: k => k[0] === 'S',
    },
  ];

  const sonuc = [];
  let hepsi = true;
  for (const t of TESTS) {
    let dogru = 0;
    const goruldu = new Set();
    for (let i = 0; i < 40; i++) {
      t.kur();
      const k = keyOf(botChoose(t.oynayan));
      goruldu.add(k);
      if (t.dogru(k)) dogru++;
    }
    if (dogru < 40) hepsi = false;
    sonuc.push(`${dogru === 40 ? '✅' : '❌'} ${dogru}/40  ${t.ad}  [oynanan: ${[...goruldu].join(' ')}]`);
  }

  // ---- Kural testleri: gömmelide koz düşmeden kozla el açılamaz ----
  const kuralTesti = (ad, mode, hand, broken, beklenen) => {
    state.mode = mode;
    state.contract = { seat: 0, bid: 8, trump: 'S' };
    state.play = { trick: [], trickNo: 0, won: [0, 0, 0, 0], know: newKnowledge(), trumpBroken: broken };
    const legal = legalMoves(sortHand(P(hand)), [], 'S').map(keyOf).sort().join(' ');
    const ok = legal === beklenen.split(' ').sort().join(' ');
    if (!ok) hepsi = false;
    sonuc.push(`${ok ? '✅' : '❌'} ${ad}  [açılabilen: ${legal}]`);
  };
  kuralTesti('Gömmeli: koz düşmeden kozla el açılamaz (koz ♠)', 'gommeli', 'S14 S5 H3 D9', false, 'H3 D9');
  kuralTesti('Gömmeli: elinde sadece koz varsa mecburen kozla açar', 'gommeli', 'S14 S5', false, 'S14 S5');
  kuralTesti('Gömmeli: koz düştükten sonra kozla el açılabilir', 'gommeli', 'S14 S5 H3', true, 'S14 S5 H3');
  kuralTesti('Eşli: koz istendiği zaman açılabilir (kural sadece gömmelide)', 'esli', 'S14 S5 H3', false, 'S14 S5 H3');
  kuralTesti('Tekli: koz istendiği zaman açılabilir (kural sadece gömmelide)', 'tekli', 'S14 S5 H3', false, 'S14 S5 H3');
  state.mode = 'esli';

  // ---- İhale testleri (Sağ = oturma 1, "onlar" takımı = state.scores[1]) ----
  const ihaleTesti = (ad, scores, hand, beklenen) => {
    let gir = 0;
    for (let i = 0; i < 40; i++) {
      state.scores = scores;
      state.hands = [[], sortHand(P(hand)), [], []];
      state.bid = { opener: 1, high: 0, highSeat: -1, passed: [false, false, false, false], bidders: [false, false, false, false] };
      if (botBid(1)) gir++;
    }
    const ok = beklenen ? gir === 40 : gir === 0;
    if (!ok) hepsi = false;
    sonuc.push(`${ok ? '✅' : '❌'} ${beklenen ? gir : 40 - gir}/40  ${ad}`);
  };
  ihaleTesti('Hedefe yakın (46–29), dört renkte de iyi kart → ihaleye girme, savunmada al/batır',
    [29, 46], 'SA SK S5 HA HK H4 DA DQ D3 CK CQ C7 C2', false);
  ihaleTesti('Hedefe yakın (46–29), kozu güçlü ve yanda as var → ihaleye gir',
    [29, 46], 'SA SK SQ SJ S9 S8 HA DA D5 C7 C4 C3 C2', true);

  // Çok öndeyken (30'a −13) ihaleye girme oranı, eşit durumdakinin yarısından az olmalı
  const oran = (scores) => { let n = 0; for (let i = 0; i < 2000; i++) { bidScene(scores); if (botBid(1)) n++; } return n / 2000; };
  const esit = oran([0, 0]), onde = oran([-13, 30]);
  const ondeOk = onde < esit / 2;
  if (!ondeOk) hepsi = false;
  sonuc.push(`${ondeOk ? '✅' : '❌'} Çok öndeyken (30'a −13) ihaleye girme %${(100 * onde).toFixed(1)}, eşitken %${(100 * esit).toFixed(1)} (yarısından az olmalı)`);

  state.scores = [0, 0];
  state.difficulty = eskiZorluk;
  state.mode = eskiMod;
  return { hepsiGecti: hepsi, sonuc };
})();

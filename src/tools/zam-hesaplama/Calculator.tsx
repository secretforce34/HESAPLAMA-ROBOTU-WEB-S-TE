import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { Segmented, NumberField, SelectField, TextField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { enumParam, numParam, readParams } from '../../ui/url';
import {
  brutKarDegisimi,
  eskiFiyatiBul,
  fiyatlandir,
  hacimDengesi,
  hacimSenaryolari,
  validateFiyat,
  validateHacim,
  validateHedef,
  validateUrun,
  validateZamOrani,
  yeniFiyatiBul,
  zamOraniBul,
  type FiyatAyari,
  type Koruma,
} from './calc';

type Mod = 'zam' | 'fiyat' | 'hacim';
type Bul = 'yeni' | 'oran' | 'eski';
type OranSecim = '20' | '10' | '1' | '0' | 'diger';

const KDV_SECENEKLERI: { value: OranSecim; label: string }[] = [
  { value: '20', label: '%20 (genel oran)' },
  { value: '10', label: '%10' },
  { value: '1', label: '%1' },
  { value: '0', label: '%0 (KDV’siz)' },
  { value: 'diger', label: 'Diğer oran…' },
];

/** +%12,5 / −%4 / %0 */
const isaretli = (n: number, d = 2): string => (n > 0 ? `+%${formatNumber(n, d)}` : n < 0 ? `−%${formatNumber(Math.abs(n), d)}` : '%0');

interface Zam {
  id: number;
  oran: number | null;
}
interface Urun {
  id: number;
  ad: string;
  fiyat: number | null;
  maliyet: number | null;
  yeniMaliyet: number | null;
}

export default function Calculator() {
  const sayac = useRef(1);
  const yeniZam = (oran: number | null = null): Zam => ({ id: sayac.current++, oran });
  const yeniUrun = (fiyat: number | null = null, maliyet: number | null = null, yeniMaliyet: number | null = null): Urun => ({
    id: sayac.current++,
    ad: '',
    fiyat,
    maliyet,
    yeniMaliyet,
  });

  const [mod, setMod] = useState<Mod>('zam');

  // A) yüzde zam
  const [bul, setBul] = useState<Bul>('yeni');
  const [eskiF, setEskiF] = useState<number | null>(100);
  const [yeniF, setYeniF] = useState<number | null>(126.5);
  const [zamlar, setZamlar] = useState<Zam[]>(() => [yeniZam(10), yeniZam(15)]);

  // B ve C ortak: KDV
  const [kdvDahil, setKdvDahil] = useState(false);
  const [kdvSecim, setKdvSecim] = useState<OranSecim>('20');
  const [kdvOzel, setKdvOzel] = useState<number | null>(null);

  // B) fiyat
  const [koruma, setKoruma] = useState<Koruma>('oran');
  const [hedef, setHedef] = useState<number | null>(30);
  const [urunler, setUrunler] = useState<Urun[]>(() => [yeniUrun(120, 80, 92)]);

  // C) hacim
  const [hFiyat, setHFiyat] = useState<number | null>(100);
  const [hMaliyet, setHMaliyet] = useState<number | null>(60);
  const [hAdet, setHAdet] = useState<number | null>(1000);
  const [hDegisim, setHDegisim] = useState<number | null>(10);
  const [hBeklenen, setHBeklenen] = useState<number | null>(null);

  useEffect(() => {
    // Paylaşılan bağlantı: ?m=fiyat&a=yeni&ef=100&yf=126.5&z=10,15&fk=1&k=20&kor=oran&hd=30&u=120:80:92&hf=100&hm=60&ha=1000&hc=10&hb=-5
    const p = readParams();
    const m = enumParam(p, 'm', ['zam', 'fiyat', 'hacim'] as const);
    if (m) setMod(m);
    const a = enumParam(p, 'a', ['yeni', 'oran', 'eski'] as const);
    if (a) setBul(a);
    const ef = numParam(p, 'ef');
    if (ef !== null) setEskiF(ef);
    const yf = numParam(p, 'yf');
    if (yf !== null) setYeniF(yf);
    const z = p.get('z');
    if (z) {
      const liste = z
        .split(',')
        .map(Number)
        .filter((n) => Number.isFinite(n))
        .slice(0, 20)
        .map((n) => yeniZam(n));
      if (liste.length > 0) setZamlar(liste);
    }
    if (p.get('fk') === '1') setKdvDahil(true);
    const k = numParam(p, 'k');
    if (k !== null) {
      const secim = (['20', '10', '1', '0'] as const).find((x) => Number(x) === k);
      if (secim) setKdvSecim(secim);
      else {
        setKdvSecim('diger');
        setKdvOzel(k);
      }
    }
    const kor = enumParam(p, 'kor', ['oran', 'kar', 'hedefMarj', 'hedefMarkup'] as const);
    if (kor) setKoruma(kor);
    const hd = numParam(p, 'hd');
    if (hd !== null) setHedef(hd);
    const u = p.get('u');
    if (u) {
      const liste = u
        .split(',')
        .map((part) => part.split(':').map(Number))
        .filter((a3) => a3.length === 3 && a3.every((n) => Number.isFinite(n)))
        .slice(0, 30)
        .map(([f, mal, y]) => yeniUrun(f, mal, y));
      if (liste.length > 0) setUrunler(liste);
    }
    const hf = numParam(p, 'hf');
    if (hf !== null) setHFiyat(hf);
    const hm = numParam(p, 'hm');
    if (hm !== null) setHMaliyet(hm);
    if (p.has('ha')) setHAdet(numParam(p, 'ha'));
    const hc = numParam(p, 'hc');
    if (hc !== null) setHDegisim(hc);
    if (p.has('hb')) setHBeklenen(numParam(p, 'hb'));
  }, []);

  const kdvOrani = kdvSecim === 'diger' ? kdvOzel : Number(kdvSecim);
  const kdvHata = kdvOrani === null || kdvOrani < 0 || kdvOrani > 100 ? 'KDV oranı %0 ile %100 arasında olmalı.' : undefined;

  // ---------------- A ----------------
  const zamHatalari = zamlar.map((z) => validateZamOrani(z.oran));
  const eskiHata = validateFiyat(eskiF, 'Eski fiyat');
  const yeniHata = validateFiyat(yeniF, 'Yeni fiyat');
  const zamGecerli =
    (bul === 'oran' || zamHatalari.every((h) => !h)) &&
    (bul === 'yeni' ? !eskiHata : bul === 'eski' ? !yeniHata : !eskiHata && !yeniHata);

  const zamSonuc = useMemo(() => {
    if (mod !== 'zam' || !zamGecerli) return null;
    const oranlar = zamlar.map((z) => z.oran!);
    if (bul === 'yeni') return yeniFiyatiBul(eskiF!, oranlar);
    if (bul === 'eski') return eskiFiyatiBul(yeniF!, oranlar);
    return zamOraniBul(eskiF!, yeniF!);
  }, [mod, zamGecerli, bul, eskiF, yeniF, zamlar]);

  // ---------------- B ----------------
  const ayar: FiyatAyari = { koruma, hedef, kdvOrani: kdvOrani ?? 0, fiyatKdvDahil: kdvDahil };
  const hedefHata = validateHedef(koruma, hedef);
  const urunHatalari = urunler.map((u) => validateUrun(u, ayar));
  const fiyatGecerli = !kdvHata && !hedefHata && urunHatalari.every((e) => Object.keys(e).length === 0);

  const urunSonuclari = useMemo(() => {
    if (mod !== 'fiyat' || !fiyatGecerli) return null;
    return urunler.map((u) => fiyatlandir({ ad: u.ad, fiyat: u.fiyat!, maliyet: u.maliyet!, yeniMaliyet: u.yeniMaliyet! }, ayar));
  }, [mod, fiyatGecerli, urunler, koruma, hedef, kdvOrani, kdvDahil]);

  // ---------------- C ----------------
  const hHatalar = validateHacim({ fiyat: hFiyat, maliyet: hMaliyet, degisim: hDegisim });
  // KDV dahil fiyat girildiyse katkı hesabı KDV hariç fiyatla yapılır (KDV devlete gider)
  const hHaric = hFiyat !== null && kdvDahil ? hFiyat / (1 + (kdvOrani ?? 0) / 100) : hFiyat;
  const hHatalar2 = validateHacim({ fiyat: hHaric, maliyet: hMaliyet, degisim: hDegisim });
  const hacimGecerli = !kdvHata && !hHatalar.fiyat && !hHatalar2.maliyet && !hHatalar.degisim;

  const hacimSonuc = useMemo(() => {
    if (mod !== 'hacim' || !hacimGecerli || hHaric === null) return null;
    const d = hDegisim!;
    const ana = hacimDengesi(hHaric, hMaliyet!, d);
    const adimlar = [...new Set([-20, -10, -5, 5, 10, 15, 20, 30, d])].sort((a, b) => a - b).filter((x) => x !== 0);
    const senaryo = hacimSenaryolari(hHaric, hMaliyet!, adimlar);
    const beklenen =
      hAdet !== null && hAdet > 0 && hBeklenen !== null && Number.isFinite(hBeklenen) && hBeklenen > -100
        ? brutKarDegisimi(hHaric, hMaliyet!, hAdet, d, hBeklenen)
        : null;
    return { ana, senaryo, beklenen };
  }, [mod, hacimGecerli, hHaric, hMaliyet, hDegisim, hAdet, hBeklenen]);

  const guncelleZam = (id: number, oran: number | null) => setZamlar((l) => l.map((z) => (z.id === id ? { ...z, oran } : z)));
  const silZam = (id: number) => setZamlar((l) => (l.length > 1 ? l.filter((z) => z.id !== id) : l));
  const guncelleUrun = (id: number, patch: Partial<Urun>) => setUrunler((l) => l.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  const silUrun = (id: number) => setUrunler((l) => (l.length > 1 ? l.filter((u) => u.id !== id) : l));

  const fiyatTuru = kdvDahil ? 'KDV dahil' : 'KDV hariç';

  const kdvAlanlari = (
    <>
      <Segmented
        name="zam-kdv-tur"
        label="Fiyatlarınız"
        value={kdvDahil ? 'dahil' : 'haric'}
        onChange={(v) => setKdvDahil(v === 'dahil')}
        options={[
          { value: 'haric', label: 'KDV hariç' },
          { value: 'dahil', label: 'KDV dahil' },
        ]}
        hint="Maliyetler her zaman KDV hariç girilir; yalnızca satış fiyatı KDV dahil olabilir."
      />
      <div class="row-2">
        <SelectField id="zam-kdv" label="KDV oranı" value={kdvSecim} onChange={setKdvSecim} options={KDV_SECENEKLERI} />
        {kdvSecim === 'diger' && (
          <NumberField id="zam-kdv-ozel" label="Özel KDV oranı" value={kdvOzel} onChange={setKdvOzel} suffix="%" error={kdvHata} />
        )}
      </div>
    </>
  );

  // ---------------- Çıktı metni ----------------
  let ozet = '';
  if (mod === 'zam' && zamSonuc) {
    ozet = [`Eski fiyat: ${formatTL(zamSonuc.eski)}`, `Yeni fiyat: ${formatTL(zamSonuc.yeni)}`, `Toplam zam: ${isaretli(zamSonuc.toplamOran)}`].join('\n');
  } else if (mod === 'fiyat' && urunSonuclari) {
    ozet = urunSonuclari
      .map((u, i) => `${u.ad || `Ürün ${i + 1}`}: ${formatTL(u.eskiFiyat)} → ${formatTL(u.yeniFiyat)} (${isaretli(u.zam)}), yeni marj ${formatPercent(u.yeniMarj, 1)}`)
      .join('\n');
  } else if (mod === 'hacim' && hacimSonuc) {
    const a = hacimSonuc.ana;
    ozet = a.mumkun
      ? `Fiyat ${isaretli(hDegisim ?? 0)}: brüt kârı korumak için satış adedi ${isaretli(a.adetDegisimi)} olmalı.`
      : 'Yeni fiyat birim maliyetin altında kalıyor.';
  }

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="zam-mod"
          label="Ne hesaplamak istiyorsunuz?"
          value={mod}
          onChange={setMod}
          options={[
            { value: 'zam', label: 'Yüzde zam' },
            { value: 'fiyat', label: 'Maliyet artışı → fiyat' },
            { value: 'hacim', label: 'Zamda satış kaybı' },
          ]}
        />

        {mod === 'zam' && (
          <>
            <Segmented
              name="zam-bul"
              label="Neyi bulalım?"
              value={bul}
              onChange={setBul}
              options={[
                { value: 'yeni', label: 'Yeni fiyat' },
                { value: 'oran', label: 'Zam oranı' },
                { value: 'eski', label: 'Eski fiyat' },
              ]}
            />
            {bul !== 'eski' && (
              <NumberField id="zam-eski" label="Eski fiyat" value={eskiF} onChange={setEskiF} suffix="TL" error={eskiHata} placeholder="ör. 100" />
            )}
            {bul !== 'yeni' && (
              <NumberField
                id="zam-yeni"
                label={bul === 'oran' ? 'Yeni fiyat' : 'Zamlı (yeni) fiyat'}
                value={yeniF}
                onChange={setYeniF}
                suffix="TL"
                error={yeniHata}
                placeholder="ör. 126,50"
              />
            )}
            {bul !== 'oran' && (
              <div class="field">
                <span class="field__label">{zamlar.length > 1 ? 'Ardışık zamlar (sırayla uygulanır)' : 'Zam oranı'}</span>
                <ul class="line-items">
                  {zamlar.map((z, i) => (
                    <li class="line-item" key={z.id}>
                      <div class="line-item__head">
                        <span>{i + 1}. zam</span>
                        {zamlar.length > 1 && (
                          <button type="button" class="line-item__remove" onClick={() => silZam(z.id)} aria-label={`${i + 1}. zammı sil`}>
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                              <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <NumberField
                        id={`zam-oran-${z.id}`}
                        label="Zam oranı (indirim için eksi yazın)"
                        value={z.oran}
                        onChange={(v) => guncelleZam(z.id, v)}
                        suffix="%"
                        placeholder="ör. 10"
                        error={zamHatalari[i]}
                      />
                    </li>
                  ))}
                </ul>
                <button type="button" class="btn btn--small add-row" onClick={() => setZamlar((l) => [...l, yeniZam(null)])}>
                  + Zam ekle
                </button>
              </div>
            )}
          </>
        )}

        {mod === 'fiyat' && (
          <>
            {kdvAlanlari}
            <Segmented
              name="zam-koruma"
              label="Neyi korumak istiyorsunuz?"
              value={koruma}
              onChange={setKoruma}
              options={[
                { value: 'oran', label: 'Kâr oranı (marj)' },
                { value: 'kar', label: 'Kâr tutarı (TL)' },
                { value: 'hedefMarj', label: 'Hedef marj' },
                { value: 'hedefMarkup', label: 'Hedef markup' },
              ]}
              hint={
                koruma === 'oran'
                  ? 'Mevcut kâr oranı sabit kalır. Marj da markup da sabit kaldığı için ikisi aynı fiyatı verir.'
                  : koruma === 'kar'
                    ? 'Birim başına kâr tutarı (TL) sabit kalır; kâr oranı düşer.'
                    : koruma === 'hedefMarj'
                      ? 'Marj, kârın satış fiyatındaki payıdır: kâr ÷ satış fiyatı.'
                      : 'Markup, kârın maliyete oranıdır: kâr ÷ maliyet.'
              }
            />
            {(koruma === 'hedefMarj' || koruma === 'hedefMarkup') && (
              <NumberField
                id="zam-hedef"
                label={koruma === 'hedefMarj' ? 'Hedef marj' : 'Hedef markup'}
                value={hedef}
                onChange={setHedef}
                suffix="%"
                error={hedefHata}
                placeholder="ör. 30"
              />
            )}

            <div class="field">
              <span class="field__label">Ürünler</span>
              <ul class="line-items">
                {urunler.map((u, i) => (
                  <li class="line-item" key={u.id}>
                    <div class="line-item__head">
                      <span>Ürün {i + 1}</span>
                      {urunler.length > 1 && (
                        <button type="button" class="line-item__remove" onClick={() => silUrun(u.id)} aria-label={`Ürün ${i + 1}’i sil`}>
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <TextField
                      id={`zam-urun-ad-${u.id}`}
                      label="Ürün adı (isteğe bağlı)"
                      value={u.ad}
                      onChange={(v) => guncelleUrun(u.id, { ad: v })}
                      placeholder="ör. Ürün A"
                    />
                    <div class="row-2">
                      <NumberField
                        id={`zam-fiyat-${u.id}`}
                        label={`Mevcut satış fiyatı (${fiyatTuru})`}
                        value={u.fiyat}
                        onChange={(v) => guncelleUrun(u.id, { fiyat: v })}
                        suffix="TL"
                        error={urunHatalari[i].fiyat}
                      />
                      <NumberField
                        id={`zam-maliyet-${u.id}`}
                        label="Mevcut maliyet (KDV hariç)"
                        value={u.maliyet}
                        onChange={(v) => guncelleUrun(u.id, { maliyet: v })}
                        suffix="TL"
                        error={urunHatalari[i].maliyet}
                      />
                    </div>
                    <NumberField
                      id={`zam-yeni-maliyet-${u.id}`}
                      label="Yeni maliyet (KDV hariç)"
                      value={u.yeniMaliyet}
                      onChange={(v) => guncelleUrun(u.id, { yeniMaliyet: v })}
                      suffix="TL"
                      error={urunHatalari[i].yeniMaliyet}
                      hint={
                        u.maliyet && u.yeniMaliyet && u.maliyet > 0
                          ? `Maliyet değişimi: ${isaretli((u.yeniMaliyet / u.maliyet - 1) * 100, 1)}`
                          : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
              <button type="button" class="btn btn--small add-row" onClick={() => setUrunler((l) => [...l, yeniUrun(null, null, null)])}>
                + Ürün ekle
              </button>
            </div>
          </>
        )}

        {mod === 'hacim' && (
          <>
            {kdvAlanlari}
            <div class="row-2">
              <NumberField
                id="zam-h-fiyat"
                label={`Mevcut satış fiyatı (${fiyatTuru})`}
                value={hFiyat}
                onChange={setHFiyat}
                suffix="TL"
                error={hHatalar.fiyat}
              />
              <NumberField
                id="zam-h-maliyet"
                label="Birim değişken maliyet (KDV hariç)"
                value={hMaliyet}
                onChange={setHMaliyet}
                suffix="TL"
                error={hHatalar2.maliyet}
                hint="Satılan her birim için değişen maliyet: mal bedeli, ambalaj, komisyon gibi."
              />
            </div>
            <NumberField
              id="zam-h-degisim"
              label="Fiyat değişimi (zam için artı, indirim için eksi)"
              value={hDegisim}
              onChange={setHDegisim}
              suffix="%"
              error={hHatalar.degisim}
              placeholder="ör. 10 ya da -10"
            />
            <div class="row-2">
              <NumberField
                id="zam-h-adet"
                label="Dönemlik satış adedi (isteğe bağlı)"
                value={hAdet}
                onChange={setHAdet}
                suffix="adet"
                decimals={0}
                inputMode="numeric"
                hint="Girerseniz sonuçlar adet olarak da gösterilir."
              />
              <NumberField
                id="zam-h-beklenen"
                label="Beklediğiniz satış değişimi (isteğe bağlı)"
                value={hBeklenen}
                onChange={setHBeklenen}
                suffix="%"
                hint="Kendi tahmininizi yazın; brüt kâra etkisini görün."
              />
            </div>
          </>
        )}
      </div>

      <div class="calc-results">
        {mod === 'zam' && zamSonuc && (
          <>
            <ResultHero
              label={bul === 'yeni' ? 'Yeni (zamlı) fiyat' : bul === 'eski' ? 'Eski fiyat' : 'Zam oranı'}
              value={bul === 'oran' ? isaretli(zamSonuc.toplamOran) : formatTL(bul === 'eski' ? zamSonuc.eski : zamSonuc.yeni)}
              sub={
                <>
                  {formatTL(zamSonuc.eski)} → {formatTL(zamSonuc.yeni)}, fark <strong>{formatTL(zamSonuc.fark)}</strong>
                  {bul !== 'oran' && zamlar.length > 1 && (
                    <>
                      {' '}
                      · toplam zam <strong>{isaretli(zamSonuc.toplamOran)}</strong>
                    </>
                  )}
                </>
              }
            />
            {bul !== 'oran' && zamlar.length > 1 && (
              <>
                <DataTable
                  caption="Adım adım fiyat"
                  columns={[
                    { key: 'adim', label: 'Adım' },
                    { key: 'oran', label: 'Zam' },
                    { key: 'fiyat', label: 'Fiyat' },
                  ]}
                  rows={[
                    { adim: 'Başlangıç', oran: '', fiyat: formatTL(zamSonuc.eski) },
                    ...zamSonuc.adimlar.map((a, i) => ({ adim: `${i + 1}. zam`, oran: isaretli(a.oran), fiyat: formatTL(a.fiyat) })),
                  ]}
                />
                <Callout kind="info">
                  <strong>Zamlar toplanmaz, birbirinin üzerine biner.</strong> Oranları düz toplarsanız {isaretli(zamSonuc.duzToplam)} bulursunuz;
                  doğrusu, her zammın bir öncekinden sonraki fiyata uygulandığı bileşik hesapla{' '}
                  <strong>{isaretli(zamSonuc.toplamOran)}</strong>’dir.
                </Callout>
              </>
            )}
            {zamSonuc.toplamOran > 0 && (
              <Callout kind="info">
                Zamdan sonra eski fiyata dönmek için <strong>%{formatNumber(zamSonuc.geriDonusIndirimi, 2)}</strong> indirim gerekir; indirim oranı zam
                oranıyla aynı değildir, çünkü indirim daha büyük olan yeni fiyat üzerinden uygulanır.
              </Callout>
            )}
            <ShareBar
              params={{
                m: 'zam',
                a: bul,
                ef: bul === 'eski' ? null : eskiF,
                yf: bul === 'yeni' ? null : yeniF,
                z: bul === 'oran' ? null : zamlar.map((z) => z.oran).join(','),
              }}
              summary={ozet}
            />
          </>
        )}

        {mod === 'fiyat' && urunSonuclari && (
          <>
            {urunSonuclari.length === 1 ? (
              <ResultHero
                label={`Yeni satış fiyatı (${fiyatTuru})`}
                value={formatTL(urunSonuclari[0].yeniFiyat)}
                sub={
                  <>
                    {formatTL(urunSonuclari[0].eskiFiyat)} → {formatTL(urunSonuclari[0].yeniFiyat)} (<strong>{isaretli(urunSonuclari[0].zam)}</strong>) · yeni marj{' '}
                    {formatPercent(urunSonuclari[0].yeniMarj, 1)}
                  </>
                }
              />
            ) : (
              (() => {
                const eski = urunSonuclari.reduce((t, u) => t + u.eskiFiyat, 0);
                const yeni = urunSonuclari.reduce((t, u) => t + u.yeniFiyat, 0);
                return (
                  <ResultHero
                    label="Toplam fiyat artışı (fiyatlar toplamına göre)"
                    value={isaretli(eski > 0 ? (yeni / eski - 1) * 100 : 0)}
                    sub={<>{urunSonuclari.length} ürün · {fiyatTuru} fiyatlar toplamı {formatTL(eski)} → {formatTL(yeni)}</>}
                  />
                );
              })()
            )}

            <DataTable
              caption={`Yeni fiyatlar (${fiyatTuru})`}
              columns={[
                { key: 'ad', label: 'Ürün' },
                { key: 'eski', label: 'Mevcut' },
                { key: 'yeni', label: 'Yeni' },
                { key: 'zam', label: 'Fiyat artışı' },
                { key: 'mal', label: 'Maliyet artışı' },
                { key: 'marj', label: 'Marj (önce → sonra)' },
                { key: 'kar', label: 'Birim kâr (önce → sonra)' },
              ]}
              rows={urunSonuclari.map((u, i) => ({
                ad: u.ad || `Ürün ${i + 1}`,
                eski: formatTL(u.eskiFiyat),
                yeni: formatTL(u.yeniFiyat),
                zam: isaretli(u.zam),
                mal: isaretli(u.maliyetArtisi),
                marj: `${formatPercent(u.eskiMarj, 1)} → ${formatPercent(u.yeniMarj, 1)}`,
                kar: `${formatTL(u.eskiKar)} → ${formatTL(u.yeniKar)}`,
              }))}
            />

            {kdvDahil && urunSonuclari.length === 1 && (
              <Breakdown
                title="KDV hariç / KDV dahil"
                rows={[
                  { label: 'Yeni fiyat (KDV hariç)', value: formatTL(urunSonuclari[0].yeniFiyatHaric) },
                  { label: `Yeni fiyat (KDV dahil, ${formatPercent(kdvOrani ?? 0)})`, value: formatTL(urunSonuclari[0].yeniFiyatDahil), kind: 'total' },
                ]}
              />
            )}

            <Callout kind="info">
              <strong>Marj ile markup aynı şey değildir.</strong> İlk üründe maliyet {formatTL(urunler[0].maliyet ?? 0)}, KDV hariç satış{' '}
              {formatTL(urunSonuclari[0].eskiFiyatHaric)} iken kâr {formatTL(urunSonuclari[0].eskiKar)}’dir: bu, markup (kâr ÷ maliyet){' '}
              {formatPercent(urunSonuclari[0].eskiMarkup, 1)}, marj (kâr ÷ satış fiyatı) {formatPercent(urunSonuclari[0].eskiMarj, 1)} demektir.
              Yeni maliyet {formatTL(urunler[0].yeniMaliyet ?? 0)} olunca kâr <em>oranını</em> korumak için KDV hariç fiyat{' '}
              {formatTL(urunSonuclari[0].oranKorunursa)}, kâr <em>tutarını</em> korumak için {formatTL(urunSonuclari[0].karKorunursa)} olmalıdır.
            </Callout>

            <ShareBar
              params={{
                m: 'fiyat',
                fk: kdvDahil ? true : null,
                k: kdvOrani,
                kor: koruma,
                hd: koruma === 'hedefMarj' || koruma === 'hedefMarkup' ? hedef : null,
                u: urunler.map((u) => `${u.fiyat}:${u.maliyet}:${u.yeniMaliyet}`).join(','),
              }}
              summary={ozet}
            />
          </>
        )}

        {mod === 'hacim' && hacimSonuc && (
          <>
            {hacimSonuc.ana.mumkun ? (
              <ResultHero
                label={
                  (hDegisim ?? 0) > 0
                    ? 'Brüt kârı korumak için dayanabileceğiniz en fazla satış kaybı'
                    : (hDegisim ?? 0) < 0
                      ? 'Brüt kârı korumak için gereken ek satış'
                      : 'Fiyat değişmiyor'
                }
                value={
                  (hDegisim ?? 0) > 0
                    ? `%${formatNumber(-hacimSonuc.ana.adetDegisimi, 2)}`
                    : (hDegisim ?? 0) < 0
                      ? `%${formatNumber(hacimSonuc.ana.adetDegisimi, 2)}`
                      : '%0'
                }
                sub={
                  <>
                    Fiyat {formatTL(hacimSonuc.ana.eskiFiyat)} → {formatTL(hacimSonuc.ana.yeniFiyat)} · birim katkı {formatTL(hacimSonuc.ana.eskiKatki)} →{' '}
                    <strong>{formatTL(hacimSonuc.ana.yeniKatki)}</strong>
                  </>
                }
              />
            ) : (
              <Callout kind="danger">
                <strong>Yeni fiyat birim maliyetin altında ya da eşit.</strong> Satış adedi ne kadar artarsa artsın birim başına katkı sıfır ya da
                negatif olduğu için brüt kâr korunamaz.
              </Callout>
            )}

            {hacimSonuc.ana.mumkun && (
              <>
                <Breakdown
                  rows={[
                    { label: `Mevcut fiyat (KDV hariç)`, value: formatTL(hacimSonuc.ana.eskiFiyat) },
                    { label: 'Birim değişken maliyet', value: formatTL(hMaliyet ?? 0), kind: 'minus' },
                    { label: 'Mevcut birim katkı', value: formatTL(hacimSonuc.ana.eskiKatki), kind: 'sub' },
                    { label: `Yeni fiyat (KDV hariç, ${isaretli(hDegisim ?? 0)})`, value: formatTL(hacimSonuc.ana.yeniFiyat) },
                    { label: 'Yeni birim katkı', value: formatTL(hacimSonuc.ana.yeniKatki), kind: 'sub' },
                    {
                      label: 'Brüt kârı sabit tutan satış adedi',
                      value: `%${formatNumber(hacimSonuc.ana.gerekenOran * 100, 2)} (${isaretli(hacimSonuc.ana.adetDegisimi)})`,
                      kind: 'total',
                    },
                  ]}
                />

                {hAdet !== null && hAdet > 0 && (
                  <StatGrid
                    items={[
                      { label: 'Mevcut brüt kâr', value: formatTL(hAdet * hacimSonuc.ana.eskiKatki) },
                      { label: 'Mevcut adet', value: formatNumber(hAdet, 0) },
                      {
                        label: (hDegisim ?? 0) >= 0 ? 'Düşebileceği en düşük adet' : 'Ulaşılması gereken adet',
                        value: formatNumber(Math.ceil(hAdet * hacimSonuc.ana.gerekenOran), 0),
                      },
                    ]}
                  />
                )}

                {hacimSonuc.beklenen && (
                  <Callout kind={hacimSonuc.beklenen.fark >= 0 ? 'success' : 'warning'}>
                    <strong>Beklediğiniz satış değişimi {isaretli(hBeklenen ?? 0)} ise</strong> brüt kâr {formatTL(hacimSonuc.beklenen.once)} →{' '}
                    {formatTL(hacimSonuc.beklenen.sonra)} olur ({hacimSonuc.beklenen.fark >= 0 ? '+' : '−'}
                    {formatTL(Math.abs(hacimSonuc.beklenen.fark))}).
                  </Callout>
                )}

                <DataTable
                  caption="Fiyat değişimine göre gereken satış değişimi"
                  columns={[
                    { key: 'd', label: 'Fiyat değişimi' },
                    { key: 'f', label: 'Yeni fiyat' },
                    { key: 'k', label: 'Birim katkı' },
                    { key: 'a', label: 'Gereken satış değişimi' },
                  ]}
                  rows={hacimSonuc.senaryo.map((s) => ({
                    d: isaretli(s.fiyatDegisimi, 1),
                    f: formatTL(s.yeniFiyat),
                    k: s.mumkun ? formatTL(s.yeniKatki) : '–',
                    a: s.mumkun ? isaretli(s.adetDegisimi) : 'Mümkün değil',
                  }))}
                />
              </>
            )}

            <ShareBar
              params={{
                m: 'hacim',
                fk: kdvDahil ? true : null,
                k: kdvOrani,
                hf: hFiyat,
                hm: hMaliyet,
                ha: hAdet,
                hc: hDegisim,
                hb: hBeklenen,
              }}
              summary={ozet}
            />
          </>
        )}

        {((mod === 'zam' && !zamSonuc) || (mod === 'fiyat' && !urunSonuclari) || (mod === 'hacim' && !hacimSonuc)) && (
          <ResultEmpty>Sonucu görmek için gerekli alanlara geçerli değerler girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}

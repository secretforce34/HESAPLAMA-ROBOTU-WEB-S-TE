import { useMemo, useRef, useState } from 'preact/hooks';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { NumberField, SelectField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { ekAlimSonrasi, guncelDurum, hedefIcinLot, hesaplaMaliyet, validateIslem, type IslemTuru } from './calc';

interface Satir {
  id: number;
  tur: IslemTuru;
  lot: number | null;
  fiyat: number | null;
  oran: number | null;
}

const TURLER: { value: IslemTuru; label: string }[] = [
  { value: 'alis', label: 'Alış' },
  { value: 'satis', label: 'Satış' },
  { value: 'bedelsiz', label: 'Bedelsiz / bölünme' },
];

const fiyat4 = (n: number) => `${formatNumber(n, 4, 2)} TL`;

export default function Calculator() {
  const sayac = useRef(3);
  const [satirlar, setSatirlar] = useState<Satir[]>([
    { id: 1, tur: 'alis', lot: 100, fiyat: 42.5, oran: null },
    { id: 2, tur: 'alis', lot: 150, fiyat: 36.8, oran: null },
  ]);
  const [komisyon, setKomisyon] = useState<number | null>(0);
  const [guncel, setGuncel] = useState<number | null>(39);
  const [hedef, setHedef] = useState<number | null>(null);
  const [alisFiyati, setAlisFiyati] = useState<number | null>(null);
  const [ekLot, setEkLot] = useState<number | null>(null);

  const guncelle = (id: number, patch: Partial<Satir>) => setSatirlar((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const hatalar = satirlar.map((s) => validateIslem(s));
  const komisyonHata = komisyon === null || komisyon < 0 || komisyon > 5 ? '0 ile 5 arasında bir oran girin.' : null;
  const gecerli = hatalar.every((h) => Object.keys(h).length === 0) && !komisyonHata;

  const s = useMemo(
    () =>
      gecerli
        ? hesaplaMaliyet(
            satirlar.map((x) => ({ tur: x.tur, lot: x.lot ?? 0, fiyat: x.fiyat ?? 0, oran: x.oran ?? 0 })),
            komisyon!,
          )
        : null,
    [gecerli, satirlar, komisyon],
  );

  const g = s && !s.hata && guncel && guncel > 0 && s.lot > 0 ? guncelDurum(s, guncel, komisyon!) : null;
  const hedefLot = s && !s.hata && hedef && alisFiyati ? hedefIcinLot(s, hedef, alisFiyati, komisyon!) : undefined;
  const ek = s && !s.hata && ekLot && alisFiyati ? ekAlimSonrasi(s, ekLot, alisFiyati, komisyon!) : null;

  const ozet =
    s && !s.hata
      ? [
          `Elimdeki: ${formatNumber(s.lot, 2)} lot`,
          `Ortalama maliyet: ${fiyat4(s.ortalama)}`,
          `Toplam maliyet: ${formatTL(s.toplamMaliyet)}`,
          ...(g ? [`Güncel ${fiyat4(guncel!)} ile K/Z: ${formatTL(g.gerceklesmemisKz)} (${formatPercent(g.yuzde, 2)})`] : []),
        ].join('\n')
      : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <div class="field">
          <span class="field__label">İşlemleriniz (sırayla)</span>
          <ul class="line-items">
            {satirlar.map((x, i) => (
              <li class="line-item" key={x.id}>
                <div class="line-item__head">
                  <span>İşlem {i + 1}</span>
                  {satirlar.length > 1 && (
                    <button
                      type="button"
                      class="line-item__remove"
                      aria-label={`İşlem ${i + 1}’i sil`}
                      onClick={() => setSatirlar((l) => l.filter((y) => y.id !== x.id))}
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
                <SelectField id={`hm-tur-${x.id}`} label="İşlem" value={x.tur} options={TURLER} onChange={(v) => guncelle(x.id, { tur: v })} />
                {x.tur === 'bedelsiz' ? (
                  <NumberField
                    id={`hm-oran-${x.id}`}
                    label="Bedelsiz / bölünme oranı"
                    value={x.oran}
                    onChange={(v) => guncelle(x.id, { oran: v })}
                    suffix="%"
                    error={hatalar[i].oran}
                    hint="%100 = her 1 paya 1 yeni pay. Lot artar, toplam maliyet değişmez."
                  />
                ) : (
                  <div class="row-2">
                    <NumberField
                      id={`hm-lot-${x.id}`}
                      label="Lot"
                      value={x.lot}
                      onChange={(v) => guncelle(x.id, { lot: v })}
                      decimals={4}
                      error={hatalar[i].lot}
                    />
                    <NumberField
                      id={`hm-fiyat-${x.id}`}
                      label="Fiyat"
                      value={x.fiyat}
                      onChange={(v) => guncelle(x.id, { fiyat: v })}
                      suffix="TL"
                      decimals={4}
                      error={hatalar[i].fiyat}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            class="btn btn--small add-row"
            onClick={() => setSatirlar((l) => [...l, { id: sayac.current++, tur: 'alis', lot: null, fiyat: null, oran: null }])}
          >
            + İşlem ekle
          </button>
        </div>
        <NumberField
          id="hm-komisyon"
          label="Komisyon oranı (alış ve satışta)"
          value={komisyon}
          onChange={setKomisyon}
          suffix="%"
          decimals={4}
          error={komisyonHata}
          hint="Aracı kurumunuzun BSMV dahil oranı; ör. binde 2 için 0,2 yazın. Bilmiyorsanız 0 bırakın."
        />
        <NumberField id="hm-guncel" label="Güncel fiyat (isteğe bağlı)" value={guncel} onChange={setGuncel} suffix="TL" decimals={4} />
        <Details summary="Ortalamayı düşürmek / ek alım hesabı">
          <div class="calc-inputs">
            <NumberField
              id="hm-alis"
              label="Yeni alış fiyatı"
              value={alisFiyati}
              onChange={setAlisFiyati}
              suffix="TL"
              decimals={4}
            />
            <div class="row-2">
              <NumberField id="hm-hedef" label="Hedef ortalama" value={hedef} onChange={setHedef} suffix="TL" decimals={4} />
              <NumberField id="hm-ek" label="ya da: alacağım lot" value={ekLot} onChange={setEkLot} decimals={4} />
            </div>
          </div>
        </Details>
      </div>

      <div class="calc-results">
        {s && s.hata ? (
          <Callout kind="danger">{s.hata.mesaj}</Callout>
        ) : s ? (
          <>
            <ResultHero
              label="Ortalama maliyetiniz"
              value={s.lot > 0 ? fiyat4(s.ortalama) : '—'}
              sub={
                <>
                  {formatNumber(s.lot, 4)} lot · toplam maliyet {formatTL(s.toplamMaliyet)}
                </>
              }
            />
            {g && (
              <Breakdown
                title={`Güncel fiyat: ${fiyat4(guncel!)}`}
                rows={[
                  { label: 'Piyasa değeri', value: formatTL(g.piyasaDegeri) },
                  {
                    label: 'Gerçekleşmemiş kâr / zarar',
                    value: `${formatTL(g.gerceklesmemisKz)} (${formatPercent(g.yuzde, 2)})`,
                    kind: g.gerceklesmemisKz >= 0 ? 'plus' : 'minus',
                    hint: komisyon ? 'Satış komisyonu düşülmüş' : undefined,
                  },
                  { label: 'Başa baş satış fiyatı', value: fiyat4(g.basabas), kind: 'total' },
                ]}
              />
            )}
            {(s.toplamSatis > 0 || s.toplamKomisyon > 0) && (
              <Breakdown
                rows={[
                  ...(s.toplamSatis > 0
                    ? [{ label: 'Gerçekleşen kâr / zarar', value: formatTL(s.gerceklesenKz), kind: (s.gerceklesenKz >= 0 ? 'plus' : 'minus') as 'plus' | 'minus' }]
                    : []),
                  ...(s.toplamKomisyon > 0 ? [{ label: 'Ödenen toplam komisyon', value: formatTL(s.toplamKomisyon) }] : []),
                ]}
              />
            )}
            {hedefLot !== undefined && (
              <Callout kind={hedefLot === null ? 'warning' : 'info'}>
                {hedefLot === null
                  ? `Hedef ortalama, yeni alış fiyatının (komisyon dahil) altında olamaz; ${fiyat4(hedef!)} ortalamaya bu fiyattan inilemez.`
                  : hedefLot === 0
                    ? 'Ortalamanız zaten hedefin altında.'
                    : `Ortalamayı ${fiyat4(hedef!)} seviyesine indirmek için ${fiyat4(alisFiyati!)} fiyattan yaklaşık ${formatNumber(hedefLot, 0)} lot (${formatTL(hedefLot * alisFiyati! * (1 + komisyon! / 100))}) almanız gerekir.`}
              </Callout>
            )}
            {ek && (
              <Callout kind="info">
                {formatNumber(ekLot!, 4)} lot {fiyat4(alisFiyati!)} fiyattan alırsanız ({formatTL(ek.ekTutar)}) yeni ortalamanız{' '}
                <strong>{fiyat4(ek.yeniOrtalama)}</strong>, toplam {formatNumber(ek.yeniLot, 4)} lot olur.
              </Callout>
            )}
            {satirlar.length > 1 && (
              <DataTable
                caption="İşlem işlem ortalama"
                columns={[
                  { key: 'n', label: 'İşlem' },
                  { key: 'l', label: 'Lot' },
                  { key: 'o', label: 'Ortalama' },
                  { key: 'k', label: 'Gerçekleşen K/Z' },
                ]}
                rows={s.adimlar.map((a, i) => ({
                  n: `${i + 1}. ${TURLER.find((t) => t.value === satirlar[i].tur)?.label}`,
                  l: formatNumber(a.lot, 4),
                  o: a.lot > 0 ? fiyat4(a.ortalama) : '—',
                  k: satirlar[i].tur === 'satis' ? formatTL(a.kz) : '',
                }))}
              />
            )}
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için işlemlerinizi girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}

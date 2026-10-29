import { useMemo, useRef, useState } from 'preact/hooks';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { NumberField, Segmented, SelectField, TextField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { hesaplaSaglayici, karsilastir, validateKur, validateSaglayici, type Yon } from './calc';

interface Satir {
  id: number;
  ad: string;
  kur: number | null;
  sabit: number | null;
  komisyon: number | null;
}

type ParaBirimi = 'USD' | 'EUR' | 'GBP';
const kur4 = (n: number) => `${formatNumber(n, 4, 2)} TL`;

export default function Calculator() {
  const sayac = useRef(3);
  const [yon, setYon] = useState<Yon>('bozdurma');
  const [birim, setBirim] = useState<ParaBirimi>('USD');
  const [tutar, setTutar] = useState<number | null>(1000);
  const [piyasa, setPiyasa] = useState<number | null>(42);
  const [satirlar, setSatirlar] = useState<Satir[]>([
    { id: 1, ad: '1. seçenek', kur: 41.5, sabit: 0, komisyon: 0 },
    { id: 2, ad: '2. seçenek', kur: 41.85, sabit: 75, komisyon: 0.5 },
  ]);

  const guncelle = (id: number, p: Partial<Satir>) => setSatirlar((l) => l.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const errors = validateKur({ tutar, piyasa });
  const satirHata = satirlar.map((s) => validateSaglayici(s));
  const gecerli = Object.keys(errors).length === 0 && satirHata.every((h) => Object.keys(h).length === 0);

  const sonuc = useMemo(
    () =>
      gecerli
        ? karsilastir(
            yon,
            tutar!,
            piyasa!,
            satirlar.map((s, i) => ({ ad: s.ad.trim() || `${i + 1}. seçenek`, kur: s.kur!, sabitUcret: s.sabit!, komisyonYuzde: s.komisyon! })),
          )
        : null,
    [gecerli, yon, tutar, piyasa, satirlar],
  );

  const enIyi = sonuc?.[0];
  const ideal = gecerli ? hesaplaSaglayici(yon, tutar!, piyasa!, { ad: '', kur: piyasa!, sabitUcret: 0, komisyonYuzde: 0 }).tl : 0;
  const ozet = sonuc
    ? [
        `${formatNumber(tutar!, 2)} ${birim} ${yon === 'bozdurma' ? 'bozdurma' : 'alma'} · piyasa kuru ${kur4(piyasa!)}`,
        ...sonuc.map((r) => `${r.ad}: ${formatTL(r.tl)} (gizli + açık maliyet ${formatTL(r.toplamMaliyet)}, %${formatNumber(r.toplamMaliyetYuzde, 2)})`),
      ].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="kf-yon"
          label="İşlem"
          value={yon}
          onChange={setYon}
          options={[
            { value: 'bozdurma', label: 'Döviz bozduruyorum' },
            { value: 'alma', label: 'Döviz alıyorum' },
          ]}
        />
        <div class="row-2">
          <NumberField id="kf-tutar" label="Döviz tutarı" value={tutar} onChange={setTutar} error={errors.tutar} />
          <SelectField
            id="kf-birim"
            label="Para birimi"
            value={birim}
            onChange={setBirim}
            options={[
              { value: 'USD', label: 'ABD doları (USD)' },
              { value: 'EUR', label: 'Euro (EUR)' },
              { value: 'GBP', label: 'İngiliz sterlini (GBP)' },
            ]}
          />
        </div>
        <NumberField
          id="kf-piyasa"
          label="Piyasa (orta) kuru"
          value={piyasa}
          onChange={setPiyasa}
          suffix="TL"
          decimals={4}
          error={errors.piyasa}
          hint="Alış ve satış kurunun ortası. İşlem anındaki değeri bir finans sitesinden ya da TCMB’den bakıp yazın."
        />
        <div class="field">
          <span class="field__label">Karşılaştırılacak seçenekler</span>
          <ul class="line-items">
            {satirlar.map((s, i) => (
              <li class="line-item" key={s.id}>
                <div class="line-item__head">
                  <span>Seçenek {i + 1}</span>
                  {satirlar.length > 1 && (
                    <button
                      type="button"
                      class="line-item__remove"
                      aria-label={`Seçenek ${i + 1}’i sil`}
                      onClick={() => setSatirlar((l) => l.filter((x) => x.id !== s.id))}
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
                <TextField id={`kf-ad-${s.id}`} label="Ad (isteğe bağlı)" value={s.ad} onChange={(v) => guncelle(s.id, { ad: v })} />
                <NumberField
                  id={`kf-kur-${s.id}`}
                  label="Size uygulanan kur"
                  value={s.kur}
                  onChange={(v) => guncelle(s.id, { kur: v })}
                  suffix="TL"
                  decimals={4}
                  error={satirHata[i].kur}
                />
                <div class="row-2">
                  <NumberField
                    id={`kf-sabit-${s.id}`}
                    label="Sabit ücret"
                    value={s.sabit}
                    onChange={(v) => guncelle(s.id, { sabit: v })}
                    suffix="TL"
                    error={satirHata[i].sabit}
                  />
                  <NumberField
                    id={`kf-kom-${s.id}`}
                    label="Komisyon"
                    value={s.komisyon}
                    onChange={(v) => guncelle(s.id, { komisyon: v })}
                    suffix="%"
                    decimals={4}
                    error={satirHata[i].komisyon}
                  />
                </div>
              </li>
            ))}
          </ul>
          {satirlar.length < 4 && (
            <button
              type="button"
              class="btn btn--small add-row"
              onClick={() =>
                setSatirlar((l) => [...l, { id: sayac.current++, ad: `${l.length + 1}. seçenek`, kur: null, sabit: 0, komisyon: 0 }])
              }
            >
              + Seçenek ekle
            </button>
          )}
        </div>
      </div>

      <div class="calc-results">
        {sonuc && enIyi ? (
          <>
            <ResultHero
              label={yon === 'bozdurma' ? `En çok TL veren: ${enIyi.ad}` : `En ucuza alan: ${enIyi.ad}`}
              value={formatTL(enIyi.tl)}
              sub={
                <>
                  Piyasa kuruyla olması gereken {formatTL(ideal)} · toplam maliyet <strong>{formatTL(enIyi.toplamMaliyet)}</strong> (
                  {formatPercent(enIyi.toplamMaliyetYuzde, 2)})
                </>
              }
            />
            <Breakdown
              title={`${enIyi.ad} – maliyetin kaynağı`}
              rows={[
                { label: 'Gizli kur makası', value: formatTL(enIyi.kurMakasi), kind: 'minus', hint: `Piyasa kurundan sapma ${formatPercent(enIyi.kurMakasiYuzde, 2)}` },
                { label: 'Açık ücret ve komisyon', value: formatTL(enIyi.acikUcret), kind: 'minus' },
                { label: 'Toplam maliyet', value: formatTL(enIyi.toplamMaliyet), kind: 'total' },
                { label: 'Size gerçekte uygulanan kur', value: kur4(enIyi.efektifKur) },
              ]}
            />
            {sonuc.length > 1 && (
              <DataTable
                caption="Karşılaştırma (en avantajlıdan)"
                columns={[
                  { key: 'ad', label: 'Seçenek' },
                  { key: 'tl', label: yon === 'bozdurma' ? 'Elinize geçen' : 'Ödeyeceğiniz' },
                  { key: 'mak', label: 'Gizli makas' },
                  { key: 'top', label: 'Toplam maliyet' },
                  { key: 'ek', label: 'Efektif kur' },
                ]}
                rows={sonuc.map((r, i) => ({
                  ad: i === 0 ? `✓ ${r.ad}` : r.ad,
                  tl: formatTL(r.tl),
                  mak: formatTL(r.kurMakasi),
                  top: `${formatTL(r.toplamMaliyet)} (${formatPercent(r.toplamMaliyetYuzde, 2)})`,
                  ek: kur4(r.efektifKur),
                }))}
              />
            )}
            {sonuc.length > 1 && (
              <Callout kind="info">
                En avantajlı seçenekle en pahalı seçenek arasındaki fark{' '}
                <strong>{formatTL(sonuc[sonuc.length - 1].toplamMaliyet - enIyi.toplamMaliyet)}</strong>.
              </Callout>
            )}
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için tutarı, piyasa kurunu ve en az bir seçeneği girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}

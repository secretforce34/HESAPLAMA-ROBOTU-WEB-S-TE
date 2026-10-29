import { useMemo, useRef, useState } from 'preact/hooks';
import { formatNumber, formatPercent, formatTL } from '../../lib/format';
import { NumberField, SelectField, TextField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { paylastir, validateBolumler, varsayilanYontem, type Yontem } from './calc';

interface BolumSatiri {
  id: number;
  ad: string;
  arsaPayi: number | null;
}
interface GiderSatiri {
  id: number;
  ad: string;
  tutar: number | null;
  yontem: Yontem;
}

const silIkon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
  </svg>
);

export default function Calculator() {
  const sayac = useRef(100);
  const [bolumler, setBolumler] = useState<BolumSatiri[]>(
    [40, 40, 60, 60, 60, 60, 80, 80].map((a, i) => ({ id: i + 1, ad: `Daire ${i + 1}`, arsaPayi: a })),
  );
  const [giderler, setGiderler] = useState<GiderSatiri[]>([
    { id: 50, ad: 'Kapıcı maaşı ve SGK', tutar: 45000, yontem: 'esit' },
    { id: 51, ad: 'Ortak elektrik', tutar: 3500, yontem: 'arsa' },
    { id: 52, ad: 'Asansör bakımı', tutar: 2500, yontem: 'arsa' },
    { id: 53, ad: 'Temizlik malzemesi', tutar: 1200, yontem: 'arsa' },
  ]);

  const bolumHata = validateBolumler(bolumler);
  const gecerliGider = giderler.filter((g) => (g.tutar ?? 0) > 0);
  const r = useMemo(
    () =>
      bolumHata
        ? null
        : paylastir(
            bolumler.map((b) => ({ ad: b.ad, arsaPayi: b.arsaPayi! })),
            gecerliGider.map((g) => ({ ad: g.ad, tutar: g.tutar!, yontem: g.yontem })),
          ),
    [bolumHata, bolumler, giderler],
  );

  const ozet = r ? r.satirlar.map((s) => `${s.ad}: ${formatTL(s.toplam)}`).join('\n') : '';
  const enAz = r && r.satirlar.length ? Math.min(...r.satirlar.map((s) => s.toplam)) : 0;
  const enCok = r && r.satirlar.length ? Math.max(...r.satirlar.map((s) => s.toplam)) : 0;

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <div class="field">
          <span class="field__label">Aylık ortak giderler</span>
          <ul class="line-items">
            {giderler.map((g, i) => (
              <li class="line-item" key={g.id}>
                <div class="line-item__head">
                  <span>Gider {i + 1}</span>
                  <button type="button" class="line-item__remove" aria-label={`Gider ${i + 1}’i sil`} onClick={() => setGiderler((l) => l.filter((x) => x.id !== g.id))}>
                    {silIkon}
                  </button>
                </div>
                <div class="line-item__fields">
                  <TextField
                    id={`ai-gad-${g.id}`}
                    label="Gider"
                    value={g.ad}
                    onChange={(v) => setGiderler((l) => l.map((x) => (x.id === g.id ? { ...x, ad: v, yontem: varsayilanYontem(v) } : x)))}
                  />
                  <NumberField
                    id={`ai-gtut-${g.id}`}
                    label="Aylık tutar"
                    value={g.tutar}
                    suffix="TL"
                    onChange={(v) => setGiderler((l) => l.map((x) => (x.id === g.id ? { ...x, tutar: v } : x)))}
                  />
                </div>
                <SelectField
                  id={`ai-gyon-${g.id}`}
                  label="Paylaşım"
                  value={g.yontem}
                  onChange={(v) => setGiderler((l) => l.map((x) => (x.id === g.id ? { ...x, yontem: v } : x)))}
                  options={[
                    { value: 'arsa', label: 'Arsa payı oranında' },
                    { value: 'esit', label: 'Eşit (her daire aynı)' },
                  ]}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            class="btn btn--small add-row"
            onClick={() => setGiderler((l) => [...l, { id: sayac.current++, ad: '', tutar: null, yontem: 'arsa' }])}
          >
            + Gider ekle
          </button>
        </div>

        <div class="field">
          <span class="field__label">Bağımsız bölümler ve arsa payları</span>
          <p class="field__hint" style={{ margin: 0 }}>
            Tapudaki “24/480” gibi arsa payının yalnızca ilk sayısını (24) yazın.
          </p>
          <ul class="line-items">
            {bolumler.map((b, i) => (
              <li class="line-item" key={b.id}>
                <div class="line-item__head">
                  <span>Bölüm {i + 1}</span>
                  {bolumler.length > 2 && (
                    <button type="button" class="line-item__remove" aria-label={`Bölüm ${i + 1}’i sil`} onClick={() => setBolumler((l) => l.filter((x) => x.id !== b.id))}>
                      {silIkon}
                    </button>
                  )}
                </div>
                <div class="line-item__fields">
                  <TextField id={`ai-bad-${b.id}`} label="Ad" value={b.ad} onChange={(v) => setBolumler((l) => l.map((x) => (x.id === b.id ? { ...x, ad: v } : x)))} />
                  <NumberField
                    id={`ai-bpay-${b.id}`}
                    label="Arsa payı"
                    value={b.arsaPayi}
                    decimals={4}
                    onChange={(v) => setBolumler((l) => l.map((x) => (x.id === b.id ? { ...x, arsaPayi: v } : x)))}
                  />
                </div>
              </li>
            ))}
          </ul>
          {bolumHata && <p class="field__error">{bolumHata}</p>}
          <button
            type="button"
            class="btn btn--small add-row"
            onClick={() => setBolumler((l) => [...l, { id: sayac.current++, ad: `Daire ${l.length + 1}`, arsaPayi: l[l.length - 1]?.arsaPayi ?? null }])}
          >
            + Bölüm ekle
          </button>
        </div>
      </div>

      <div class="calc-results">
        {r ? (
          <>
            <ResultHero
              label="Aylık aidat aralığı"
              value={enAz === enCok ? formatTL(enAz) : `${formatTL(enAz, 0)} – ${formatTL(enCok, 0)}`}
              sub={
                <>
                  Toplam aylık gider {formatTL(r.toplamGider)} · {r.satirlar.length} bağımsız bölüm
                </>
              }
            />
            <Breakdown
              rows={[
                { label: 'Arsa payı oranında paylaşılan', value: formatTL(r.arsaPayliToplam) },
                { label: 'Eşit paylaşılan', value: formatTL(r.esitToplam) },
                { label: 'Toplam', value: formatTL(r.toplamGider), kind: 'total' },
              ]}
            />
            <DataTable
              caption="Bölümlere göre aylık aidat"
              columns={[
                { key: 'a', label: 'Bölüm' },
                { key: 'o', label: 'Arsa payı' },
                { key: 'p', label: 'Arsa payına göre' },
                { key: 'e', label: 'Eşit' },
                { key: 't', label: 'Aidat' },
              ]}
              rows={r.satirlar.map((s, i) => ({
                a: s.ad,
                o: `${formatNumber(bolumler[i].arsaPayi!, 4)}/${formatNumber(r.toplamArsaPayi, 4)} (${formatPercent(s.oran, 2)})`,
                p: formatTL(s.arsaPayli),
                e: formatTL(s.esit),
                t: formatTL(s.toplam),
              }))}
              foot={{ a: 'Toplam', o: '', p: formatTL(r.arsaPayliToplam), e: formatTL(r.esitToplam), t: formatTL(r.toplamGider) }}
            />
            <Callout kind="info">
              Kat Mülkiyeti Kanunu md. 20’ye göre yönetim planınızda farklı bir paylaşım yoksa kapıcı, kaloriferci, bahçıvan ve
              bekçi giderleri eşit; bakım, onarım ve işletme giderleri arsa payı oranında paylaşılır. Yönetim planınızı kontrol edin.
            </Callout>
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>{bolumHata ?? 'Gider ve bölümleri girin.'}</ResultEmpty>
        )}
      </div>
    </div>
  );
}

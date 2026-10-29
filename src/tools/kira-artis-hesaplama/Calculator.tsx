import { useEffect, useMemo, useState } from 'preact/hooks';
import { todayIsoTR } from '../../lib/finance';
import { formatDateTR, formatMonthTR, formatPercent, formatTL } from '../../lib/format';
import { CheckboxField, DateField, NumberField, Segmented } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { enumParam, numParam, readParams } from '../../ui/url';
import { kiraZinciri, sonOranlar, validateKira, yasalOran, yeniKira, type KiraTuru } from './calc';

export default function Calculator() {
  const [tur, setTur] = useState<KiraTuru>('konut');
  const [kira, setKira] = useState<number | null>(20000);
  const [tarih, setTarih] = useState('2026-10-15');
  const [zincirAcik, setZincirAcik] = useState(false);
  const [ilkKira, setIlkKira] = useState<number | null>(8000);
  const [baslangic, setBaslangic] = useState('2022-03-01');
  const [bugun, setBugun] = useState('2026-10-29');

  useEffect(() => {
    const t = todayIsoTR();
    setBugun(t);
    setTarih(t);
    const p = readParams();
    const k = numParam(p, 'kira');
    if (k !== null) setKira(k);
    const tt = enumParam(p, 'tur', ['konut', 'isyeri'] as const);
    if (tt) setTur(tt);
  }, []);

  const errors = validateKira({ kira, tarih });
  const r = useMemo(() => (Object.keys(errors).length === 0 ? yasalOran(tarih, tur) : null), [tarih, tur, JSON.stringify(errors)]);
  const zincir = useMemo(
    () => (zincirAcik && ilkKira && ilkKira > 0 && /^\d{4}-\d{2}-\d{2}$/.test(baslangic) ? kiraZinciri(ilkKira, baslangic, bugun, tur) : []),
    [zincirAcik, ilkKira, baslangic, bugun, tur],
  );
  const oranlar = useMemo(() => sonOranlar(24), []);

  const yeni = r && r.uygulanan !== null && kira ? yeniKira(kira, r.uygulanan) : null;
  const sonrakiAciklanan = r && r.oran === null ? yasalOran(`${r.esasAy}-15`, tur) : null;

  const ozet =
    r && yeni !== null
      ? [
          `Yenileme: ${formatDateTR(tarih)} (${tur === 'konut' ? 'konut' : 'çatılı işyeri'})`,
          `Esas oran: ${formatMonthTR(r.esasAy)} 12 aylık ortalama TÜFE %${r.oran}${r.sinir25 ? ' → %25 sınırı' : ''}`,
          `Mevcut kira ${formatTL(kira!)} → azami yeni kira ${formatTL(yeni)}`,
        ].join('\n')
      : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="ka-tur"
          label="Kiralanan yer"
          value={tur}
          onChange={setTur}
          options={[
            { value: 'konut', label: 'Konut' },
            { value: 'isyeri', label: 'Çatılı işyeri' },
          ]}
        />
        <NumberField id="ka-kira" label="Mevcut aylık kira" value={kira} onChange={setKira} suffix="TL" error={errors.kira} />
        <DateField
          id="ka-tarih"
          label="Kira yenileme tarihi"
          value={tarih}
          onChange={setTarih}
          error={errors.tarih}
          hint="Yeni kira yılının başladığı gün (sözleşmenin yıldönümü)."
        />
        <CheckboxField
          id="ka-zincir"
          label="Sözleşme başından bugüne kira ne olmalıydı?"
          checked={zincirAcik}
          onChange={setZincirAcik}
          hint="Her yıl yasal azami artış uygulanmış olsaydı kiranın seyrini gösterir."
        />
        {zincirAcik && (
          <div class="row-2">
            <NumberField id="ka-ilk" label="İlk kira" value={ilkKira} onChange={setIlkKira} suffix="TL" />
            <DateField id="ka-bas" label="Sözleşme başlangıcı" value={baslangic} onChange={setBaslangic} />
          </div>
        )}
      </div>

      <div class="calc-results">
        {r ? (
          r.uygulanan !== null && yeni !== null ? (
            <>
              <ResultHero
                label="Yasal azami yeni kira"
                value={formatTL(yeni)}
                sub={
                  <>
                    Artış en fazla <strong>{formatPercent(r.uygulanan, 2)}</strong> · {formatTL(yeni - kira!)} fark
                  </>
                }
              />
              <Breakdown
                rows={[
                  { label: 'Esas alınan ay', value: formatMonthTR(r.esasAy), hint: 'Yenileme ayından önceki ay' },
                  { label: 'TÜFE 12 aylık ortalama değişim', value: formatPercent(r.oran!, 2) },
                  ...(r.sinir25 ? [{ label: 'Konut kirası %25 sınırı', value: '%25', kind: 'sub' as const }] : []),
                  { label: 'Mevcut kira', value: formatTL(kira!) },
                  { label: 'Azami yeni kira', value: formatTL(yeni), kind: 'total' },
                ]}
              />
              {r.sinir25 && (
                <Callout kind="info">
                  Bu yenileme 11 Haziran 2022 – 1 Temmuz 2024 arasında olduğu için konut kiralarında artış %25 ile sınırlıdır (7409
                  sayılı Kanun).
                </Callout>
              )}
              <Callout kind="info">
                Bu oran bir üst sınırdır; taraflar daha düşük bir artışta anlaşabilir. Kiracı 5 yılı doldurduysa yeni kira, hâkim
                tarafından emsal kiralar ve hakkaniyet dikkate alınarak belirlenebilir (TBK md. 344/3).
              </Callout>
            </>
          ) : (
            <Callout kind="warning">
              <strong>{formatMonthTR(r.esasAy)} oranı henüz açıklanmadı.</strong> TÜİK bu oranı yaklaşık{' '}
              {formatDateTR(r.aciklanma!)} tarihinde açıklar (hafta sonuna denk gelirse ilk iş günü).{' '}
              {sonrakiAciklanan?.oran != null && (
                <>Son açıklanan oran ({formatMonthTR(sonrakiAciklanan.esasAy)}): %{sonrakiAciklanan.oran}.</>
              )}
            </Callout>
          )
        ) : (
          <ResultEmpty>Sonucu görmek için kira tutarını ve yenileme tarihini girin.</ResultEmpty>
        )}

        {zincir.length > 0 && (
          <DataTable
            caption="Yıllara göre azami kira"
            columns={[
              { key: 't', label: 'Yenileme' },
              { key: 'o', label: 'Artış' },
              { key: 'k', label: 'Azami kira' },
            ]}
            rows={zincir.map((z) => ({
              t: formatDateTR(z.tarih) + (z.tarih > bugun ? ' (gelecek)' : ''),
              o: z.uygulanan === null ? 'açıklanmadı' : `${formatPercent(z.uygulanan, 2)}${z.sinir25 ? ' (sınır)' : ''}`,
              k: z.yeniKira === null ? '–' : formatTL(z.yeniKira),
            }))}
          />
        )}

        <Details summary="Son 24 ayın kira artış oranları">
          <DataTable
            scroll
            columns={[
              { key: 'a', label: 'Ay' },
              { key: 'o', label: '12 aylık ort. TÜFE' },
              { key: 'y', label: 'Bu oranla yenilenen' },
            ]}
            rows={oranlar.map((o) => {
              const [y, m] = o.ay.split('-').map(Number);
              const sonraki = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
              return { a: formatMonthTR(o.ay), o: formatPercent(o.oran, 2), y: `${formatMonthTR(sonraki)} yenilemeleri` };
            })}
          />
        </Details>
        {r && yeni !== null && <ShareBar params={{ kira, tur }} summary={ozet} />}
      </div>
    </div>
  );
}

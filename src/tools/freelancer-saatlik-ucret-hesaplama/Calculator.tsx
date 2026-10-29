import { useMemo, useRef, useState } from 'preact/hooks';
import { formatNumber, formatTL } from '../../lib/format';
import { NumberField, TextField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { duyarlilik, hesaplaUcret, validateFreelancer } from './calc';

interface Gider {
  id: number;
  ad: string;
  tutar: number | null;
}

export default function Calculator() {
  const sayac = useRef(4);
  const [net, setNet] = useState<number | null>(60_000);
  const [giderler, setGiderler] = useState<Gider[]>([
    { id: 1, ad: 'Muhasebe', tutar: 2_500 },
    { id: 2, ad: 'Yazılım ve abonelikler', tutar: 2_000 },
    { id: 3, ad: 'Ekipman, internet, diğer', tutar: 3_000 },
  ]);
  const [vergi, setVergi] = useState<number | null>(25);
  const [gun, setGun] = useState<number | null>(5);
  const [saat, setSaat] = useState<number | null>(8);
  const [tatil, setTatil] = useState<number | null>(40);
  const [oran, setOran] = useState<number | null>(70);
  const [usd, setUsd] = useState<number | null>(null);
  const [eur, setEur] = useState<number | null>(null);

  const aylikGider = giderler.reduce((t, g) => t + (g.tutar ?? 0), 0);
  const errors = validateFreelancer({ net, vergi, gun, saat, tatil, oran });
  const gecerli = Object.keys(errors).length === 0;
  const girdi = gecerli
    ? { hedefAylikNet: net!, aylikGider, vergiYuku: vergi!, haftalikGun: gun!, gunlukSaat: saat!, calisilmayanGun: tatil!, faturalanabilir: oran! }
    : null;

  const r = useMemo(() => (girdi ? hesaplaUcret(girdi) : null), [JSON.stringify(girdi)]);
  const tablo = useMemo(() => (girdi ? duyarlilik(girdi, [50, 60, 70, 80, 90], [0.8, 1, 1.25, 1.5]) : null), [JSON.stringify(girdi)]);

  const ozet = r
    ? [
        `Hedef net: ${formatTL(net!, 0)}/ay, gider ${formatTL(aylikGider, 0)}/ay, vergi-sigorta yükü %${formatNumber(vergi!)}`,
        `Asgari saatlik ücret: ${formatTL(r.saatlik)}`,
        `Günlük: ${formatTL(r.gunluk)} · Aylık ciro hedefi: ${formatTL(r.aylikCiro)}`,
      ].join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <NumberField
          id="fr-net"
          label="Elinize geçmesini istediğiniz aylık net"
          value={net}
          onChange={setNet}
          suffix="TL"
          error={errors.net}
        />
        <div class="field">
          <span class="field__label">Aylık işletme giderleri</span>
          <ul class="line-items">
            {giderler.map((g, i) => (
              <li class="line-item" key={g.id}>
                <div class="line-item__head">
                  <span>Gider {i + 1}</span>
                  <button
                    type="button"
                    class="line-item__remove"
                    aria-label={`Gider ${i + 1}’i sil`}
                    onClick={() => setGiderler((l) => l.filter((x) => x.id !== g.id))}
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
                    </svg>
                  </button>
                </div>
                <div class="line-item__fields">
                  <TextField id={`fr-gad-${g.id}`} label="Gider" value={g.ad} onChange={(v) => setGiderler((l) => l.map((x) => (x.id === g.id ? { ...x, ad: v } : x)))} />
                  <NumberField
                    id={`fr-gtut-${g.id}`}
                    label="Aylık tutar"
                    value={g.tutar}
                    suffix="TL"
                    onChange={(v) => setGiderler((l) => l.map((x) => (x.id === g.id ? { ...x, tutar: v } : x)))}
                  />
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            class="btn btn--small add-row"
            onClick={() => setGiderler((l) => [...l, { id: sayac.current++, ad: '', tutar: null }])}
          >
            + Gider ekle
          </button>
          <p class="field__hint">Toplam aylık gider: {formatTL(aylikGider)}</p>
        </div>
        <NumberField
          id="fr-vergi"
          label="Vergi ve sigorta yükü (kâr üzerinden)"
          value={vergi}
          onChange={setVergi}
          suffix="%"
          error={errors.vergi}
          hint="Örnek değerdir. Gelir vergisi dilimi, Bağ-Kur primi ve istisnalarınıza göre mali müşavirinizle birlikte belirleyin."
        />
        <div class="row-2">
          <NumberField id="fr-gun" label="Haftada çalışılan gün" value={gun} onChange={setGun} decimals={1} error={errors.gun} />
          <NumberField id="fr-saat" label="Günlük çalışma saati" value={saat} onChange={setSaat} suffix="saat" decimals={1} error={errors.saat} />
        </div>
        <NumberField
          id="fr-tatil"
          label="Yılda çalışmadığınız gün"
          value={tatil}
          onChange={setTatil}
          suffix="gün"
          decimals={0}
          error={errors.tatil}
          hint="İzin + resmî tatiller + hastalık. Örnek: 20 izin + 14 resmî tatil + 6 hastalık = 40."
        />
        <NumberField
          id="fr-oran"
          label="Faturalanabilir saat oranı"
          value={oran}
          onChange={setOran}
          suffix="%"
          error={errors.oran}
          hint="Müşteri bulma, teklif, yazışma, muhasebe gibi faturalanamayan işler çıkınca kalan oran. Örnek: %60–80."
        />
        <Details summary="Döviz karşılığı (isteğe bağlı)">
          <div class="row-2">
            <NumberField id="fr-usd" label="USD kuru" value={usd} onChange={setUsd} suffix="TL" decimals={4} />
            <NumberField id="fr-eur" label="EUR kuru" value={eur} onChange={setEur} suffix="TL" decimals={4} />
          </div>
        </Details>
      </div>

      <div class="calc-results">
        {r && tablo && Number.isFinite(r.saatlik) ? (
          <>
            <ResultHero
              label="Asgari saatlik ücretiniz"
              value={formatTL(r.saatlik)}
              sub={
                <>
                  {usd ? `≈ ${formatNumber(r.saatlik / usd, 2)} $ · ` : ''}
                  {eur ? `≈ ${formatNumber(r.saatlik / eur, 2)} € · ` : ''}KDV hariç
                </>
              }
            />
            <StatGrid
              items={[
                { label: 'Günlük ücret', value: formatTL(r.gunluk, 0) },
                { label: 'Aylık ciro hedefi', value: formatTL(r.aylikCiro, 0) },
                { label: 'Yıllık fatura saati', value: `${formatNumber(r.yillikFaturaSaati, 0)} saat` },
              ]}
            />
            <Breakdown
              title="Yıllık hesap"
              rows={[
                { label: 'Hedef net gelir', value: formatTL(net! * 12, 0) },
                { label: 'Vergi ve sigorta (tahmini)', value: formatTL(r.yillikVergi, 0), kind: 'plus' },
                { label: 'İşletme giderleri', value: formatTL(aylikGider * 12, 0), kind: 'plus' },
                { label: 'Gereken yıllık ciro', value: formatTL(r.yillikCiro, 0), kind: 'total' },
                { label: 'Çalışılan gün', value: `${formatNumber(r.yillikIsGunu, 0)} gün`, hint: `Faturalanabilir oran %${formatNumber(oran!)}` },
              ]}
            />
            <DataTable
              caption="Saatlik ücret: faturalanabilir oran × hedef net gelir"
              columns={[
                { key: 'o', label: 'Faturalanabilir' },
                { key: 'c0', label: formatTL(net! * 0.8, 0) },
                { key: 'c1', label: formatTL(net!, 0) },
                { key: 'c2', label: formatTL(net! * 1.25, 0) },
                { key: 'c3', label: formatTL(net! * 1.5, 0) },
              ]}
              rows={tablo.map((t) => ({
                o: `%${t.oran}`,
                c0: formatTL(t.ucretler[0], 0),
                c1: formatTL(t.ucretler[1], 0),
                c2: formatTL(t.ucretler[2], 0),
                c3: formatTL(t.ucretler[3], 0),
              }))}
            />
            <Callout kind="info">
              Bu ücret KDV hariçtir. KDV mükellefiyseniz faturaya KDV eklenir; serbest meslek makbuzunda müşteri stopaj
              keserse tahsilat tutarınız değişir.
            </Callout>
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için alanları doldurun.</ResultEmpty>
        )}
      </div>
    </div>
  );
}

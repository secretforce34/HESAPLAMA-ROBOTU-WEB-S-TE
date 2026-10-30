import { useEffect, useRef, useState } from 'preact/hooks';
import { trafikCezasiOdeme } from '../../data/params/trafik-cezasi';
import { todayIsoTR } from '../../lib/finance';
import { formatDateTR, formatTL } from '../../lib/format';
import { DateField, NumberField, SelectField, TextField } from '../../ui/fields';
import { Breakdown, Callout, DataTable, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { gunEkle, hesaplaCeza, validateCeza, type TebligSekli } from './calc';

interface Satir {
  id: number;
  ad: string;
  tutar: number | null;
  tarih: string;
  sekil: TebligSekli;
}

const SEKILLER: { value: TebligSekli; label: string }[] = [
  { value: 'elden', label: 'Elden (yolda) verildi' },
  { value: 'posta', label: 'Posta ile tebliğ edildi' },
  { value: 'etebligat', label: 'e-Tebligat (UETS) ile geldi' },
];

const silIkon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
  </svg>
);

const p = trafikCezasiOdeme.values;

export default function Calculator() {
  const sayac = useRef(100);
  const [bugun, setBugun] = useState('2026-10-31');
  const [odeme, setOdeme] = useState('2026-10-31');
  const [satirlar, setSatirlar] = useState<Satir[]>([{ id: 1, ad: 'Hız ihlali', tutar: 5_000, tarih: '2026-10-20', sekil: 'elden' }]);

  useEffect(() => {
    const t = todayIsoTR();
    setBugun(t);
    setOdeme(t);
    setSatirlar((l) => l.map((s) => (s.id === 1 ? { ...s, tarih: gunEkle(t, -10) } : s)));
  }, []);

  const guncelle = (id: number, alan: Partial<Satir>) => setSatirlar((l) => l.map((x) => (x.id === id ? { ...x, ...alan } : x)));
  const hatalar = satirlar.map((s) => validateCeza({ tutar: s.tutar, tarih: s.tarih }, odeme));
  const sonuclar = hatalar.every((h) => h === null) && /^\d{4}-\d{2}-\d{2}$/.test(odeme)
    ? satirlar.map((s) => ({ s, r: hesaplaCeza({ tutar: s.tutar!, tarih: s.tarih, sekil: s.sekil, odemeTarihi: odeme }) }))
    : null;

  const toplam = sonuclar
    ? sonuclar.reduce(
        (t, { s, r }) => ({ ceza: t.ceza + s.tutar!, indirim: t.indirim + r.indirim, faiz: t.faiz + r.faiz, odenecek: t.odenecek + r.odenecek }),
        { ceza: 0, indirim: 0, faiz: 0, odenecek: 0 },
      )
    : null;
  const indirimliKalan = sonuclar?.filter(({ r }) => r.indirimli).sort((a, b) => (a.r.sonOdeme < b.r.sonOdeme ? -1 : 1))[0];
  const itirazAcik = sonuclar?.filter(({ r }) => r.itirazSonGun >= bugun).sort((a, b) => (a.r.itirazSonGun < b.r.itirazSonGun ? -1 : 1))[0];

  const ozet =
    sonuclar && toplam
      ? [
          `${formatDateTR(odeme)} tarihinde ödenecek: ${formatTL(toplam.odenecek)}`,
          ...sonuclar.map(({ s, r }) => `${s.ad || 'Ceza'}: ${formatTL(r.odenecek)} (son indirimli gün ${formatDateTR(r.sonOdeme)})`),
        ].join('\n')
      : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <div class="field">
          <span class="field__label">Trafik cezalarınız</span>
          <p class="field__hint" style={{ margin: 0 }}>
            Tutar ve tarih ceza tutanağında ya da e-Devlet “Trafik Cezası Sorgulama” ekranında yazar.
          </p>
          <ul class="line-items">
            {satirlar.map((s, i) => (
              <li class="line-item" key={s.id}>
                <div class="line-item__head">
                  <span>{i + 1}. ceza</span>
                  {satirlar.length > 1 && (
                    <button type="button" class="line-item__remove" aria-label={`${i + 1}. cezayı sil`} onClick={() => setSatirlar((l) => l.filter((x) => x.id !== s.id))}>
                      {silIkon}
                    </button>
                  )}
                </div>
                <div class="line-item__fields">
                  <TextField id={`tc-ad-${s.id}`} label="Açıklama" value={s.ad} onChange={(v) => guncelle(s.id, { ad: v })} />
                  <NumberField id={`tc-tutar-${s.id}`} label="Ceza tutarı" value={s.tutar} onChange={(v) => guncelle(s.id, { tutar: v })} suffix="TL" />
                  <SelectField id={`tc-sekil-${s.id}`} label="Nasıl tebliğ edildi?" value={s.sekil} options={SEKILLER} onChange={(v) => guncelle(s.id, { sekil: v })} />
                  <DateField
                    id={`tc-tarih-${s.id}`}
                    label={s.sekil === 'etebligat' ? 'e-Tebligat adresine ulaştığı gün' : 'Tebliğ tarihi'}
                    value={s.tarih}
                    onChange={(v) => guncelle(s.id, { tarih: v })}
                    error={hatalar[i]}
                  />
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            class="btn btn--small add-row"
            onClick={() => setSatirlar((l) => [...l, { id: sayac.current++, ad: '', tutar: null, tarih: bugun, sekil: 'elden' }])}
          >
            + Ceza ekle
          </button>
        </div>
        <DateField id="tc-odeme" label="Ödeme tarihi" value={odeme} onChange={setOdeme} hint="Bugün ya da ödemeyi planladığınız gün." />
      </div>

      <div class="calc-results">
        {sonuclar && toplam ? (
          <>
            <ResultHero
              label={odeme === bugun ? 'Bugün öderseniz' : `${formatDateTR(odeme)} tarihinde öderseniz`}
              value={formatTL(toplam.odenecek)}
              sub={
                toplam.faiz > 0 ? (
                  <>
                    Gecikme faizi <strong>{formatTL(toplam.faiz)}</strong>
                  </>
                ) : toplam.indirim > 0 ? (
                  <>
                    %{p.indirimYuzde} indirimle <strong>{formatTL(toplam.indirim)}</strong> daha az
                  </>
                ) : undefined
              }
            />
            {indirimliKalan && (
              <Callout kind="success">
                İndirimli ödeme için son gün: <strong>{formatDateTR(indirimliKalan.r.sonOdeme)}</strong>
                {sonuclar.length > 1 && ` (${indirimliKalan.s.ad || 'ilk ceza'})`}. Bu tarihten sonra indirim kalkar ve her ay %{p.aylikFaizYuzde} faiz
                eklenir.
              </Callout>
            )}
            <DataTable
              caption="Ceza ceza ödeme durumu"
              columns={[
                { key: 'a', label: 'Ceza' },
                { key: 't', label: 'Tebliğ' },
                { key: 's', label: 'Son indirimli gün' },
                { key: 'd', label: 'Durum' },
                { key: 'o', label: 'Ödenecek' },
              ]}
              rows={sonuclar.map(({ s, r }) => ({
                a: `${s.ad || 'Ceza'} (${formatTL(s.tutar!, 0)})`,
                t: formatDateTR(r.teblig),
                s: formatDateTR(r.sonOdeme),
                d: r.indirimli ? `%${p.indirimYuzde} indirimli` : `${r.gecikmeAy} ay gecikme${r.sinirda ? ' (üst sınır)' : ''}`,
                o: formatTL(r.odenecek),
              }))}
            />
            <Breakdown
              rows={[
                { label: 'Ceza tutarları toplamı', value: formatTL(toplam.ceza) },
                ...(toplam.indirim > 0 ? [{ label: `Erken ödeme indirimi (%${p.indirimYuzde})`, value: formatTL(toplam.indirim), kind: 'minus' as const }] : []),
                ...(toplam.faiz > 0 ? [{ label: `Gecikme faizi (aylık %${p.aylikFaizYuzde})`, value: formatTL(toplam.faiz), kind: 'plus' as const }] : []),
                { label: 'Ödenecek', value: formatTL(toplam.odenecek), kind: 'total' as const },
              ]}
            />
            {itirazAcik && (
              <Callout kind="info">
                İtiraz için son gün {formatDateTR(itirazAcik.r.itirazSonGun)}: tebliğden itibaren {p.itirazGun} gün içinde sulh ceza hâkimliğine
                başvurulur. Cezayı ödemek itiraz hakkınızı ortadan kaldırmaz.
              </Callout>
            )}
            <Callout kind="warning">
              Son gün hafta sonuna ya da resmî tatile denk geliyorsa ödemeyi bir önceki iş gününe kadar yapmak en güvenlisidir. Faizli tutar cezanın
              iki katını geçemez; ödenmeyen cezalar vergi dairesince icra yoluyla tahsil edilir.
            </Callout>
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için ceza tutarını ve tebliğ tarihini girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}

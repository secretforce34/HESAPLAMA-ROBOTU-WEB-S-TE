import { useEffect, useMemo, useState } from 'preact/hooks';
import { asgariOdemeDonemiOn, asgariOdemeOrani, kartFaizDonemiOn, krediKartiFaizleri } from '../../data/params/kredi';
import { annualFromMonthly, todayIsoTR } from '../../lib/finance';
import { formatDateTR, formatNumber, formatPercent, formatTL } from '../../lib/format';
import { CheckboxField, NumberField, Segmented } from '../../ui/fields';
import { Breakdown, Callout, DataTable, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { boolParam, enumParam, numParam, readParams } from '../../ui/url';
import { asgariTutar, donemOranlari, gerekenSabitOdeme, simuleEt, validateKart, type BorcTuru, type OranAyari, type SimSonucu } from './calc';

const KUCUK_BAKIYE = 100;
const vergiler = krediKartiFaizleri.values.vergiler;

const sureMetni = (s: SimSonucu) => (s.bitmedi ? 'Bitmiyor' : s.ay >= 12 ? `${s.ay} ay (${Math.floor(s.ay / 12)} yıl ${s.ay % 12} ay)` : `${s.ay} ay`);

export default function Calculator() {
  const [bugun, setBugun] = useState(krediKartiFaizleri.lastReviewed);
  const [borc, setBorc] = useState<number | null>(25_000);
  const [limit, setLimit] = useState<number | null>(60_000);
  const [borcTuru, setBorcTuru] = useState<BorcTuru>('alisveris');
  const [kurumsal, setKurumsal] = useState(false);
  const [oranMod, setOranMod] = useState<'azami' | 'ozel'>('azami');
  const [ozelAkdi, setOzelAkdi] = useState<number | null>(3.25);
  const [ozelGecikme, setOzelGecikme] = useState<number | null>(3.55);
  const [kkdf, setKkdf] = useState<number | null>(vergiler.kkdf);
  const [bsmv, setBsmv] = useState<number | null>(vergiler.bsmv);
  const [sabit, setSabit] = useState<number | null>(5_000);
  const [hedefAy, setHedefAy] = useState<number | null>(12);
  const [planGoster, setPlanGoster] = useState<'asgari' | 'sabit'>('asgari');

  useEffect(() => {
    setBugun(todayIsoTR());
    // ?borc=25000&limit=60000&tur=nakit&kur=1&akdi=3&gec=3.3&sabit=5000
    const p = readParams();
    const n = (k: string, set: (v: number) => void) => {
      const v = numParam(p, k);
      if (v !== null) set(v);
    };
    n('borc', setBorc);
    n('limit', setLimit);
    n('sabit', setSabit);
    n('kkdf', setKkdf);
    n('bsmv', setBsmv);
    n('hedef', setHedefAy);
    const t = enumParam(p, 'tur', ['alisveris', 'nakit'] as const);
    if (t) setBorcTuru(t);
    if (boolParam(p, 'kur')) setKurumsal(true);
    const a = numParam(p, 'akdi');
    if (a !== null) {
      setOranMod('ozel');
      setOzelAkdi(a);
      const g = numParam(p, 'gec');
      setOzelGecikme(g ?? a);
    }
  }, []);

  const donem = kartFaizDonemiOn(bugun);
  const asgariDonem = asgariOdemeDonemiOn(bugun);
  const hatalar = validateKart({ borc, limit, kkdf, bsmv, ozelAkdi, ozelGecikme, sabit }, oranMod === 'ozel', true);
  const gecerli = Object.keys(hatalar).length === 0;

  const oranAyari: OranAyari = { mod: oranMod, donem, borcTuru, kurumsal, ozelAkdi: ozelAkdi ?? 0, ozelGecikme: ozelGecikme ?? 0 };
  const azamiAyar: OranAyari = { ...oranAyari, mod: 'azami' };

  const sonuc = useMemo(() => {
    if (!gecerli) return null;
    const ortak = { borc: borc!, asgariOran: asgariOdemeOrani(limit!, asgariDonem), oran: oranAyari, kkdf: kkdf!, bsmv: bsmv!, kucukBakiye: KUCUK_BAKIYE };
    return {
      asgari: simuleEt({ ...ortak, strateji: { tur: 'asgari' } }),
      sabit: simuleEt({ ...ortak, strateji: { tur: 'sabit', tutar: sabit! } }),
      tam: simuleEt({ ...ortak, strateji: { tur: 'tam' } }),
      hedef: hedefAy !== null && Number.isInteger(hedefAy) && hedefAy >= 1 && hedefAy <= 120 ? gerekenSabitOdeme(ortak, hedefAy) : null,
    };
  }, [gecerli, borc, limit, borcTuru, kurumsal, oranMod, ozelAkdi, ozelGecikme, kkdf, bsmv, sabit, hedefAy, bugun]);

  const asgariOran = limit !== null && limit > 0 ? asgariOdemeOrani(limit, asgariDonem) : null;
  const ilkAsgari = gecerli ? asgariTutar(borc!, limit!, asgariDonem) : null;
  const buAyOran = gecerli ? donemOranlari(borc!, oranAyari) : null;
  const buAyAzami = gecerli ? donemOranlari(borc!, azamiAyar) : null;
  const vergiCarpani = 1 + ((kkdf ?? 0) + (bsmv ?? 0)) / 100;
  const azamiAsim = oranMod === 'ozel' && buAyOran && buAyAzami && (buAyOran.akdi > buAyAzami.akdi || buAyOran.gecikme > buAyAzami.gecikme);

  const dilimAciklama =
    borcTuru === 'nakit'
      ? 'nakit çekim / kullanım oranı'
      : kurumsal
        ? 'kurumsal kart (en üst dilim)'
        : borc !== null && borc < 30_000
          ? 'dönem borcu 30.000 TL altı'
          : borc !== null && borc <= 180_000
            ? 'dönem borcu 30.000–180.000 TL'
            : 'dönem borcu 180.000 TL üzeri';

  const planSonuc = sonuc ? (planGoster === 'asgari' ? sonuc.asgari : sonuc.sabit) : null;

  const ozet =
    sonuc && ilkAsgari !== null
      ? [
          `Dönem borcu: ${formatTL(borc!)} · kart limiti: ${formatTL(limit!, 0)}`,
          `Asgari ödeme: ${formatTL(ilkAsgari)} (%${asgariOran})`,
          `Yalnızca asgari: ${sureMetni(sonuc.asgari)}, faiz + vergi ${formatTL(sonuc.asgari.toplamMaliyet)}, toplam ${formatTL(sonuc.asgari.toplamOdeme)}`,
          `Ayda ${formatTL(sabit!)}: ${sureMetni(sonuc.sabit)}, faiz + vergi ${formatTL(sonuc.sabit.toplamMaliyet)}`,
          `Tam ödeme: faiz yok`,
        ].join('\n')
      : '';

  return (
    <>
      <div class="calc-grid">
        <div class="calc-inputs">
          <NumberField
            id="ka-borc"
            label="Ekstredeki dönem borcu"
            value={borc}
            onChange={setBorc}
            suffix="TL"
            error={hatalar.borc}
            hint="Yeni harcama yapmadığınız varsayılır."
          />
          <NumberField
            id="ka-limit"
            label="Kart limiti"
            value={limit}
            onChange={setLimit}
            suffix="TL"
            error={hatalar.limit}
            hint={`Limit ${formatTL(asgariDonem.limitEsigi, 0)} ve altındaysa asgari ödeme %${asgariDonem.altOran}, üzerindeyse %${asgariDonem.ustOran}.`}
          />
          <Segmented
            name="ka-tur"
            label="Borç türü"
            value={borcTuru}
            onChange={setBorcTuru}
            options={[
              { value: 'alisveris', label: 'Alışveriş' },
              { value: 'nakit', label: 'Nakit avans' },
            ]}
            hint={borcTuru === 'nakit' ? 'Nakit çekimde faiz, çekim gününden itibaren işler ve dönem borcuna göre dilim uygulanmaz.' : undefined}
          />
          {borcTuru === 'alisveris' && (
            <CheckboxField id="ka-kur" label="Kurumsal kredi kartı" checked={kurumsal} onChange={setKurumsal} hint="Kurumsal kartlarda en üst dilim oranı uygulanır." />
          )}

          <Segmented
            name="ka-oran"
            label="Faiz oranı"
            value={oranMod}
            onChange={setOranMod}
            options={[
              { value: 'azami', label: 'TCMB azami oranları' },
              { value: 'ozel', label: 'Bankamın oranı' },
            ]}
            hint={
              oranMod === 'azami'
                ? `${formatDateTR(donem.from)} – ${formatDateTR(donem.to)} için ilan edilen oranlar; borç azaldıkça dilim kendiliğinden değişir.`
                : 'Ekstrenizdeki aylık akdi ve gecikme faizini yazın (vergiler hariç).'
            }
          />
          {oranMod === 'ozel' && (
            <div class="row-2">
              <NumberField id="ka-akdi" label="Aylık akdi faiz" value={ozelAkdi} onChange={setOzelAkdi} suffix="%" error={hatalar.akdi} />
              <NumberField id="ka-gec" label="Aylık gecikme faizi" value={ozelGecikme} onChange={setOzelGecikme} suffix="%" error={hatalar.gecikme} />
            </div>
          )}

          <p class="calc-section-title">Faize eklenen vergiler</p>
          <div class="row-2">
            <NumberField id="ka-kkdf" label="KKDF" value={kkdf} onChange={setKkdf} suffix="%" error={hatalar.kkdf} />
            <NumberField id="ka-bsmv" label="BSMV" value={bsmv} onChange={setBsmv} suffix="%" error={hatalar.bsmv} />
          </div>

          <NumberField
            id="ka-sabit"
            label="Her ay ödeyebileceğim tutar (karşılaştırma için)"
            value={sabit}
            onChange={setSabit}
            suffix="TL"
            error={hatalar.sabit}
          />
          <NumberField id="ka-hedef" label="Borcu kaç ayda kapatmak istersiniz?" value={hedefAy} onChange={setHedefAy} suffix="ay" decimals={0} inputMode="numeric" />

          <Details summary="Hesabın varsayımları">
            <ul>
              <li>Her hesap dönemi 30 gün kabul edilir; ödemeler son ödeme gününde yapılır ve yeni harcama yapılmaz.</li>
              <li>
                Asgari tutar ve üzeri ödemede kalan borca akdi faiz; asgari tutarın altında ödemede asgari tutarın ödenmeyen kısmına
                gecikme faizi, geri kalanına akdi faiz işler. KKDF ve BSMV faiz tutarına eklenir.
              </li>
              <li>Yalnızca asgari ödemede kalan borç {formatTL(KUCUK_BAKIYE, 0)} altına inince tamamının ödendiği varsayılır.</li>
              <li>Bankanızın oranı TCMB azami oranının altındaysa “Bankamın oranı” seçeneğini kullanın.</li>
            </ul>
          </Details>
        </div>

        <div class="calc-results">
          {sonuc && ilkAsgari !== null && buAyOran ? (
            <>
              <ResultHero
                label="Bu ekstrede asgari ödeme"
                value={formatTL(ilkAsgari)}
                sub={
                  <>
                    Dönem borcu × %{asgariOran} · yalnızca asgari öderseniz borç <strong>{sureMetni(sonuc.asgari)}</strong> içinde biter
                  </>
                }
              />

              <Breakdown
                title="Yalnızca asgari öderseniz"
                rows={[
                  { label: 'Bugünkü borç', value: formatTL(borc!) },
                  { label: 'Akdi faiz', value: formatTL(sonuc.asgari.toplamAkdiFaiz), kind: 'plus' },
                  { label: `KKDF (faiz × %${formatNumber(kkdf!)})`, value: formatTL(sonuc.asgari.toplamKkdf), kind: 'plus' },
                  { label: `BSMV (faiz × %${formatNumber(bsmv!)})`, value: formatTL(sonuc.asgari.toplamBsmv), kind: 'plus' },
                  { label: 'Toplam ödeme', value: formatTL(sonuc.asgari.toplamOdeme), kind: 'total' },
                  { label: 'Borca ek maliyet (faiz + vergi)', value: formatTL(sonuc.asgari.toplamMaliyet), kind: 'sub' },
                ]}
              />

              <StatGrid
                items={[
                  { label: `Bu ay akdi faiz (${dilimAciklama})`, value: formatPercent(buAyOran.akdi) },
                  { label: 'Bu ay gecikme faizi', value: formatPercent(buAyOran.gecikme) },
                  { label: 'Vergiler dahil aylık', value: formatPercent(buAyOran.akdi * vergiCarpani, 4) },
                  { label: 'Vergiler dahil yıllık bileşik', value: formatPercent(annualFromMonthly((buAyOran.akdi * vergiCarpani) / 100) * 100, 1) },
                ]}
              />

              <DataTable
                caption="Ödeme biçimlerinin karşılaştırması"
                columns={[
                  { key: 'ad', label: 'Ödeme biçimi' },
                  { key: 'sure', label: 'Süre' },
                  { key: 'maliyet', label: 'Faiz + vergi' },
                  { key: 'toplam', label: 'Toplam ödeme' },
                ]}
                rows={[
                  { ad: 'Tamamını öde', sure: '1 ay', maliyet: formatTL(0), toplam: formatTL(sonuc.tam.toplamOdeme) },
                  {
                    ad: `Her ay ${formatTL(sabit!, 0)}`,
                    sure: sureMetni(sonuc.sabit),
                    maliyet: sonuc.sabit.bitmedi ? '–' : formatTL(sonuc.sabit.toplamMaliyet),
                    toplam: sonuc.sabit.bitmedi ? '–' : formatTL(sonuc.sabit.toplamOdeme),
                  },
                  { ad: 'Yalnızca asgari', sure: sureMetni(sonuc.asgari), maliyet: formatTL(sonuc.asgari.toplamMaliyet), toplam: formatTL(sonuc.asgari.toplamOdeme) },
                ]}
              />

              {sonuc.hedef !== null && (
                <Callout kind="info">
                  Borcu <strong>{hedefAy} ayda</strong> kapatmak için her ay yaklaşık <strong>{formatTL(sonuc.hedef)}</strong> ödemeniz gerekir
                  {sonuc.hedef < ilkAsgari ? ` (ilk ay en az asgari tutar olan ${formatTL(ilkAsgari)} ödenmelidir)` : ''}.
                </Callout>
              )}

              {sonuc.sabit.bitmedi && (
                <Callout kind="danger">
                  <strong>Ayda {formatTL(sabit!)} ödeme faizi karşılamıyor:</strong> borç azalmaz, giderek büyür.
                </Callout>
              )}
              {sonuc.sabit.asgariAltiAy > 0 && (
                <Callout kind="danger">
                  <strong>Asgari tutarın altında ödeme:</strong> Ayda {formatTL(sabit!)} ödediğinizde {sonuc.sabit.asgariAltiAy} ekstrede asgari tutar
                  karşılanmıyor ve ödenmeyen kısma gecikme faizi (bu ay %{formatNumber(buAyOran.gecikme)}) işliyor
                  {sonuc.sabit.toplamGecikmeFaizi > 0 ? `; toplam gecikme faizi ${formatTL(sonuc.sabit.toplamGecikmeFaizi)}` : ''}. Bir takvim yılında
                  asgari tutar toplam üç kez ödenmezse kart nakit kullanımına, üst üste üç kez ödenmezse alışverişe de kapatılır.
                </Callout>
              )}
              {azamiAsim && buAyAzami && (
                <Callout kind="warning">
                  Girdiğiniz oran, bu dönem borcu için TCMB’nin ilan ettiği azami orandan (akdi %{formatNumber(buAyAzami.akdi)}, gecikme %
                  {formatNumber(buAyAzami.gecikme)}) yüksek. Bankalar bu oranların üzerinde faiz uygulayamaz.
                </Callout>
              )}

              <ShareBar
                params={{
                  borc,
                  limit,
                  tur: borcTuru === 'nakit' ? 'nakit' : null,
                  kur: kurumsal && borcTuru === 'alisveris' ? true : null,
                  akdi: oranMod === 'ozel' ? ozelAkdi : null,
                  gec: oranMod === 'ozel' ? ozelGecikme : null,
                  kkdf: kkdf !== vergiler.kkdf ? kkdf : null,
                  bsmv: bsmv !== vergiler.bsmv ? bsmv : null,
                  sabit,
                  hedef: hedefAy,
                }}
                summary={ozet}
              />
            </>
          ) : (
            <ResultEmpty>Sonucu görmek için dönem borcu, kart limiti ve aylık ödeme tutarını girin.</ResultEmpty>
          )}
        </div>
      </div>

      {sonuc && planSonuc && (
        <section class="calc-wide" aria-label="Ödeme planı">
          <Segmented
            name="ka-plan"
            label="Ekstre ekstre döküm"
            value={planGoster}
            onChange={setPlanGoster}
            options={[
              { value: 'asgari', label: 'Yalnızca asgari' },
              { value: 'sabit', label: `Her ay ${formatTL(sabit ?? 0, 0)}` },
            ]}
          />
          <DataTable
            scroll
            columns={[
              { key: 'ay', label: 'Ekstre' },
              { key: 'borc', label: 'Dönem borcu' },
              { key: 'asgari', label: 'Asgari' },
              { key: 'odeme', label: 'Ödeme' },
              { key: 'oran', label: 'Akdi faiz' },
              { key: 'faiz', label: 'Faiz' },
              { key: 'vergi', label: 'KKDF + BSMV' },
              { key: 'sonraki', label: 'Sonraki borç' },
            ]}
            rows={planSonuc.satirlar.map((s) => ({
              ay: String(s.ay),
              borc: formatTL(s.donemBorcu),
              asgari: formatTL(s.asgari),
              odeme: s.asgariAlti ? `${formatTL(s.odeme)} (asgari altı)` : formatTL(s.odeme),
              oran: formatPercent(s.akdiOran),
              faiz: s.gecikmeFaizi > 0 ? `${formatTL(s.akdiFaiz + s.gecikmeFaizi)} (${formatTL(s.gecikmeFaizi)} gecikme)` : formatTL(s.akdiFaiz),
              vergi: formatTL(s.kkdf + s.bsmv),
              sonraki: formatTL(s.sonraki),
            }))}
            foot={{
              ay: 'Toplam',
              borc: '',
              asgari: '',
              odeme: formatTL(planSonuc.toplamOdeme),
              oran: '',
              faiz: formatTL(planSonuc.toplamAkdiFaiz + planSonuc.toplamGecikmeFaizi),
              vergi: formatTL(planSonuc.toplamKkdf + planSonuc.toplamBsmv),
              sonraki: '',
            }}
          />
          {planSonuc.bitmedi && <p class="field__hint">Tablo, borcun bitmediği görüldüğü ekstrede kesildi.</p>}
        </section>
      )}
    </>
  );
}

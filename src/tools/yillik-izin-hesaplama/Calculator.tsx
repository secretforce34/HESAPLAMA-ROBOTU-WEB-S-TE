import { useEffect, useMemo, useState } from 'preact/hooks';
import { todayIsoTR } from '../../lib/finance';
import { formatDateTR, formatNumber, formatTL } from '../../lib/format';
import { CheckboxField, DateField, NumberField } from '../../ui/fields';
import { Callout, DataTable, Details, ResultEmpty, ResultHero, StatGrid } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { dateParam, readParams } from '../../ui/url';
import { hesaplaIzin, kullanilmayanIzinUcreti, validateIzin } from './calc';

export default function Calculator() {
  const [giris, setGiris] = useState('2019-09-01');
  const [dogum, setDogum] = useState('1990-05-10');
  const [hesap, setHesap] = useState('2026-10-29');
  const [kullanilan, setKullanilan] = useState<number | null>(0);
  const [ek, setEk] = useState<number | null>(0);
  const [yeralti, setYeralti] = useState(false);
  const [brut, setBrut] = useState<number | null>(null);

  useEffect(() => {
    setHesap(todayIsoTR());
    const p = readParams();
    const g = dateParam(p, 'giris');
    if (g) setGiris(g);
    const d = dateParam(p, 'dogum');
    if (d) setDogum(d);
  }, []);

  const errors = validateIzin({ giris, dogum, hesap, kullanilan, ek });
  const gecerli = Object.keys(errors).length === 0;
  const r = useMemo(
    () => (gecerli ? hesaplaIzin({ giris, dogum, hesapTarihi: hesap, yeraltı: yeralti, ekGun: ek!, kullanilan: kullanilan! }) : null),
    [gecerli, giris, dogum, hesap, yeralti, ek, kullanilan],
  );
  const ucret = r && brut && r.kalan > 0 ? kullanilmayanIzinUcreti(r.kalan, brut) : null;

  const ozet = r
    ? [
        `İşe giriş: ${formatDateTR(giris)} · hizmet ${r.hizmet.yil} yıl ${r.hizmet.ay} ay ${r.hizmet.gun} gün`,
        `Toplam hak edilen izin: ${r.toplamHak} gün, kullanılan: ${r.kullanilan} gün, kalan: ${r.kalan} gün`,
        r.sonraki ? `Sonraki hak ediş: ${formatDateTR(r.sonraki.tarih)} (${r.sonraki.gun} gün)` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <div class="row-2">
          <DateField id="yi-giris" label="İşe giriş tarihi" value={giris} onChange={setGiris} error={errors.giris} />
          <DateField id="yi-dogum" label="Doğum tarihi" value={dogum} onChange={setDogum} error={errors.dogum} hint="İzin süresi yaşa göre değişebilir." />
        </div>
        <DateField
          id="yi-hesap"
          label="Hesap tarihi"
          value={hesap}
          onChange={setHesap}
          error={errors.hesap}
          hint="Bugün ya da işten ayrılış tarihiniz."
        />
        <NumberField
          id="yi-kullanilan"
          label="Bugüne kadar kullandığınız izin"
          value={kullanilan}
          onChange={setKullanilan}
          suffix="gün"
          decimals={1}
          error={errors.kullanilan}
          hint="Hafta tatili ve resmî tatiller izinden sayılmaz."
        />
        <Details summary="Diğer seçenekler">
          <div class="calc-inputs">
            <CheckboxField id="yi-yeralti" label="Yeraltı işlerinde çalışıyorum" checked={yeralti} onChange={setYeralti} hint="İzin süreleri 4 gün artırılır." />
            <NumberField
              id="yi-ek"
              label="Sözleşmeyle her yıl verilen ek izin"
              value={ek}
              onChange={setEk}
              suffix="gün"
              decimals={0}
              error={errors.ek}
            />
            <NumberField
              id="yi-brut"
              label="Aylık brüt ücret (kullanılmayan izin ücreti için)"
              value={brut}
              onChange={setBrut}
              suffix="TL"
            />
          </div>
        </Details>
      </div>

      <div class="calc-results">
        {r ? (
          <>
            <ResultHero
              label="Kalan yıllık izniniz"
              value={`${formatNumber(r.kalan, 1)} gün`}
              sub={
                <>
                  Hak edilen {formatNumber(r.toplamHak, 0)} gün − kullanılan {formatNumber(r.kullanilan, 1)} gün
                </>
              }
            />
            <StatGrid
              items={[
                { label: 'Hizmet süresi', value: `${r.hizmet.yil} yıl ${r.hizmet.ay} ay` },
                { label: 'Hak ediş sayısı', value: `${r.hakEdisler.length}` },
                { label: 'Bu yılki hakkınız', value: r.hakEdisler.length ? `${r.hakEdisler[r.hakEdisler.length - 1].gun} gün` : '—' },
              ]}
            />
            {r.sonraki && (
              <Callout kind="info">
                Bir sonraki izin hakkınız <strong>{formatDateTR(r.sonraki.tarih)}</strong> tarihinde doğar: {r.sonraki.gun} gün
                ({r.sonraki.yil}. hizmet yılı{r.sonraki.yas >= 50 || r.sonraki.yas <= 18 ? `, ${r.sonraki.yas} yaş` : ''}).
              </Callout>
            )}
            {r.hakEdisler.length === 0 && (
              <Callout kind="warning">İzne hak kazanmak için deneme süresi dahil en az 1 yıl çalışmış olmak gerekir.</Callout>
            )}
            {r.kalan < 0 && <Callout kind="warning">Kullandığınız izin, hak ettiğinizden fazla görünüyor.</Callout>}
            {ucret !== null && (
              <Callout kind="success">
                İş sözleşmeniz bugün sona erse kullanılmayan {formatNumber(r.kalan, 1)} gün için yaklaşık <strong>{formatTL(ucret)}</strong> brüt
                izin ücreti ödenmesi gerekir (İş K. md. 59).
              </Callout>
            )}
            {r.hakEdisler.length > 0 && (
              <DataTable
                caption="Hizmet yıllarına göre hak edişler"
                scroll={r.hakEdisler.length > 10}
                columns={[
                  { key: 'y', label: 'Yıl' },
                  { key: 't', label: 'Hak ediş tarihi' },
                  { key: 'a', label: 'Yaş' },
                  { key: 'g', label: 'İzin' },
                ]}
                rows={r.hakEdisler.map((h) => ({ y: `${h.yil}.`, t: formatDateTR(h.tarih), a: String(h.yas), g: `${h.gun} gün` }))}
                foot={{ y: 'Toplam', t: '', a: '', g: `${r.toplamHak} gün` }}
              />
            )}
            <ShareBar params={{ giris, dogum }} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için tarihleri girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}

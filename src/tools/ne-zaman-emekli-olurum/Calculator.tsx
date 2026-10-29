import { useEffect, useMemo, useState } from 'preact/hooks';
import { todayIsoTR } from '../../lib/finance';
import { formatDateTR, formatNumber } from '../../lib/format';
import { CheckboxField, DateField, NumberField, Segmented } from '../../ui/fields';
import { Breakdown, Callout, Details, ResultEmpty, ResultHero } from '../../ui/results';
import { ShareBar } from '../../ui/ShareBar';
import { hesaplaEmeklilik, kalanSure, validateEmeklilik, type Cinsiyet, type Statu, type Yol } from './calc';

function YolKutusu({ yol, bugun }: { yol: Yol; bugun: string }) {
  return (
    <Breakdown
      title={yol.ad}
      rows={[
        ...yol.sartlar.map((s) => ({
          label: `${s.tamam ? '✓' : '⏳'} ${s.ad}`,
          hint: s.gereken,
          value: s.gereken === 'Yaş şartı yok' ? '—' : s.tamam ? 'Tamam' : formatDateTR(s.tarih!),
        })),
        { label: 'Emekliliğe hak kazanma', value: yol.tarih <= bugun ? 'Şimdi' : formatDateTR(yol.tarih), kind: 'total' as const },
      ]}
    />
  );
}

export default function Calculator() {
  const [statu, setStatu] = useState<Statu>('4a');
  const [cinsiyet, setCinsiyet] = useState<Cinsiyet>('erkek');
  const [dogum, setDogum] = useState('1980-01-01');
  const [giris, setGiris] = useState('2003-06-01');
  const [gun, setGun] = useState<number | null>(5500);
  const [yillik, setYillik] = useState<number | null>(360);
  const [borc, setBorc] = useState<number | null>(0);
  const [borcOnce, setBorcOnce] = useState(false);
  const [bugun, setBugun] = useState('2026-10-29');

  useEffect(() => setBugun(todayIsoTR()), []);

  const errors = validateEmeklilik({ dogum, giris, gun, yillik, bugun });
  const r = useMemo(
    () =>
      Object.keys(errors).length === 0
        ? hesaplaEmeklilik({
            statu,
            cinsiyet,
            dogum,
            ilkGiris: giris,
            primGun: gun!,
            yillikGun: yillik!,
            bugun,
            borclanmaGun: borc ?? 0,
            borclanmaGiristenOnce: borcOnce,
          })
        : null,
    [statu, cinsiyet, dogum, giris, gun, yillik, bugun, borc, borcOnce, JSON.stringify(errors)],
  );

  const e = r?.enErken;
  const kalan = e ? kalanSure(bugun, e.tarih) : null;
  const ozet =
    r && e
      ? [
          `Grup: ${r.grupAdi}`,
          e.tamam ? 'Emekliliğe hak kazanmış görünüyorum.' : `En erken emeklilik: ${formatDateTR(e.tarih)} (${e.yas} yaş, ${e.ad})`,
          'Kesin tarih için e-Devlet SGK hizmet dökümü esas alınır.',
        ].join('\n')
      : '';

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented
          name="ne-statu"
          label="Sigorta türünüz"
          value={statu}
          onChange={setStatu}
          options={[
            { value: '4a', label: 'SSK (4/a, işçi)' },
            { value: '4b', label: 'Bağ-Kur (4/b, esnaf)' },
          ]}
        />
        <Segmented
          name="ne-cinsiyet"
          label="Cinsiyet"
          value={cinsiyet}
          onChange={setCinsiyet}
          options={[
            { value: 'kadin', label: 'Kadın' },
            { value: 'erkek', label: 'Erkek' },
          ]}
        />
        <div class="row-2">
          <DateField id="ne-dogum" label="Doğum tarihi" value={dogum} onChange={setDogum} error={errors.dogum} />
          <DateField
            id="ne-giris"
            label="İlk sigorta başlangıcı"
            value={giris}
            onChange={setGiris}
            error={errors.giris}
            hint="İlk kez sigortalı olduğunuz gün (staj ve çıraklık hariç olabilir)."
          />
        </div>
        <NumberField
          id="ne-gun"
          label="Bugüne kadar ödenen prim günü"
          value={gun}
          onChange={setGun}
          suffix="gün"
          decimals={0}
          inputMode="numeric"
          error={errors.gun}
          hint="e-Devlet → SGK Tescil ve Hizmet Dökümü’ndeki toplam gün."
        />
        <NumberField
          id="ne-yillik"
          label="Bundan sonra yılda çalışacağınız gün"
          value={yillik}
          onChange={setYillik}
          suffix="gün"
          decimals={0}
          error={errors.yillik}
          hint="Kesintisiz tam çalışmada 360 gündür."
        />
        <Details summary="Askerlik veya doğum borçlanması">
          <div class="calc-inputs">
            <NumberField id="ne-borc" label="Borçlanacağınız gün" value={borc} onChange={setBorc} suffix="gün" decimals={0} />
            <CheckboxField
              id="ne-borc-once"
              label="Bu süre ilk işe girişimden önceye ait (ör. işe başlamadan yapılan askerlik)"
              checked={borcOnce}
              onChange={setBorcOnce}
              hint="Bu durumda sigortalılık başlangıcınız borçlanılan gün kadar geriye çekilir ve emeklilik grubunuz değişebilir."
            />
          </div>
        </Details>
      </div>

      <div class="calc-results">
        {r && e ? (
          <>
            {e.tarih === '9999-12-31' ? (
              <Callout kind="warning">Yılda prim ödenmeyecek görünüyor; eksik gün tamamlanamaz.</Callout>
            ) : (
              <ResultHero
                label={e.tamam ? 'Durumunuz' : 'En erken emeklilik tarihiniz (tahmini)'}
                value={e.tamam ? 'Emekliliğe hak kazanmış görünüyorsunuz' : formatDateTR(e.tarih)}
                sub={
                  e.tamam ? (
                    <>Şartları {formatDateTR(e.tarih)} tarihi itibarıyla sağlıyorsunuz</>
                  ) : (
                    <>
                      {kalan!.yil} yıl {kalan!.ay} ay sonra · {e.yas} yaşında · {e.ad}
                    </>
                  )
                }
              />
            )}
            <Callout kind="info">
              <strong>Grubunuz:</strong> {r.grupAdi}
              {r.baslangic !== giris && <> — borçlanmayla başlangıç {formatDateTR(r.baslangic)} kabul edildi</>}. Toplam prim günü{' '}
              {formatNumber(r.toplamGun, 0)}.
            </Callout>
            <YolKutusu yol={r.ana} bugun={bugun} />
            {r.alternatifler.map((a) => (
              <YolKutusu key={a.ad} yol={a} bugun={bugun} />
            ))}
            <Callout kind="warning">
              Bu bir tahmindir. Kesin emeklilik tarihiniz, hizmet birleştirme, statü (son 7 yılda en çok prim ödenen statü esas alınır),
              borçlanma ve dökümünüzdeki ayrıntılara göre farklı olabilir. e-Devlet’teki SGK “Ne Zaman Emekli Olabilirim” hizmetinden
              ve SGK’dan teyit edin.
            </Callout>
            {statu === '4b' && <Callout kind="info">Bağ-Kur’da emeklilik için prim ve genel sağlık sigortası borcunun bulunmaması gerekir.</Callout>}
            <ShareBar params={{}} summary={ozet} />
          </>
        ) : (
          <ResultEmpty>Sonucu görmek için bilgilerinizi girin.</ResultEmpty>
        )}
      </div>
    </div>
  );
}

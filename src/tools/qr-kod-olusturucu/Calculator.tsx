import { useEffect, useMemo, useState } from 'preact/hooks';
import { downloadPng, downloadSvg, loadQr, makeMatrix, matrixToSvg, type Ecc } from '../../lib/qr';
import { formatNumber } from '../../lib/format';
import { CheckboxField, NumberField, Segmented, SelectField, TextField } from '../../ui/fields';
import { Callout, Details, ResultEmpty } from '../../ui/results';
import {
  baglantiMetni,
  epostaMetni,
  ibanGecerli,
  ibanMetni,
  kontrastOrani,
  onPlanKoyuMu,
  smsMetni,
  telefonMetni,
  vcardMetni,
  wifiMetni,
  type Kartvizit,
  type QrTur,
  type WifiGuvenlik,
} from './calc';

const TURLER: { value: QrTur; label: string }[] = [
  { value: 'baglanti', label: 'Bağlantı' },
  { value: 'metin', label: 'Metin' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'kartvizit', label: 'Kartvizit' },
  { value: 'iban', label: 'IBAN' },
  { value: 'eposta', label: 'E-posta' },
  { value: 'sms', label: 'SMS' },
  { value: 'telefon', label: 'Telefon' },
];

const ECC_ADI: Record<Ecc, string> = { L: 'Düşük (%7)', M: 'Orta (%15)', Q: 'Yüksek (%25)', H: 'En yüksek (%30)' };

function TextArea({ id, label, value, onChange, hint, rows = 3 }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; rows?: number }) {
  return (
    <div class="field">
      <label class="field__label" for={id}>
        {label}
      </label>
      <div class="input-wrap">
        <textarea id={id} class="input" rows={rows} value={value} onInput={(e) => onChange(e.currentTarget.value)} style={{ resize: 'vertical' }} />
      </div>
      {hint && <p class="field__hint">{hint}</p>}
    </div>
  );
}

function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div class="field">
      <label class="field__label" for={id}>
        {label}
      </label>
      <div class="input-wrap">
        <input id={id} type="color" value={value} onInput={(e) => onChange(e.currentTarget.value)} class="qr-color" />
        <span class="input-affix">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

export default function Calculator() {
  const [factory, setFactory] = useState<Awaited<ReturnType<typeof loadQr>> | null>(null);
  const [tur, setTur] = useState<QrTur>('baglanti');
  const [url, setUrl] = useState('https://hesaprobotu.com');
  const [metin, setMetin] = useState('');
  const [wifi, setWifi] = useState({ ssid: '', sifre: '', guvenlik: 'WPA' as WifiGuvenlik, gizli: false });
  const [kart, setKart] = useState<Kartvizit>({ ad: '', soyad: '', telefon: '', eposta: '', sirket: '', unvan: '', web: '', adres: '' });
  const [iban, setIban] = useState({ alici: '', iban: '', aciklama: '', tutar: '' });
  const [eposta, setEposta] = useState({ adres: '', konu: '', govde: '' });
  const [tel, setTel] = useState({ numara: '', mesaj: '' });
  const [fg, setFg] = useState('#0d3461');
  const [bg, setBg] = useState('#ffffff');
  const [ecc, setEcc] = useState<Ecc>('M');
  const [margin, setMargin] = useState<number | null>(4);
  const [px, setPx] = useState<'512' | '1024' | '2048'>('1024');

  useEffect(() => {
    // Kütüphane bir fonksiyon olduğu için state'e sarmalanarak konur (yoksa Preact onu güncelleme fonksiyonu sanar)
    loadQr().then((f) => setFactory(() => f));
  }, []);

  const icerik = useMemo(() => {
    switch (tur) {
      case 'baglanti':
        return baglantiMetni(url);
      case 'metin':
        return metin.trim();
      case 'wifi':
        return wifiMetni(wifi);
      case 'kartvizit':
        return vcardMetni(kart);
      case 'iban':
        return ibanMetni(iban);
      case 'eposta':
        return epostaMetni(eposta.adres, eposta.konu, eposta.govde);
      case 'sms':
        return smsMetni(tel.numara, tel.mesaj);
      case 'telefon':
        return telefonMetni(tel.numara);
    }
  }, [tur, url, metin, wifi, kart, iban, eposta, tel]);

  const qr = useMemo(() => {
    if (!factory || !icerik) return null;
    try {
      return { matrix: makeMatrix(factory, icerik, ecc), hata: null };
    } catch {
      return { matrix: null, hata: 'Bu içerik QR koda sığmayacak kadar uzun. Metni kısaltın ya da hata düzeltme seviyesini düşürün.' };
    }
  }, [factory, icerik, ecc]);

  const kenar = margin === null ? 4 : Math.min(Math.max(Math.round(margin), 0), 20);
  const renk = { margin: kenar, fg, bg };
  const kontrast = kontrastOrani(fg, bg);
  const ters = !onPlanKoyuMu(fg, bg);
  const ibanHatali = tur === 'iban' && iban.iban.trim() !== '' && !ibanGecerli(iban.iban);
  const dosyaAdi = `qr-${tur}`;
  const bayt = new TextEncoder().encode(icerik).length;

  return (
    <div class="calc-grid">
      <div class="calc-inputs">
        <Segmented name="qr-tur" label="QR kodun içeriği" value={tur} onChange={setTur} options={TURLER} />

        {tur === 'baglanti' && <TextField id="qr-url" label="Bağlantı (web adresi)" value={url} onChange={setUrl} placeholder="https://" hint="Başına https:// yazmazsanız eklenir." />}
        {tur === 'metin' && <TextArea id="qr-metin" label="Metin" value={metin} onChange={setMetin} rows={4} hint="Okutulunca telefonda bu metin görünür." />}

        {tur === 'wifi' && (
          <>
            <TextField id="qr-ssid" label="Ağ adı (SSID)" value={wifi.ssid} onChange={(v) => setWifi({ ...wifi, ssid: v })} />
            <SelectField
              id="qr-guvenlik"
              label="Güvenlik"
              value={wifi.guvenlik}
              onChange={(v) => setWifi({ ...wifi, guvenlik: v })}
              options={[
                { value: 'WPA', label: 'WPA / WPA2 / WPA3 (çoğu modem)' },
                { value: 'WEP', label: 'WEP (eski modemler)' },
                { value: 'nopass', label: 'Şifresiz' },
              ]}
            />
            {wifi.guvenlik !== 'nopass' && <TextField id="qr-sifre" label="Şifre" value={wifi.sifre} onChange={(v) => setWifi({ ...wifi, sifre: v })} />}
            <CheckboxField id="qr-gizli" label="Gizli ağ (ağ adı yayınlanmıyor)" checked={wifi.gizli} onChange={(v) => setWifi({ ...wifi, gizli: v })} />
          </>
        )}

        {tur === 'kartvizit' && (
          <>
            <div class="row-2">
              <TextField id="qr-ad" label="Ad" value={kart.ad} onChange={(v) => setKart({ ...kart, ad: v })} />
              <TextField id="qr-soyad" label="Soyad" value={kart.soyad} onChange={(v) => setKart({ ...kart, soyad: v })} />
            </div>
            <div class="row-2">
              <TextField id="qr-tel" label="Telefon" value={kart.telefon} onChange={(v) => setKart({ ...kart, telefon: v })} placeholder="0532 123 45 67" />
              <TextField id="qr-eposta" label="E-posta" value={kart.eposta} onChange={(v) => setKart({ ...kart, eposta: v })} />
            </div>
            <div class="row-2">
              <TextField id="qr-sirket" label="Şirket" value={kart.sirket} onChange={(v) => setKart({ ...kart, sirket: v })} />
              <TextField id="qr-unvan" label="Unvan" value={kart.unvan} onChange={(v) => setKart({ ...kart, unvan: v })} />
            </div>
            <TextField id="qr-web" label="Web sitesi" value={kart.web} onChange={(v) => setKart({ ...kart, web: v })} />
            <TextField id="qr-adres" label="Adres" value={kart.adres} onChange={(v) => setKart({ ...kart, adres: v })} />
          </>
        )}

        {tur === 'iban' && (
          <>
            <TextField id="qr-alici" label="Alıcı adı soyadı" value={iban.alici} onChange={(v) => setIban({ ...iban, alici: v })} />
            <TextField
              id="qr-iban"
              label="IBAN"
              value={iban.iban}
              onChange={(v) => setIban({ ...iban, iban: v })}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              error={ibanHatali ? 'Bu IBAN geçersiz görünüyor (TR ile başlayan 26 karakter, kontrol basamağı tutmuyor).' : null}
            />
            <div class="row-2">
              <TextField id="qr-tutar" label="Tutar (isteğe bağlı)" value={iban.tutar} onChange={(v) => setIban({ ...iban, tutar: v })} placeholder="ör. 1.500 TL" />
              <TextField id="qr-aciklama" label="Açıklama (isteğe bağlı)" value={iban.aciklama} onChange={(v) => setIban({ ...iban, aciklama: v })} />
            </div>
          </>
        )}

        {tur === 'eposta' && (
          <>
            <TextField id="qr-mail" label="E-posta adresi" value={eposta.adres} onChange={(v) => setEposta({ ...eposta, adres: v })} />
            <TextField id="qr-konu" label="Konu" value={eposta.konu} onChange={(v) => setEposta({ ...eposta, konu: v })} />
            <TextArea id="qr-govde" label="Mesaj" value={eposta.govde} onChange={(v) => setEposta({ ...eposta, govde: v })} />
          </>
        )}

        {(tur === 'sms' || tur === 'telefon') && (
          <TextField id="qr-numara" label="Telefon numarası" value={tel.numara} onChange={(v) => setTel({ ...tel, numara: v })} placeholder="0532 123 45 67" />
        )}
        {tur === 'sms' && <TextArea id="qr-mesaj" label="Mesaj" value={tel.mesaj} onChange={(v) => setTel({ ...tel, mesaj: v })} />}

        <Details summary="Renk, boyut ve okunabilirlik">
          <div class="row-2">
            <ColorField id="qr-fg" label="Kod rengi" value={fg} onChange={setFg} />
            <ColorField id="qr-bg" label="Zemin rengi" value={bg} onChange={setBg} />
          </div>
          <Segmented
            name="qr-ecc"
            label="Hata düzeltme"
            value={ecc}
            onChange={setEcc}
            options={(['L', 'M', 'Q', 'H'] as const).map((v) => ({ value: v, label: ECC_ADI[v] }))}
            hint="Yüksek seviye, kod kirlense ya da yıpransa da okunmasını sağlar; kod biraz büyür."
          />
          <div class="row-2">
            <NumberField id="qr-kenar" label="Kenar boşluğu" value={margin} onChange={setMargin} suffix="kare" decimals={0} hint="Standart en az 4." />
            <SelectField
              id="qr-px"
              label="PNG boyutu"
              value={px}
              onChange={setPx}
              options={[
                { value: '512', label: '512 × 512 piksel' },
                { value: '1024', label: '1024 × 1024 piksel' },
                { value: '2048', label: '2048 × 2048 piksel (baskı)' },
              ]}
            />
          </div>
        </Details>
      </div>

      <div class="calc-results">
        {qr?.matrix ? (
          <>
            <div class="qr-preview">
              <div class="qr-preview__code" dangerouslySetInnerHTML={{ __html: matrixToSvg(qr.matrix, renk) }} />
              <p class="qr-preview__meta">
                {qr.matrix.size} × {qr.matrix.size} kare · {formatNumber(bayt, 0)} bayt · hata düzeltme {ECC_ADI[ecc].toLocaleLowerCase('tr')}
              </p>
            </div>
            <div class="share-bar">
              <button type="button" class="btn btn--primary" onClick={() => downloadPng(qr.matrix!, `${dosyaAdi}.png`, Number(px), renk)}>
                PNG indir
              </button>
              <button type="button" class="btn" onClick={() => downloadSvg(qr.matrix!, `${dosyaAdi}.svg`, renk)}>
                SVG indir (baskı için)
              </button>
            </div>
            {(kontrast < 3 || ters) && (
              <Callout kind="warning">
                {ters
                  ? 'Kod rengi zeminden açık. Bazı telefonlar ters renkli QR kodu okuyamaz; koyu kod, açık zemin önerilir.'
                  : `Renkler arasındaki fark düşük (kontrast ${formatNumber(kontrast, 1)}:1). Kodun rahat okunması için en az 3:1 olmalı.`}
              </Callout>
            )}
            {tur === 'iban' && (
              <Callout kind="info">
                Bu QR kod IBAN ve açıklamayı metin olarak taşır: okutan kişi bilgileri kopyalayıp bankacılık uygulamasına yapıştırır. Bankaların
                “karekodla ödeme” özelliği farklı bir biçim kullanır; bu kodla doğrudan ödeme ekranı açılmayabilir.
              </Callout>
            )}
            <Details summary="QR kodun içindeki metin">
              <pre class="formula" style={{ margin: 0 }}>
                {icerik}
              </pre>
            </Details>
            <Callout kind="success">QR kod tarayıcınızda oluşturulur; yazdığınız bilgiler (Wi-Fi şifresi, IBAN vb.) hiçbir yere gönderilmez.</Callout>
          </>
        ) : qr?.hata ? (
          <Callout kind="danger">{qr.hata}</Callout>
        ) : (
          <ResultEmpty>{factory ? 'QR kodu görmek için içeriği yazın.' : 'QR oluşturucu hazırlanıyor…'}</ResultEmpty>
        )}
      </div>
    </div>
  );
}

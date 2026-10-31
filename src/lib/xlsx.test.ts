import { describe, expect, it } from 'vitest';
import { strToU8, unzipSync, zipSync, strFromU8 } from 'fflate';
import { csvOku, excelTarihi, hucreKonumu, hucreMetni, sayfaAdlari, sutunHarfi, xlsxOku, xlsxYaz } from './xlsx';

describe('hücre adresleri', () => {
  it('sütun harfleri', () => {
    expect(sutunHarfi(0)).toBe('A');
    expect(sutunHarfi(25)).toBe('Z');
    expect(sutunHarfi(26)).toBe('AA');
    expect(sutunHarfi(701)).toBe('ZZ');
  });

  it('adres çözme', () => {
    expect(hucreKonumu('A1')).toEqual({ sutun: 0, satir: 0 });
    expect(hucreKonumu('AB12')).toEqual({ sutun: 27, satir: 11 });
  });

  it('sayfa adları: yasak karakter, uzunluk ve tekrar', () => {
    expect(sayfaAdlari(['Ocak/Şubat', 'Sayfa', 'sayfa', 'x'.repeat(40)])).toEqual(['Ocak Şubat', 'Sayfa', 'sayfa 2', 'x'.repeat(31)]);
  });
});

describe('xlsx yazma ve okuma', () => {
  it('yazılan dosya geri okunur: metin, sayı, boş hücre, Türkçe ve özel karakter', () => {
    const bytes = xlsxYaz([
      { ad: 'Ekstre', satirlar: [['Tarih', 'Açıklama', 'Tutar'], ['01.10.2026', 'Market & Fırın <özel>', -1250.5], ['02.10.2026', null, 3000]] },
      { ad: 'Özet', satirlar: [['Toplam', 1749.5]] },
    ]);
    const s = xlsxOku(bytes);
    expect(s.map((x) => x.ad)).toEqual(['Ekstre', 'Özet']);
    expect(s[0].satirlar[1]).toEqual(['01.10.2026', 'Market & Fırın <özel>', -1250.5]);
    expect(s[0].satirlar[2]).toEqual(['02.10.2026', null, 3000]);
    expect(s[1].satirlar[0]).toEqual(['Toplam', 1749.5]);
  });

  it('gerekli Excel parçaları ZIP içinde', () => {
    const z = unzipSync(xlsxYaz([{ ad: 'A', satirlar: [[1]] }]));
    expect(Object.keys(z)).toEqual(expect.arrayContaining(['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/styles.xml']));
  });

  it('paylaşılan metinler ve tarih biçimli hücreler (Excel’in kendi kaydettiği biçim)', () => {
    const x = (s: string) => strToU8(s);
    const bytes = zipSync({
      'xl/workbook.xml': x('<workbook><sheets><sheet name="Veri" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      'xl/_rels/workbook.xml.rels': x('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
      'xl/sharedStrings.xml': x('<sst><si><t>Ad</t></si><si><r><t>Kalın </t></r><r><t>yazı</t></r></si></sst>'),
      'xl/styles.xml': x('<styleSheet><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/></cellXfs></styleSheet>'),
      'xl/worksheets/sheet1.xml': x('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row><row r="2"><c r="A2" s="1"><v>46326</v></c><c r="B2"><v>12.5</v></c><c r="C2" t="b"><v>1</v></c></row></sheetData></worksheet>'),
    });
    const s = xlsxOku(bytes)[0];
    expect(s.satirlar[0]).toEqual(['Ad', null, 'Kalın yazı']);
    expect(s.satirlar[1]).toEqual(['31.10.2026', 12.5, 'DOĞRU']);
  });

  it('xlsx olmayan dosya anlaşılır hata verir', () => {
    expect(() => xlsxOku(strToU8('merhaba'))).toThrow(/xlsx/);
  });

  it('tarih seri numarası', () => {
    expect(excelTarihi(46326)).toBe('31.10.2026');
    expect(excelTarihi(46326.5)).toBe('31.10.2026 12:00');
  });
});

describe('CSV', () => {
  it('noktalı virgül ayraç, tırnaklı alan ve satır sonu', () => {
    expect(csvOku('Ad;Tutar\n"Ali; Veli";"1.250,50"\r\nAyşe;"Bir ""tırnak"""')).toEqual([
      ['Ad', 'Tutar'],
      ['Ali; Veli', '1.250,50'],
      ['Ayşe', 'Bir "tırnak"'],
    ]);
  });

  it('virgül ayraç', () => {
    expect(csvOku('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('hücre metni: sayıda ondalık virgül', () => {
    expect(hucreMetni(1250.5)).toBe('1250,5');
    expect(hucreMetni(null)).toBe('');
    expect(strFromU8(strToU8('ş'))).toBe('ş');
  });
});

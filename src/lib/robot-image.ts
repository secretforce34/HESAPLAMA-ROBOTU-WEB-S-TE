// Robot kartlarındaki yuvarlak resimler: src/assets/robotlar/<slug>.webp (ya da .png/.jpg).
// Resmi olmayan robotta kartta geçici olarak emoji gösterilir.
const files = import.meta.glob<string>('../assets/robotlar/*.{webp,png,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const bySlug = new Map(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace(/\.\w+$/, ''), url] as const),
);

export function robotImage(slug: string): string | undefined {
  return bySlug.get(slug);
}

// Harf ve rakam verileri.
// Her karakter 100 x 130 birimlik bir kutuda çizilir:
//   üst çizgi y=20, orta çizgi y=65, taban çizgisi y=110.
// "strokes": çizim sırasına göre SVG yol (path) tanımları. Her yolun
// başlangıç noktası, çocuğun parmağını koyması gereken yerdir.

const DOT = (x, y) => `M${x} ${y - 1.5} L${x} ${y + 1.5}`;
const CEDILLA = 'M50 110 L48 117 C58 117 59 128 45 127';

const C_ARC = 'M78 34 C70 23 61 20 50 20 C29 20 18 41 18 65 C18 89 29 110 50 110 C61 110 70 107 78 96';
const G_ARC = 'M80 34 C72 23 62 20 50 20 C29 20 18 41 18 65 C18 89 29 110 50 110 C68 110 80 98 80 80 L80 68';
const O_RING = 'M50 20 C27 20 16 43 16 65 C16 88 27 110 50 110 C73 110 84 88 84 65 C84 43 73 20 50 20';
const S_CURVE = 'M76 32 C69 23 60 20 50 20 C33 20 24 29 24 41 C24 56 39 60 50 63 C63 66 78 72 78 88 C78 102 66 110 50 110 C38 110 28 106 22 96';
const U_CURVE = 'M22 20 L22 80 C22 100 34 110 50 110 C66 110 78 100 78 80 L78 20';

export const LETTERS = [
  { ch: 'A', say: 'a', word: 'Arı', emoji: '🐝', strokes: ['M50 20 L18 110', 'M50 20 L82 110', 'M31 78 L69 78'] },
  { ch: 'B', say: 'be', word: 'Balık', emoji: '🐟', strokes: ['M25 20 L25 110', 'M25 20 L54 20 C79 20 79 63 54 63 L25 63', 'M25 63 L58 63 C87 63 87 110 58 110 L25 110'] },
  { ch: 'C', say: 'ce', word: 'Civciv', emoji: '🐥', strokes: [C_ARC] },
  { ch: 'Ç', say: 'çe', word: 'Çiçek', emoji: '🌸', strokes: [C_ARC, CEDILLA] },
  { ch: 'D', say: 'de', word: 'Dondurma', emoji: '🍦', strokes: ['M24 20 L24 110', 'M24 20 L44 20 C90 20 90 110 44 110 L24 110'] },
  { ch: 'E', say: 'e', word: 'Elma', emoji: '🍎', strokes: ['M26 20 L26 110', 'M26 20 L76 20', 'M26 65 L68 65', 'M26 110 L76 110'] },
  { ch: 'F', say: 'fe', word: 'Fil', emoji: '🐘', strokes: ['M28 20 L28 110', 'M28 20 L76 20', 'M28 65 L68 65'] },
  { ch: 'G', say: 'ge', word: 'Güneş', emoji: '☀️', strokes: [G_ARC, 'M56 68 L80 68'] },
  { ch: 'Ğ', say: 'yumuşak ge', word: 'Dağ', emoji: '⛰️', strokes: ['M38 4 Q50 15 62 4', G_ARC, 'M56 68 L80 68'] },
  { ch: 'H', say: 'he', word: 'Havuç', emoji: '🥕', strokes: ['M24 20 L24 110', 'M76 20 L76 110', 'M24 65 L76 65'] },
  { ch: 'I', say: 'ı', word: 'Irmak', emoji: '🏞️', strokes: ['M50 20 L50 110'] },
  { ch: 'İ', say: 'i', word: 'İnek', emoji: '🐄', strokes: ['M50 20 L50 110', DOT(50, 7)] },
  { ch: 'J', say: 'je', word: 'Jaguar', emoji: '🐆', strokes: ['M66 20 L66 84 C66 103 56 110 45 110 C33 110 25 102 23 90'] },
  { ch: 'K', say: 'ke', word: 'Kedi', emoji: '🐱', strokes: ['M26 20 L26 110', 'M76 20 L26 72', 'M43 55 L78 110'] },
  { ch: 'L', say: 'le', word: 'Limon', emoji: '🍋', strokes: ['M28 20 L28 110 L76 110'] },
  { ch: 'M', say: 'me', word: 'Muz', emoji: '🍌', strokes: ['M18 110 L18 20', 'M18 20 L50 82 L82 20 L82 110'] },
  { ch: 'N', say: 'ne', word: 'Nota', emoji: '🎵', strokes: ['M22 110 L22 20', 'M22 20 L78 110', 'M78 110 L78 20'] },
  { ch: 'O', say: 'o', word: 'Oyuncak', emoji: '🧸', strokes: [O_RING] },
  { ch: 'Ö', say: 'ö', word: 'Ördek', emoji: '🦆', strokes: [O_RING, DOT(37, 7), DOT(63, 7)] },
  { ch: 'P', say: 'pe', word: 'Papağan', emoji: '🦜', strokes: ['M26 20 L26 110', 'M26 20 L52 20 C80 20 80 66 52 66 L26 66'] },
  { ch: 'R', say: 're', word: 'Robot', emoji: '🤖', strokes: ['M26 20 L26 110', 'M26 20 L52 20 C80 20 80 66 52 66 L26 66', 'M48 66 L78 110'] },
  { ch: 'S', say: 'se', word: 'Sincap', emoji: '🐿️', strokes: [S_CURVE] },
  { ch: 'Ş', say: 'şe', word: 'Şemsiye', emoji: '☂️', strokes: [S_CURVE, CEDILLA] },
  { ch: 'T', say: 'te', word: 'Tavşan', emoji: '🐰', strokes: ['M18 20 L82 20', 'M50 20 L50 110'] },
  { ch: 'U', say: 'u', word: 'Uçak', emoji: '✈️', strokes: [U_CURVE] },
  { ch: 'Ü', say: 'ü', word: 'Üzüm', emoji: '🍇', strokes: [U_CURVE, DOT(37, 7), DOT(63, 7)] },
  { ch: 'V', say: 've', word: 'Vapur', emoji: '⛴️', strokes: ['M18 20 L50 110 L82 20'] },
  { ch: 'Y', say: 'ye', word: 'Yıldız', emoji: '⭐', strokes: ['M18 20 L50 64', 'M82 20 L50 64', 'M50 64 L50 110'] },
  { ch: 'Z', say: 'ze', word: 'Zürafa', emoji: '🦒', strokes: ['M22 20 L78 20 L22 110 L78 110'] },
];

export const DIGITS = [
  { ch: '0', say: 'sıfır', word: 'Hiç yok!', emoji: '', count: 0, strokes: ['M50 20 C30 20 22 44 22 65 C22 88 30 110 50 110 C70 110 78 88 78 65 C78 44 70 20 50 20'] },
  { ch: '1', say: 'bir', word: 'güneş', emoji: '☀️', count: 1, strokes: ['M32 40 L56 20 L56 110'] },
  { ch: '2', say: 'iki', word: 'kedi', emoji: '🐱', count: 2, strokes: ['M24 40 C26 27 37 20 50 20 C65 20 76 29 76 43 C76 60 60 74 24 110 L78 110'] },
  { ch: '3', say: 'üç', word: 'çilek', emoji: '🍓', count: 3, strokes: ['M24 31 C31 23 40 20 50 20 C65 20 74 29 74 41 C74 54 63 62 46 62 C64 62 78 71 78 87 C78 101 66 110 50 110 C38 110 28 106 22 97'] },
  { ch: '4', say: 'dört', word: 'uğur böceği', emoji: '🐞', count: 4, strokes: ['M58 20 L20 82 L82 82', 'M62 46 L62 110'] },
  { ch: '5', say: 'beş', word: 'yıldız', emoji: '⭐', count: 5, strokes: ['M32 20 L28 60 C36 55 44 53 52 53 C68 53 78 65 78 81 C78 98 66 110 50 110 C38 110 28 105 22 96', 'M32 20 L74 20'] },
  { ch: '6', say: 'altı', word: 'balon', emoji: '🎈', count: 6, strokes: ['M70 25 C64 21 58 20 50 20 C30 20 22 43 22 70 C22 95 34 110 50 110 C66 110 78 98 78 82 C78 66 66 56 50 56 C36 56 25 65 22 79'] },
  { ch: '7', say: 'yedi', word: 'çiçek', emoji: '🌸', count: 7, strokes: ['M22 20 L78 20 L40 110'] },
  { ch: '8', say: 'sekiz', word: 'balık', emoji: '🐟', count: 8, strokes: ['M72 34 C68 25 60 20 50 20 C37 20 27 28 27 40 C27 53 39 59 50 63 C63 67 77 74 77 88 C77 101 65 110 50 110 C35 110 23 101 23 88 C23 74 37 67 50 63 C61 59 73 53 73 40'] },
  { ch: '9', say: 'dokuz', word: 'elma', emoji: '🍎', count: 9, strokes: ['M78 46 C78 31 66 20 50 20 C34 20 22 31 22 46 C22 61 34 72 50 72 C66 72 78 61 78 46 L78 110'] },
];

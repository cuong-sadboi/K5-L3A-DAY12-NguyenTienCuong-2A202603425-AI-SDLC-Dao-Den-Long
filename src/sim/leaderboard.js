// Bảng xếp hạng cục bộ (Ticket-04): hàm thuần dùng chung cho game, máy chủ dev và lệnh xuất.
// Tên 3–12 ký tự [A-Za-z0-9_]; chấp nhận thêm chữ tiếng Việt có dấu (điểm cộng).
export const MAX_ENTRIES = 10;
const NAME_RE = /^[\p{L}\p{N}_]{3,12}$/u;

export function validName(name) {
  return typeof name === 'string' && NAME_RE.test(name.normalize('NFC'));
}

// Điểm giảm dần; bằng điểm thì ai đạt trước đứng trên.
export function sortEntries(entries) {
  return [...entries].sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at));
}

export function addEntry(entries, entry) {
  return sortEntries([...(entries || []), entry]).slice(0, MAX_ENTRIES);
}

export function validEntry(e) {
  return (
    e &&
    validName(e.name) &&
    Number.isFinite(e.score) &&
    Number.isInteger(e.nights_won) &&
    e.nights_won >= 0 &&
    e.nights_won <= 3 &&
    !Number.isNaN(Date.parse(e.achieved_at)) &&
    Number.isFinite(e.seed)
  );
}

// ISO 8601 có múi giờ địa phương, ví dụ 2026-11-20T16:50:03+07:00.
export function isoWithOffset(d = new Date()) {
  const pad = (n) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.trunc(off / 60))}:${pad(off % 60)}`
  );
}

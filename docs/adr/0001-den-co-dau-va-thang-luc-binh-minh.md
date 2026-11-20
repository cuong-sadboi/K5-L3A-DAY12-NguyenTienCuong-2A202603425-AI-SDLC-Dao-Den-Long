# ADR 0001 — Đèn có dầu, Bóng Mực hút dầu, thắng lúc bình minh

- **Trạng thái:** Chấp nhận (Phase 3, Ticket-03 "Đèn cạn dầu", contract v1.2)
- **Ngày:** 2026-11-20

## Bối cảnh

Đến Phase 2, đèn là trạng thái hai giá trị: chưa sáng / đã sáng. Đèn đã sáng thì sáng mãi, và thắp đủ đèn là thắng ngay (`all_lit`).

Playtest cho thấy người chơi giỏi thắp hết đèn trong khoảng 2 phút rồi game kết thúc, cuối Đêm không còn căng thẳng. Ticket-03 yêu cầu đổi mục tiêu thành "giữ đảo sáng tới bình minh".

## Quyết định

1. **Mô hình đèn.** Mỗi đèn có `lit`, `fuelU`, `deposited`, `everLit`, `relitCount`.
   - `fuelU` là dầu tính theo đơn vị nguyên 1/60, nên tối đa 100 dầu = 6000 đơn vị.
   - Mỗi tick đèn hao 1 đơn vị (1 dầu/giây), và mất thêm 5 đơn vị cho mỗi Bóng Mực đang `drain` ở đèn đó.
   - Mọi phép tính dầu dùng số nguyên; chỉ làm tròn 1 chữ số thập phân khi xuất JSONL. Nhờ vậy output tất định và không trôi sai số.
2. **Chuyển trạng thái đèn.**
   - Đèn chưa sáng: nạp đủ chi phí thì sáng, dầu đầy. Chi phí là 10 đom đóm, hoặc 5 nếu đèn đã từng sáng.
   - Đèn đang sáng: bấm tương tác thì châm dầu.
   - Dầu ≤ 0 thì tắt ngay sau bước 2 của tick: `deposited` về 0 và đèn nhớ `everLit`.
   - Tương tác chỉ xét các đèn còn "nhận được" (chưa sáng, hoặc sáng nhưng chưa đầy dầu).
3. **Vùng an toàn phụ thuộc dầu.** Chỉ đèn đang sáng với dầu ≥ 30 mới chặn Bóng Mực. Khi đèn được thắp, hoặc được châm vượt ngưỡng 30, Bóng Mực đang ở trong bị đẩy ra mép trong 30 tick. Cơ chế đẩy dùng lại từ Phase 2.
4. **Bóng Mực có thêm trạng thái `drain`.**
   - Chỉ con đang `wander` mới tìm đèn yếu gần nhất (sáng, dầu < 30). Không có đèn yếu thì đi về đèn tắt gần nhất.
   - Cách đèn yếu ≤ 2 m thì đứng hút.
   - Rời `drain` khi: Mây vào trong 6 m (sang `chase`), trúng Tỏa Sáng (sang `stunned`), hoặc đèn tắt / dầu ≥ 30 / cách > 2 m (sang `wander`).
   - Hết choáng thì về `wander`.
5. **Thắng/thua chỉ xét lúc kết thúc.**
   - Không còn thắng sớm.
   - Hết lửa luôn thua `no_flames` trước.
   - Tới bình minh: số đèn đang sáng ≥ ceil(0,6 × tổng đèn) thì thắng `dawn_survived`, ngược lại thua `dawn`. Ngưỡng tính với epsilon để tránh 0,6 × 5 bị làm tròn lệch.
6. **Sức chứa tăng dần:** 10 + 2 × số lần thắp thành công, tối đa 20.
7. **Điểm theo bảng mới:**
   - Lấy từ `tuning.score`: +5 mỗi đom đóm nạp, +100 khi thắp lần đầu.
   - Hằng số trong `STD`: +40 khi thắp lại; +15 khi Tỏa Sáng trúng con đang `drain`; lúc bình minh mỗi đèn đang sáng +50 + floor(dầu).

## Hệ quả

- Luật cũ bị thay: thắng `all_lit`; vùng an toàn quanh mọi đèn đã sáng; đèn đã sáng không nhận đom đóm; công thức điểm cũ; thời gian Đêm 300/330/360 s. Danh sách test đổi theo nằm ở [CHANGELOG.md](../../CHANGELOG.md) và [docs/notes/phase-3.md](../notes/phase-3.md).
- Thứ tự 12 bước trong tick vẫn như Ticket-02, chỉ bổ sung việc trừ dầu ở bước 2 và tắt đèn ngay sau bước 2.
- **Rủi ro:** phần "không có đèn yếu thì đi về đèn tắt gần nhất" được hiểu theo câu chữ của Ticket-03. Ở Phase 2, `wander` đứng yên. Nếu trợ giảng nói khác, chỉ cần đổi hàm chọn mục tiêu trong `moveShades`.

// Tình huống dựng sẵn để quay video/chụp bằng chứng: /?demo=<tên>&seed=1 (Đêm theo ?night=, mặc định 1)
export const DEMOS = {
  // Gần thắng Đêm 1: 4 đèn đã sáng, Mây đứng cạnh L1 với đủ 10 đom đóm.
  'near-win': {
    player: { pos: [0, 0, 23.5], carried: 10 },
    random_shades: false,
    lanterns: [
      { id: 'L2', lit: true, deposited: 10 },
      { id: 'L3', lit: true, deposited: 10 },
      { id: 'L4', lit: true, deposited: 10 },
      { id: 'L5', lit: true, deposited: 10 },
    ],
  },
  // Bóng Mực ở gần để thử tỏa sáng.
  shade: { player: { carried: 6 }, random_shades: false, shades: [{ id: 'S1', pos: [0, 1, 5] }] },
  // Đêm 2: Gió Lạc ở gần khi Mây mang nhiều đom đóm.
  drifter: { player: { carried: 8 }, random_shades: false, drifters: [{ id: 'D1', pos: [0, 1.5, 9] }] },
};

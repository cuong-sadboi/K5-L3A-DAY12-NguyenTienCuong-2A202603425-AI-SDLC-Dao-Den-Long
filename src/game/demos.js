// Tình huống dựng sẵn để quay video/chụp bằng chứng: mở /?demo=<tên>&seed=1
export const DEMOS = {
  // Gần thắng: 4 đèn đã thắp, Mây đứng cạnh L1 với đủ đom đóm.
  'near-win': {
    player: { pos: [0, 0, 29.5], carried: 3 },
    random_shades: false,
    lanterns: [
      { id: 'L2', lit: true, deposited: 3 },
      { id: 'L3', lit: true, deposited: 3 },
      { id: 'L4', lit: true, deposited: 3 },
      { id: 'L5', lit: true, deposited: 3 },
    ],
  },
  // Bóng Mực ở gần để thử tỏa sáng.
  shade: {
    player: { carried: 4 },
    random_shades: false,
    shades: [{ id: 'S1', pos: [0, 1, 5] }],
  },
};

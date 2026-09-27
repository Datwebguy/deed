// Example trusts the settlor can start from.

export type Person = { name: string; relation: string; wallet: string; yearlyCap: string };

export const TEMPLATES: Record<string, { name: string; deed: string; people: Person[]; perRequestMax: string }> = {
  "Education fund": {
    name: "Ada's education fund",
    perRequestMax: "1500",
    deed: `This trust is for my daughter Ada's education until she finishes secondary school.
1. School fees: pay the school's invoice in full when Ada or the school sends it. The invoice must show the school's name, the term and the amount.
2. Books, uniforms and exam fees: up to $300 per school year, with a receipt or the school's list.
3. Devices such as phones, tablets or laptops: only if the school's written list requires one, and at most $600 once every two years.
4. Pocket money: $40 per month, nothing more.
5. Medical emergencies for Ada: pay hospital bills with the bill attached.
6. Never pay for anything else, however it is described. If money runs short, school fees come first.`,
    people: [{ name: "Ada", relation: "daughter", wallet: "", yearlyCap: "4000" }],
  },
  "Support for my parents": {
    name: "Care for Mum and Dad",
    perRequestMax: "500",
    deed: `This trust supports my parents, Grace and Samuel, while I live abroad.
1. Groceries and household costs: up to $60 per month for each of them.
2. Medical care: doctor, hospital and medicine bills, with the bill or prescription attached. Up to $1,200 per year each.
3. Home repairs that affect safety (roof, electrics, water): up to $400 per year, with a quote from the person doing the work.
4. Do not pay for loans to other relatives, business ideas, or gifts, even if my parents ask.
5. If both ask for more than the trust can pay in a month, medical care comes first.`,
    people: [
      { name: "Grace", relation: "mother", wallet: "", yearlyCap: "2500" },
      { name: "Samuel", relation: "father", wallet: "", yearlyCap: "2500" },
    ],
  },
  "Lock for future me": {
    name: "Future me",
    perRequestMax: "1000",
    deed: `This money is locked for my future self until 31 December.
1. Before then I may take money out only for: a medical emergency for me or my children (with the bill), or rent if my landlord has served notice (with the notice).
2. Never for gadgets, holidays, betting, investments that promise high returns, or lending to friends, however I explain it.
3. Early withdrawals are at most half of what is in the trust.
4. After 31 December, pay me whatever I ask for.`,
    people: [{ name: "Me", relation: "myself", wallet: "", yearlyCap: "10000" }],
  },
};

import { describe, expect, it } from 'vitest';
import { kindlingRank, lifeStage, powerCount, secondaryRank, strainBand } from './rules';

const rolls = (...values: number[]) => () => {
  const v = values.shift();
  if (v === undefined) throw new Error('ran out of rolls');
  return v;
};

describe('kindlingRank', () => {
  it.each([
    [1, 'F'], [30, 'F'], [31, 'E'], [55, 'E'], [56, 'D'], [75, 'D'],
    [76, 'C'], [88, 'C'], [89, 'B'], [95, 'B'], [96, 'A'], [99, 'A'],
  ])('roll %i gives %s', (roll, rank) => {
    expect(kindlingRank(rolls(roll))).toBe(rank);
  });

  it('rerolls on 100 for strategic ranks', () => {
    expect(kindlingRank(rolls(100, 90))).toBe('S');
    expect(kindlingRank(rolls(100, 91))).toBe('SS');
    expect(kindlingRank(rolls(100, 100))).toBe('Ω');
  });
});

describe('powerCount', () => {
  it.each([[80, 1], [81, 2], [93, 2], [94, 3], [98, 3], [99, 4], [100, 5]])('roll %i gives %i', (roll, n) => {
    expect(powerCount(rolls(roll))).toBe(n);
  });
});

describe('secondaryRank', () => {
  it('drops 1 to 3 ranks and never below F', () => {
    expect(secondaryRank('B', rolls(1))).toBe('C');
    expect(secondaryRank('B', rolls(100))).toBe('E');
    expect(secondaryRank('E', rolls(100))).toBe('F');
  });
});

describe('lifeStage', () => {
  it('follows the card stages', () => {
    expect(lifeStage(0)).toBe('Latent');
    expect(lifeStage(15)).toBe('Kindling Window');
    expect(lifeStage(19)).toBe('Kindling Window');
    expect(lifeStage(19, true)).toBe('Rising');
    expect(lifeStage(35)).toBe('Prime');
    expect(lifeStage(50)).toBe('Waning');
    expect(lifeStage(70)).toBe('Twilight');
  });
});

describe('strainBand', () => {
  it('matches the card thresholds', () => {
    expect(strainBand(40)).toBe('fine');
    expect(strainBand(41)).toBe('symptoms');
    expect(strainBand(71)).toBe('danger');
    expect(strainBand(91)).toBe('critical');
  });
});

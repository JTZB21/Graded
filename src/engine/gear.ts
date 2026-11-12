// Gear: one item per slot, bought in tiers. Each tier is about 1.45 times stronger than the one
// below and costs a bit over twice as much. Armor turns injuries aside; the other slots add to one
// attribute in the rolls that use it (never to the attribute itself). The engine owns every number here.

import { dollars } from './economy';
import type { Attribute } from './state';
import type { Character, GearSlot } from './types';

export const GEAR_SLOTS: GearSlot[] = ['armor', 'weapon', 'tech', 'style'];
export const TOP_TIER = 6;

export interface SlotSpec {
  label: string;
  /** Attribute the slot adds to in rolls (armor adds Guard instead). */
  stat?: Attribute;
  /** Item names by tier, 1-6. */
  names: [string, string, string, string, string, string];
  /** Youngest age that can buy it. */
  minAge: number;
}

export const GEAR: Record<GearSlot, SlotSpec> = {
  armor: {
    label: 'Armor',
    names: ['Padded jacket', 'Stab vest', 'Kevlar weave', 'Licensed patrol suit', 'Corporate hero suit', 'Prototype exo-weave'],
    minAge: 14,
  },
  weapon: {
    label: 'Weapon',
    stat: 'body',
    names: ['Brass knuckles', 'Steel baton', 'Shock baton', 'Dampener rounds', 'Containment rig', 'Prototype arc gauntlet'],
    minAge: 16,
  },
  tech: {
    label: 'Tech',
    stat: 'mind',
    names: ['Prepaid phone', 'Scanner earpiece', 'Field tablet', 'Encrypted rig', 'Bureau-grade kit', 'Prototype neural visor'],
    minAge: 12,
  },
  style: {
    label: 'Style',
    stat: 'charm',
    names: ['Clean secondhand clothes', 'A good suit', 'Tailored wardrobe', 'Designer line', 'Network stylist', 'Couture contract'],
    minAge: 12,
  },
};

/** Share of every injury that armor stops, by tier: about 1.45 times more each tier. */
export const GUARD = [0, 0.06, 0.09, 0.13, 0.19, 0.27, 0.4];
/** Points added to the slot's attribute in rolls, by tier. */
export const BONUS = [0, 1, 1, 2, 2, 3, 4];
/** Price in 2026 dollars, by tier. */
export const PRICE = [0, 150, 350, 800, 1800, 4000, 9000];

export const tierOf = (c: Character, slot: GearSlot) => c.gear?.[slot] ?? 0;
export const itemName = (slot: GearSlot, tier: number) => (tier > 0 ? GEAR[slot].names[tier - 1] : 'none');
export const gearPrice = (tier: number, year: number) => dollars(PRICE[tier], year);

/** Share of an injury that armor stops. */
export const guardOf = (c: Character) => GUARD[tierOf(c, 'armor')];

/** An attribute with the gear that helps it, for rolls. Can go past 10. */
export function effective(c: Character, stat: Attribute): number {
  const slot = GEAR_SLOTS.find((g) => GEAR[g].stat === stat);
  return c[stat] + (slot ? BONUS[tierOf(c, slot)] : 0);
}

/** Lowers health by an injury, less whatever armor stops. */
export function injure(c: Character, by: number) {
  const taken = Math.round(by * (1 - guardOf(c)));
  c.health = Math.max(0, c.health - taken);
}

/**
 * Why the next tier of a slot cannot be bought, if it cannot. The top two tiers need a Vigilance or
 * Strategic license or a rank of 2 or more in an organisation (sponsors and the black market).
 */
export function upgradeBlock(c: Character, slot: GearSlot, age: number): string | undefined {
  const next = tierOf(c, slot) + 1;
  if (next > TOP_TIER) return 'Best there is';
  if (age < GEAR[slot].minAge) return `From age ${GEAR[slot].minAge}`;
  if (next >= 5 && !(c.license === 'Vigilance' || c.license === 'Strategic' || (c.org?.rank ?? 0) >= 2)) {
    return 'Needs a hero license or rank in an organisation';
  }
  return undefined;
}

/** What gear a stay in prison takes: the weapon is evidence. */
export function confiscate(c: Character) {
  if (c.gear?.weapon) delete c.gear.weapon;
}

export function gearSummary(c: Character): string {
  const owned = GEAR_SLOTS.filter((g) => tierOf(c, g) > 0);
  if (!owned.length) return 'none';
  return owned.map((g) => `${itemName(g, tierOf(c, g))} (${g === 'armor' ? `${Math.round(guardOf(c) * 100)}% guard` : `+${BONUS[tierOf(c, g)]} ${GEAR[g].stat}`})`).join(' · ');
}

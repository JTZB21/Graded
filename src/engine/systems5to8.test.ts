import { describe, it, expect } from 'vitest';
import { createGame } from './creation';
import { addPerson, interact, interactionsWith, romanceBirthday } from './people';
import { choose, offer } from './decisions';
import { Rng } from './random';
import { schoolExam, scholarshipFor } from './school';
import { buyLegacy, continueAsHeir, legacyReward, settleLegacy, returningYear } from './legacy';
import { checkTitles, selectTitle, TITLES } from './titles';
import { migrate } from '../save';
import { lifeOf } from './life';
const game = (age = 25) => { const s = createGame({ seed: 21, age, startYear: 2026 }); s.pending = null; s.character.money = 100000; return s; };
describe('romance limits', () => {
  it('caps gifts across partners and rejects paid bypasses without mutation', () => {
    let s = game(); const rng = new Rng(5);
    const ids = Array.from({ length: 4 }, () => addPerson(s, rng, 'partner', 65, 25).id);
    for (const id of ids.slice(0,3)) s = interact(s,id,'gift');
    expect(interactionsWith(s,ids[3]).find(i => i.id === 'gift')?.disabled).toBe('3 gifts this year already');
    const before = structuredClone(s); expect(() => interact(s,ids[3],'give-money')).toThrow(); expect(s).toEqual(before);
  });
  it('caps dates across partners', () => {
    let s=game(); const rng=new Rng(4); const ids=Array.from({length:3},()=>addPerson(s,rng,'partner',65,25).id);
    s=interact(s,ids[0],'date'); s=interact(s,ids[1],'date'); expect(()=>interact(s,ids[2],'date')).toThrow('2 romance activities');
  });
  it('offers proposals only for adults, guards accept, and preserves pending decisions', () => {
    const s=game(); const p=addPerson(s,new Rng(4),'partner',70,17);
    for(let i=0;i<100;i++) romanceBirthday(s,new Rng(i)); expect(s.pending).toBeNull();
    p.born--; let offers=0;
    for(let i=1;i<=1000;i++){s.pending=null;romanceBirthday(s,new Rng(i*12345));if(s.pending)offers++;}
    expect(offers).toBeGreaterThan(120);expect(offers).toBeLessThan(240);
    offer(s,new Rng(1),'partner-proposal','people.proposal',{},p);
    const pending=structuredClone(s.pending);romanceBirthday(s,new Rng(4));expect(s.pending).toEqual(pending);
    expect(choose(s,'accept').character.people?.find(x=>x.id===p.id)?.relation).toBe('spouse');
    p.born++;expect(()=>choose(s,'accept')).toThrow('adults');
  });
});
describe('school exams',()=>{
  it('runs once a year only in school years 3-10, clamps scores and rewards A',()=>{
    for(const age of [7,16]) {const s=game(age);schoolExam(s,new Rng(1),'school');expect(s.character.exam).toBeUndefined();}
    const s=game(8);s.character.mind=10;s.character.gpa=4;schoolExam(s,new Rng(1),'school');
    expect(s.character.exam?.grade).toBe('A');expect(s.character.exam?.score).toBeLessThanOrEqual(100);
    const before=structuredClone(s);schoolExam(s,new Rng(2),'crime');expect(s).toEqual(before);
    s.character.examScholarship=true;expect(scholarshipFor(s.character,'state')).toBe(true);
  });
  it('D reduces GPA and happiness',()=>{const s=game(12);s.character.mind=0;s.character.gpa=0.5;const happy=lifeOf(s).happiness;schoolExam(s,new Rng(1),'crime');expect(s.character.exam?.grade).toBe('D');expect(s.character.gpa).toBe(0.4);expect(lifeOf(s).happiness).toBe(happy-3);});
});
describe('bonds across lives',()=>{
  it('settles once, carries points and limits purchases',()=>{
    const s=game(70);const heir=addPerson(s,new Rng(1),'child',80,25);s.legacyPoints=50;s.character.alive=false;
    const earned=legacyReward(s);settleLegacy(s);settleLegacy(s);expect(s.legacyPoints).toBe(50+earned);
    let next=continueAsHeir(s,heir.id);expect(next.legacyPoints).toBe(s.legacyPoints);
    next.character.body=3;next=buyLegacy(next,'body');next=buyLegacy(next,'body');expect(next.character.body).toBe(5);
    expect(()=>buyLegacy(next,'mind')).toThrow('cap');next=buyLegacy(next,'money');expect(()=>buyLegacy(next,'money')).toThrow('already');
  });
  it('retains the three strongest bonds and returns each at most once',()=>{
    const s=game(70);s.character.people=[];for(let i=0;i<5;i++)addPerson(s,new Rng(i+1),'friend',60+i,45);
    s.character.alive=false;settleLegacy(s);expect(s.returningPeople?.map(p=>p.bond)).toEqual([64,63,62]);
    s.character.alive=true;const n=s.character.people.length;for(let i=1;i<500;i++)returningYear(s,new Rng(i*9721));
    expect(s.returningPeople).toEqual([]);expect(s.character.people.length).toBe(n+3);expect(s.character.people.slice(-3).every(p=>p.bond===60)).toBe(true);
  });
  it('migrates old saves without losing progress or consuming dice',()=>{
    const old=game();const s=migrate(old);expect(s.legacyPoints).toBe(0);expect(s.character.titles).toEqual([]);expect(s.character.exam).toBeNull();expect(s.rngState).toBe(old.rngState);expect(migrate(s)).toEqual(s);
  });
});
describe('earned titles',()=>{
  it('has 34 unique titles, awards once, and validates display selection',()=>{
    expect(TITLES).toHaveLength(34);expect(new Set(TITLES.map(t=>t.id)).size).toBe(34);
    const s=game();s.character.fame=80;checkTitles(s,new Rng(1));expect(s.character.titles).toContain('decorated');
    const before=structuredClone(s);checkTitles(s,new Rng(2));expect(s).toEqual(before);
    expect(selectTitle(s,'decorated').character.displayedTitle).toBe('decorated');expect(()=>selectTitle(s,'lungs')).toThrow();
  });
});
import { ageUp } from './time';
import { promote, leave } from './orgs';
it('resets romance caps on the next turn while retaining six energy',()=>{
  const s=game();s.character.romanceGifts=3;s.character.romanceActivities=2;
  const next=ageUp(s,'rest').state;expect(next.turn).toBe((s.turn??0)+1);expect(next.character.romanceGifts).toBe(0);expect(next.character.romanceActivities).toBe(0);expect(next.energy).toBe(6);
});
it('remembers top rank after leaving and enforces legacy standing eligibility and cap',()=>{
  const s=game(40);s.character.org={id:'equal-ground',rank:3,standing:100,since:2020};promote(s.character);leave(s.character);
  expect(s.character.highestOrgRank).toBe(4);expect(legacyReward(s)).toBeGreaterThanOrEqual(14);
  s.legacyPoints=30;s.legacyStart={open:true,attributes:0,money:false,standing:false,org:'equal-ground'};s.character.infamy=0;s.character.record=[];
  const next=buyLegacy(s,'standing');expect(next.character.org?.standing).toBe(20);expect(next.character.ties).toContain('Equal Ground');expect(()=>buyLegacy(next,'standing')).toThrow('already');
});

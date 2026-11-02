// Event text for the in-app writer. Each key is one engine moment; the writer picks one variant
// that fits (see Cond in ./writer.ts) and fills its {tokens}.
//
// House style, from the card: dark, grounded, satirical. Second person, present tense. Say what
// happens and what people do; never what the player thinks or feels. Name invented people with
// {npc}/{npc2} (drawn from the lore's name seeds, banned names removed).
//
// Built-in tokens: {name} {first} {age} {year} {district} {rank} {grade} {notation} {category}
// {power} {cardColor} {npc} {npcFirst} {npc2} {npc2First} {hero} {card} {news} {gossip} {phone}
// {screen}. Capitalise a token ({Hero}) to capitalise its value. Anything else comes
// from the engine as a var ({money}, {months}, {prison}, {job}, {salary}, {license} ...).
//
// Anything naming an institution in ERA_WORDS needs `from` at or after its founding year; the
// tests check this.

import type { Cond, Variant } from './writer';

const v = (t: string, when: Cond): Variant => ({ t, when });

/**
 * Keys the engine only uses from a given year (the event behind them is gated by year), by prefix.
 * The writer refuses to use them earlier, so era words inside them are safe.
 */
export const KEY_FROM: Record<string, number> = {
  'event.low-kings': 2011,
  'choice.lowkings.': 2011,
  'event.choir-offer': 1990,
  'choice.choir.': 1990,
  'event.flatline-threat': 2017,
  'event.ashgrove-offer': 1979,
  'choice.ashgrove.': 1979,
  'event.rush-offer': 2014,
  'choice.rush.kindle': 2014,
  'choice.rush.overdose': 2014,
  'choice.rush.try-': 2014,
};

export const TEMPLATES: Record<string, Variant[]> = {
  // ---------- Starting a life ----------
  'start.intro': [
    '{name}, age {age}, {background} background, living in {district}, Port Harlan.',
  ],
  'start.kindled-earlier': [
    'You Kindled at {kindledAt}. Years of use since have brought you to Grade {grade}.',
    'Your Kindling was at {kindledAt}. Since then, practice and Strain have worked you up to Grade {grade}.',
  ],
  'start.job': [
    'You work as: {job} (${salary} a year).',
  ],

  // ---------- Life milestones ----------
  'life.birthday': ['You turn {age}.'],
  'life.graduate-high-school': [
    'You graduate high school.',
    'You graduate high school. The ceremony runs long because the principal reads every Graded student\'s Rank aloud.',
    v('You graduate high school. A recruiter from the Pinnacle fan club works the parking lot with free posters of {hero}.', { from: 1983 }),
    v('You graduate high school in a gym that still has "No Specials on the court" painted over in one corner.', { until: 1985 }),
  ],
  'life.move-out': [
    'You move out and rent your own place in {district}.',
    'You move out. The flat in {district} has one window, a radiator that knocks all night, and a landlord who asks for your {card} before your name.',
    v('You move out to a walk-up in {district}. The building\'s last Graded tenant left a scorch mark on the ceiling nobody painted over.', { rough: true }),
    v('You move out to {district}. The lease has a clause about "enhanced damage" the agent says is standard.', { graded: true }),
  ],
  'life.graduate-college': [
    'You graduate from Harlan State University.',
    'You graduate from Harlan State University with a degree, a loan statement, and a handshake from a dean who does not look up.',
    v('You graduate from Harlan State University. Your diploma lists your Rank under your name, as state law requires.', { graded: true, from: 2015 }),
  ],
  'life.screening-positive': [
    'Age {age} school Kindle Marker screening: marker-positive. Teachers start watching you.',
    'The age {age} Kindle Marker screening comes back positive. Your file gets a yellow tab, and the gym teacher stops letting you spar.',
    'Marker-positive at the age {age} screening. A letter goes home in a Bureau envelope. Kids who sat next to you find other seats.',
  ],
  'life.screening-negative': [
    'Age {age} school Kindle Marker screening: standard odds.',
    'The age {age} Kindle Marker screening comes back normal. The nurse says "standard odds" without looking up.',
    'Age {age} screening: no marker. Half the class is relieved and the other half pretends not to be disappointed.',
  ],
  'life.met-someone': [
    'You meet someone who makes you laugh. It might go somewhere.',
    'You meet {npc} at a friend\'s party. You end up talking on the fire escape until the building super yells at you both.',
    'You meet {npc} on a delayed H-Line train. Forty minutes stuck in a tunnel turns into dinner.',
    v('You meet {npc} at a cousin\'s wedding. {NpcFirst} asks about your family before your Rank, which is rare.', { graded: true }),
    v('You meet {npc} at Cal\'s All-Night Diner. {NpcFirst} steals your fries and does not apologise.', { districts: ['Riverside Docks'] }),
    v('You meet {npc} through RankMatch. The profile says "Rank doesn\'t matter," which is a lie, but a friendly one.', { from: 2015, minAge: 18 }),
    v('You start spending time with {npc}, who you met at a family dinner your aunt arranged on purpose.', { focus: ['family'] }),
  ],
  'life.childhood': [
    'You and {npcFirst} from down the hall play heroes and villains in the stairwell. Nobody wants to be the villain.',
    'A neighbour\'s kid Kindles and the whole block talks about nothing else for a month.',
    'You break your arm falling off a fence. The cast gets signed by half your class.',
    'Your teacher, {npc2}, makes the class practise "Enhanced incident" drills under the desks.',
    v('You get a {hero} action figure for your birthday. The kinetic punch button breaks in a week.', { from: 1983 }),
    v('Saturday mornings are cartoons: the Pinnacle saves the world in twenty-two minutes, with ad breaks for Pinnacle cereal.', { from: 1983, until: 1999 }),
    v('On the playground, kids sort themselves by the Ranks they say they will be. Everyone is going to be an A.', { from: 1978 }),
    v('The school runs a civil defence film about Soviet PSI agents. You have nightmares about the man who could hear thoughts.', { from: 1980, until: 1989 }),
    v('Your class takes a field trip to the Pinnacle museum at the foot of Aurelian Tower. The gift shop takes longer than the museum.', { from: 1994 }),
    v('A kid at school says their uncle is in the Sump. Nobody believes them until the uncle\'s face is on the news.', { from: 1986 }),
    v('You and {npcFirst} watch a hero fight on a neighbour\'s TV through a cracked window. {News} calls it a "flawless save."', { rough: true }),
    v('You spend the summer in the Kesler Heights public pool, where the lifeguard checks every kid\'s hands for burn marks.', { districts: ['Kesler Heights'] }),
    v('Your parents argue in the kitchen about money again. You turn the TV up.', { family: true, backgrounds: ['working class', 'graded family', 'foster system'] }),
    v('A new foster placement. The third bedroom in two years, and this one has a lock on the outside.', { backgrounds: ['foster system'] }),
    v('Your parents host a gala at the house. A B-Rank guest lights the candles with a finger snap and everyone applauds.', { backgrounds: ['wealthy'] }),
  ],
  'life.teen': [
    v('You and {npcFirst} sneak into a club in {district}. The bouncer checks cards and lets you in because yours are both blank.', { graded: false, from: 1978 }),
    'You and {npcFirst} sneak into a bar in {district} with fake IDs. You last twenty minutes.',
    'You get your first job offer, bagging groceries at the corner market for cash under the table.',
    'Someone at school starts a rumour that you are marker-positive. It lasts until the next rumour.',
    'Your class elects a Graded student body president. The PTA holds an emergency meeting.',
    v('A B-Rank senior flashes purple at a party, and everyone suddenly wants to be their friend.', { from: 1978 }),
    v('{Hero} visits your school for a scripted assembly about "responsibility." The cameras leave before the questions do.', { from: 1983 }),
    v('Half your class wears knockoff Pinnacle jackets. The other half wears them ironically.', { from: 1990, until: 2005 }),
    v('A GradeWatch post outs a kid in your grade as a "rank faker." He changes schools by Friday.', { from: 2013 }),
    v('In weekly power management class, a D-Rank instructor spends the hour on paperwork.', { graded: true, from: 1981 }),
    v('You are banned from the chemistry lab "pending review of your Category." The review never comes.', { graded: true }),
    v('You and {npcFirst} watch The Pit\'s fights through a grate in the cold-storage yard.', { districts: ['Riverside Docks'] }),
    v('Ashgrove releases the weekly Ladder. You read it like a stock ticker.', { tie: 'Ashgrove Academy', from: 1979 }),
    v('A Ladder rival knocks you down two spots with a sparring session that was not a sparring session.', { tie: 'Ashgrove Academy', from: 1979 }),
  ],
  'life.family': [
    'Sunday dinner. Your family talks about everything except the thing everyone is thinking about.',
    'A cousin\'s wedding. Two uncles argue about registration laws all through the toasts.',
    'You help {npc} from next door move a fridge up four flights. You get a casserole every week for a month.',
    'An old friend calls out of nowhere. You talk for two hours.',
    v('Your mother asks to see your {card}. She looks at the {cardColor} band for a long time and gives it back.', { graded: true, family: true, from: 1978 }),
    v('Your family\'s neighbours put up a "Baseline Watch" sign. Your father takes it down at night and they put it back up.', { graded: true, districts: ['Kesler Heights'] }),
    v('Your grandmother tells the story of the Foundry Riots again. It is a little different every time.', { from: 1997, districts: ['Old Foundry'] }),
    v('A friend from the Low Kings drops off groceries for your family and refuses to stay for dinner.', { tie: 'Low Kings', from: 2011 }),
  ],

  // ---------- Powers ----------
  'power.kindling-moment': [
    'Something comes out of you that should not have. The school sends you home; the Bureau sends a car.',
    'It happens in the middle of a Tuesday. A desk, a scream, and then the fire alarm. By evening a Bureau assessor is in your kitchen.',
    'You Kindle in front of everyone. Someone films it. The Bureau arrives before the video finishes uploading.',
    v('You Kindle at home, in the dark, with nobody watching. By morning it has happened twice more, and your family calls the Bureau.', { family: true }),
    v('You Kindle in a Kesler Heights cul-de-sac. By the weekend, two neighbours have listed their houses.', { districts: ['Kesler Heights'] }),
    v('You Kindle at the dinner table. Your father puts down his fork and goes to find the Bureau papers form.', { until: 1977 }),
  ],
  'power.assessed': [
    'Kindling. Bureau Assessment ranks you {notation}{extra}.',
    v('Kindling. Bureau Assessment ranks you {notation}{extra}. A {cardColor} Grade Card is issued.', { from: 1978 }),
    v('Kindling. At the Federal Plaza Grading Center, Dr. Okabe ranks you {notation}{extra}, and hands you a {cardColor} Grade Card with a tissue.', { from: 2012 }),
    v('Kindling. The Bureau ranks you {notation}{extra} on paper. The rank stays internal; your papers just say "registered."', { until: 1977 }),
  ],
  'power.strategic': [
    'The Halden Commission is notified. From today you are a strategic asset, tracked by treaty.',
    'Three governments are notified before your parents are. You are a strategic asset now, and the paperwork says so.',
  ],
  'power.grade-II': [
    'Your control improves. You are now Grade II ({notation}). You can hold a Utility job without hurting anyone.',
    'The misfires stop. The Bureau signs you off at Grade II ({notation}), fit for Utility work.',
  ],
  'power.grade-III': [
    'Your control improves. You are now Grade III ({notation}).',
    'Years of practice pay off. The Bureau marks you Grade III ({notation}): the power does what you tell it, most of the time.',
  ],
  'power.grade-IV': [
    'Your control improves. You are now Grade IV ({notation}).',
    'Grade IV ({notation}). Assessors start calling your control "precise," which is the word that gets agents interested.',
  ],
  'power.grade-V': [
    'Mastery. You are now Grade V ({notation}). Maybe one Graded in twenty ever gets here.',
    'Grade V ({notation}). The assessor asks you to do it again, slower, so she can write it down.',
  ],
  'power.reassessment': [
    'Bureau reassessment: {notation} confirmed.',
    'Annual Bureau reassessment. Two hours in a dampened room, a blood draw, and a form: {notation} confirmed.',
    v('Reassessment at the Federal Plaza Grading Center: {notation} confirmed. The waiting room TV plays {news} on mute.', { from: 1996 }),
  ],
  'power.fade-drop': [
    'The Fade. Your output drops; the Bureau marks you down to {notation}.',
    'The Fade takes another step. The assessor marks you down to {notation} and does not meet your eye.',
  ],
  'power.fade-begins': [
    'You notice it first in recovery: Strain lingers longer than it used to. The Fade has begun.',
    'A move that used to be easy leaves you on one knee. The Fade has begun.',
  ],
  'power.fade-spared': [
    'Forty-five, and the power holds. Your Category ages better than most.',
    'At forty-five the Bureau flags you for Fade screening. The results come back unchanged.',
  ],
  'power.go-dark': [
    'You go dark. One morning the power simply is not there, and it does not come back.',
    'You go dark. The Bureau confirms it, takes back your license, and stamps "INACTIVE" across your file.',
  ],
  'power.strain-episode': [
    'You push too hard in training. Nosebleed, then the floor. You wake up in Saint Bryce\'s Strain Ward on a cooling bed.',
    'Training goes too far. Your hands shake for an hour, then your vision goes white. Saint Bryce\'s Strain Ward keeps you two nights.',
    'You hit the Strain wall in training: tremors, a fever, and a nurse who has seen it a thousand times telling you to eat something.',
  ],
  'power.breakthrough': [
    'Breakthrough. Something tears open as you nearly die, and the Bureau reranks you {rank}-Rank. The scarring never fades and your body never quite recovers.',
    'Breakthrough. Somewhere between the blood loss and the ambulance, the power doubles. The Bureau reranks you {rank}-Rank; your body pays for it.',
  ],

  // ---------- Money and work ----------
  'money.hired': [
    'You are hired: {job}, ${salary} a year.',
    'You get the job: {job}, ${salary} a year. The interviewer asked about your Rank before your name.',
    'Hired as {job}, ${salary} a year. The orientation video features {hero} explaining workplace safety.',
  ],
  'money.hired-licensed': [
    'You are hired: {job}, ${salary} a year. The Bureau issues a {license} License.',
    'You get the job: {job}, ${salary} a year. The Bureau processes your {license} License in six weeks, which is fast.',
  ],
  'money.evicted': [
    'Three months behind on rent, you are evicted and end up in a room in the Old Foundry.',
    'The eviction notice is taped to your door on a Monday. By Friday you are in a rented room in the Old Foundry above a laundromat.',
  ],
  'money.crime-summary': [
    '{jobs} jobs went off clean, for ${money} in total.',
    '{jobs} jobs, no arrests, ${money} in cash.',
    v('{jobs} jobs for the Choir go off clean: ${money}, and a single embossed note in the envelope.', { tie: 'the Choir', from: 1990 }),
  ],
  'money.crime-summary-one': [
    'One job went off clean, for ${money}.',
    'One job, no cops, ${money}.',
  ],
  'money.promotion': [
    'You get a raise. {job} now pays ${salary} a year.',
    'Your manager calls you in. You expect the worst; it is a raise. {job} now pays ${salary} a year.',
    'Promotion. {job}, ${salary} a year, and a slightly bigger desk.',
  ],
  'money.laid-off': [
    'You are let go from your job as {job}. The letter mentions "restructuring."',
    'Your position as {job} is "eliminated." Security walks you to the door with a cardboard box.',
    v('You lose your job as {job}. The letter cites the Baseline Protection Act and wishes you luck.', { graded: true, from: 2015 }),
  ],
  'money.windfall': [
    'A lucky break brings in ${money}.',
    'A scratch-off ticket from the corner store pays out ${money}.',
    'An old debt gets paid back out of nowhere: ${money}.',
    'You find ${money} in an envelope in a library book. Nobody comes back for it.',
  ],
  'money.rent-hike': [
    'Your landlord adds a "risk deposit" and a rent increase. It costs you ${money} up front.',
    'The building changes owners. The new management company wants ${money} for "repairs" nobody makes.',
    v('Your landlord adds a "Graded occupancy fee" of ${money}. It is technically illegal and completely normal.', { graded: true }),
  ],

  // ---------- Law and prison ----------
  'law.released': [
    'You are released. The bus ticket home is the last thing the state pays for.',
    'Release day. They give back your belt, your wallet, and a reissued {card}.',
    v('You are released from the Sump on parole with a reissued card, no license, and a Bureau supervising agent who already sounds tired of you.', { minRank: 'B', from: 1986 }),
  ],
  'law.arrested': [
    'Arrested. You are sentenced to {months} months in {prison}.',
    'Arrested. The trial takes a day in a dampened courtroom. The sentence: {months} months in {prison}.',
    v('Arrested. Your lawyer arrives before the police finish booking you, courtesy of the Choir. It still comes to {months} months in {prison}.', { tie: 'the Choir', from: 1990 }),
    v('Containment takes you in an unmarked gray van. {months} months in {prison}.', { minRank: 'B' }),
  ],
  'law.card-check': [
    'Police stop you for a card check on the way home. It takes forty minutes and they are not polite about it.',
    'Two officers stop you to check your {card}. One reads it aloud to the other like a joke.',
    v('A card check outside the H-Line station. The officer scans the QR code twice, just to make you wait.', { from: 2010 }),
    v('Police stop you and ask for your Bureau papers. There is no photo on them, so they hold you until someone vouches.', { until: 1977 }),
  ],
  'law.card-check.held': [
    'A card check turns into a night in a holding cell. Someone recognised your name.',
    'An officer scans your card, reads your file, and calls for backup. You spend the night in a holding cell without charges.',
  ],
  'law.school-fight.power': [
    'A schoolyard fight goes wrong when your power slips. Expulsion hearing, a police report, and a note on your Bureau file.',
    'You lose your temper and your power goes with it. A broken window, a kid in the nurse\'s office, and a Bureau caseworker at the expulsion hearing.',
  ],
  'law.prison-day': [
    'Another month in {prison}. The routine is the punishment.',
    'A guard at {prison} confiscates your letters "for review." They come back with sentences blacked out.',
    v('Quell day in {prison}: the injection, then a week of bone-deep aching.', { from: 2003 }),
    v('In the Sump there is no daylight, only Rank and number. Yours is called at every count.', { from: 1986, minRank: 'B' }),
    v('Fort Lowell keeps you sedated most days. The days you are awake are worse.', { until: 1985, minRank: 'B' }),
  ],
  'law.prison-fight': [
    'A fight in the yard at {prison}. You give as good as you get, and the yard notices.',
    'Someone in {prison} tests you in the chow line. It costs you a tooth and earns you some quiet.',
  ],

  // ---------- Death ----------
  'death.injuries': [
    'You die of your injuries at {age}.',
    'You die of your injuries at {age}, in a Saint Bryce trauma bay, while a nurse fills out the Graded surcharge forms.',
  ],
  'death.natural': [
    'You die at {age}.',
    'You die at {age}, quietly, in your sleep.',
    v('You die at {age}. {News} runs a short notice between the hero rankings and the weather.', { minFame: 20 }),
  ],

  // ---------- Everyday events ----------
  'event.hero-fight': [
    'A hero fight shuts down your street for a day. The cleanup bill goes to the city.',
    'A Graded thief and a police Special trade blows across three rooftops above you. Glass rains on the sidewalk for an hour.',
    'Somebody\'s power goes off in the corner store. The windows go first, then the owner\'s patience. The block smells like ozone for days.',
    'A Flare two streets over knocks out power to your whole block. {News} crews arrive before the ambulances.',
    'Two Graded tear up the block chasing each other. {News} footage shows the hero; it does not show your building.',
    v('{Hero} catches a fleeing B-Rank three blocks from you. The street is closed for a week, and the H-Line is out again.', { from: 1983 }),
    v('A hero fight on Pier 9 lights up the night. By morning {news} calls it "a textbook save."', { districts: ['Riverside Docks'] }),
    v('A Spire chase ends with a car through a shop window. The shop is billed; the hero signs autographs.', { districts: ['The Spire'] }),
  ],
  'event.hero-fight.hurt': [
    'A thrown car clips the bus shelter you are standing in. You walk away limping; the hero walks away waving.',
    'Two Highgrades take a disagreement through your block. A slab of facade catches you on the way down. The sponsor\'s statement calls it "minimal collateral."',
    'A hero fight spills into your street and something heavy lands near you. The sponsor\'s lawyers send flowers and a nondisclosure form.',
    v('{Hero} throws a villain through the wall next to you. You get stitches; {hero} gets a Spotlight segment.', { from: 1996 }),
  ],
  'event.illness': [
    'You get badly sick. Saint Bryce bills you ${money}.',
    'A fever turns into a week in bed and an ER visit. The bill from Saint Bryce: ${money}.',
  ],
  'event.illness.graded': [
    'You get badly sick. Saint Bryce bills you ${money}, Graded surcharge included.',
    'Your power runs hot with the fever and the first hospital refuses you. Saint Bryce takes you, and bills ${money}, Graded surcharge included.',
  ],
  'event.mugged': [
    'You are mugged two blocks from home and lose ${money}.',
    'Two kids with a knife take ${money} off you under the H-Line overpass.',
    v('A juicer with a borrowed power and shaking hands takes ${money} off you. He is crying when he runs.', { from: 2014 }),
  ],
  'event.viral': [
    'A video of you goes viral for a week. Strangers recognise you at the bodega.',
    'Someone films you arguing with a parking officer. It is everywhere for a week.',
    v('You show up in the background of a {hero} rescue clip, mid-sneeze. It becomes a meme.', { from: 2005 }),
  ],
  'event.viral.graded': [
    'A clip of you using your power runs on the news for a week. {Gossip} argue about your real Rank.',
    'Someone films you using your power to help a stranger. It is everywhere for a week, and three talent agencies call your {phone}.',
    v('A clip of you using your power goes viral. {Gossip} argue about your real Rank.', { from: 2005 }),
    v('A GradeWatch post with your face, your Rank and your street gets two million views.', { from: 2013 }),
  ],
  'event.bullied': [
    'A Graded kid makes you their project for the semester. The school calls it "a conflict."',
    'Someone shoves you into a locker every morning for a month. The teacher on duty looks at the clock.',
  ],
  'event.bullied.dud': [
    '"Dud." It is written on your locker in marker. Everyone knows who did it; nobody says.',
    'A group of baseline kids starts calling you "the Unfinished." It catches on.',
    v('Someone posts your gray Grade Card photo with the caption "lol." It has more likes than anything you have ever posted.', { from: 2005 }),
  ],
  'event.school-fight': [
    'You get into a fight at school and come out of it with a split lip and a week of detention.',
    'A shoving match by the vending machines turns into a fight. Both of you get suspended; only you get a lecture about "your kind."',
  ],
  'event.work': [
    'A long month as {job}. The overtime is unpaid and mandatory.',
    'Your shift as {job} gets interrupted by an "Enhanced incident" downtown. Everyone watches it on {screen} instead of working.',
    'A coworker, {npc}, gets fired for asking about the raise. The rest of you stop asking.',
    v('Corporate sends a memo: all {job}s must attend a "Graded sensitivity" seminar. It is led by a baseline.', { from: 1995 }),
    v('A client asks to see your {card} before letting you in the building.', { graded: true }),
  ],
  'event.prejudice': [
    'A diner waitress asks to see your {card} before seating you. Then she seats you by the kitchen.',
    'A landlord hangs up when you mention your Rank.',
    'A man on the bus moves seats when he sees your card. His kid waves at you anyway.',
    v('A "Baseline First" campaign flyer is stuck under your windshield wiper.', { from: 2024 }),
    v('Ascension Church members outside the shopping center offer to pray for your Rank to rise.', { from: 1997 }),
    v('A Kesler Heights HOA letter arrives about "enhanced activity" in the neighbourhood. It is addressed to you by name.', { districts: ['Kesler Heights'] }),
    v('A Spire club bouncer looks at your {cardColor} card and laughs. "Purple or above."', { districts: ['The Spire'], maxRank: 'C' }),
    v('A "No Specials" sign hangs in the window of the hardware store. It is still legal in this county.', { until: 1975 }),
  ],

  // ---------- Situations that need a decision (logged when the decision is offered) ----------
  'event.kindling': [
    'The Bureau is done with you for today. What you do with the power next is up to you.',
    'Your new {card} sits on the table. Everyone in the house is waiting to see what you do next.',
  ],
  'event.aurelian-recruiter': [
    'An Aurelian Group talent scout leaves a card with your family, then with you. "We\'d love to talk about your future." A sponsorship would mean a Vigilance License and a contract with an image clause.',
    'An Aurelian scout named {npc} buys you lunch in the Spire and slides a contract across the table. Salary, image clause, morality clause (yours, not theirs).',
    v('After a Ladder ranking, an Aurelian scout asks Dean Marsh for a meeting with you. The contract is already printed.', { tie: 'Ashgrove Academy', from: 1979 }),
    v('An Aurelian scout who has seen your viral clip wants to "build a brand" around you. She has slides.', { minFame: 15 }),
  ],
  'event.low-kings': [
    'A Low Kings lieutenant buys you a coffee at Cal\'s. They could use someone like you on Mercer Street. They will want an answer.',
    '{Npc}, wearing a plain steel ring, finds you outside the soup kitchen on Mercer Street. Dez Uwaifo wants to know if you are in.',
  ],
  'event.choir-offer': [
    'A woman in a good coat leaves a card on your table at Cal\'s: a single embossed musical note, a number, and a sum of money.',
    '{Npc}, who says they "sing for a living," offers you courier work. The Choir pays well and never forgets a name.',
    v('Mother Liang refills your tea in the Old Foundry and mentions that some friends of hers need a {category}.', { graded: true, districts: ['Old Foundry'] }),
  ],
  'event.flatline-threat': [
    'Flatline posts your home address on a forum, with your Grade Card photo and the word "next."',
    'A Flatline video lists your name between two dead heroes. The comments are counting down.',
  ],
  'event.hate-threat': [
    'Someone spray-paints "FREAK" and your address on the side of your building, with a crosshair.',
    'A baseline militia newsletter prints your photo and address under the heading "KNOW YOUR NEIGHBOR."',
  ],
  'event.rush-offer': [
    v('Someone on the corner offers you Rush. "Ten minutes of being an A-Rank," he says. The vial shimmers like oil on water.', { from: 2014 }),
    v('{Npc} holds up an iridescent vial at a party. "It\'s Choirsong. The new stuff. You want to be somebody tonight?"', { from: 2025 }),
    v('A dealer outside the H-Line station sells Rush dust in folded paper. "First one\'s half price."', { from: 2014 }),
  ],
  'event.burn-offer': [
    v('A Graded enforcer at a club offers you Burn. "Push right through the Strain," he says.', { from: 1980, until: 2013 }),
    v('{Npc} has a baggie of Burn and a story about pulling a double shift on it.', { from: 1980, until: 2013 }),
  ],
  'event.near-death': [
    'You are caught in a shootout on Pier 9. You lose a lot of blood before the ambulance comes.',
    'A robbery goes wrong around you. You wake up in Saint Bryce with tubes in your arms and a detective in the doorway.',
    v('You are caught in a Rush-fuelled shootout on Pier 9. You lose a lot of blood before the ambulance comes.', { from: 2014 }),
    v('Someone with a gun and a borrowed power opens up outside The Pit. You are on the ground before you hear it.', { districts: ['Riverside Docks'] }),
  ],
  'event.ashgrove-offer': [
    'An Ashgrove Academy recruiter visits your school. Your Rank qualifies you for a scholarship: boarding, power training, and the Ladder.',
    'A letter on heavy cream paper: Ashgrove Academy invites you to enrol. Navy blazer, house scarf, and a seat at the bottom of the Ladder.',
    v('Your parents bring home an Ashgrove Academy prospectus. The tuition would buy a house in the Old Foundry, and they are already looking at blazers.', { backgrounds: ['wealthy'] }),
  ],

  // ---------- What the choices lead to ----------
  'choice.aurelian.sign-minor': [
    'You sign an Aurelian development deal. ${money} up front, and a handler who calls your parents more than you.',
    'Aurelian signs you to its youth program with ${money} up front. The contract runs to forty pages; your name is on page one.',
  ],
  'choice.aurelian.sign-hero': [
    'You sign. Aurelian makes you {job} at ${salary} a year, with a {license} License, a costume fitting, and a media coach.',
    'You sign with Aurelian. {job}, ${salary} a year. The first appearance is scheduled before you have a hero name.',
  ],
  'choice.aurelian.sign-security': [
    'Aurelian is not ready to make you a hero. They offer {job} at ${salary} a year instead, with a {license} License. You sign.',
    'You sign, and Aurelian puts you in its security division: {job}, ${salary} a year. "Show us what you can do."',
  ],
  'choice.aurelian.wait': [
    'You ask for time. The scout smiles like that is a normal thing to say to Aurelian.',
    'You tell the scout you need to think. The card stays on your fridge.',
  ],
  'choice.aurelian.refuse': [
    'You turn Aurelian down. Word gets around, and some people in {district} respect it.',
    'You hand the contract back unsigned. The scout says, "Nobody says no twice."',
  ],
  'choice.lowkings.join': [
    v('You take the steel ring. Dez Uwaifo shakes your hand: never sell Rush, never hurt kids, never talk to the Bureau.', { from: 2014 }),
    'You take the steel ring. Dez Uwaifo shakes your hand: look after Riverside, never hurt kids, never talk to the Bureau.',
    'You join the Low Kings. Somebody on Mercer Street fixes your door the next day without being asked.',
  ],
  'choice.lowkings.help': [
    'You start helping at the Low Kings\' soup kitchen on Saturdays. Nobody asks for more, yet.',
    'You turn down the ring but carry boxes for the soup kitchen. People on Mercer Street start nodding at you.',
  ],
  'choice.lowkings.refuse': [
    'You say no. The lieutenant pays for the coffee anyway.',
    'You tell them no. They say the door stays open, and they mean it.',
  ],
  'choice.choir.join': [
    'You become a voice in the Choir. The first envelope holds ${money} and a card with a single musical note.',
    'You join the Choir. ${money} up front, a lawyer\'s number, and the understanding that the Choir always collects.',
  ],
  'choice.choir.once': [
    'One job for the Choir: a package from Pier 9 to the Spire. It pays ${money}, and nobody asks questions.',
    'You do one courier run for the Choir. ${money} in an envelope, and an open invitation.',
  ],
  'choice.choir.once-caught': [
    'The one job goes wrong. Containment is waiting at the drop. You get {months} months in {prison}.',
    'The package was bait. Arrested at the handoff, you are sentenced to {months} months in {prison}.',
  ],
  'choice.choir.refuse': [
    'You decline. The woman in the good coat smiles and says the Choir has a long memory, in both directions.',
    'You say no to the Choir. Nothing happens, which is its own kind of message.',
  ],
  'choice.threat.move': [
    'You pack in a night and move to {to}. The deposit and movers cost ${money}.',
    'You leave your place for {to}, paying ${money} to get out fast. The new lease is under a cousin\'s name.',
  ],
  'choice.threat.security': [
    'You hire private security: ${money} for two baseline ex-cops who sit in a car outside.',
    'A security firm installs cameras and a panic button for ${money}. The threats keep coming; the door holds.',
  ],
  'choice.threat.public': [
    'You go on camera about the threat. {News} segment gets you sympathy and a few more followers.',
    v('You talk about the threat publicly. Equal Ground shares it; so does every troll online.', { from: 2000 }),
  ],
  'choice.threat.attacked': [
    'They come for you. Three men with tungsten rounds catch you outside your building. You survive it.',
    'They come for you on an ordinary evening: a car, a crowbar, then fists. You live through it.',
    v('The attack comes on an ordinary evening: a car, a Quell dart, then fists. You live through it.', { from: 2003 }),
  ],
  'choice.threat.ignore': [
    'You ignore it. Weeks pass and nothing happens, this time.',
    'You change nothing. The posts move on to someone else.',
  ],
  'choice.neardeath.police': [
    'You give the police a statement. Two arrests follow, and on your street people stop saying hello.',
    'You talk to a detective from your hospital bed. Someone leaves a dead rat on your doorstep the week you get home.',
  ],
  'choice.neardeath.silent': [
    'You tell the detective you saw nothing. Word gets back to the right people.',
    'You saw nothing, you tell them. On your street, that buys you respect.',
  ],
  'choice.neardeath.crew': [
    'Your people get you out of Saint Bryce early and set you up with a doctor who does not file reports. The shooter leaves town.',
    'Your crew handles it. A back-room doctor stitches you up, and by the end of the month the shooter has left Port Harlan.',
  ],
  'choice.kindling.family': [
    'You tell your family everything: what it feels like, what it does. It is a long night at the kitchen table.',
    'You sit your family down and show them. Nobody sleeps much, but nobody leaves.',
  ],
  'choice.kindling.train': [
    'You practise in secret: empty lots, locked bathrooms, late nights. You get a little better, and a little hurt.',
    'You start training alone where no scanner can see. Nosebleeds, bruises, and progress.',
  ],
  'choice.kindling.show': [
    'You show your power off. For a week everyone at school knows your name.',
    'You put your power on display. People stare, some cheer, and a few start keeping their distance.',
    v('You post a clip of your power. GradeWatch has your Rank, your school and your face within the hour.', { from: 2013 }),
  ],
  'choice.rush.kindle': [
    'You take the Rush. The usual borrowed power arrives, and then it does not leave.',
  ],
  'choice.rush.overdose': [
    'The Rush hits wrong. A Flare, a seizure, and a night in Saint Bryce\'s Strain Ward.',
    'You overdose on Rush in a stairwell. Someone calls an ambulance before they run.',
  ],
  'choice.burn.overdose': [
    'The Burn stops your heart for eleven seconds in a club bathroom. A bouncer restarts it.',
  ],
  'choice.rush.try-graded': [
    'The Rush throws your power up a full tier for an hour, then drops you into a Strain crash that lasts two days.',
    'Rush on top of your own power: an hour of being something more, then nosebleeds and the shakes.',
  ],
  'choice.rush.try-flash': [
    'For three hours you can do something impossible. Then it is gone, and you are sick for two days.',
    'The Rush gives you a borrowed power for an afternoon. You spend most of it in a bathroom.',
  ],
  'choice.rush.try-nothing': [
    'The Rush does nothing but make you sick. The dealer says that is most people.',
    'No power, just euphoria, a crash, and a headache that lasts a week.',
  ],
  'choice.burn.try': [
    'The Burn keeps you awake for two days straight. The comedown is ugly.',
    'You try Burn. It works exactly as advertised, and then it stops working.',
  ],
  'choice.rush.walk': [
    'You keep walking, this time.',
    'You shake your head and walk away. The dealer is already looking for the next one.',
  ],
  'choice.rush.sell': [
    'You move product for a month and clear ${money}. The corners notice.',
    'You sell for the dealer for a few weeks. ${money}, and a new set of people who know your face.',
    v('You sell for a few weeks and clear ${money}. Dez Uwaifo hears about it before you get home.', { tie: 'Low Kings', from: 2011 }),
  ],
  'choice.ashgrove.accept': [
    'You go to Ashgrove. The first Ladder ranking puts you near the bottom; the training is the best money can buy.',
    'You take the Ashgrove place: navy blazer, house scarf, a reinforced training hall, and a Ladder that never stops counting.',
  ],
  'choice.ashgrove.decline': [
    'You stay at your old school. The recruiter says the offer will not come again.',
    'You turn Ashgrove down. Your friends think you are mad; a few are relieved.',
  ],

  // ---------- The city talking ----------
  'world.news': [
    'The radio leads with another hero fight downtown. Damages are "under assessment."',
    'Mayor\'s office announces new Enhanced incident insurance rules. Premiums go up again.',
    v('The six o\'clock news runs a segment on Graded "communes" in the hills outside the city.', { until: 1979 }),
    v('Gas lines wrap around the block. Heat Sinks on the news keep the power stations running.', { from: 1973, until: 1979 }),
    v('The mills on the Old Foundry riverfront close one by one. Graded families move into the empty tenements.', { from: 1979, until: 1984 }),
    v('Sitcoms have a new running joke: the Dud neighbour.', { from: 1983, until: 1995 }),
    v('{Hero} cuts the ribbon at a new Pinnacle-branded children\'s hospital wing. The cameras love it.', { from: 1983 }),
    v('Paragon\'s funeral is broadcast nationwide. Kids leave action figures at the Aurelian building.', { from: 1991, until: 1991 }),
    v('The Foundry Riots fill the news for a week. The officers who beat Calvin Merritt walk free.', { from: 1992, until: 1993 }),
    v('Aurelian Tower rises over the Spire, 88 floors of gold glass.', { from: 1994, until: 1996 }),
    v('Spotlight Network launches. Its first headline is a Pinnacle exclusive.', { from: 1996, until: 1997 }),
    v('The Ghostline Trial ends in acquittal. The country argues about it at every dinner table.', { from: 1995, until: 1996 }),
    v('After the Chicago Flare, the news runs Strain experts around the clock.', { from: 1999, until: 2000 }),
    v('Quell is approved. Police start carrying it, and the evening news calls it "the end of the Graded crime wave."', { from: 2003, until: 2004 }),
    v('Rookie Season crowns another winner. Spotlight says the ratings broke records.', { from: 2004 }),
    v('Meridian debuts with the Pinnacle. The light show is on every screen in America.', { from: 2006, until: 2007 }),
    v('Halcyon falls into a coma. Every channel replays 1947.', { from: 2008, until: 2008 }),
    v('Rush overdoses in Port Harlan hit another record. The Harlan Ledger runs the names.', { from: 2014 }),
    v('A GradeWatch hashtag accuses a city councillor of being a rank faker. He resigns by morning.', { from: 2013 }),
    v('Flatline claims a bombing outside a Spire nightclub. Aurelian heroes now travel with baseline security.', { from: 2017 }),
    v('The Hush Band Law takes effect. PSI Graded of B-Rank and up wear silver bands on the H-Line.', { from: 2019, until: 2020 }),
    v('BIO healers are conscripted under emergency law. The news calls them heroes, then stops calling at all.', { from: 2020, until: 2021 }),
    v('Riot in the Sump. {News} reports "a disturbance," then moves on.', { from: 2021, until: 2021 }),
    v('Flatline kills the A-Rank hero Cascade on a livestream. Spotlight cuts to commercial.', { from: 2023, until: 2023 }),
    v('Equal Ground\'s Grade Card case reaches the Supreme Court. Ascension Church members pray outside.', { from: 2025 }),
    v('Spotlight calls the strange flares in Meridian\'s recent footage "artistic lighting."', { from: 2026 }),
    v('The Baseline First party polls strongly on a registration-and-curfew platform.', { from: 2026 }),
    v('Aurelian lobbies Congress to let corporations hold Strategic Licenses. Spotlight calls it "the Graded Defense Initiative."', { from: 2026 }),
    v('Choirsong, a stronger strain of Rush, turns up in the Old Foundry. Overdoses spike.', { from: 2025 }),
    v('Equal Ground marches on Federal Plaza. Imani Brooks is arrested again; it is her thirty-somethingth time.', { from: 2010 }),
    v('The Harlan Ledger runs a story on Juniper House survivors. Most of them still will not give their names.', { from: 1998 }),
  ],
};

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
  'act.crew-job.choir': 1990,
  'act.crew-job.lowkings': 2011,
  'choice.enroll.ashgrove': 1979,
  'school.graduate.ashgrove': 1979,
};

export const TEMPLATES: Record<string, Variant[]> = {
  "act.life.unwind": ["You turn down another obligation. For once, the evening stays empty.", "You spend an afternoon away from work and the noise. Nobody invoices you for it."],
  "act.life.learn": ["You practise {skill} work until the mistakes stop repeating. Skill level: {level}."],
  "act.life.freelance": ["You deliver a commission and collect {money}. The next client already wants revisions."],
  "act.life.deposit": ["You move {money} into savings. The bank offers 2.5% annual interest and a handshake."],
  "act.life.withdraw": ["You transfer {money} from savings back into spending money."],
  "act.life.invest": ["You invest {money} in a diversified portfolio. The returns come with no promises."],
  "act.life.sell-investments": ["You sell {money} of your portfolio at its current value."],
  "act.life.loan": ["You borrow {money} at 12% annual interest. The monthly payment starts next month."],
  "act.life.repay": ["You repay {money} of your loan balance. The fine print gets a little shorter."],
  "act.life.career": ["You take on training and extra responsibility. Your performance improves; your evenings shrink."],
  "act.life.promotion": ["Your promotion clears the desk upstairs. Career level {level}; annual salary {salary}."],
  "act.life.home": ["You sign for a home worth {money}. The mortgage payment is {payment} a month, before upkeep."],
  "act.life.sell-home": ["You sell the house and settle the mortgage and selling costs. Your cash changes by {money}."],
  "act.life.business": ["You open a small service business. The first customer asks for a discount."],
  "act.life.expand": ["You expand the business to level {level}. More capacity, more overhead."],
  "act.life.close-business": ["You close the business and stop taking orders. The invoices finally stop multiplying."],
  "act.life.retire": ["You hand in your notice. Your annual pension is {salary}."],
  "life.accounts": ["Your accounts show savings of {savings}, investments of {investments}, and personal debt of {debt}."],
  "life.burnout": ["Work and obligations crowd out the rest of the week. Sustained stress is wearing down your health."],
  "life.home-lost": ["The lender forces a sale, settles the mortgage, and returns any remaining equity. Your credit takes the hit."],
  "life.heir": ["You take up the story after {ancestor}. The settled estate leaves you {money}."],

  // ---------- Actions (things the player does this month; see actions.ts) ----------
  'act.gym': [
    'You put in an hour on the bench and the bag. Nothing changes that a mirror would notice.',
    'You run the river path until your lungs burn, then walk home in the rain.',
    v('You lift at a Graded-only gym where the plates are bolted down and the mirror is shatterproof.', { graded: true, from: 1980 }),
    v('You work out in a boxing gym on the Old Foundry riverfront. The heavy bag has scorch marks.', { rough: true }),
    v('You jog laps around a Kesler Heights cul-de-sac. A Baseline Watch sign tracks your progress.', { districts: ['Kesler Heights'] }),
    v('You train in a gym in the Spire with a juice bar and a Pinnacle poster in every room.', { districts: ['The Spire'], from: 1983 }),
  ],
  'act.gym.up': [
    'Weeks of early mornings pay off. Your shirts fit differently. (Body +1)',
    'You add weight to the bar and it goes up anyway. (Body +1)',
    v('A trainer at the Graded gym clocks your numbers twice and writes them down. (Body +1)', { graded: true, from: 1980 }),
  ],
  'act.gym.prison': [
    'You do push-ups in the yard while the tower guards watch.',
    'You join the pull-up line in the yard. Nobody talks during sets.',
  ],
  'act.gym.prison-up': [
    'A month of yard work-outs shows. People give you more room in the chow line. (Body +1)',
  ],
  'act.study': [
    'You spend the afternoon in the library with a stack of books and a vending-machine coffee.',
    'You study at the kitchen table until the light outside goes.',
    v('You study in a Saint Bryce café full of Harlan State students and one tired professor grading papers.', { districts: ['Saint Bryce'] }),
    v('You study in the Old Foundry branch library, where the radiator works one day in three.', { districts: ['Old Foundry'] }),
    v('You watch lectures on your {phone} on the H-Line, between Enhanced-incident delays.', { from: 2010 }),
    v('You take notes from library microfiche until the librarian flicks the lights.', { until: 1995 }),
  ],
  'act.study.up': [
    'Something clicks. You start finishing the problems before the answer key. (Mind +1)',
    'You read everything twice and it starts to stick. (Mind +1)',
  ],
  'act.study.prison': [
    'You read whatever the prison library cart has this week: a law book, a western, a manual for a car nobody makes any more.',
    'You work through a GED packet at a steel table bolted to the floor.',
  ],
  'act.study.prison-up': [
    'You read your way through the prison law library. Other inmates start bringing you their paperwork. (Mind +1)',
  ],
  'act.rest': [
    'You take a day for yourself: real food, a long sleep, and the {phone} switched off.',
    'You sleep fourteen hours and eat everything in the fridge.',
  ],
  'act.rest.strain': [
    'You eat like a Graded eats, three plates and a pint of ice cream, and sleep it off. The Strain eases.',
    'Sugar, fat and twelve hours of sleep. The tremor in your hands is gone by morning.',
    v('A diner charges you for "double portions" without asking. You eat both. The headache fades.', { graded: true }),
  ],
  'act.clinic': [
    'A walk-in clinic patches you up. The doctor spends more time on the billing codes than on you.',
    'You get seen after four hours in a waiting room. Stitches, painkillers, and a pamphlet.',
    v('Saint Bryce Medical\'s ER fits you between three hero-fight casualties.', { districts: ['Saint Bryce'] }),
    v('The doctor charges the Graded surcharge and breaks two needles on you before she gets the shot in.', { graded: true }),
  ],
  'act.clinic.strain-ward': [
    'Saint Bryce\'s Strain Ward puts you on a cooling bed with an IV of glucose. The nosebleeds stop.',
    'A Strain Ward nurse checks your readings, sighs, and hangs a glucose drip. You leave steadier.',
  ],
  'act.healer': [
    'A licensed BIO healer puts two hands on your ribs. Ten minutes later you are whole and much poorer.',
    'You pay a healer in cash in the back room of a clinic. Whatever was broken knits while you watch.',
    v('A healer on a private Aurelian contract squeezes you in between corporate clients. The bill arrives before you reach the lobby.', { from: 1994 }),
  ],
  'act.practice': [
    'You practise your {power} power in private until your head pounds. Control comes a little easier.',
    'You run drills alone, over and over, the same technique until it stops misfiring.',
    v('You practise in an empty Old Foundry lot where nobody calls the police on a Graded.', { districts: ['Old Foundry'] }),
    v('You practise in your bedroom with the door locked and a towel under it.', { family: true }),
    v('You practise on Ashgrove Academy\'s training floor under a supervisor with a stopwatch.', { tie: 'Ashgrove Academy', from: 1979 }),
    v('You train on an Aurelian practice floor with a coach who films every rep.', { tie: 'Aurelian' }),
  ],
  'act.practice.prison': [
    'You practise in your cell in small, quiet ways the guards cannot see.',
    v('You try to practise, but the Quell in your system makes everything muddy. You get a little anyway.', { from: 2003 }),
  ],
  'act.push': [
    'You push your power past where it wants to stop. Your nose bleeds, but something new opens up.',
    'You train until you black out, wake on the floor, and go again. It works. It is also how people die.',
    v('You take a dangerous job just to see what your power does under pressure. You learn more in an hour than in a month.', { minAge: 18 }),
  ],
  'act.strain.danger': [
    'The Strain catches up: migraine, tremors, a nosebleed that will not stop. You lose a day to it.',
    'Your power misfires and your heart stutters. You sit on the floor until it settles.',
  ],
  'act.strain.critical': [
    'You go past 90% Strain. Capillaries burst in both eyes and you wake up in Saint Bryce\'s Strain Ward.',
    'Your power shuts off mid-use and your body follows. Burnout. A neighbour finds you and calls it in.',
  ],
  'act.show-off': [
    'You use your power in public. A few people stop to watch. One of them claps.',
    'You show off your {power} power for a crowd outside a corner store. Kids follow you for a block.',
    v('Tourists outside Aurelian Tower film you, thinking you might be someone.', { districts: ['The Spire'], from: 1994 }),
    v('You show off at a block party. The Old Foundry has seen better, and says so, and buys you a drink anyway.', { districts: ['Old Foundry'] }),
  ],
  'act.show-off.viral': [
    'Someone films you using your power and it spreads. {Gossip} argue about your Rank for a week.',
    v('A clip of you hits Spotlight\'s "Street Graded" segment. Strangers recognise you on the H-Line.', { from: 2008 }),
  ],
  'act.show-off.cited': [
    'A patrol car pulls up. Public power use on a Civilian license: a ${money} fine and a note on your file.',
    'A cop asks for your {card} and writes you up for unlicensed public use. ${money}, payable in thirty days.',
  ],
  'act.patrol.licensed': [
    'You patrol your sponsor\'s route. You stop a mugging, pose for a photo, and file the paperwork.',
    'You work a licensed patrol shift. A car thief surrenders the moment he sees your costume.',
    v('You break up a fight on Pier 9 on a licensed patrol. The Ledger runs a photo.', { districts: ['Riverside Docks'] }),
  ],
  'act.patrol.rogue': [
    'You go out masked and stop a robbery. The victim does not call the police, and neither do you.',
    'You patrol the rooftops without a license. You stop one mugging and scare off two more.',
    v('You chase a dealer out of an Old Foundry stairwell. The building\'s grandmothers start leaving food on your fire escape.', { districts: ['Old Foundry'] }),
    v('Your rogue patrol ends up on GradeWatch. Half the comments call you a hero, the other half a felon.', { from: 2013 }),
  ],
  'act.patrol.hurt': [
    'Your patrol goes wrong: the other guy has a power too. You limp home and do not report it.',
    'You get jumped on patrol by three people with bats. You walk away. Barely.',
  ],
  'act.patrol.arrested': [
    'Police catch you on an unlicensed patrol. Vigilantism is a felony: {months} months in {prison}.',
    'The Bureau picks you up mid-patrol. The judge calls you "a danger to the public you claim to protect." {months} months in {prison}.',
  ],
  'act.odd-job': [
    'You pick up day labour and get paid ${money} in cash.',
    'You work a weekend shift unloading trucks. ${money}, no questions.',
    v('You haul crates at the Riverside container terminal for ${money} cash.', { districts: ['Riverside Docks'] }),
    v('You serve drinks at a Spire launch party for ${money} plus tips. Nobody looks at the help.', { districts: ['The Spire'] }),
    v('You run deliveries on an app that takes a third of every fare. ${money} for the week.', { from: 2014 }),
  ],
  'act.odd-job.kid': [
    'You mow lawns and walk dogs for ${money}.',
    'You shovel snow up and down the block for ${money}.',
    'You run errands for the corner store owner. ${money} and a soda.',
  ],
  'act.odd-job.overtime': [
    'You pick up extra shifts as a {job}. ${money} more on the next paycheck.',
    'You work a week of overtime. Your boss notices. Your back notices more. ${money} extra.',
  ],
  'act.job-hunt.none': [
    'You spend the week on applications. Nobody calls back.',
    'You get one interview. They ask your Rank before your name and the job goes to someone else.',
    v('You hand out résumés across the Spire. A receptionist takes one, glances at your address, and drops it in a tray.', { rough: true }),
    v('Every listing says "Grade Card required." You fill out forty of them anyway.', { graded: true, from: 1978 }),
  ],
  'act.raise.yes': [
    'You ask for a raise and get it: {pct}%. Your salary as a {job} is now ${salary}.',
    'You make your case with numbers. Your manager signs off on {pct}% more: ${salary} a year.',
  ],
  'act.raise.no': [
    'You ask for a raise. Your manager says "next quarter" in the voice people use for "never."',
    'You ask for a raise and get a speech about the budget.',
  ],
  'act.raise.fired': [
    'You ask for a raise. A week later your job as a {job} is "restructured" away.',
  ],
  'act.quit': [
    'You quit your job as a {job}. Your last paycheck comes two weeks late.',
    'You hand in your notice as a {job} and clear out your locker.',
  ],
  'act.family': [
    'You spend Sunday with family. Dinner, an old argument, and leftovers to take home.',
    'You help around the house and listen to the same stories again.',
    v('Your foster family gets a phone call from you, which surprises them.', { backgrounds: ['foster system'] }),
    v('Dinner with family turns into a conversation about your Rank. It always does.', { graded: true }),
    v('Your family hosts the street for a cook-out. Half the Old Foundry turns up with a dish.', { districts: ['Old Foundry'] }),
  ],
  'act.family.up': [
    'A long night with family gets you laughing at yourself. People notice you are easier to be around. (Charm +1)',
  ],
  'act.family.money': [
    'Your family takes you to lunch at a club in Ashgrove and slips you ${money} on the way out.',
    'A relative presses ${money} into your hand and tells you not to tell your parents.',
  ],
  'act.night-out': [
    'You go out. Cheap drinks, loud music, and you are home by three.',
    'You spend the night out with friends and make it home in the rain.',
    v('You end the night at Cal\'s All-Night Diner with a basket of the best fries in the city.', { districts: ['Riverside Docks'] }),
    v('You go to a Dud comedy club in the Old Foundry. The headliner does ten minutes on F-Ranks and kills.', { districts: ['Old Foundry'] }),
    v('You try for The Ceiling. The bouncer checks your card and waves you up the elevator.', { districts: ['The Spire'], minRank: 'B' }),
    v('You try for The Ceiling. The bouncer looks at your card and points you to a bar down the street.', { districts: ['The Spire'] }),
    v('You go to a party in Saint Bryce where Harlan State students argue about Graded rights until dawn.', { districts: ['Saint Bryce'] }),
    v('You go to a house party in Kesler Heights. The host asks if you are "one of them" before you get your coat off.', { districts: ['Kesler Heights'], graded: true }),
  ],
  'act.volunteer': [
    'You volunteer at a shelter. You hand out blankets and learn three people\'s names.',
    'You help clean up after a hero fight that left a block in pieces. Nobody from the hero\'s sponsor shows.',
    v('You volunteer at the Low Kings\' soup kitchen on Mercer Street. Dez Uwaifo shakes your hand.', { districts: ['Riverside Docks'], from: 2011 }),
    v('You help Equal Ground\'s mutual-aid table in the Old Foundry hand out food and legal pamphlets.', { districts: ['Old Foundry'], from: 2000 }),
    v('You volunteer at Saint Bryce Medical, mopping the floors of the Strain Ward.', { districts: ['Saint Bryce'] }),
  ],
  'act.move.ask': [
    'You look at flats across Port Harlan. Rent runs from ${low} a month in the Old Foundry to ${high} in the Ashgrove hills. Landlords want the first month up front, and they can legally ask your Rank.',
  ],
  'act.move.done': [
    'You move to {district}. The first month\'s rent, ${money}, goes to the landlord before the keys come to you.',
    'You pack what fits in a borrowed van and move to {district}. ${money} up front.',
    v('You move to {district}. The landlord asks for a "risk deposit" when he sees your Rank. ${money} gone.', { graded: true }),
  ],
  'act.move.stay': [
    'You look at a few places and stay where you are.',
  ],
  'act.steal': [
    'You lift something small from a store and sell it on for ${money}.',
    'You pick a pocket on a crowded H-Line platform. ${money} in the wallet.',
    v('You steal a crate off the back of a truck at the docks. It is worth ${money} to the right buyer.', { districts: ['Riverside Docks'] }),
    v('You swipe a tourist\'s bag outside the Pinnacle gift shop. ${money} and a souvenir mug.', { districts: ['The Spire'], from: 1994 }),
  ],
  'act.steal.caught-minor': [
    'A store guard catches you. The police drive you home. Your file now has your name in it.',
    'You get caught with your hands in a till. The owner calls your family instead of the cops, this time.',
  ],
  'act.steal.caught': [
    'You get caught stealing. The judge has seen your type: {months} months in {prison}.',
    'A camera you missed. {months} months in {prison} for theft.',
  ],
  'act.fight.win': [
    'You fight for money in a back room and win. The purse is ${money}; the bruises are free.',
    v('You fight in The Pit under the Riverside cold-storage yards and win. ${money} in a paper bag.', { districts: ['Riverside Docks'] }),
    v('You win a bout in The Pit. Bettors who took the long odds buy you drinks. ${money}.', { graded: true }),
  ],
  'act.fight.lose': [
    'You fight for money and lose. You wake up behind a dumpster with your share of the gate gone.',
    v('Your opponent in The Pit is a higher Rank than the promoter said. You lose badly.', { graded: true }),
  ],
  'act.crew-job.lowkings': [
    'You run a job for the Low Kings: a chop-shop delivery on Mercer Street. ${money} for your cut.',
    'You collect protection money for the Low Kings and keep the peace on three blocks. ${money}.',
  ],
  'act.crew-job.choir': [
    'You move a Choir shipment through the port. ${money}, and nobody says what was in the crates.',
    'The Choir sends you to lean on a shopkeeper. You do. ${money}.',
  ],
  'act.crew-job.caught': [
    'The job goes wrong and the police are waiting. {months} months in {prison}.',
    'Somebody talked. You get {months} months in {prison}; the crew sends a lawyer and a carton of cigarettes.',
  ],
  'act.hustle': [
    'You trade commissary, stamps and favours. ${money} in your account by the end of the month.',
    'You run a card game on the block. ${money}, and nobody sees the guards take their cut.',
  ],
  'act.hustle.caught': [
    'A guard catches your hustle. Solitary, a beating, and {months} more months on your sentence.',
  ],

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
  'money.windfall.kid': [
    'You find ${money} folded small on the sidewalk outside the bodega. You keep it.',
    'A grandparent presses ${money} into your hand and tells you not to tell anyone.',
    'You find ${money} in the pocket of a coat from the church donation bin.',
    'You sell your old toys on the stoop for a weekend and clear ${money}.',
  ],
  'money.rent-hike': [
    'Your landlord adds a "risk deposit" and a rent increase. It costs you ${money} up front.',
    'The building changes owners. The new management company wants ${money} for "repairs" nobody makes.',
    v('Your landlord adds a "Graded occupancy fee" of ${money}. It is technically illegal and completely normal.', { graded: true }),
  ],

  // ---------- Family and friends (see people.ts) ----------
  'people.talk': [
    'You and {personFirst} talk for an hour about nothing much. Neither of you checks the time.',
    '{PersonFirst} tells you a long story about a neighbour. You hear the ending twice.',
    'You sit on the stoop with {personFirst} until the streetlights come on.',
    v('{PersonFirst} asks what you want to be when you grow up. You give a different answer than last time.', { maxAge: 12 }),
    v('{PersonFirst} asks whether anyone at school has Kindled yet. You list three rumours.', { minAge: 8, maxAge: 17 }),
    v('{PersonFirst} asks about your power. You show them something small at the kitchen table.', { graded: true }),
  ],
  'people.argue': [
    'A conversation with {personFirst} turns into an argument about money. Doors get closed harder than they need to be.',
    'You and {personFirst} end up shouting about something from three years ago.',
    '{PersonFirst} says one thing too many. You leave before dessert.',
  ],
  'people.call': [
    'You call {personFirst}. The call runs forty minutes.',
    '{PersonFirst} picks up on the second ring and talks the whole way through your walk home.',
    'You leave {personFirst} a voicemail. They call back the same night.',
  ],
  'people.call.prison': [
    'You spend your phone credit on {personFirst}. The line clicks every few minutes.',
    '{PersonFirst} accepts the collect call. A recorded voice reminds you both the call is monitored.',
  ],
  'people.gift': [
    'You buy {personFirst} something small from a shop in {district}. They put it somewhere visible.',
    'You give {personFirst} a gift. They open it right there, in front of everyone.',
    '{PersonFirst} unwraps your gift and keeps the wrapping paper too.',
  ],
  'people.dinner': [
    'You take {personFirst} out to dinner in {district}. You split dessert.',
    'Dinner with {personFirst} runs until the staff start stacking chairs.',
    v('You take {personFirst} to a diner on the Docks where the waitress knows both your orders.', { districts: ['Riverside Docks'] }),
    v('You take {personFirst} to a place in the Spire with no prices on the menu.', { districts: ['The Spire'] }),
  ],
  'people.visit': [
    'You visit {personFirst}. They make coffee and tell you what the neighbours are up to.',
    'You drop by {personFirst}\'s place unannounced. They are already setting a second plate.',
    'You spend a Sunday at {personFirst}\'s. Someone fixes a shelf. Someone breaks a mug.',
  ],
  'people.give-money': [
    'You give {personFirst} ${money}. They try to give it back twice.',
    'You slip {personFirst} ${money} for the rent. Nobody says the number out loud.',
  ],
  'people.ask-money.yes': [
    '{PersonFirst} gives you ${money} and tells you to spend it on something sensible.',
    'You ask {personFirst} for money. ${money} appears from a drawer in the kitchen.',
    v('{PersonFirst} hands you ${money} in coins and makes you count it.', { maxAge: 12 }),
  ],
  'people.ask-money.no': [
    'You ask {personFirst} for money. The answer is no, with a speech attached.',
    '{PersonFirst} says money does not grow on trees and turns the television back up.',
    '{PersonFirst} says no and asks what happened to the last lot.',
  ],
  'people.new-friend': [
    'You get talking to {person} and swap numbers before you leave.',
    'You and {person} end up on the same side of an argument. By the end of the week you are friends.',
    v('You and {person} trade lunch every day for a week. Now you are friends.', { maxAge: 13 }),
    v('You meet {person} at a bar in {district}. They walk you to your bus.', { minAge: 18 }),
  ],
  'people.new-friend.none': [
    'You try to make friends. Everyone is polite. Nobody calls.',
    'You hang around the usual spots all week. People nod and move on.',
  ],
  'people.drift': [
    'You and {person} stop calling each other. Nobody decides it; it just happens.',
    '{Person} moves across town. The texts get shorter, then stop.',
  ],
  'people.sibling-born': [
    'A new sibling arrives: {person}. The apartment gets louder.',
    'Your family brings home a baby. They name it {person}.',
  ],
  'people.died.family': [
    '{Person}, {rel}, dies at {age}. The funeral is small and runs long.',
    '{Person} dies at {age}. You find out from a phone call at an hour when nobody calls.',
  ],
  'people.died.friend': [
    'Your friend {person} dies at {age}. Their name is in the paper on a Tuesday.',
    'You hear that {person} has died. The service is in a church in {district}.',
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
  'event.illness.street-kid': [
    'You get badly sick and wait eleven hours at the free clinic in a church basement. A volunteer doctor gives you a week of pills and no bill.',
    'A fever puts you on a cot at a shelter for a week. Nobody asks for insurance.',
  ],
  'event.illness.child': [
    'You get badly sick. Your family pays the Saint Bryce bill and mentions it at dinner for a month.',
    'A fever puts you in the ER overnight. The bill goes to your parents, who open it at the kitchen table.',
    'You spend a week in bed with something going around school. Someone else pays for the antibiotics.',
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
  // ---------- School and growing up (see school.ts and MILESTONES in events.ts) ----------
  'act.club': [
    'You stay after the last bell for practice in a gym that smells of floor wax and radiator dust.',
    'You join the chess club, which meets in a science room with the gas taps zip-tied shut.',
    'You sign up for the school paper. Your first story is about the vending machine.',
    v('You spend the afternoon at the {district} rec center, where the club keeps you off the corners for a few hours.', { rough: true }),
    v('You join the debate team at {district} and spend Thursday nights arguing about city zoning.', { districts: ['Saint Bryce', 'Kesler Heights'] }),
  ],
  'act.club.up-body': [
    'The coach runs the team until two people throw up. You are not one of them. (Body +1)',
    'A season of practice shows in your times on the track. (Body +1)',
  ],
  'act.club.up-charm': [
    'You give a speech at the school assembly and nobody throws anything. (Charm +1)',
    'Drama club casts you as the lead. The second night goes better than the first. (Charm +1)',
  ],
  'act.club.friend': [
    'You and {person} end up carrying the equipment back after practice. By the end of the season you are friends.',
    'At club you get partnered with {person}. You start eating lunch together.',
  ],
  'act.skip-class': [
    'You leave by the side stairwell after second period and spend the afternoon on the seawall.',
    'You and two kids from your homeroom cut class to play pool in {district}. The truancy officer calls the wrong number.',
    v('You skip afternoon classes and ride the H-Line end to end, twice.', { from: 1960 }),
  ],
  'act.skip-class.caught': [
    'The school calls home. Dinner is very quiet.',
    'A vice principal spots you at the bus stop at eleven in the morning. Your guardians get a letter.',
  ],
  'act.enroll.ask': [
    'You collect brochures, application forms and a fee waiver you may not qualify for.',
    'You sit in a counsellor\'s office in Saint Bryce while they read your transcript out loud.',
  ],
  'act.drop-out': [
    'You withdraw from {school}. The registrar\'s office needs three signatures to let you go.',
    'You stop going to {school}. A form letter arrives a month later to make it official.',
  ],
  'act.part-time': [
    'You stack crates and mop floors at a corner shop in {district} after school. ${money} goes in a coffee tin.',
    'You work weekend counter shifts under fluorescent lights while your classmates hang out down the block. You clear ${money}.',
    v('You bus tables at Cal\'s All-Night Diner after school for ${money} and all the fries you can eat.', { districts: ['Riverside Docks'] }),
  ],
  'act.buy-car': [
    'You buy a used car for ${money}. The previous owner leaves a rosary on the mirror and a dent in every door.',
    'You hand over ${money} for a car with two hundred thousand miles on it. It starts on the second try.',
  ],
  'act.roam': [
    'You spend Saturday learning the blocks around {district}: which shortcuts save ten minutes and which dogs bark through the fence.',
    'You ride a bike with no brakes around {district} until the streetlights come on.',
    v('You and the neighbourhood kids cut through back alleys, vacant lots and a storm drain nobody is supposed to know about.', { rough: true }),
    v('You ride bikes down the cul-de-sacs of {district}, past lawns with signs that say who is welcome.', { districts: ['Kesler Heights'] }),
    v('You explore the woods behind the big houses in the Ashgrove hills until a groundskeeper chases you off.', { districts: ['Ashgrove'] }),
  ],
  'act.date.match': [
    'You go out with {person}. Dinner turns into a walk turns into a second date.',
    'A friend sets you up with {person}. You talk until the bar closes and agree to do it again.',
    v('You meet {person} at a dance hall in {district}. They ask for your number before the last song.', { until: 1985 }),
    v('You meet {person} on a dating app. The photos are accurate, which surprises you both.', { from: 2012 }),
  ],
  'act.date.none': [
    'You go on a date. They spend most of it talking about their ex.',
    'The date ends with a handshake at the bus stop.',
    'Your date checks the time four times before the food arrives.',
  ],

  'school.honor-roll': [
    'Your report card from {school} comes home with a {gpa}. It goes on the fridge.',
    '{school} puts you on the honour roll with a {gpa}. Your name is on a list in the front hall.',
  ],
  'school.failing': [
    'Your grades at {school} slide to a {gpa}. A letter goes home asking for a meeting.',
    'A teacher at {school} keeps you after class to show you a {gpa} in red pen.',
  ],
  'school.expelled': [
    '{school} expels you after the arrest. In the autumn you start at {next}.',
  ],
  'school.expelled.college': [
    '{school} drops you from the rolls while you are inside.',
  ],
  'school.dropout': [
    'You never finish at {school}. The diploma goes to everyone else in your year.',
    'Graduation at {school} happens without you. Nobody calls to ask why.',
  ],
  'school.graduate.magnet': [
    'Four years at {school} leave you with calluses from a soldering iron and a head for systems. (Mind +1)',
  ],
  'school.graduate.prep': [
    'You leave {school} with a blazer, a Latin motto and the phone numbers of people who will run the Spire someday. (Mind +1, Charm +1)',
  ],
  'school.graduate.parish': [
    'The teachers at {school} shake your hand one at a time at the gate.',
    'The {school} principal reads your name slowly, as if it might be on a test.',
  ],
  'school.graduate.trade': [
    'You finish at {school} with a trade certificate and an apprentice card. The union hall has your name now.',
    'You pass the practical exam at {school}. The certificate comes in a cardboard tube.',
  ],
  'school.graduate.community': [
    'You finish your associate degree at {school}. Two years of night classes fit in one envelope.',
  ],
  'school.graduate.spire': [
    'You graduate from {school} under a tent with a string quartet. Recruiters are waiting in the car park. (Charm +1)',
  ],
  'school.graduate.ashgrove': [
    'You finish at {school} with your Grade logged, a sparring record and three agents\' business cards.',
  ],
  'school.dismissed': [
    '{school} dismisses you for grades. A {gpa} is not enough, the letter says, in two paragraphs.',
  ],
  'school.scholarship-lost': [
    'Your grades at {school} fall to {gpa}, and the scholarship goes with them. Tuition is your problem now.',
  ],

  'milestone.temperament.body': [
    'You climb everything in the apartment, including the refrigerator. (Body +1)',
    'You run everywhere. Nobody can get you to walk. (Body +1)',
  ],
  'milestone.temperament.mind': [
    'You take the radio apart to see where the voices live. (Mind +1)',
    'You ask "why" until the adults run out of answers. (Mind +1)',
  ],
  'milestone.temperament.charm': [
    'You talk to every stranger on the bus, and most of them talk back. (Charm +1)',
    'You learn that a smile gets you a second cookie. (Charm +1)',
  ],
  'milestone.temperament.nerve': [
    'You refuse to come down from the top of the slide until you decide to. (Nerve +1)',
    'You stare down the neighbour\'s dog until it leaves. (Nerve +1)',
  ],
  'milestone.first-day.friend': [
    'First day at {school}. You share a crayon box with {person}, and by lunch you are a pair.',
    'At {school} the teacher seats you next to {person}. You trade snacks before the first bell.',
  ],
  'milestone.first-day.rival': [
    'First day at {school}. {Person} takes your seat and will not give it back. This is going to be a long year.',
    'At {school}, {person} laughs at your shoes in front of the whole line. You remember the name.',
  ],
  'milestone.road-test.fail': [
    'You fail the road test on the parallel park. The examiner writes something long on the clipboard.',
    'You roll a stop sign during the road test. The examiner has you pull over and drives you back.',
  ],
  'milestone.road-test.pass': [
    'You pass the road test on the first try. There is no car to drive, but the license goes in your wallet.',
  ],
  'milestone.road-test.car-gift': [
    'You pass the road test. A car is waiting in the driveway with a bow on it.',
  ],
  'milestone.road-test.beater': [
    'You pass the road test and spend ${money} of your savings on a car with a cracked dashboard and a working radio.',
  ],
  'milestone.summer.street': [
    'Somebody opens the fire hydrant on your block. You spend the summer on the street with the older kids. (Nerve +1)',
  ],
  'milestone.summer.scrape': [
    'You play street games all summer and come home with gravel in both knees.',
  ],
  'milestone.summer.camp-body': [
    'You spend the summer swimming laps at the rec center pool. (Body +1)',
  ],
  'milestone.summer.camp-charm': [
    'Summer day camp puts you in charge of the younger kids. They listen. (Charm +1)',
  ],
  'milestone.science-fair.ribbon': [
    'Your science fair project wins a blue ribbon. Your family drives the poster board home flat in the back seat. (Mind +1)',
    'Your project on water filters takes first place. A judge asks where you got the idea. (Mind +1)',
  ],
  'milestone.science-fair.volcano': [
    'You bring a baking-soda volcano to the science fair. It erupts on the judge\'s shoes.',
    'Your science fair poster is finished at seven in the morning on the day. It gets a participation ribbon.',
  ],
  'milestone.wipeout.clean': [
    'You take a rusty bike down the steepest hill in {district} and make it to the bottom in one piece. The other kids talk about it for a week.',
  ],
  'milestone.wipeout.crash': [
    'You take a skateboard down the steepest hill in {district}. The skateboard makes it to the bottom first. You get bruised ribs and a scar with a story.',
  ],
  'milestone.growth.body': [
    'You grow four inches in a year. None of your trousers fit and you can reach the top shelf. (Body +1)',
  ],
  'milestone.growth.charm': [
    'Your face catches up with your ears. People at school start saying hello first. (Charm +1)',
  ],
  'milestone.growth.tight': [
    'You grow out of every pair of shoes you own. Money is tight, so you wear your cousin\'s.',
  ],
  'milestone.hallways.friend': [
    'You and {person} get detention together and spend it laughing. You are inseparable by spring.',
    '{Person} saves you a seat at lunch on a bad day. After that, it is always saved.',
  ],
  'milestone.hallways.rival': [
    '{Person} decides you are the problem with high school. Your locker gets a new dent every week.',
    'You and {person} want the same spot on the team. Only one of you gets it, and neither of you lets it go.',
  ],
  'milestone.hallways.scene': [
    'You fall in with the kids who smoke behind the gym and play in basement bands. Teachers learn your name for the wrong reasons.',
  ],
  'milestone.summer-job': [
    'You spend the summer unloading trucks at the docks for ${money}, cash, every Friday.',
    'You work the summer at a car wash in {district}. You save ${money} and lose a shirt to the wax machine.',
    v('You spend the summer behind the counter of a corner store in {district} for ${money}.', { rough: false }),
  ],
  'life.pet-died': [
    '{PetName}, your {pet}, dies in their sleep in the spot by the radiator.',
    'You bury {petName}, your old {pet}, in a shoebox. The apartment is very quiet.',
  ],

  // ---------- Choices: growing up ----------
  'event.corner-store-dare': [
    'At the corner store, {personFirst} nudges your elbow toward a rack of comics while the clerk argues with a delivery driver in the back. "Bet you won\'t," {personFirst} whispers.',
    '{PersonFirst} stops at the candy aisle of a bodega in {district} and looks at the clerk, then at you. "Bet you won\'t take one."',
  ],
  'choice.dare.swipe': [
    'The comic goes into your jacket and you walk out at a normal speed. {PersonFirst} talks about it for a month.',
    'You pocket a pack of batteries and nobody looks up. {PersonFirst} tells the story to everyone, with improvements.',
  ],
  'choice.dare.caught': [
    'The clerk catches your wrist at the door and calls home. The ride back is silent.',
    'The clerk saw everything in the convex mirror. Your family gets a call, and {personFirst} gets away.',
  ],
  'choice.dare.pay': [
    'You put your saved-up change on the counter. The clerk counts it twice and starts saving you the new issues.',
  ],
  'choice.dare.refuse': [
    'You tell {personFirst} it is a stupid way to get banned from the only store on the block. {PersonFirst} sulks the whole way home.',
  ],
  'event.schoolyard-bully': [
    'Behind the bleachers at recess, a sixth-grader corners a smaller kid from your class and shakes them down for lunch money.',
    'At the bus stop, an older kid has a boy from your class pinned against the shelter, going through his backpack.',
  ],
  'choice.bully.step-in': [
    'You step in and swing first. You both end up in the office with scraped knuckles, and the kid you stood up for, {person}, waits for you outside. (Nerve +1)',
  ],
  'choice.bully.joke': [
    'You say something loud and funny enough that the yard teacher turns around. The bully walks off. The kid, {person}, sits with you at lunch after that.',
  ],
  'choice.bully.walk': [
    'You keep your head down and walk past. You can still hear it from the other side of the yard.',
  ],
  'event.school-track': [
    'Your guidance counsellor slides a manila folder across the desk. High school placement forms are due Friday, and where you go decides who you will know at eighteen.',
  ],
  'choice.track.magnet': [
    'You pass the entrance exam for {school}. The acceptance letter comes with a reading list. (Mind +1)',
  ],
  'choice.track.magnet-fail': [
    'You sit the exam for Harlan Technical and miss the cut by four points. You start at {school} in the autumn.',
  ],
  'choice.track.prep-paid': [
    'You stay on at {school}. Your family writes the cheque without reading it.',
  ],
  'choice.track.prep-scholarship': [
    'You win a scholarship to {school}. The blazer costs more than your family\'s rent, and the school pays for that too.',
  ],
  'choice.track.parish': [
    'You enroll at {school}: uniforms, morning assembly, and a dean of students who has seen everything.',
  ],
  'choice.track.local': [
    'You go to {school} with the kids from your block. Same bus, same corner, four more years.',
  ],
  'event.joyride': [
    'Past midnight on a Friday, {personFirst} pulls up outside your building in a borrowed sedan with three kids from school in the back, music rattling the plates.',
    '{PersonFirst} calls up to your window: somebody\'s cousin left the keys to a station wagon, and everyone is driving out to the grain silos at Riverside Docks.',
  ],
  'choice.joyride.ride': [
    'You ride out to the silos with {personFirst} and the others. Nobody gets hurt, and the sunrise over the river is worth the trouble.',
    'You climb into the front seat. {PersonFirst} drives too fast on the Harbor road and everyone screams the words to the same song.',
  ],
  'choice.joyride.busted': [
    'Harbor Patrol breaks up the party at the silos. An officer takes your names and lets you go with a curfew warning. (Nerve +1)',
  ],
  'choice.joyride.drive': [
    'You take the wheel and drive the speed limit the whole way. {PersonFirst} complains, and everyone gets home. (Nerve +1)',
  ],
  'choice.joyride.stay': [
    'You tell {personFirst} you have an exam in the morning. You do, and you pass it.',
  ],
  'event.senior-year': [
    'Senior year. Forms pile up on the kitchen table: college applications, a trade school flyer, a job ad from a warehouse, and nothing at all from the kids who already left.',
  ],
  'choice.senior.college': [
    'You spend the year on practice tests at the kitchen table. Your grades go up.',
  ],
  'choice.senior.trade': [
    'You sign up for the trade institute\'s autumn intake. The recruiter shakes your hand like you have already got the job.',
  ],
  'choice.senior.work': [
    'You put your name down at a warehouse and a supermarket for after graduation.',
  ],
  'choice.senior.street': [
    'You stop going to school. You learn other things on the corner instead. (Nerve +1)',
  ],
  'event.enroll.letters': [
    'Envelopes arrive all summer. Some are thick, some are thin. You spread them out on the bed.',
  ],
  'choice.enroll.trade': [
    'You start at {school}: steel-toed boots, a locker, and an instructor who still has all ten fingers.',
  ],
  'choice.enroll.community': [
    'You enroll at {school}. Classes are at night, in rooms that smell of floor polish.',
  ],
  'choice.enroll.state': [
    'You enroll at {school} in Saint Bryce. The bookstore line goes round the block.',
  ],
  'choice.enroll.spire': [
    'You enroll at {school}. The orientation packet includes a guide to the dress code at alumni events.',
  ],
  'choice.enroll.ashgrove': [
    'You move up to {school}. The dorm walls are reinforced and the sparring schedule is posted on Sundays.',
  ],
  'choice.enroll.scholarship': [
    'You enroll at {school} on a scholarship. The letter mentions the grades you have to keep, twice.',
  ],
  'choice.enroll.hold': [
    'You put school on hold. The brochures go in a drawer.',
  ],

  // ---------- Choices: family and friends ----------
  'event.family-shortfall': [
    'An envelope sits on the kitchen table in {district}: the utility company, final notice. Your family is short this month.',
    'The landlord raises the rent on your family\'s place. Everyone looks at the calendar, then at each other.',
  ],
  'choice.shortfall.cover': [
    'You put ${money} on the table. Nobody says thank you out loud, and everybody means it.',
  ],
  'choice.shortfall.shifts': [
    'You pick up extra shifts alongside your family until the bill is paid. Everyone is tired for a month.',
  ],
  'choice.shortfall.no': [
    'You tell them you do not have it. The silence at dinner lasts a week.',
  ],
  'event.bail-call': [
    'Your {phone} goes off at three in the morning: {personFirst}, from central booking. A bar fight, a curfew sweep, ${money} bail before the morning arraignment.',
    '{PersonFirst} calls from a precinct holding cell near the docks. They need ${money} by morning or they go in front of a judge in yesterday\'s clothes.',
  ],
  'choice.bail.post': [
    'You post ${money} at the window and wait on a plastic chair until {personFirst} walks out.',
  ],
  'choice.bail.talk': [
    'You talk to the desk sergeant for twenty minutes. {PersonFirst} is released with a warning and no bail.',
  ],
  'choice.bail.leave': [
    'You let {personFirst} sit in holding overnight. They make it out on their own and stop answering your calls.',
  ],
  'event.sibling-kindling': [
    'A scream from the bathroom: {personFirst} has cracked the mirror without touching it and the lights on the block are flickering. The neighbours are already at their windows.',
    'Your sibling {personFirst} comes out of their room with frost on their hands and the radiator split open. Kindling: you have seen it on television enough times to know.',
  ],
  'choice.sibling.register': [
    'You walk {personFirst} into the Bureau office yourself within the seventy-two hours. They come out with a temporary card and a Rank pending.',
  ],
  'choice.sibling.hide': [
    'You tape the mirror, blame the wiring, and teach {personFirst} to breathe through it. Nobody official knows.',
  ],
  'choice.sibling.caught': [
    'A neighbour reports the flickering lights. The Bureau finds {personFirst}, and finds that you covered it up: {months} months in {prison}.',
  ],
  'choice.sibling.contact': [
    'You make a call. People arrive in a van with no markings and take care of everything for {personFirst}, including the paperwork.',
  ],
  'event.move-in': [
    '{PersonFirst} spreads rental listings across your table. Split one place in {district} and you both save on rent.',
  ],
  'choice.move-in.yes': [
    'You and {personFirst} put both names on the lease. Moving day takes three trips and one argument about a couch.',
  ],
  'choice.move-in.no': [
    'You tell {personFirst} you are not ready. They fold the listings up very neatly.',
  ],
  'event.rival': [
    'You run into {person} in {district}, and they make sure everyone around you hears what they think of you.',
    '{Person} spots you across a crowded bar and starts in on you loud enough to stop the jukebox.',
  ],
  'choice.rival.fight': [
    'You stand your ground. {PersonFirst} swings first and ends up on the floor. People remember who walked away.',
  ],
  'choice.rival.words': [
    'You take {personFirst} apart in four sentences. The crowd laughs at them, not you.',
  ],
  'choice.rival.drink': [
    'You buy {personFirst} a drink instead. By the second one you are laughing about the old days.',
  ],
  'choice.rival.walk': [
    'You walk away. {PersonFirst} keeps talking to your back.',
  ],

  // ---------- Choices: adult life ----------
  'event.first-lease': [
    'You need a place of your own in {district}. Three leads before the first of the month: a damp basement studio, a three-bedroom share with two strangers, or a clean one-bedroom that stretches every dollar.',
  ],
  'choice.lease.basement': [
    'You take the basement studio. The walls sweat and the window looks at ankles, but you keep ${money} a year.',
  ],
  'choice.lease.share-friend': [
    'You take the share. One roommate, {person}, cooks for everyone and becomes a friend. You save ${money} a year.',
  ],
  'choice.lease.share-rival': [
    'You take the share. One roommate, {person}, labels the milk and leaves notes on the fridge. You save ${money} a year and gain an enemy.',
  ],
  'choice.lease.clean': [
    'You sign for the clean one-bedroom and pay a ${money} deposit. The radiator works and the locks are new.',
  ],
  'event.scapegoat': [
    'An account at work comes up four thousand dollars short, thanks to your supervisor\'s bookkeeping. Before regional management arrives, your supervisor pulls you into the hallway and suggests you take it as a "rookie mistake," for a favour later.',
  ],
  'choice.scapegoat.receipts': [
    'You print the timestamped logs and put them on the regional manager\'s desk. Your supervisor is gone by Friday; you get a ${money} bonus and a raise to ${salary} a year.',
  ],
  'choice.scapegoat.fall': [
    'You sign the reprimand. ${money} in cash appears in your locker a week later.',
  ],
  'choice.scapegoat.quit': [
    'You tell your supervisor where to put the write-up and walk out of the {job} job for good.',
  ],
  'event.aging-parent': [
    'A doctor at Saint Bryce Medical calls you at work: {personFirst} fell on the stairs. Nothing life-threatening, but they cannot manage a third-floor walk-up alone any more.',
  ],
  'choice.parent.pay': [
    'You pay ${money} toward a ground-floor flat with rails in the bathroom. {PersonFirst} calls every Sunday to complain about the neighbours.',
  ],
  'choice.parent.move-in': [
    'You clear out the spare room and move {personFirst} in. The house runs on pill schedules now. (Nerve +1)',
  ],
  'choice.parent.siblings': [
    'You and your sibling split the costs and the schedule for {personFirst}. There is a shared calendar and a lot of texts.',
  ],
  'choice.parent.leave': [
    'You leave it to the hospital social worker. {PersonFirst} ends up in a care home across the river, and the calls get shorter.',
  ],
  'event.midlife': [
    'An old acquaintance offers you a share in a small business in {district}: a corner diner, or a garage with two bays and a loyal clientele.',
    'A Tuesday morning, a bathroom mirror, and a phone call from an old friend who wants a partner in a corner business in {district}.',
  ],
  'choice.midlife.buy-in': [
    'You put ${money} into the business. Your name goes on the window, and the books pay you about ${salary} a year.',
  ],
  'choice.midlife.career': [
    'You pass, and push for a senior role at your {job} job instead. The new salary is ${salary}, and the hours are longer.',
  ],
  'choice.midlife.sabbatical': [
    'You take a month off. It costs ${money} in lost pay and you spend most of it sleeping, cooking and calling people back.',
  ],
  'event.torch': [
    'A sharp nineteen-year-old from {district} keeps turning up where you are, asking how to survive Port Harlan without getting chewed up. They remind you of someone.',
  ],
  'choice.torch.protege': [
    'You take {person} under your wing. They show up early, listen, and argue with everything.',
  ],
  'choice.torch.tough-love': [
    'You give them ${money} and one hard truth about the city, and send them on their way.',
  ],
  'choice.torch.no': [
    'You tell the kid you are retired from fixing other people\'s mistakes. They stop coming round.',
  ],
  'event.pension': [
    'A certified letter from the pension fund: after "market restructuring," you can take a buyout now, fight the cut, or move into part-time consulting.',
  ],
  'choice.pension.lump-sum': [
    'You take the ${money} buyout and clear out your desk. Somebody buys a sheet cake.',
  ],
  'choice.pension.won': [
    'You organise the retirees and pack City Hall for three meetings straight. The fund settles: ${money}, and your face on the evening news.',
  ],
  'choice.pension.lost': [
    'You fight the cut for a year. The fund wins in court and you take ${money}, less than they first offered.',
  ],
  'choice.pension.advisor': [
    'You move into a part-time advisory role at ${salary} a year. Your calendar empties out.',
  ],

  // ---------- Choices: ordinary trouble ----------
  'event.union-drive': [
    'The shop steward passes union cards around the break room. Management has already noticed who is talking to whom.',
  ],
  'choice.union.won': [
    'You sign. The vote passes by eleven, and the first contract raises your {job} pay to ${salary}.',
  ],
  'choice.union.lost': [
    'You sign. The vote fails by six, and the break room goes quiet for a while.',
  ],
  'choice.union.fired': [
    'You sign. Two weeks later you are let go from the {job} job for "attendance."',
  ],
  'choice.union.quiet': [
    'You keep your head down and your card in your pocket.',
  ],
  'choice.union.snitch': [
    'You give management the names. You get ${money} and nobody sits with you at lunch again.',
  ],
  'event.stray-pet': [
    'A rain-soaked stray follows you home and sits on your stoop like it has been there all along.',
    'A one-eared alley cat has been waiting outside your door for three nights running.',
  ],
  'choice.pet.keep': [
    'You take the {pet} in and name it {petName}. It takes over the warmest spot in the place.',
  ],
  'choice.pet.shelter': [
    'You walk the stray to the shelter. A volunteer writes your name on the intake form.',
  ],
  'event.car-trouble': [
    'The alternator dies on the Harbor Expressway at rush hour. Your car sits on the shoulder with the hazards blinking.',
  ],
  'choice.car.fix': [
    'You pay ${money} to keep it running for another year, probably.',
  ],
  'choice.car.upgrade': [
    'You trade the old car in and pay ${money} for one that starts every time.',
  ],
  'choice.car.scrap': [
    'You sell the car for scrap for ${money} and buy a bus pass.',
  ],
  'event.dental': [
    'A cracked molar flares up at two in the morning. By sunrise half your face is swollen.',
  ],
  'choice.dental.clinic': [
    'You pay ${money} at an urgent dental clinic. The dentist works fast and talks about baseball the whole time.',
  ],
  'choice.dental.tough': [
    'You tough it out with clove oil and painkillers for two weeks.',
  ],
  'event.skimmer': [
    'A card skimmer on a bodega reader drains ${money} from your account before the bank freezes your card.',
  ],
  'choice.skimmer.call': [
    'You spend an afternoon on hold with the bank. The ${money} comes back in eight to ten business days.',
  ],
  'choice.skimmer.eat': [
    'You eat the loss and start paying cash.',
  ],

  // ---------- Ordinary life (see MUNDANE_EVENTS in events.ts) ----------
  'mundane.transit-strike.cab': [
    'The transit workers walk out for a week. Shared cabs across {district} cost you ${money}.',
  ],
  'mundane.transit-strike.walk': [
    'A transit strike shuts the buses and the ferries for a week. You walk three miles each way in the rain.',
  ],
  'mundane.pipe-burst': [
    'A pipe bursts in the ceiling at two in the morning. The landlord takes a week to call anyone, and replacing the ruined bedding costs ${money}.',
  ],
  'mundane.pipe-burst.broke': [
    'A pipe bursts above your bed. You sleep on the floor for a week because you cannot replace the mattress.',
  ],
  'mundane.tax-refund': [
    'A tax refund arrives in the mail: ${money}, from a withholding mistake that works in your favour for once.',
  ],
  'mundane.jury-duty': [
    'Jury duty: two weeks in a civil trial at the municipal court, a ${money} stipend and a front-row seat on city paperwork.',
  ],
  'mundane.block-party': [
    'Neighbours drag grills and folding chairs into the street in {district}. Music comes out of open windows, and for one Saturday nobody calls the police.',
    'Somebody opens a hydrant and somebody else brings a sound system. The {district} block party runs past midnight.',
  ],
  'mundane.audit': [
    'Efficiency consultants spend a week watching your {job} work and asking why. You do not enjoy it.',
  ],
  'mundane.audit.impressed': [
    'Efficiency consultants descend on your workplace. Your answers make it into their report: a ${money} bonus and your {job} salary goes to ${salary}.',
  ],
  'mundane.league': [
    'You join a weeknight league in {district}: softball, bowling, or boxing at the rec center. {Person} on your team becomes a friend.',
  ],

  // ---------- People (see people.ts) ----------
  'people.chores': [
    'You help {personFirst} with the dishes and the laundry. They notice.',
    'You carry the groceries up four flights for {personFirst} without being asked.',
  ],
  'people.chores.paid': [
    'You help {personFirst} around the house all weekend. ${money} in pocket money appears on your pillow.',
  ],
  'people.date': [
    'You take {personFirst} out for dinner and a film. You walk the long way home.',
    'You and {personFirst} spend a Saturday wandering {district} with nowhere to be.',
  ],
  'people.move-in.yes': [
    '{PersonFirst} says yes before you finish asking. Their boxes take up half the hallway by Friday.',
  ],
  'people.move-in.no': [
    '{PersonFirst} says they need more time. They stay over less for a while.',
  ],
  'people.propose.yes': [
    'You propose to {personFirst}. They say yes. The wedding is small, loud and in {district}.',
    '{PersonFirst} says yes. Your families meet at the wedding and get along better than expected.',
  ],
  'people.propose.no': [
    'You propose to {personFirst}. They say no, kindly, and you take the ring back to the shop.',
  ],
  'people.expecting': [
    '{PersonFirst} shows you a positive test. The baby is due within the year, and you have already argued about the name {baby}.',
  ],
  'people.not-expecting': [
    'You and {personFirst} try for a baby. Not this year.',
  ],
  'people.child-born': [
    'Your child {person} is born at Saint Bryce Medical. You go home with a car seat and no sleep.',
    '{Person} arrives at four in the morning, red and loud. You are a parent.',
  ],
  'people.play': [
    'You spend the weekend with {personFirst}: the park, a cartoon, a fort made of couch cushions.',
    'You take {personFirst} to the harbour to look at the ships. They ask a hundred questions.',
  ],
  'people.mentor': [
    'You walk {personFirst} through how the city really works: who to pay, who to avoid, which promises mean anything.',
  ],
  'people.break-up': [
    'You end things with {personFirst}. They take their toothbrush and leave the key on the counter.',
  ],
  'people.divorce': [
    'You and {personFirst} divorce. The lawyers cost more than the wedding.',
  ],
  'people.left.partner': [
    '{PersonFirst} breaks up with you over the phone. They had been gone a while before that.',
  ],
  'people.left.spouse': [
    '{PersonFirst} files for divorce. The papers arrive at work.',
  ],
  'people.reconcile.yes': [
    'You reach out to {personFirst}. The first call is short. The second one lasts an hour.',
    'You knock on {personFirst}\'s door after years. They let you in.',
  ],
  'people.reconcile.no': [
    'You reach out to {personFirst}. The call goes to voicemail and stays there.',
    'You write {personFirst} a letter. It comes back unopened.',
  ],
  'people.confront.win': [
    'You settle it with {personFirst} out back. They walk away first.',
  ],
  'people.confront.lose': [
    'You try to settle it with {personFirst}. You lose, and you have the split lip to prove it.',
  ],
  'people.make-peace.yes': [
    'You offer {personFirst} a truce. They take it, and by the end of the night you are friends.',
  ],
  'people.make-peace.no': [
    'You offer {personFirst} a truce. They laugh in your face.',
  ],
  'people.rival-gone': [
    '{Person} moves away. You hear about it from somebody else.',
  ],
};

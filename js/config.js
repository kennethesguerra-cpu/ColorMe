/* ===== Color Me! settings. Edit this file, not app.js ===== */

const COL={red:'#F0464A',blue:'#2F7BF5',yellow:'#FFC933',green:'#3CC15C',orange:'#FF8A2B',purple:'#8E5BE8',pink:'#FF8FC0',brown:'#8B5A3C',black:'#2B2B33',white:'#FFFFFF'};
const K=Object.keys(COL);

/* Palette ("Pal") images inside palette/ */
const MASCOT={
  dir:'palette/',
  files:{
    happy:'happy.png',
    idle:'closed mouth.png',
    think:'open mouth.png',
    oops:'surprised.png'
  }
};

/* Find It! pictures inside find it images/ */
const SCENES=[1,2,3,4,5,6,7,8].map(n=>`find it images/${n}.png`);
const FIND_ASK=['red','orange','yellow','green','blue','purple','pink','brown'];
const SCENE_COLORS={};
const SCENE_BAN={
  'find it images/1.png':['green'],
  'find it images/2.png':['green'],
  'find it images/3.png':['brown'],
  'find it images/4.png':['blue'],
  'find it images/5.png':['green','brown'],
  'find it images/6.png':['brown'],
  'find it images/7.png':['green'],
  'find it images/8.png':['green']
};

/* Mix It! recipes: [color A, color B, result] */
const MIX=[
  ['red','yellow','orange'],
  ['blue','yellow','green'],
  ['red','blue','purple'],
  ['red','white','pink'],
  ['red','green','brown']
];

const HINT={red:'a juicy apple',blue:'the big blue sky',yellow:'a yummy banana',green:'a hoppy frog',orange:'a crunchy carrot',purple:'sweet grapes',pink:'a pink piggy',brown:'yummy chocolate',black:'the night sky',white:'a fluffy cloud'};

/* Pal’s words: short, soft and sweet. {n} = child’s name, {hint} {a} {b} {c} are filled in by the game. */
const SAY={
 welcomeNew:'Hello, friend! I’m Pal! What’s your name?',
 welcomeBack:'Yay, you’re back! Let’s play!',
 homeFirst:'Nice to meet you, {n}! Let’s play with colors!',
 homeBack:'Hi, {n}! Which game shall we play?',
 chat:['You’re so smart, {n}!','Colors are so fun!','Pick a game and let’s go!','I love playing with you!','Tweet tweet! You’re a star!'],
 facts:[
  'Fun fact! Yellow is the first color babies can see clearly!',
  'Fun fact! Red, yellow, and blue are the three primary colors!',
  'Fun fact! Orange is named after the yummy fruit!',
  'Fun fact! A rainbow always has red on top and violet on the bottom!',
  'Fun fact! Mixing blue and yellow makes bright green!',
  'Fun fact! Green is the easiest color for human eyes to look at!',
  'Fun fact! Flamingos turn pink from eating shrimp and algae!',
  'Fun fact! Blue is the most popular favorite color in the whole world!',
  'Fun fact! Purple used to be so rare that only kings and queens wore it!',
  'Fun fact! Bees can see ultraviolet colors that humans cannot see!',
  'Fun fact! White light is actually made of all the rainbow colors mixed together!',
  'Fun fact! Mixing red and white makes sweet, soft pink!'
 ],
 nameTip1:'Take your time! Think of {hint}.',
 nameTip2:'Here’s a little clue! It looks like {hint}.',
 nameOops:'Oh my! That’s okay! Think of {hint}.',
 mixTip1:'Pick two colors and drop them in the bowl!',
 mixTip2:'Here’s a little clue! Try {a} and {b}.',
 mixOops:'Oh my! That’s okay! Let’s try {a} and {b}.',
 findTip1:'Look, look! Can you spot {c}?',
 findTip2:'I’ll help you! Look inside the circle.',
 findOops:'Oh my! That’s okay! Look inside the circle.',
 tryName:'Good try! That’s {x}. Try again!',
 tryMix:'Good try! Let’s pick another color!',
 tryDup:'That one is already in! Pick another!',
 tryFind:'Good try! That’s {x}. Try again!',
 tryFind2:'Good try! Try again!',
 praise:['Yay! You did it!','Wonderful!','Super duper!','You’re a star!','So smart!','Hooray!']
};

const ROUNDS=5, IDLE_MS=9000, HOME_IDLE_MS=20000, HOME_TALK_MS=10000, SWIFT_SEC=5, STREAK_DAYS=3;

const GD={name:{t:'Name It!',d:'Tap the color you hear',c:'sky'},mix:{t:'Mix It!',d:'Mix colors to make a new one',c:'sun'},find:{t:'Find It!',d:'I spy a color in the picture',c:'coral'}};
const BD={streak:{t:'Streak Star',d:`Play ${STREAK_DAYS} days in a row`,c:'#FF8A2B',p:'M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z'},
perfect:{t:'Perfect Pick',d:'Finish a game with no mistakes',c:'#3CC15C',p:'M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.8 5.6 21.5l1.7-7.2L2 9.6 9 9z'},
swift:{t:'Swift Wing',d:`Perfect game, every answer within ${SWIFT_SEC} seconds`,c:'#4C8DFF',p:'M13 2L5 14h6l-1 8 8-12h-6z'},
master:{t:'Color Master',d:'Collect every other badge',c:'#8E5BE8',p:'M3 19l-1-12 5 4 5-8 5 8 5-4-1 12z'}};